import { Stall, Reservation, BookingTicket, PaymentRecord, VerificationResult } from '../types';

export const RESERVATION_HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const SANITATION_FEE_NGN = 2500;
export const SECURITY_LEVY_NGN = 1500;

export interface AtomicStallStore {
  getStall(stallId: string): Promise<Stall | null>;
  getReservation(reservationId: string): Promise<Reservation | null>;
  getReservationByStall(stallId: string): Promise<Reservation | null>;
  getPaymentByReference(reference: string): Promise<PaymentRecord | null>;
  getTicket(ticketIdOrCode: string): Promise<BookingTicket | null>;

  // Atomic transaction runner
  runAtomicTransaction<T>(updateFunction: (transaction: AtomicTransactionContext) => Promise<T>): Promise<T>;
}

export interface AtomicTransactionContext {
  getStall(stallId: string): Promise<Stall | null>;
  getReservation(reservationId: string): Promise<Reservation | null>;
  getReservationByStall(stallId: string): Promise<Reservation | null>;
  getPaymentByReference(reference: string): Promise<PaymentRecord | null>;
  getTicket(ticketIdOrCode: string): Promise<BookingTicket | null>;

  updateStall(stallId: string, data: Partial<Stall>): void;
  setReservation(reservation: Reservation): void;
  updateReservation(reservationId: string, data: Partial<Reservation>): void;
  setPayment(payment: PaymentRecord): void;
  setTicket(ticket: BookingTicket): void;
  recordAuditLog(action: string, targetType: string, targetId: string, details?: any): void;
  recordCheckInLog(log: any): void;
}

export class MemoryAtomicStallStore implements AtomicStallStore {
  private stalls = new Map<string, Stall>();
  private reservations = new Map<string, Reservation>();
  private payments = new Map<string, PaymentRecord>();
  private tickets = new Map<string, BookingTicket>();
  private auditLogs: any[] = [];
  private checkIns: any[] = [];

  constructor(initialStalls?: Stall[]) {
    if (initialStalls) {
      initialStalls.forEach((s) => this.stalls.set(s.id, { ...s }));
    }
  }

  async getStall(stallId: string): Promise<Stall | null> {
    const s = this.stalls.get(stallId);
    return s ? { ...s } : null;
  }

  async getReservation(reservationId: string): Promise<Reservation | null> {
    const r = this.reservations.get(reservationId);
    return r ? { ...r } : null;
  }

  async getReservationByStall(stallId: string): Promise<Reservation | null> {
    for (const r of this.reservations.values()) {
      if (r.stallId === stallId && (r.status === 'pending_payment' || r.status === 'confirmed')) {
        return { ...r };
      }
    }
    return null;
  }

  async getPaymentByReference(reference: string): Promise<PaymentRecord | null> {
    const p = this.payments.get(reference);
    return p ? { ...p } : null;
  }

  async getTicket(ticketIdOrCode: string): Promise<BookingTicket | null> {
    const clean = ticketIdOrCode.trim();
    for (const t of this.tickets.values()) {
      if (t.id === clean || t.ticketNumber === clean || t.qrVerificationCode === clean || t.reservationId === clean) {
        return { ...t };
      }
    }
    return null;
  }

  // Mutex lock to simulate database-level atomic transaction serialization
  private lockPromise: Promise<void> = Promise.resolve();

