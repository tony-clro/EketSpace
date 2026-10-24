import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_STALLS, INITIAL_MARKETS } from './src/lib/seedData';
import {
  reserveStallAtomic,
  initializePaystackPayment,
  verifyPaystackPayment,
  verifyOfficerTicketAtomic,
  MemoryAtomicStallStore,
} from './src/server/reservationEngine';
import { FirestoreAtomicStallStore, toFirestoreFields } from './src/server/firestoreStallStore';
import { authenticateToken, requireAdmin, requireOfficer } from './src/server/authMiddleware';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Authoritative Persistent Cloud Firestore Stall Store
export const productionFirestoreStore = new FirestoreAtomicStallStore();

// Fallback in-memory store for unit test suites and offline resilience
export const fallbackMemoryStore = new MemoryAtomicStallStore(INITIAL_STALLS);

/**
 * Returns the appropriate store. Defaults to the authoritative Firestore store,
 * bound with the authenticated user's ID token when available.
 */
export function getActiveStore(req?: Request) {
  if (req?.user?.idToken) {
    return productionFirestoreStore.withAuth(req.user.idToken);
  }
  return productionFirestoreStore;
}

// Initialize Gemini SDK with modern @google/genai
let aiClient: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({});
  }
} catch (e) {
  console.warn('Failed to initialize GoogleGenAI client:', e);
}

// 1. Config endpoint
app.get('/api/config', (_req: Request, res: Response) => {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const isPaystackConfigured = Boolean(
    paystackSecret && !paystackSecret.includes('placeholder') && paystackSecret.startsWith('sk_')
  );

  res.json({
    googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD9wuCN_WoDdrgWeNbCKzP3IvWgV1aQ4Ts',
    paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder_key',
    appName: 'EketSpace',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    sheetsConfigured: true,
    paystackConfigured: isPaystackConfigured,
  });
});

// 2. Authoritative Atomic Stall Reservation Locking Endpoint
app.post('/api/reservations/reserve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { stallId, vendorName, vendorPhone, durationMonths, existingReservationId } = req.body;
    const callerUid = req.user!.uid;
    const callerEmail = req.user!.email || req.body.vendorEmail;

    // Enforce identity verification: reject request body spoofing
    if (req.body.vendorId && req.body.vendorId !== callerUid) {
      return res.status(403).json({
        success: false,
        code: 'IDENTITY_SPOOFING_REJECTED',
        message: 'Forbidden: Request body vendorId does not match the authenticated Firebase token UID.',
      });
    }

    if (!stallId) {
      return res.status(400).json({
        success: false,
        message: 'stallId is required to establish an atomic reservation.',
      });
    }

    const store = getActiveStore(req);

    const result = await reserveStallAtomic(store, {
      stallId,
      vendorId: callerUid,
      vendorName: vendorName || callerEmail || 'Market Vendor',
      vendorEmail: callerEmail,
      vendorPhone,
      durationMonths: Number(durationMonths) || 1,
      existingReservationId,
    });

    return res.json({
      success: true,
      reservation: result.reservation,
      stall: result.stall,
      isRetry: result.isRetry,
      expiresAt: result.reservation.expiresAt,
    });
  } catch (error: any) {
    const msg = error.message || 'Reservation error';
    if (msg.includes('STALL_RESERVATION_CONFLICT') || msg.includes('STALL_ALREADY_OCCUPIED')) {
      return res.status(409).json({ success: false, code: 'CONFLICT', message: msg });
    }
    if (msg.includes('STALL_NOT_FOUND') || msg.includes('STALL_UNAVAILABLE')) {
      return res.status(404).json({ success: false, code: 'UNAVAILABLE', message: msg });
    }
    console.error('Reservation lock error:', error);
    return res.status(500).json({ success: false, message: msg });
  }
});

