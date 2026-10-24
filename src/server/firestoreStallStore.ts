import { Stall, Reservation, BookingTicket, PaymentRecord, CheckInLog, AuditLog } from '../types';
import { AtomicStallStore, AtomicTransactionContext } from './reservationEngine';
import firebaseConfig from '../../firebase-applet-config.json';

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(val),
      },
    };
  }
  return { stringValue: String(val) };
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  }
  return fields;
}

export function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields || {})) {
    obj[key] = fromFirestoreValue(val);
  }
  return obj;
}

export class FirestoreAtomicStallStore implements AtomicStallStore {
  private projectId: string;
  private databaseId: string;
  private apiKey: string;
  private baseUrl: string;
  private defaultAuthToken?: string;

  constructor(options?: {
    projectId?: string;
    databaseId?: string;
    apiKey?: string;
    authToken?: string;
  }) {
    this.projectId = options?.projectId || firebaseConfig.projectId || 'practical-canopy-zsmzh';
    this.databaseId = options?.databaseId || (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-eketspace-f2d1e805-ec7a-4ba3-96a3-1c6621ae50bb';
    this.apiKey = options?.apiKey || firebaseConfig.apiKey || 'AIzaSyBjVPVY8xslUvBkIZ3Iu-OsndJkxtEAAko';
    this.defaultAuthToken = options?.authToken;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents`;
  }

  public withAuth(token: string): FirestoreAtomicStallStore {
    return new FirestoreAtomicStallStore({
      projectId: this.projectId,
      databaseId: this.databaseId,
      apiKey: this.apiKey,
      authToken: token,
    });
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const activeToken = token || this.defaultAuthToken;
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  async getStall(stallId: string, transactionId?: string): Promise<Stall | null> {
    const txParam = transactionId ? `&transaction=${encodeURIComponent(transactionId)}` : '';
    const url = `${this.baseUrl}/stalls/${encodeURIComponent(stallId)}?key=${this.apiKey}${txParam}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Firestore getStall error: ${res.status} ${JSON.stringify(err)}`);
    }

    const doc = await res.json();
    return fromFirestoreFields(doc.fields) as Stall;
  }

  async getReservation(reservationId: string, transactionId?: string): Promise<Reservation | null> {
    const txParam = transactionId ? `&transaction=${encodeURIComponent(transactionId)}` : '';
    const url = `${this.baseUrl}/reservations/${encodeURIComponent(reservationId)}?key=${this.apiKey}${txParam}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Firestore getReservation error: ${res.status} ${JSON.stringify(err)}`);
    }

    const doc = await res.json();
    return fromFirestoreFields(doc.fields) as Reservation;
  }

  async getReservationByStall(stallId: string, transactionId?: string): Promise<Reservation | null> {
    const url = `${this.baseUrl}:runQuery?key=${this.apiKey}`;
    const structuredQuery: any = {
      from: [{ collectionId: 'reservations' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'stallId' },
          op: 'EQUAL',
          value: { stringValue: stallId },
        },
      },
    };

    const body: any = { structuredQuery };
    if (transactionId) {
      body.transaction = transactionId;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Firestore getReservationByStall error: ${res.status} ${JSON.stringify(err)}`);
    }