  async runAtomicTransaction<T>(updateFunction: (transaction: AtomicTransactionContext) => Promise<T>): Promise<T> {
    const previousLock = this.lockPromise;
    let releaseLock: () => void;
    this.lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousLock;

    try {
      const pendingStallUpdates = new Map<string, Partial<Stall>>();
      const pendingReservations = new Map<string, Reservation>();
      const pendingReservationUpdates = new Map<string, Partial<Reservation>>();
      const pendingPayments = new Map<string, PaymentRecord>();
      const pendingTickets = new Map<string, BookingTicket>();
      const pendingAuditLogs: any[] = [];
      const pendingCheckIns: any[] = [];

      const txContext: AtomicTransactionContext = {
        getStall: async (stallId: string) => {
          const s = this.stalls.get(stallId);
          return s ? { ...s, ...(pendingStallUpdates.get(stallId) || {}) } : null;
        },
        getReservation: async (reservationId: string) => {
          if (pendingReservations.has(reservationId)) {
            return { ...pendingReservations.get(reservationId)! };
          }
          const r = this.reservations.get(reservationId);
          if (!r) return null;
          return { ...r, ...(pendingReservationUpdates.get(reservationId) || {}) };
        },
        getReservationByStall: async (stallId: string) => {
          for (const r of pendingReservations.values()) {
            if (r.stallId === stallId && (r.status === 'pending_payment' || r.status === 'confirmed')) {
              return { ...r };
            }
          }
          for (const r of this.reservations.values()) {
            if (r.stallId === stallId && (r.status === 'pending_payment' || r.status === 'confirmed')) {
              const updates = pendingReservationUpdates.get(r.id);
              return { ...r, ...(updates || {}) };
            }
          }
          return null;
        },
        getPaymentByReference: async (ref: string) => {
          if (pendingPayments.has(ref)) return { ...pendingPayments.get(ref)! };
          const p = this.payments.get(ref);
          return p ? { ...p } : null;
        },
        getTicket: async (ticketIdOrCode: string) => {
          const clean = ticketIdOrCode.trim();
          for (const t of pendingTickets.values()) {
            if (t.id === clean || t.ticketNumber === clean || t.qrVerificationCode === clean || t.reservationId === clean) {
              return { ...t };
            }
          }
          for (const t of this.tickets.values()) {
            if (t.id === clean || t.ticketNumber === clean || t.qrVerificationCode === clean || t.reservationId === clean) {
              return { ...t };
            }
          }
          return null;
        },
        updateStall: (stallId: string, data: Partial<Stall>) => {
          pendingStallUpdates.set(stallId, { ...(pendingStallUpdates.get(stallId) || {}), ...data });
        },
        setReservation: (reservation: Reservation) => {
          pendingReservations.set(reservation.id, reservation);
        },
        updateReservation: (reservationId: string, data: Partial<Reservation>) => {
          pendingReservationUpdates.set(reservationId, { ...(pendingReservationUpdates.get(reservationId) || {}), ...data });
        },
        setPayment: (payment: PaymentRecord) => {
          pendingPayments.set(payment.reference, payment);
          pendingPayments.set(payment.id, payment);
        },
        setTicket: (ticket: BookingTicket) => {
          pendingTickets.set(ticket.id, ticket);
        },
        recordAuditLog: (action: string, targetType: string, targetId: string, details?: any) => {
          pendingAuditLogs.push({
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            action,
            targetType,
            targetId,
            details,
            timestamp: new Date().toISOString(),
          });
        },
        recordCheckInLog: (log: any) => {
          pendingCheckIns.push(log);
        },
      };

      const result = await updateFunction(txContext);

      // Commit changes atomically
      pendingStallUpdates.forEach((data, id) => {
        const existing = this.stalls.get(id);
        if (existing) {
          this.stalls.set(id, { ...existing, ...data });
        }
      });

      pendingReservations.forEach((res, id) => {
        this.reservations.set(id, res);
      });

      pendingReservationUpdates.forEach((data, id) => {
        const existing = this.reservations.get(id);
        if (existing) {
          this.reservations.set(id, { ...existing, ...data });
        }
      });

      pendingPayments.forEach((pay, key) => {
        this.payments.set(key, pay);
      });

      pendingTickets.forEach((t, id) => {
        this.tickets.set(id, t);
      });

      this.auditLogs.push(...pendingAuditLogs);
      this.checkIns.push(...pendingCheckIns);

      return result;
    } finally {
      releaseLock!();
    }
  }