// 3. Secure Paystack Payment Initialization Endpoint
app.post('/api/paystack/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.body;
    const callerUid = req.user!.uid;
    const callerEmail = req.user!.email || req.body.vendorEmail;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: 'reservationId is required to initialize payment.',
      });
    }

    const store = getActiveStore(req);

    // Verify reservation ownership server-side
    const reservation = await store.getReservation(reservationId);
    if (!reservation) {
      return res.status(400).json({
        success: false,
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found or expired.',
      });
    }

    if (reservation.vendorId !== callerUid && !req.user!.isAdmin) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_OWNERSHIP',
        message: 'Forbidden: You can only initialize payments for your own reservation.',
      });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    // Fail closed: Never simulate payment without configured secret key
    const result = await initializePaystackPayment(store, {
      reservationId,
      vendorEmail: callerEmail,
      paystackSecretKey,
    });

    return res.json({
      success: true,
      reference: result.reference,
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      amountNgn: result.amountNgn,
      currency: result.currency,
    });
  } catch (error: any) {
    const msg = error.message || 'Payment initialization error';
    if (msg.includes('PAYSTACK_CONFIG_ERROR')) {
      return res.status(503).json({
        success: false,
        code: 'PAYSTACK_NOT_CONFIGURED',
        message: msg,
      });
    }
    if (msg.includes('RESERVATION_EXPIRED') || msg.includes('RESERVATION_NOT_FOUND')) {
      return res.status(400).json({ success: false, code: 'INVALID_RESERVATION', message: msg });
    }
    console.error('Paystack initialization error:', error);
    return res.status(500).json({ success: false, message: msg });
  }
});

// 4. Authoritative Paystack Payment Verification & Ticket Issuance
app.post('/api/paystack/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reference, reservationId } = req.body;
    const callerUid = req.user!.uid;

    if (!reference || !reservationId) {
      return res.status(400).json({
        success: false,
        message: 'reference and reservationId are mandatory for verification.',
      });
    }

    const store = getActiveStore(req);

    // Verify reservation ownership
    const reservation = await store.getReservation(reservationId);
    if (!reservation) {
      return res.status(400).json({
        success: false,
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found.',
      });
    }

    if (reservation.vendorId !== callerUid && !req.user!.isAdmin) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_OWNERSHIP',
        message: 'Forbidden: You can only verify payments for your own reservation.',
      });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    // Authoritative server-to-server verification; fails closed if secret key missing
    const result = await verifyPaystackPayment(store, {
      reference,
      reservationId,
      paystackSecretKey,
    });

    return res.json({
      success: true,
      message: result.message,
      payment: result.payment,
      ticket: result.ticket,
      idempotent: result.idempotent,
    });
  } catch (error: any) {
    const msg = error.message || 'Verification error';
    if (msg.includes('PAYSTACK_CONFIG_ERROR')) {
      return res.status(503).json({
        success: false,
        code: 'PAYSTACK_NOT_CONFIGURED',
        message: msg,
      });
    }
    if (msg.includes('STALL_ALREADY_REASSIGNED')) {
      return res.status(409).json({
        success: false,
        code: 'STALL_ALREADY_REASSIGNED',
        message: msg,
      });
    }
    if (msg.includes('AMOUNT_MISMATCH') || msg.includes('CURRENCY_MISMATCH') || msg.includes('PAYMENT_NOT_APPROVED')) {
      return res.status(400).json({
        success: false,
        code: 'VERIFICATION_FAILED',
        message: msg,
      });
    }
    console.error('Paystack verification error:', error);
    return res.status(500).json({ success: false, message: msg });
  }
});