    const list = await res.json();
    for (const item of list) {
      if (item.document?.fields) {
        const r = fromFirestoreFields(item.document.fields) as Reservation;
        if (r.status === 'pending_payment' || r.status === 'confirmed') {
          return r;
        }
      }
    }
    return null;
  }

  async getPaymentByReference(reference: string, transactionId?: string): Promise<PaymentRecord | null> {
    const txParam = transactionId ? `&transaction=${encodeURIComponent(transactionId)}` : '';
    const url = `${this.baseUrl}/payments/${encodeURIComponent(reference)}?key=${this.apiKey}${txParam}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (res.status === 200) {
      const doc = await res.json();
      return fromFirestoreFields(doc.fields) as PaymentRecord;
    }

    // Secondary fallback: query by reference field
    const qUrl = `${this.baseUrl}:runQuery?key=${this.apiKey}`;
    const structuredQuery: any = {
      from: [{ collectionId: 'payments' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'reference' },
          op: 'EQUAL',
          value: { stringValue: reference },
        },
      },
    };

    const qBody: any = { structuredQuery };
    if (transactionId) qBody.transaction = transactionId;

    const qRes = await fetch(qUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(qBody),
    });

    if (qRes.ok) {
      const list = await qRes.json();
      for (const item of list) {
        if (item.document?.fields) {
          return fromFirestoreFields(item.document.fields) as PaymentRecord;
        }
      }
    }

    return null;
  }

  async getTicket(ticketIdOrCode: string, transactionId?: string): Promise<BookingTicket | null> {
    const clean = ticketIdOrCode.trim();
    const txParam = transactionId ? `&transaction=${encodeURIComponent(transactionId)}` : '';

    // 1. Direct fetch by ID
    const url = `${this.baseUrl}/bookingTickets/${encodeURIComponent(clean)}?key=${this.apiKey}${txParam}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (res.status === 200) {
      const doc = await res.json();
      return fromFirestoreFields(doc.fields) as BookingTicket;
    }

    // 2. Query ticketNumber, qrVerificationCode, or reservationId
    const qUrl = `${this.baseUrl}:runQuery?key=${this.apiKey}`;
    const filters = ['ticketNumber', 'qrVerificationCode', 'reservationId'];

    for (const fieldPath of filters) {
      const body: any = {
        structuredQuery: {
          from: [{ collectionId: 'bookingTickets' }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: { stringValue: clean },
            },
          },
        },
      };
      if (transactionId) body.transaction = transactionId;

      const qRes = await fetch(qUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (qRes.ok) {
        const list = await qRes.json();
        for (const item of list) {
          if (item.document?.fields) {
            return fromFirestoreFields(item.document.fields) as BookingTicket;
          }
        }
      }
    }

    return null;
  }

  async getAllTickets(): Promise<BookingTicket[]> {
    const url = `${this.baseUrl}:runQuery?key=${this.apiKey}`;
    const structuredQuery = {
      from: [{ collectionId: 'bookingTickets' }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ structuredQuery }),
    });

    if (!res.ok) return [];

    const list = await res.json();
    const tickets: BookingTicket[] = [];
    for (const item of list) {
      if (item.document?.fields) {
        tickets.push(fromFirestoreFields(item.document.fields) as BookingTicket);
      }
    }
    return tickets;
  }

  /**
   * Authoritative cross-instance atomic transaction using Cloud Firestore REST API.
   * If any document read during the transaction was modified concurrently, Firestore
   * rejects the commit and this method retries with exponential backoff.
   */
  async runAtomicTransaction<T>(
    updateFunction: (transaction: AtomicTransactionContext) => Promise<T>,
    token?: string
  ): Promise<T> {
    const activeToken = token || this.defaultAuthToken;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 1. Begin read-write transaction
        const beginUrl = `${this.baseUrl}:beginTransaction?key=${this.apiKey}`;
        const beginRes = await fetch(beginUrl, {
          method: 'POST',
          headers: this.getHeaders(activeToken),
          body: JSON.stringify({ options: { readWrite: {} } }),
        });

        if (!beginRes.ok) {
          const err = await beginRes.json().catch(() => ({}));
          throw new Error(`beginTransaction failed: ${beginRes.status} ${JSON.stringify(err)}`);
        }

        const beginData = await beginRes.json();
        const txId = beginData.transaction;
        if (!txId) {
          throw new Error('beginTransaction returned empty transaction token');
        }

        // 2. Stage writes inside transaction context
        const writes: any[] = [];
        const stagedStallUpdates = new Map<string, Partial<Stall>>();
        const stagedReservations = new Map<string, Reservation>();
        const stagedReservationUpdates = new Map<string, Partial<Reservation>>();
        const stagedPayments = new Map<string, PaymentRecord>();
        const stagedTickets = new Map<string, BookingTicket>();
        const stagedAuditLogs: any[] = [];
        const stagedCheckIns: any[] = [];

        const context: AtomicTransactionContext = {
          getStall: (stallId: string) => this.getStall(stallId, txId),
          getReservation: (reservationId: string) => this.getReservation(reservationId, txId),
          getReservationByStall: (stallId: string) => this.getReservationByStall(stallId, txId),
          getPaymentByReference: (reference: string) => this.getPaymentByReference(reference, txId),
          getTicket: (ticketIdOrCode: string) => this.getTicket(ticketIdOrCode, txId),

          updateStall: (stallId: string, data: Partial<Stall>) => {
            stagedStallUpdates.set(stallId, { ...(stagedStallUpdates.get(stallId) || {}), ...data });
          },
          setReservation: (reservation: Reservation) => {
            stagedReservations.set(reservation.id, reservation);
          },
          updateReservation: (reservationId: string, data: Partial<Reservation>) => {
            stagedReservationUpdates.set(reservationId, {
              ...(stagedReservationUpdates.get(reservationId) || {}),
              ...data,
            });
          },
          setPayment: (payment: PaymentRecord) => {
            stagedPayments.set(payment.reference, payment);
          },
          setTicket: (ticket: BookingTicket) => {
            stagedTickets.set(ticket.id, ticket);
          },
          recordAuditLog: (action: string, targetType: string, targetId: string, details?: any) => {
            stagedAuditLogs.push({
              id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              action,
              targetType,
              targetId,
              details,
              timestamp: new Date().toISOString(),
            });
          },
          recordCheckInLog: (log: any) => {
            stagedCheckIns.push(log);
          },
        };

        // 3. Execute caller update logic
        const result = await updateFunction(context);

        // 4. Assemble Firestore commit writes
        // Stall updates
        for (const [stallId, patch] of stagedStallUpdates.entries()) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/stalls/${encodeURIComponent(stallId)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(patch),
            },
            updateMask: {
              fieldPaths: Object.keys(patch),
            },
          });
        }

        // Reservations (new)
        for (const [resId, resDoc] of stagedReservations.entries()) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/reservations/${encodeURIComponent(resId)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(resDoc),
            },
          });
        }

        // Reservation updates
        for (const [resId, patch] of stagedReservationUpdates.entries()) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/reservations/${encodeURIComponent(resId)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(patch),
            },
            updateMask: {
              fieldPaths: Object.keys(patch),
            },
          });
        }

        // Payments
        for (const [payId, paymentDoc] of stagedPayments.entries()) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/payments/${encodeURIComponent(payId)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(paymentDoc),
            },
          });
        }

        // Tickets
        for (const [tktId, ticketDoc] of stagedTickets.entries()) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/bookingTickets/${encodeURIComponent(tktId)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(ticketDoc),
            },
          });
        }

        // CheckIns
        for (const chk of stagedCheckIns) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/checkIns/${encodeURIComponent(chk.id)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(chk),
            },
          });
        }

        // AuditLogs
        for (const audit of stagedAuditLogs) {
          const docPath = `projects/${this.projectId}/databases/${this.databaseId}/documents/auditLogs/${encodeURIComponent(audit.id)}`;
          writes.push({
            update: {
              name: docPath,
              fields: toFirestoreFields(audit),
            },
          });
        }

        // 5. Commit atomic transaction
        const commitUrl = `${this.baseUrl}:commit?key=${this.apiKey}`;
        const commitRes = await fetch(commitUrl, {
          method: 'POST',
          headers: this.getHeaders(activeToken),
          body: JSON.stringify({
            transaction: txId,
            writes,
          }),
        });

        if (!commitRes.ok) {
          const commitErr = await commitRes.json().catch(() => ({}));
          const status = commitRes.status;
          // If transaction aborted by Firestore concurrency conflict, retry
          if ((status === 409 || status === 400) && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 50));
            continue;
          }
          throw new Error(`Firestore transaction commit failed: ${status} ${JSON.stringify(commitErr)}`);
        }

        return result;
      } catch (err: any) {
        if (attempt >= maxRetries) {
          throw err;
        }
      }
    }

    throw new Error('Transaction failed after maximum retries');
  }
}
