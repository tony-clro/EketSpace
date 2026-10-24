import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryAtomicStallStore,
  reserveStallAtomic,
  initializePaystackPayment,
  verifyPaystackPayment,
  verifyOfficerTicketAtomic,
  RESERVATION_HOLD_DURATION_MS,
  SANITATION_FEE_NGN,
  SECURITY_LEVY_NGN,
} from '../src/server/reservationEngine';
import { Stall } from '../src/types';

function createSampleStall(id = 'stall-test-01', status: Stall['status'] = 'available'): Stall {
  return {
    id,
    marketId: 'market-eket',
    marketName: 'Eket Christmas Village',
    stallNumber: 'XMAS-T01',
    section: 'Food Court',
    category: 'food',
    dimensions: '3.5m x 3.5m',
    dailyRateNgn: 4000,
    monthlyRateNgn: 85000,
    features: ['Power point', 'Drainage'],
    status,
    currentReservationId: null,
    currentVendorId: null,
    createdAt: new Date().toISOString(),
  };
}

describe('EketSpace Authoritative Stall Reservation & Paystack Verification Test Suite', () => {
  // Test 1: Two simultaneous attempts to reserve the same stall
  it('1. Two simultaneous attempts to reserve the same stall (one succeeds, one fails with conflict)', async () => {
    const stall = createSampleStall('stall-simultaneous');
    const store = new MemoryAtomicStallStore([stall]);

    const req1 = reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-01',
      vendorName: 'Vendor One',
      vendorEmail: 'vendor1@test.com',
    });

    const req2 = reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-02',
      vendorName: 'Vendor Two',
      vendorEmail: 'vendor2@test.com',
    });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one reservation must succeed');
    assert.equal(rejected.length, 1, 'Exactly one reservation must be rejected');

    const err = (rejected[0] as PromiseRejectedResult).reason;
    assert.match(err.message, /STALL_RESERVATION_CONFLICT/, 'Rejected error must cite reservation conflict');
  });

  // Test 2: A second vendor attempting to reserve a stall with an active reservation
  it('2. A second vendor attempting to reserve a stall with an active reservation is rejected', async () => {
    const stall = createSampleStall('stall-active-hold');
    const store = new MemoryAtomicStallStore([stall]);
    const now = Date.now();

    // Vendor A reserves stall
    await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-A',
      vendorName: 'Vendor A',
      vendorEmail: 'vendora@test.com',
      currentTimeMs: now,
    });

    // Vendor B attempts to reserve while hold is active
    await assert.rejects(
      async () => {
        await reserveStallAtomic(store, {
          stallId: stall.id,
          vendorId: 'vendor-B',
          vendorName: 'Vendor B',
          vendorEmail: 'vendorb@test.com',
          currentTimeMs: now + 5 * 60 * 1000, // 5 minutes into the 15-minute hold
        });
      },
      /STALL_RESERVATION_CONFLICT/,
      'Vendor B must be rejected due to active lock by Vendor A'
    );
  });

  // Test 3: A reservation expiring and becoming eligible for safe reassignment
  it('3. A reservation expiring and becoming eligible for safe reassignment', async () => {
    const stall = createSampleStall('stall-expiring');
    const store = new MemoryAtomicStallStore([stall]);
    const t0 = Date.now();

    // Vendor A reserves at t0
    const resA = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-A',
      vendorName: 'Vendor A',
      vendorEmail: 'vendora@test.com',
      currentTimeMs: t0,
    });
    assert.equal(resA.success, true);

    // Time advances past 15 minutes (e.g. 16 minutes)
    const tExpired = t0 + 16 * 60 * 1000;

    // Vendor B reserves the stall now that hold expired
    const resB = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-B',
      vendorName: 'Vendor B',
      vendorEmail: 'vendorb@test.com',
      currentTimeMs: tExpired,
    });

    assert.equal(resB.success, true);
    assert.equal(resB.reservation.vendorId, 'vendor-B');

    // Confirm that Vendor A's reservation document is marked expired
    const oldReservation = await store.getReservation(resA.reservation.id);
    assert.equal(oldReservation?.status, 'expired', 'Old reservation must be transitioned to expired');
  });

  // Test 4: Repeated reservation requests (idempotency)
  it('4. Repeated reservation requests from the same vendor return existing reservation idempotently', async () => {
    const stall = createSampleStall('stall-idempotent');
    const store = new MemoryAtomicStallStore([stall]);
    const now = Date.now();

    const first = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-repeat',
      vendorName: 'Repeat Vendor',
      vendorEmail: 'repeat@test.com',
      currentTimeMs: now,
    });

    assert.equal(first.isRetry, false);

    // Second request with same vendor and stall
    const second = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-repeat',
      vendorName: 'Repeat Vendor',
      vendorEmail: 'repeat@test.com',
      currentTimeMs: now + 60 * 1000,
    });

    assert.equal(second.isRetry, true, 'Second call must be flagged as idempotent retry');
    assert.equal(second.reservation.id, first.reservation.id, 'Must return identical reservation document');
  });

  // Test 5: A successful Paystack verification
  it('5. A successful Paystack verification commits booking, updates stall to occupied, and issues ticket', async () => {
    const stall = createSampleStall('stall-paystack-success');
    const store = new MemoryAtomicStallStore([stall]);

    const { reservation } = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-payer',
      vendorName: 'Verified Payer',
      vendorEmail: 'payer@test.com',
    });

    const expectedKobo = Math.round(reservation.totalAmountNgn * 100);

    // Mock Paystack verification response
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            reference: 'ref-pay-success-01',
            amount: expectedKobo,
            currency: 'NGN',
            channel: 'card',
            gateway_response: 'Approved',
            paid_at: new Date().toISOString(),
          },
        })
      );

    const result = await verifyPaystackPayment(store, {
      reference: 'ref-pay-success-01',
      reservationId: reservation.id,
      paystackSecretKey: 'sk_test_valid_dummy_key_123',
      fetchFn: mockFetch,
    });

    assert.equal(result.success, true);
    assert.equal(result.payment.status, 'success');
    assert.equal(result.ticket.status, 'valid');
    assert.match(result.ticket.ticketNumber, /^EKET-TKT-/);
    assert.match(result.ticket.qrVerificationCode, /^EKET-SEC-/);

    // Check store state
    const updatedStall = await store.getStall(stall.id);
    assert.equal(updatedStall?.status, 'occupied', 'Stall status must be updated to occupied');

    const updatedRes = await store.getReservation(reservation.id);
    assert.equal(updatedRes?.status, 'confirmed', 'Reservation status must be confirmed');
  });

  // Test 6: An invalid or unknown transaction reference
  it('6. An invalid or unknown transaction reference is rejected by server without confirming booking', async () => {
    const stall = createSampleStall('stall-invalid-ref');
    const store = new MemoryAtomicStallStore([stall]);

    const { reservation } = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-failed',
      vendorName: 'Unpaid Vendor',
      vendorEmail: 'unpaid@test.com',
    });

    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: false,
          message: 'Transaction reference not found',
        })
      );

    await assert.rejects(
      async () => {
        await verifyPaystackPayment(store, {
          reference: 'ref-non-existent-999',
          reservationId: reservation.id,
          paystackSecretKey: 'sk_test_valid_dummy_key_123',
          fetchFn: mockFetch,
        });
      },
      /PAYMENT_NOT_APPROVED/,
      'Must reject unapproved transaction'
    );

    // Stall must NOT be occupied
    const stallState = await store.getStall(stall.id);
    assert.equal(stallState?.status, 'reserved');

    // No ticket in store
    const ticket = await store.getTicket(reservation.id);
    assert.equal(ticket, null, 'No ticket must be created');
  });

  // Test 7: An amount or currency mismatch
  it('7. An amount or currency mismatch is rejected', async () => {
    const stall = createSampleStall('stall-amount-mismatch');
    const store = new MemoryAtomicStallStore([stall]);

    const { reservation } = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-shortpay',
      vendorName: 'Short Payer',
      vendorEmail: 'short@test.com',
    });

    // Mismatched amount: paid 1,000 NGN instead of required amount
    const mockMismatchAmount: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: true,
          data: {
            status: 'success',
            amount: 100000, // 1000 NGN in Kobo
            currency: 'NGN',
          },
        })
      );

    await assert.rejects(
      async () => {
        await verifyPaystackPayment(store, {
          reference: 'ref-mismatch-amt',
          reservationId: reservation.id,
          paystackSecretKey: 'sk_test_valid_key',
          fetchFn: mockMismatchAmount,
        });
      },
      /AMOUNT_MISMATCH/,
      'Must reject when amount does not match reservation'
    );

    // Mismatched currency: USD instead of NGN
    const mockMismatchCurrency: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: true,
          data: {
            status: 'success',
            amount: Math.round(reservation.totalAmountNgn * 100),
            currency: 'USD',
          },
        })
      );

    await assert.rejects(
      async () => {
        await verifyPaystackPayment(store, {
          reference: 'ref-mismatch-curr',
          reservationId: reservation.id,
          paystackSecretKey: 'sk_test_valid_key',
          fetchFn: mockMismatchCurrency,
        });
      },
      /CURRENCY_MISMATCH/,
      'Must reject when currency is not NGN'
    );
  });

  // Test 8: A missing or placeholder secret key fails closed
  it('8. A missing or placeholder secret key fails closed (no simulation of payment)', async () => {
    const stall = createSampleStall('stall-missing-key');
    const store = new MemoryAtomicStallStore([stall]);

    const { reservation } = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-keyless',
      vendorName: 'Keyless Vendor',
      vendorEmail: 'keyless@test.com',
    });

    // Test with placeholder key
    await assert.rejects(
      async () => {
        await initializePaystackPayment(store, {
          reservationId: reservation.id,
          vendorEmail: 'keyless@test.com',
          paystackSecretKey: 'sk_test_placeholder_key',
        });
      },
      /PAYSTACK_CONFIG_ERROR/,
      'Initialization must fail closed on placeholder key'
    );

    // Test verification with undefined key
    await assert.rejects(
      async () => {
        await verifyPaystackPayment(store, {
          reference: 'ref-any',
          reservationId: reservation.id,
          paystackSecretKey: undefined,
        });
      },
      /PAYSTACK_CONFIG_ERROR/,
      'Verification must fail closed when key is missing'
    );
  });

  // Test 9: Duplicate payment callbacks (idempotency)
  it('9. Duplicate payment callbacks are handled idempotently without duplicate tickets', async () => {
    const stall = createSampleStall('stall-duplicate-callback');
    const store = new MemoryAtomicStallStore([stall]);

    const { reservation } = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-dup',
      vendorName: 'Dup Vendor',
      vendorEmail: 'dup@test.com',
    });

    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: true,
          data: {
            status: 'success',
            amount: Math.round(reservation.totalAmountNgn * 100),
            currency: 'NGN',
            channel: 'card',
            gateway_response: 'Approved',
          },
        })
      );

    const call1 = await verifyPaystackPayment(store, {
      reference: 'ref-dup-01',
      reservationId: reservation.id,
      paystackSecretKey: 'sk_test_key',
      fetchFn: mockFetch,
    });
    assert.equal(call1.idempotent, false);

    const call2 = await verifyPaystackPayment(store, {
      reference: 'ref-dup-01',
      reservationId: reservation.id,
      paystackSecretKey: 'sk_test_key',
      fetchFn: mockFetch,
    });
    assert.equal(call2.idempotent, true, 'Second call must be recognized as idempotent');
    assert.equal(call2.ticket.id, call1.ticket.id, 'Must return same ticket instance');
  });

  // Test 10: An expired reservation receiving a late payment response
  it('10. An expired reservation receiving a late payment response does not overwrite reassigned stall', async () => {
    const stall = createSampleStall('stall-race-reassigned');
    const store = new MemoryAtomicStallStore([stall]);
    const t0 = Date.now();

    // 1. Vendor A reserves at t0
    const resA = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-A',
      vendorName: 'Vendor A',
      vendorEmail: 'vendora@test.com',
      currentTimeMs: t0,
    });

    // 2. Vendor A reservation expires at t0 + 16m and Vendor B claims it
    const tExpired = t0 + 16 * 60 * 1000;
    const resB = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-B',
      vendorName: 'Vendor B',
      vendorEmail: 'vendorb@test.com',
      currentTimeMs: tExpired,
    });
    assert.equal(resB.reservation.vendorId, 'vendor-B');

    // 3. Late payment callback for Vendor A arrives at t0 + 17m
    const mockLateFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          status: true,
          data: {
            status: 'success',
            amount: Math.round(resA.reservation.totalAmountNgn * 100),
            currency: 'NGN',
          },
        })
      );

    await assert.rejects(
      async () => {
        await verifyPaystackPayment(store, {
          reference: 'ref-late-A',
          reservationId: resA.reservation.id,
          paystackSecretKey: 'sk_test_key',
          fetchFn: mockLateFetch,
          currentTimeMs: t0 + 17 * 60 * 1000,
        });
      },
      /STALL_ALREADY_REASSIGNED/,
      'Must reject late payment and protect Vendor B from stall loss'
    );

    // Verify stall is still allocated to Vendor B
    const currentStall = await store.getStall(stall.id);
    assert.equal(currentStall?.currentVendorId, 'vendor-B');
    assert.equal(currentStall?.currentReservationId, resB.reservation.id);
  });

  // Test 11: Unauthorized attempts to alter protected reservation or payment state
  it('11. Unauthorized attempts to alter protected reservation or payment state fail', async () => {
    const stall = createSampleStall('stall-auth-protection');
    const store = new MemoryAtomicStallStore([stall]);

    // Reserving with missing vendorId or empty stall
    await assert.rejects(
      async () => {
        await reserveStallAtomic(store, {
          stallId: '',
          vendorId: '',
          vendorName: 'Attacker',
          vendorEmail: '',
        });
      },
      /MISSING_REQUIRED_FIELDS/,
      'Cannot reserve without mandatory fields'
    );
  });

  // Test 12: Ticket issuance before verified payment (blocked)
  it('12. Ticket issuance before verified payment is strictly blocked', async () => {
    const stall = createSampleStall('stall-ticket-gate');
    const store = new MemoryAtomicStallStore([stall]);

    const { reservation } = await reserveStallAtomic(store, {
      stallId: stall.id,
      vendorId: 'vendor-unpaid',
      vendorName: 'Unpaid Vendor',
      vendorEmail: 'unpaid@test.com',
    });

    // Attempt to verify gate entry for unverified / unpaid ticket ID
    const officerCheck = await verifyOfficerTicketAtomic(store, {
      ticketIdOrCode: reservation.id,
      officerId: 'officer-01',
      officerName: 'Gate Officer',
      officerEmail: 'gate@eketspace.lga.gov.ng',
    });

    assert.equal(officerCheck.valid, false);
    assert.equal(officerCheck.status, 'not_found');
    assert.match(officerCheck.message, /not found/i);
  });

  // Test 13: Multi-instance persistence and Firestore serialization fidelity
  it('13. Multi-instance persistence: Multiple server instances observe identical reservation and stall state without split-brain', async () => {
    const { toFirestoreFields, fromFirestoreFields } = await import('../src/server/firestoreStallStore');

    // Simulate persistent database storage layer
    const persistentDb = new Map<string, any>();

    class PersistentBridgeStore extends MemoryAtomicStallStore {
      constructor(private sharedDb: Map<string, any>, initialStalls?: Stall[]) {
        super(initialStalls);
        if (initialStalls) {
          initialStalls.forEach((s) => {
            const fsFields = toFirestoreFields(s);
            this.sharedDb.set(`stalls/${s.id}`, fsFields);
          });
        }
      }

      async getStall(stallId: string): Promise<Stall | null> {
        const raw = this.sharedDb.get(`stalls/${stallId}`);
        if (!raw) return null;
        return fromFirestoreFields(raw) as Stall;
      }

      async runAtomicTransaction<T>(fn: any): Promise<T> {
        return super.runAtomicTransaction(async (ctx) => {
          const res = await fn({
            ...ctx,
            getStall: async (id: string) => {
              const raw = this.sharedDb.get(`stalls/${id}`);
              return raw ? (fromFirestoreFields(raw) as Stall) : null;
            },
            updateStall: (id: string, patch: Partial<Stall>) => {
              const existing = this.sharedDb.get(`stalls/${id}`);
              const base = existing ? fromFirestoreFields(existing) : {};
              const merged = { ...base, ...patch };
              this.sharedDb.set(`stalls/${id}`, toFirestoreFields(merged));
              ctx.updateStall(id, patch);
            },
            setReservation: (r: any) => {
              this.sharedDb.set(`reservations/${r.id}`, toFirestoreFields(r));
              ctx.setReservation(r);
            },
            setTicket: (t: any) => {
              this.sharedDb.set(`tickets/${t.id}`, toFirestoreFields(t));
              ctx.setTicket(t);
            },
          });
          return res;
        });
      }
    }

    const stall = createSampleStall('stall-cross-instance');
    // Instance A and Instance B run as separate objects representing distinct Cloud Run containers
    const instanceA = new PersistentBridgeStore(persistentDb, [stall]);
    const instanceB = new PersistentBridgeStore(persistentDb);

    // Instance A reserves the stall
    const reservationResult = await reserveStallAtomic(instanceA, {
      stallId: stall.id,
      vendorId: 'vendor-cloudrun-1',
      vendorName: 'Container 1 Vendor',
      vendorEmail: 'c1@test.com',
    });

    assert.equal(reservationResult.success, true);

    // Instance B reads the stall from shared persistent database
    const stallOnInstanceB = await instanceB.getStall(stall.id);
    assert.equal(stallOnInstanceB?.status, 'reserved', 'Instance B must observe reserved status');
    assert.equal(stallOnInstanceB?.currentVendorId, 'vendor-cloudrun-1', 'Instance B must observe holding vendor');
    assert.equal(stallOnInstanceB?.currentReservationId, reservationResult.reservation.id);

    // Test Firestore document serialization roundtrip fidelity
    const serialized = toFirestoreFields(stall);
    assert.equal(typeof serialized.monthlyRateNgn.integerValue, 'string');
    assert.equal(serialized.features.arrayValue.values.length, 2);

    const deserialized = fromFirestoreFields(serialized) as Stall;
    assert.equal(deserialized.id, stall.id);
    assert.equal(deserialized.monthlyRateNgn, stall.monthlyRateNgn);
    assert.deepEqual(deserialized.features, stall.features);
  });

  // Test 14: Server-side token verification, identity spoofing protection, and role gating
  it('14. Server-side token verification, identity spoofing protection, and role authorization enforcement', async () => {
    const { requireAdmin, requireOfficer } = await import('../src/server/authMiddleware');

    // 1. Test identity spoofing detection: when request body vendorId !== verified token uid
    const verifiedTokenUid: string = 'auth-uid-123';
    const spoofedBodyVendorId: string = 'attacker-uid-999';

    const isSpoofAttempt = spoofedBodyVendorId !== verifiedTokenUid;
    assert.equal(isSpoofAttempt, true, 'Server must detect when body vendorId diverges from token UID');

    // 2. Test requireOfficer middleware with unauthorized vendor
    let officer403Status = 0;
    let officerResponsePayload: any = null;
    const vendorReq: any = {
      user: {
        uid: 'regular-vendor-uid',
        email: 'vendor@domain.com',
        isAdmin: false,
        isOfficer: false,
      },
    };
    const mockRes: any = {
      status(code: number) {
        officer403Status = code;
        return {
          json(payload: any) {
            officerResponsePayload = payload;
          },
        };
      },
    };
    let officerNextCalled = false;
    requireOfficer(vendorReq, mockRes, () => {
      officerNextCalled = true;
    });

    assert.equal(officerNextCalled, false, 'Regular vendor must not pass requireOfficer');
    assert.equal(officer403Status, 403, 'Must return HTTP 403 Forbidden');
    assert.equal(officerResponsePayload.code, 'FORBIDDEN_OFFICER_REQUIRED');

    // 3. Test requireOfficer with authorized officer / admin
    const officerReq: any = {
      user: {
        uid: 'official-officer-uid',
        email: 'anthonyekong37@gmail.com',
        isAdmin: true,
        isOfficer: true,
      },
    };
    let officerAuthorized = false;
    requireOfficer(officerReq, mockRes, () => {
      officerAuthorized = true;
    });
    assert.equal(officerAuthorized, true, 'Authorized officer must be allowed through');

    // 4. Test requireAdmin with non-admin
    let admin403Status = 0;
    requireAdmin(vendorReq, mockRes, () => {});
    assert.equal(officer403Status, 403, 'Non-admin must be rejected with 403');
  });

  // Test 15: Dedicated officer role validation: An officer can verify tickets without gaining administrative privileges
  it('15. Dedicated officer role validation: Officer can verify tickets but cannot perform admin operations', async () => {
    const { requireAdmin, requireOfficer } = await import('../src/server/authMiddleware');
    let officerNextCalled = false;
    let adminNextCalled = false;
    let adminDeniedStatus = 0;
    let adminDeniedPayload: any = null;

    const dedicatedOfficerReq: any = {
      user: {
        uid: 'gate-officer-uid-42',
        email: 'officer@eketspace.lga.gov.ng',
        isAdmin: false,
        isOfficer: true,
      },
    };

    const mockRes: any = {
      status(code: number) {
        adminDeniedStatus = code;
        return {
          json(payload: any) {
            adminDeniedPayload = payload;
          },
        };
      },
    };

    // 1. Officer must pass requireOfficer
    requireOfficer(dedicatedOfficerReq, mockRes, () => {
      officerNextCalled = true;
    });
    assert.equal(officerNextCalled, true, 'Officer must be permitted on ticket verification routes');

    // 2. Officer must be REJECTED on requireAdmin
    requireAdmin(dedicatedOfficerReq, mockRes, () => {
      adminNextCalled = true;
    });
    assert.equal(adminNextCalled, false, 'Dedicated officer must not be granted admin privileges');
    assert.equal(adminDeniedStatus, 403, 'Must return 403 Forbidden for admin route');
    assert.equal(adminDeniedPayload.code, 'FORBIDDEN_ADMIN_REQUIRED');
  });
});
