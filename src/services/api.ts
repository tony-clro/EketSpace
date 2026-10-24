import { BookingTicket, PaymentRecord, VerificationResult, Reservation, Stall } from '../types';
import { auth } from '../lib/firebase';

export interface AppConfig {
  googleMapsApiKey: string;
  paystackPublicKey: string;
  appName: string;
  geminiConfigured: boolean;
  sheetsConfigured: boolean;
  paystackConfigured: boolean;
}

/**
 * Helper to retrieve fresh Firebase Auth ID token and assemble headers
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID token:', e);
    }
  }
  return headers;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load server config');
    return await res.json();
  } catch (error) {
    console.warn('Using client fallback config:', error);
    return {
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD9wuCN_WoDdrgWeNbCKzP3IvWgV1aQ4Ts',
      paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder_key',
      appName: 'EketSpace',
      geminiConfigured: true,
      sheetsConfigured: true,
      paystackConfigured: false,
    };
  }
}

/**
 * Create authoritative atomic reservation on server with Firebase Bearer token
 */
export async function createAtomicReservation(data: {
  stallId: string;
  vendorId?: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone?: string;
  durationMonths?: number;
  existingReservationId?: string;
}): Promise<{
  success: boolean;
  reservation: Reservation;
  stall: Stall;
  isRetry: boolean;
  expiresAt: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/reservations/reserve', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({ message: 'Failed to reserve stall' }));

  if (!res.ok) {
    throw new Error(payload.message || 'Failed to establish reservation lock');
  }

  return payload;
}

/**
 * Initialize Paystack transaction on server with Firebase Bearer token
 */
export async function initializePayment(data: {
  reservationId: string;
  vendorEmail: string;
}): Promise<{
  success: boolean;
  reference: string;
  accessCode?: string;
  authorizationUrl?: string;
  amountNgn: number;
  currency: 'NGN';
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({ message: 'Payment initialization failed' }));

  if (!res.ok) {
    throw new Error(payload.message || 'Payment initialization declined by server');
  }

  return payload;
}

/**
 * Authoritatively verify Paystack transaction on server with Firebase Bearer token
 */
export async function verifyPayment(data: {
  reference: string;
  reservationId: string;
}): Promise<{
  success: boolean;
  message: string;
  ticket: BookingTicket;
  payment: PaymentRecord;
  idempotent: boolean;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/paystack/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({ message: 'Payment verification failed' }));

  if (!res.ok) {
    throw new Error(payload.message || 'Payment verification failed at gateway');
  }

  return payload;
}

/**
 * Gate officer ticket verification on server with Firebase Bearer token
 */
export async function verifyOfficerTicket(data: {
  ticketIdOrCode: string;
  officerId?: string;
  officerName?: string;
  officerEmail?: string;
  notes?: string;
}): Promise<VerificationResult> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/verify-ticket', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Ticket verification failed' }));
    throw new Error(err.message || 'Ticket verification failed');
  }

  return await res.json();
}

/**
 * Idempotent Admin Firestore Seeding
 */
export async function seedFirestoreDatabase(): Promise<{
  success: boolean;
  message: string;
  seededMarkets?: number;
  seededStalls?: number;
  alreadySeeded?: boolean;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/admin/seed', {
    method: 'POST',
    headers,
  });

  const payload = await res.json().catch(() => ({ message: 'Seeding request failed' }));
  if (!res.ok) {
    throw new Error(payload.message || 'Failed to seed database');
  }
  return payload;
}

export async function askGeminiAssistant(
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to communicate with AI Assistant' }));
    throw new Error(err.message || 'Failed to communicate with AI Assistant');
  }

  const data = await res.json();
  return data.reply;
}

export async function exportToGoogleSheets(filterMarketId?: string): Promise<{
  success: boolean;
  message: string;
  spreadsheetUrl?: string;
  rowsExported: number;
  csvData?: string;
}> {
  const res = await fetch('/api/sheets/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterMarketId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to export reports' }));
    throw new Error(err.message || 'Failed to export reports');
  }

  return await res.json();
}
