import React, { useState, useEffect } from 'react';
import { Stall, Market, BookingTicket, Reservation } from '../types';
import { useAuth } from '../context/AuthContext';
import { createAtomicReservation, initializePayment, verifyPayment, fetchAppConfig, AppConfig } from '../services/api';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Info,
} from 'lucide-react';

interface CheckoutPageProps {
  stall: Stall;
  market?: Market | null;
  onBack: () => void;
  onPaymentSuccess: (ticket: BookingTicket) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  stall,
  market,
  onBack,
  onPaymentSuccess,
}) => {
  const { currentUser, profile } = useAuth();

  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [vendorName, setVendorName] = useState<string>(profile?.fullName || '');
  const [vendorEmail, setVendorEmail] = useState<string>(profile?.email || currentUser?.email || '');
  const [vendorPhone, setVendorPhone] = useState<string>(profile?.phone || '');
  const [businessName, setBusinessName] = useState<string>(profile?.businessName || '');

  // Authoritative server reservation state
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [lockingReservation, setLockingReservation] = useState<boolean>(true);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(15 * 60);
  const [reservationExpired, setReservationExpired] = useState<boolean>(false);

  // Payment process state
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [initializing, setInitializing] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [activeReference, setActiveReference] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  // Fetch app configuration (check if Paystack is configured)
  useEffect(() => {
    fetchAppConfig().then((cfg) => setAppConfig(cfg));
  }, []);

  // Establish authoritative atomic reservation lock on server
  useEffect(() => {
    let isCancelled = false;

    async function establishLock() {
      if (!currentUser) {
        setLockingReservation(false);
        return;
      }

      setLockingReservation(true);
      setError(null);

      try {
        const result = await createAtomicReservation({
          stallId: stall.id,
          vendorId: currentUser.uid,
          vendorName: vendorName || profile?.fullName || 'Registered Vendor',
          vendorEmail: vendorEmail || currentUser.email || '',
          vendorPhone: vendorPhone || profile?.phone || '',
          durationMonths,
          existingReservationId: activeReservation?.id,
        });

        if (!isCancelled) {
          setActiveReservation(result.reservation);

          // Calculate remaining seconds from authoritative expiresAt
          const diffMs = new Date(result.reservation.expiresAt).getTime() - Date.now();
          const remainingSec = Math.max(0, Math.floor(diffMs / 1000));
          setTimeLeftSeconds(remainingSec);
          setReservationExpired(remainingSec <= 0);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to establish reservation lock on this stall.');
        }
      } finally {
        if (!isCancelled) {
          setLockingReservation(false);
        }
      }
    }

    establishLock();

    return () => {
      isCancelled = true;
    };
  }, [stall.id, currentUser, durationMonths]);

  // Countdown timer for 15-minute hold
  useEffect(() => {
    if (reservationExpired || lockingReservation) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          setReservationExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [reservationExpired, lockingReservation]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatNgn = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  // Authoritatively computed amounts
  const baseRentNgn = stall.monthlyRateNgn * durationMonths;
  const sanitationFeeNgn = activeReservation?.sanitationFeeNgn ?? 2500;
  const securityLevyNgn = activeReservation?.securityLevyNgn ?? 1500;
  const totalAmountNgn = activeReservation?.totalAmountNgn ?? (baseRentNgn + sanitationFeeNgn + securityLevyNgn);

  // 1. Initialize Paystack payment
  const handleStartPaystackPayment = async () => {
    if (!activeReservation) {
      setError('Active stall reservation is required before initializing payment.');
      return;
    }

    if (reservationExpired) {
      setError('Reservation lock has expired. Return to stalls directory to reserve again.');
      return;
    }

    setInitializing(true);
    setError(null);
    setConfigNotice(null);

    try {
      const initResult = await initializePayment({
        reservationId: activeReservation.id,
        vendorEmail: vendorEmail || currentUser?.email || 'vendor@eketspace.lga.gov.ng',
      });

      setActiveReference(initResult.reference);
      setAuthorizationUrl(initResult.authorizationUrl || null);

      if (initResult.authorizationUrl) {
        window.open(initResult.authorizationUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      const msg = err.message || 'Payment initialization failed.';
      if (msg.includes('PAYSTACK_CONFIG_ERROR') || msg.includes('PAYSTACK_NOT_CONFIGURED')) {
        setConfigNotice(
          'Paystack Test Secret Key is not configured on the server. To test live payments, provide PAYSTACK_SECRET_KEY in server environment. In development mode without credentials, simulation is blocked by security policy.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setInitializing(false);
    }
  };

  // 2. Authoritative Server Verification
  const handleVerifyCompletedPayment = async () => {
    if (!activeReference || !activeReservation) {
      setError('No active Paystack transaction to verify.');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await verifyPayment({
        reference: activeReference,
        reservationId: activeReservation.id,
      });

      if (result.success && result.ticket) {
        onPaymentSuccess(result.ticket);
      } else {
        throw new Error(result.message || 'Payment verification not approved.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Payment verification failed at gateway.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 transition-colors">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to stall directory</span>
      </button>

      {/* Reservation Lock Bar */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
          reservationExpired
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            : lockingReservation
            ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {lockingReservation ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Clock className={`w-4 h-4 ${reservationExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
          )}
          <div>
            <div className="font-bold text-xs">
              {lockingReservation
                ? 'Acquiring Authoritative Atomic Stall Lock...'
                : reservationExpired
                ? 'Stall Reservation Lock Expired'
                : 'Stall Exclusively Reserved (Server Atomic Lock)'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {lockingReservation
                ? 'Verifying availability and active holds in database...'
                : reservationExpired
                ? 'The 15-minute hold elapsed. Return to directory to lock again.'
                : `Ref: ${activeReservation?.reservationNumber || 'Securing'} • Guaranteed exclusively for 15 minutes`}
            </div>
          </div>
        </div>
        {!lockingReservation && (
          <div className="font-mono font-bold text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            {formatTimer(timeLeftSeconds)}
          </div>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Booking Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Paystack configuration notice if secret key is missing */}
      {configNotice && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/80 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Paystack Gateway Configuration Required</h4>
              <p className="text-amber-800 dark:text-amber-200/90 leading-relaxed mt-1 text-[11px]">{configNotice}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1 shadow-xs">
            <div className="text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wider">Required Environment Configuration</div>
            <div>PAYSTACK_SECRET_KEY="sk_test_..."</div>
            <div>VITE_PAYSTACK_PUBLIC_KEY="pk_test_..."</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Vendor & Reservation Info Form */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-xs transition-colors">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vendor Allocation Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authoritative reservation verified and held exclusively under your name.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Duration of Allocation</label>
              <select
                value={durationMonths}
                disabled={lockingReservation || !!activeReference}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                <option value={1}>1 Month (Standard Period)</option>
                <option value={3}>3 Months (Quarterly Rate)</option>
                <option value={6}>6 Months (Semi-Annual)</option>
                <option value={12}>12 Months (Full Year)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor legal name"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Business / Trading Title</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Eket Fresh Foods & Spices"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email (For Ticket Delivery)</label>
                <input
                  type="email"
                  required
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Paystack Secured Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Authoritative Paystack Verification (Nigerian Naira NGN)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              Every transaction is strictly verified server-to-server with Paystack. Client confirmations, screenshots, and simulated receipts are never trusted as proof of payment.
            </p>
          </div>
        </div>

        {/* Right: Stall Summary & Payment Action */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-xs sticky top-24 transition-colors">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Allocation Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Eket Local Government Area Commercial Service</p>
          </div>

          {/* Stall mini card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{stall.stallNumber}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {stall.category}
              </span>
            </div>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">{market?.name || stall.marketName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {stall.section} • Dimensions: {stall.dimensions}
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Monthly Rent ({durationMonths} mo)</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatNgn(baseRentNgn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">LGA Sanitation & Waste Fee</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatNgn(sanitationFeeNgn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Market Security Levy</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatNgn(securityLevyNgn)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
              <span>Total Payable</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-base">{formatNgn(totalAmountNgn)}</span>
            </div>
          </div>

          {/* Checkout CTAs */}
          {!activeReference ? (
            <button
              onClick={handleStartPaystackPayment}
              disabled={initializing || lockingReservation || reservationExpired}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition"
            >
              {initializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Paystack Gateway...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Initialize Paystack Payment ({formatNgn(totalAmountNgn)})</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Active Transaction Reference</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">{activeReference}</span>
              </div>

              {authorizationUrl && (
                <a
                  href={authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition border border-slate-300 dark:border-slate-700 shadow-xs"
                >
                  <span>Open Paystack Payment Window</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                onClick={handleVerifyCompletedPayment}
                disabled={verifying}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with Paystack Server...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Payment & Issue QR Ticket</span>
                  </>
                )}
              </button>
            </div>
          )}

          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
            Official Eket LGA ticket issued exclusively after server-verified Paystack authorization.
          </p>
        </div>
      </div>
    </div>
  );
};