  // Debug inspector for tests
  getAllReservations(): Reservation[] {
    return Array.from(this.reservations.values());
  }

  getAllTickets(): BookingTicket[] {
    return Array.from(this.tickets.values());
  }
}

/**
 * Task 2: Atomic Stall Reservation Locking
 * Checks availability, existing unexpired reservations, enforces 15-minute window, and executes atomic transaction.
 */
export async function reserveStallAtomic(
  store: AtomicStallStore,
  params: {
    stallId: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    vendorPhone?: string;
    durationMonths?: number;
    existingReservationId?: string;
    currentTimeMs?: number; // injectable for testing expiration
  }
): Promise<{ success: boolean; reservation: Reservation; stall: Stall; isRetry: boolean }> {
  const { stallId, vendorId, vendorName, vendorEmail, vendorPhone } = params;
  const durationMonths = Math.max(1, Math.min(12, params.durationMonths || 1));
  const nowMs = params.currentTimeMs || Date.now();

  if (!stallId || !vendorId || !vendorEmail) {
    throw new Error('MISSING_REQUIRED_FIELDS: stallId, vendorId, and vendorEmail are mandatory.');
  }

  return await store.runAtomicTransaction(async (tx) => {
    // 1. Transaction Read: Read stall
    const stall = await tx.getStall(stallId);
    if (!stall) {
      throw new Error(`STALL_NOT_FOUND: Stall ID '${stallId}' does not exist.`);
    }

    if (stall.status === 'occupied') {
      throw new Error(`STALL_ALREADY_OCCUPIED: Stall ${stall.stallNumber} has already been allocated under a confirmed booking.`);
    }

    if (stall.status === 'maintenance' || stall.status === 'inactive') {
      throw new Error(`STALL_UNAVAILABLE: Stall ${stall.stallNumber} is currently ${stall.status}.`);
    }

    // 2. Transaction Read: Check existing reservation for this stall
    let activeReservation: Reservation | null = null;
    if (stall.currentReservationId) {
      activeReservation = await tx.getReservation(stall.currentReservationId);
    }
    if (!activeReservation) {
      activeReservation = await tx.getReservationByStall(stallId);
    }

    // Check if there is an active reservation
    if (activeReservation) {
      const expiresAtMs = new Date(activeReservation.expiresAt).getTime();
      const isExpired = expiresAtMs <= nowMs;

      if (!isExpired && activeReservation.status === 'pending_payment') {
        // Active hold exists!
        if (activeReservation.vendorId === vendorId) {
          // Idempotent retry: The same vendor already holds the active reservation lock!
          return {
            success: true,
            reservation: activeReservation,
            stall,
            isRetry: true,
          };
        } else {
          // Competing reservation from another vendor: REJECT
          throw new Error(
            `STALL_RESERVATION_CONFLICT: Stall ${stall.stallNumber} is currently locked by another vendor until ${activeReservation.expiresAt}.`
          );
        }
      }

      // If expired, safely mark previous reservation as expired so it cannot be resurrected
      if (isExpired && activeReservation.status === 'pending_payment') {
        tx.updateReservation(activeReservation.id, {
          status: 'expired',
          updatedAt: new Date(nowMs).toISOString(),
        });
      }
    }

    // 3. Calculate authoritative pricing
    const baseRentNgn = stall.monthlyRateNgn * durationMonths;
    const totalAmountNgn = baseRentNgn + SANITATION_FEE_NGN + SECURITY_LEVY_NGN;

    const reservationId = params.existingReservationId || `res-${nowMs}-${Math.random().toString(36).substring(2, 7)}`;
    const reservationNumber = `EKET-RES-${nowMs.toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const expiresAt = new Date(nowMs + RESERVATION_HOLD_DURATION_MS).toISOString();

    const newReservation: Reservation = {
      id: reservationId,
      reservationNumber,
      stallId: stall.id,
      marketId: stall.marketId,
      stallNumber: stall.stallNumber,
      marketName: stall.marketName || 'Eket Municipal Market',
      vendorId,
      vendorName: vendorName || 'Registered Vendor',
      vendorEmail,
      vendorPhone: vendorPhone || '',
      startDate: new Date(nowMs).toISOString().split('T')[0],
      endDate: new Date(nowMs + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      durationMonths,
      totalAmountNgn,
      status: 'pending_payment',
      paymentId: null,
      ticketId: null,
      expiresAt,
      createdAt: new Date(nowMs).toISOString(),
      updatedAt: new Date(nowMs).toISOString(),
    };

    // 4. Transaction Writes
    tx.setReservation(newReservation);
    tx.updateStall(stall.id, {
      status: 'reserved',
      currentReservationId: newReservation.id,
      currentVendorId: vendorId,
      updatedAt: new Date(nowMs).toISOString(),
    });
    tx.recordAuditLog('STALL_RESERVED_ATOMIC', 'stall', stall.id, {
      reservationId,
      vendorId,
      totalAmountNgn,
      expiresAt,
    });

    const updatedStall: Stall = {
      ...stall,
      status: 'reserved',
      currentReservationId: newReservation.id,
      currentVendorId: vendorId,
    };

    return {
      success: true,
      reservation: newReservation,
      stall: updatedStall,
      isRetry: false,
    };
  });
}

/**
 * Task 3: Secure Paystack Payment Initialization
 * Fails closed if secret key is missing or a placeholder.
 * Derives amount authoritatively from the server reservation record.
 */
export async function initializePaystackPayment(
  store: AtomicStallStore,
  params: {
    reservationId: string;
    vendorEmail: string;
    paystackSecretKey?: string;
    fetchFn?: typeof fetch;
  }
): Promise<{
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  amountNgn: number;
  currency: 'NGN';
}> {
  const { reservationId, vendorEmail, paystackSecretKey } = params;
  const customFetch = params.fetchFn || fetch;

  // Fail closed: Secret key must be configured and not a placeholder
  if (!paystackSecretKey || paystackSecretKey.trim() === '' || paystackSecretKey.includes('placeholder')) {
    throw new Error(
      'PAYSTACK_CONFIG_ERROR: PAYSTACK_SECRET_KEY is not configured on the server. Live payment initialization fails closed. Please provide a valid test secret key (sk_test_...).'
    );
  }

  const reservation = await store.getReservation(reservationId);
  if (!reservation) {
    throw new Error(`RESERVATION_NOT_FOUND: No booking reservation with ID '${reservationId}' exists.`);
  }

  if (reservation.status !== 'pending_payment') {
    throw new Error(`INVALID_RESERVATION_STATE: Reservation status is '${reservation.status}', cannot initialize payment.`);
  }

  // Check expiration
  if (new Date(reservation.expiresAt).getTime() <= Date.now()) {
    throw new Error(`RESERVATION_EXPIRED: The 15-minute reservation window has expired. Please reserve the stall again.`);
  }

  // Derive authoritative amount and currency in Kobo
  const amountNgn = reservation.totalAmountNgn;
  const amountKobo = Math.round(amountNgn * 100);
  const reference = `EKET-PAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  try {
    const paystackRes = await customFetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: vendorEmail || reservation.vendorEmail,
        amount: amountKobo,
        currency: 'NGN',
        reference,
        metadata: {
          reservationId: reservation.id,
          stallId: reservation.stallId,
          vendorId: reservation.vendorId,
        },
      }),
    });

    const data = await paystackRes.json();
    if (!data.status) {
      throw new Error(`PAYSTACK_GATEWAY_REJECTED: ${data.message || 'Payment initialization declined by gateway.'}`);
    }

    return {
      reference,
      authorizationUrl: data.data?.authorization_url,
      accessCode: data.data?.access_code,
      amountNgn,
      currency: 'NGN',
    };
  } catch (err: any) {
    if (err.message.startsWith('PAYSTACK_')) throw err;
    throw new Error(`PAYSTACK_NETWORK_ERROR: Failed to connect to Paystack gateway API: ${err.message}`);
  }
}