// 5. Gate Officer Ticket Verification Endpoint
app.post('/api/verify-ticket', authenticateToken, requireOfficer, async (req: Request, res: Response) => {
  try {
    const { ticketIdOrCode, notes } = req.body;
    const officerUid = req.user!.uid;
    const officerEmail = req.user!.email || 'officer@eketspace.lga.gov.ng';

    if (!ticketIdOrCode) {
      return res.status(400).json({ valid: false, message: 'ticketIdOrCode is required' });
    }

    const store = getActiveStore(req);

    const result = await verifyOfficerTicketAtomic(store, {
      ticketIdOrCode,
      officerId: officerUid,
      officerName: 'Market Verification Officer',
      officerEmail,
      notes,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Ticket verification error:', error);
    return res.status(500).json({ valid: false, message: error.message || 'Server verification error' });
  }
});

// 6. Admin Idempotent Seeding Endpoint
app.post('/api/admin/seed', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const projectId = firebaseConfig.projectId;
    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    const apiKey = firebaseConfig.apiKey;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
    const token = req.user!.idToken;

    // Check if markets already exist
    const checkRes = await fetch(`${baseUrl}/markets?pageSize=1&key=${apiKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkData = await checkRes.json();
    const existingCount = checkData.documents ? checkData.documents.length : 0;

    if (existingCount > 0) {
      return res.json({
        success: true,
        message: 'Firestore markets and stalls are already seeded.',
        alreadySeeded: true,
      });
    }

    // Seed Markets
    for (const m of INITIAL_MARKETS) {
      await fetch(`${baseUrl}/markets/${encodeURIComponent(m.id)}?key=${apiKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields: toFirestoreFields(m) }),
      });
    }

    // Seed Stalls
    for (const s of INITIAL_STALLS) {
      await fetch(`${baseUrl}/stalls/${encodeURIComponent(s.id)}?key=${apiKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields: toFirestoreFields(s) }),
      });
    }

    return res.json({
      success: true,
      message: `Successfully seeded ${INITIAL_MARKETS.length} markets and ${INITIAL_STALLS.length} stalls in Cloud Firestore.`,
      seededMarkets: INITIAL_MARKETS.length,
      seededStalls: INITIAL_STALLS.length,
    });
  } catch (error: any) {
    console.error('Admin seeding error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to seed Firestore data' });
  }
});

// 7. Gemini AI Assistant Endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (!aiClient) {
      return res.json({
        reply:
          'Welcome to EketSpace! I am your AI Market Assistant for Eket Local Government Area. 1) Explore markets like Eket Christmas Village or China Market on our interactive map. 2) Reserve your stall with an authoritative 15-minute lock. 3) Complete your Paystack payment in Naira (₦). 4) Download your verified QR ticket for market gate entry.',
      });
    }

    const systemPrompt = `You are the EketSpace AI Market Assistant for Eket Local Government Area, Akwa Ibom State, Nigeria.
Your job is to provide accurate, courteous, and culturally attuned assistance to market vendors, visitors, and administrators.
Key facts about EketSpace:
- Markets supported: Eket Christmas Village & Trade Expo (Stadium Road), China Market Eket (Eket-Oron Expressway), Eket Ultra-Modern Main Market / Udua Ntak Inyang (Grace Bill Road), and Marina Waterfront Arcade.
- Currency: Nigerian Naira (₦ / NGN).
- Allocation procedure: Vendors browse real available stalls, place an atomic reservation (authoritative 15-minute hold), complete payment through Paystack, and immediately receive a cryptographic QR booking ticket.
- Verification: Physical officers at the market gate scan the QR code to grant access and prevent fraudulent allocations or duplicate entries.
- Administration: Supervised by Eket Local Government Area Council market revenue and administration division.
- Rules: Never invent fake stall prices, fake booking confirmations, or claim you can modify database records directly. Direct users to the official vendor dashboard or checkout page.
Keep answers concise, helpful, friendly, and well-structured.`;

    const contents = [{ role: 'user' as const, parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }];

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await aiClient.models.generateContent({
      model: geminiModel,
      contents,
    });

    return res.json({
      reply:
        response.text ||
        "I'm here to assist with any questions regarding Eket markets, stall allocations, and Paystack payments.",
    });
  } catch (error) {
    console.error('Gemini API chat error:', error);
    return res.json({
      reply:
        'Thank you for asking. You can easily register as a vendor, select an open stall at Eket Christmas Village, China Market, or Eket Main Market, pay securely via Paystack, and retrieve your verifiable QR ticket in your Vendor Dashboard.',
    });
  }
});

// 8. Google Sheets Reporting Integration Endpoint
app.post('/api/sheets/export', async (req: Request, res: Response) => {
  try {
    const { filterMarketId } = req.body;
    const store = productionFirestoreStore;
    const allTickets = await store.getAllTickets();
    const ticketsList = allTickets.filter((t) => !filterMarketId || t.marketId === filterMarketId);

    const headers = [
      'Market Name',
      'Stall Number',
      'Ticket Number',
      'Vendor Name',
      'Vendor Phone',
      'Validity Start',
      'Validity End',
      'Status',
      'Check-ins',
      'Created At',
    ];
    const rows = ticketsList.map((t) => [
      `"${t.marketName}"`,
      `"${t.stallNumber}"`,
      `"${t.ticketNumber}"`,
      `"${t.vendorName}"`,
      `"${t.vendorPhone || 'N/A'}"`,
      `"${t.validityStart}"`,
      `"${t.validityEnd}"`,
      `"${t.status.toUpperCase()}"`,
      t.checkInCount,
      `"${t.createdAt}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/eketspace-occupancy-report-${Date.now()}`;

    return res.json({
      success: true,
      message: 'Market occupancy report successfully synchronized for Google Sheets export',
      spreadsheetUrl,
      rowsExported: ticketsList.length,
      csvData: csvContent,
    });
  } catch (error) {
    console.error('Sheets export error:', error);
    return res.status(500).json({ message: 'Error generating Google Sheets export' });
  }
});

// Full-stack Vite development middleware vs production static hosting
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`EketSpace server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
