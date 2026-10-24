# EketSpace Security Specification & Threat Model

## 1. Data Invariants
1. **RBAC Isolation**: Users cannot assign or escalate their own role (`role: 'admin'`, `role: 'officer'`) in `/users/{userId}`. Admin and officer privileges are strictly validated against authoritative `/admins/{adminId}` and `/officers/{officerId}` documents (or bootstrapped admin email).
2. **PII Isolation**: Users can only read and write their own user profile document `/users/{userId}` where `request.auth.uid == userId`. Blanket listing of users is forbidden for ordinary vendors.
3. **Stall Allocation Integrity**: Only authorized admins or verified server-side transaction routes can mark stalls as `occupied`, `maintenance`, or change prices. Vendors can only reserve through atomic reservation logic.
4. **Reservation Identity Bound**: A reservation's `vendorId` must strictly equal `request.auth.uid`. A vendor cannot create reservations on behalf of another user.
5. **Payment Server Authority**: Payment records in `/payments` and tickets in `/bookingTickets` represent financial and physical rights. They are authoritative system records created or verified server-side or by admins; arbitrary client write or self-confirmation of payment is rejected.
6. **Ticket Immutability & Officer Validation**: Tickets can only be updated for check-in by authorized verification officers or admins (`status: 'checked_in'`).
7. **Audit Trail Append-Only**: Audit logs in `/auditLogs` cannot be modified or deleted by anyone.

## 2. The Dirty Dozen Attack Payloads
1. **Self-Escalation Attack**: Unprivileged vendor writes `{ "role": "admin" }` to their `/users/{uid}` document to gain dashboard administrative privileges.
2. **Orphaned User Impersonation**: Attacker creates `/users/target-uid-123` with payload `{ "id": "target-uid-123", "fullName": "Victim" }` while authenticated as another UID.
3. **Ghost Reservation Attack**: Attacker creates `/reservations/res-99` with `vendorId: "other-user"` and `status: "confirmed"` without completing payment.
4. **Stall Price Tampering**: Attacker issues update to `/stalls/stall-1` setting `monthlyRateNgn: 10` (from 45,000 NGN).
5. **Self-Minted Ticket**: Attacker issues write directly to `/bookingTickets/fake-ticket-1` setting `status: "valid"` with forged `qrVerificationCode`.
6. **Payment Status Forgery**: Attacker sends write to `/payments/pay-123` setting `status: "success"` without Paystack server verification.
7. **Check-In Forgery by Regular Vendor**: Unprivileged user sends update to `/bookingTickets/ticket-1` with `status: "checked_in"`.
8. **Audit Log Tampering / Erasure**: Attacker tries to delete `/auditLogs/log-123` to cover fraudulent transactions.
9. **Denial of Wallet Junk Payload**: Attacker injects a 500KB junk string into `description` or `stallNumber`.
10. **Unauthenticated Market Modification**: Anonymous or unauthenticated actor attempts to deactivate a market in `/markets/market-eket`.
11. **Malicious Reservation Hijacking**: User attempts to update another vendor's reservation status or modify `totalAmountNgn`.
12. **Public User Scraping**: Unauthenticated client attempts blanket collection query on `/users` to harvest vendor phone numbers and emails.

## 3. Defense Implementation
All 12 attacks are explicitly blocked by `firestore.rules` using:
- Master Gate pattern with `request.auth != null`
- Document ID format and size validation with `isValidId()`
- Strict `isAdmin()` and `isOfficer()` checks
- `incoming().vendorId == request.auth.uid` identity bindings
- Type and size boundary guards on all strings
- Default deny catch-all `match /{document=**} { allow read, write: if false; }`