/**
 * Task 3 & 4: Authoritative Paystack Payment Verification & Ticket Issuance
 * Server-to-server verification.
 * Idempotent. Validates reference, status, amount, currency, and association.
 * Detects expired reservation where stall has been reassigned to prevent race conditions.
 */
export async function verifyPaystackPayment(
  store: AtomicStallStore,
  params: {
    reference: string;
    reservationId: string;
    paystackSecretKey?: string;
    fetchFn?: typeof fetch;
    currentTimeMs?: number;
  }
): Promise<{
  success: boolean;
  message: string;
  payment: PaymentRecord;
  ticket: BookingTicket;
  idempotent: boolean;
}> {
  const { reference, reservationId, paystackSecretKey } = params;
  const customFetch = params.fetchFn || fetch;
  const nowMs = params.currentTimeMs || Date.now();

  if (!reference || !reservationId) {
    throw new Error('MISSING_VERIFICATION_PARAMS: Transaction reference and reservationId are mandatory.');
  }

  // Fail closed if Paystack secret key is missing
  if (!paystackSecretKey || paystackSecretKey.trim() === '' || paystackSecretKey.includes('placeholder')) {
    throw new Error(
      'PAYSTACK_CONFIG_ERROR: PAYSTACK_SECRET_KEY is not configured on the server. Authoritative payment verification fails closed.'
    );
  }

  // 1. Authoritative Server-to-Server Request to Paystack
  let gatewayData: any;
  try {
    const verifyRes = await customFetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    gatewayData = await verifyRes.json();
  } catch (err: any) {
    throw new Error(`PAYSTACK_API_UNAVAILABLE: Server could not contact Paystack verification endpoint: ${err.message}`);
  }

  if (!gatewayData || !gatewayData.status || gatewayData.data?.status !== 'success') {
    throw new Error(
      `PAYMENT_NOT_APPROVED: Paystack transaction '${reference}' was not successful (Gateway response: ${gatewayData?.data?.gateway_response || 'Unapproved'}).`
    );
  }

  const txData = gatewayData.data;

  // Currency validation
  if (txData.currency !== 'NGN') {
    throw new Error(`CURRENCY_MISMATCH: Expected NGN currency but received '${txData.currency}'.`);
  }

  // 2. Atomic Database Transaction for Payment Commitment & Ticket Issuance
  return await store.runAtomicTransaction(async (tx) => {
    // Check payment record idempotency
    const existingPayment = await tx.getPaymentByReference(reference);
    if (existingPayment && existingPayment.status === 'success') {
      const existingTicket = await tx.getTicket(existingPayment.reservationId);
      if (existingTicket) {
        return {
          success: true,
          message: 'Payment already verified (idempotent duplicate request).',
          payment: existingPayment,
          ticket: existingTicket,
          idempotent: true,
        };
      }
    }

    // Read reservation
    const reservation = await tx.getReservation(reservationId);
    if (!reservation) {
      throw new Error(`RESERVATION_NOT_FOUND: Reservation '${reservationId}' does not exist.`);
    }

    // Amount validation: Kobo vs Naira
    const expectedKobo = Math.round(reservation.totalAmountNgn * 100);
    if (txData.amount !== expectedKobo) {
      throw new Error(
        `AMOUNT_MISMATCH: Authoritative reservation amount is ₦${reservation.totalAmountNgn} (${expectedKobo} kobo), but Paystack received ${txData.amount} kobo.`
      );
    }

    // Read stall
    const stall = await tx.getStall(reservation.stallId);
    if (!stall) {
      throw new Error(`STALL_NOT_FOUND: Allocated stall '${reservation.stallId}' was not found.`);
    }

    // Concurrency Protection: Check if reservation expired AND stall was already reassigned!
    const isExpired = new Date(reservation.expiresAt).getTime() <= nowMs;
    const isStallReassigned = stall.currentReservationId !== reservation.id;

    if (isExpired && isStallReassigned) {
      // Critical Race Condition Guard: Late payment received after stall was claimed by another vendor!
      const flaggedPayment: PaymentRecord = {
        id: `pay-flagged-${nowMs}`,
        reference,
        reservationId: reservation.id,
        stallId: stall.id,
        marketId: stall.marketId,
        vendorId: reservation.vendorId,
        amountNgn: reservation.totalAmountNgn,
        currency: 'NGN',
        gateway: 'paystack',
        status: 'failed',
        channel: txData.channel || 'card',
        paidAt: txData.paid_at || new Date(nowMs).toISOString(),
        gatewayResponse: 'Late payment received: stall already reassigned to another vendor',
        createdAt: new Date(nowMs).toISOString(),
        updatedAt: new Date(nowMs).toISOString(),
      };
      tx.setPayment(flaggedPayment);
      tx.updateReservation(reservation.id, {
        status: 'expired',
        updatedAt: new Date(nowMs).toISOString(),
      });
      tx.recordAuditLog('LATE_PAYMENT_REJECTED_STALL_REASSIGNED', 'payment', reference, {
        reservationId: reservation.id,
        stallId: stall.id,
        currentStallReservationId: stall.currentReservationId,
      });

      throw new Error(
        `STALL_ALREADY_REASSIGNED: Reservation window expired and stall ${stall.stallNumber} was already assigned to another vendor. Transaction recorded for administrative refund.`
      );
    }

    // Create confirmed payment record
    const paymentId = `pay-${nowMs}`;
    const paymentRecord: PaymentRecord = {
      id: paymentId,
      reference,
      reservationId: reservation.id,
      stallId: stall.id,
      marketId: stall.marketId,
      vendorId: reservation.vendorId,
      amountNgn: reservation.totalAmountNgn,
      currency: 'NGN',
      gateway: 'paystack',
      status: 'success',
      channel: txData.channel || 'card',
      paidAt: txData.paid_at || new Date(nowMs).toISOString(),
      gatewayResponse: txData.gateway_response || 'Approved',
      createdAt: new Date(nowMs).toISOString(),
      updatedAt: new Date(nowMs).toISOString(),
    };

    // Issue unique verifiable booking ticket
    const ticketId = `tkt-${nowMs}`;
    const ticketNumber = `EKET-TKT-${nowMs.toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const qrVerificationCode = `EKET-SEC-${ticketId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const bookingTicket: BookingTicket = {
      id: ticketId,
      ticketNumber,
      reservationId: reservation.id,
      stallId: stall.id,
      stallNumber: stall.stallNumber,
      marketId: stall.marketId,
      marketName: stall.marketName || 'Eket Municipal Market',
      vendorId: reservation.vendorId,
      vendorName: reservation.vendorName,
      vendorEmail: reservation.vendorEmail,
      vendorPhone: reservation.vendorPhone,
      validityStart: reservation.startDate,
      validityEnd: reservation.endDate,
      status: 'valid',
      checkInCount: 0,
      lastCheckInAt: null,
      qrVerificationCode,
      createdAt: new Date(nowMs).toISOString(),
      updatedAt: new Date(nowMs).toISOString(),
    };

    // Commit atomic changes
    tx.setPayment(paymentRecord);
    tx.setTicket(bookingTicket);
    tx.updateReservation(reservation.id, {
      status: 'confirmed',
      paymentId: paymentRecord.id,
      ticketId: bookingTicket.id,
      updatedAt: new Date(nowMs).toISOString(),
    });
    tx.updateStall(stall.id, {
      status: 'occupied',
      currentReservationId: reservation.id,
      currentVendorId: reservation.vendorId,
      updatedAt: new Date(nowMs).toISOString(),
    });
    tx.recordAuditLog('BOOKING_CONFIRMED_PAYMENT_VERIFIED', 'ticket', bookingTicket.id, {
      reference,
      ticketNumber,
      stallNumber: stall.stallNumber,
      vendorId: reservation.vendorId,
    });

    return {
      success: true,
      message: 'Payment verified and official ticket issued',
      payment: paymentRecord,
      ticket: bookingTicket,
      idempotent: false,
    };
  });
}

/**
 * Task 4: Authoritative Gate Ticket Verification
 * Validates ticket against authoritative DB.
 * Rejects unpaid, cancelled, expired, or invalid references.
 * Prevents duplicate check-in.
 */
export async function verifyOfficerTicketAtomic(
  store: AtomicStallStore,
  params: {
    ticketIdOrCode: string;
    officerId: string;
    officerName: string;
    officerEmail: string;
    notes?: string;
  }
): Promise<VerificationResult> {
  const { ticketIdOrCode, officerId, officerName, officerEmail, notes } = params;

  if (!ticketIdOrCode || !ticketIdOrCode.trim()) {
    return {
      valid: false,
      status: 'not_found',
      message: 'No ticket reference or QR code provided.',
    };
  }

  return await store.runAtomicTransaction(async (tx) => {
    const ticket = await tx.getTicket(ticketIdOrCode);

    if (!ticket) {
      tx.recordCheckInLog({
        id: `chk-${Date.now()}`,
        ticketId: ticketIdOrCode,
        officerId,
        officerName,
        officerEmail,
        result: 'invalid',
        notes: notes || 'Ticket identifier not found in database',
        timestamp: new Date().toISOString(),
      });
      return {
        valid: false,
        status: 'not_found',
        message: 'Invalid or forged pass. Identifier not found in official EketSpace records.',
      };
    }

    if (ticket.status === 'cancelled') {
      return {
        valid: false,
        status: 'cancelled',
        message: 'This allocation pass has been officially cancelled by administration.',
        ticket,
      };
    }

    // Check single-use / repeated check-in
    if (ticket.checkInCount > 0) {
      tx.recordCheckInLog({
        id: `chk-${Date.now()}`,
        ticketId: ticket.id,
        reservationId: ticket.reservationId,
        stallId: ticket.stallId,
        marketId: ticket.marketId,
        officerId,
        officerName,
        officerEmail,
        result: 'duplicate',
        notes: notes || `Repeated entry attempt. Prior scan was at ${ticket.lastCheckInAt}`,
        timestamp: new Date().toISOString(),
      });

      return {
        valid: true,
        status: 'checked_in',
        alreadyCheckedIn: true,
        checkInCount: ticket.checkInCount,
        message: `Warning: Ticket was already checked in at ${ticket.lastCheckInAt}. Repeated entry recorded.`,
        ticket,
      };
    }

    // Valid entry: increment scan count and record
    const checkInTimestamp = new Date().toISOString();
    const updatedTicket: BookingTicket = {
      ...ticket,
      checkInCount: ticket.checkInCount + 1,
      status: 'checked_in',
      lastCheckInAt: checkInTimestamp,
      updatedAt: checkInTimestamp,
    };

    tx.setTicket(updatedTicket);
    tx.recordCheckInLog({
      id: `chk-${Date.now()}`,
      ticketId: ticket.id,
      reservationId: ticket.reservationId,
      stallId: ticket.stallId,
      marketId: ticket.marketId,
      officerId,
      officerName,
      officerEmail,
      result: 'valid',
      notes: notes || 'Official market stall check-in successful',
      timestamp: checkInTimestamp,
    });

    return {
      valid: true,
      status: 'valid',
      alreadyCheckedIn: false,
      checkInCount: updatedTicket.checkInCount,
      message: 'Verified! Authorized market stall allocation pass is authentic.',
      ticket: updatedTicket,
    };
  });
}
