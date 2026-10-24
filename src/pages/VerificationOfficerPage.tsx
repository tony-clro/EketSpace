import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { verifyOfficerTicket } from '../services/api';
import { VerificationResult, BookingTicket } from '../types';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Loader2,
  ListCheck,
} from 'lucide-react';

interface VerificationOfficerPageProps {
  recentTickets: BookingTicket[];
}

export const VerificationOfficerPage: React.FC<VerificationOfficerPageProps> = ({ recentTickets }) => {
  const { currentUser, profile } = useAuth();
  const [ticketInput, setTicketInput] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<Array<VerificationResult & { timestamp: string; query: string }>>([]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || ticketInput).trim();
    if (!code) return;

    setVerifying(true);
    setResult(null);

    try {
      const res = await verifyOfficerTicket({
        ticketIdOrCode: code,
        officerId: currentUser?.uid || 'officer-dev',
        officerName: profile?.fullName || currentUser?.displayName || 'Market Gate Officer',
        officerEmail: currentUser?.email || 'officer@eketspace.lga.gov.ng',
        notes: officerNotes || 'Gate verification check',
      });

      setResult(res);
      setVerificationHistory((prev) => [
        { ...res, timestamp: new Date().toLocaleTimeString(), query: code },
        ...prev.slice(0, 9),
      ]);
      setTicketInput('');
    } catch (err: any) {
      setResult({
        valid: false,
        status: 'not_found',
        message: err.message || 'Verification service error.',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Market Gate Ticket Verification Terminal
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative QR scan terminal for Eket Christmas Village and Municipal Market entry control.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 px-3.5 py-2 rounded-2xl text-xs shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-slate-600 dark:text-slate-300">
            Officer: <strong className="text-slate-900 dark:text-white">{profile?.fullName || 'Active Officer'}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Verification Input & Live Terminal */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-xs transition-colors">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Ticket Authentication Console</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter the cryptographic QR hash or booking reference printed on the vendor's pass.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Booking Reference or QR Code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="e.g. EKET-TKT-102948-201 or EKET-SEC-..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gate Officer Notes (Optional)
              </label>
              <input
                type="text"
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="e.g. Vehicle entered gate 2 with merchandise"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={verifying || !ticketInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating against Server Authority...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Pass & Record Entry</span>
                </>
              )}
            </button>
          </form>

          {/* Verification Result Banner */}
          {result && (
            <div
              className={`p-5 rounded-2xl border transition animate-in fade-in space-y-4 ${
                result.valid && !result.alreadyCheckedIn
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-200'
                  : result.alreadyCheckedIn
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/80 text-amber-800 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-700/80 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.valid && !result.alreadyCheckedIn ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : result.alreadyCheckedIn ? (
                  <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {result.valid && !result.alreadyCheckedIn
                      ? 'PASS VERIFIED: VALID ALLOCATION'
                      : result.alreadyCheckedIn
                      ? 'WARNING: DUPLICATE CHECK-IN DETECTED'
                      : 'VERIFICATION REJECTED'}
                  </h3>
                  <p className="text-xs opacity-90">{result.message}</p>
                </div>
              </div>

              {result.ticket && (
                <div className="p-4 bg-white dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 grid grid-cols-2 gap-3 shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Allocated Stall</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{result.ticket.stallNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Market</span>
                    <strong className="text-slate-900 dark:text-white truncate block">{result.ticket.marketName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Vendor Name</span>
                    <span className="text-slate-800 dark:text-slate-200">{result.ticket.vendorName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Scan Count</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{result.ticket.checkInCount} scan(s)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Test Codes Helper for Demo */}
          {recentTickets.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                Quick Test: Recently Issued Passes
              </span>
              <div className="flex flex-wrap gap-2">
                {recentTickets.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleVerify(t.qrVerificationCode || t.ticketNumber)}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg font-mono text-[11px] transition border border-slate-300 dark:border-slate-700 shadow-xs"
                  >
                    {t.stallNumber} ({t.ticketNumber})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Terminal Scan Log Stream */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xs transition-colors">
          <div className="flex items-center gap-2">
            <ListCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Terminal Verification Audit</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time authoritative log of ticket scans processed during this shift.
          </p>

          <div className="space-y-3">
            {verificationHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                    {item.query}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.timestamp}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.valid && !item.alreadyCheckedIn
                        ? 'bg-emerald-500'
                        : item.alreadyCheckedIn
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.status.toUpperCase()}</span>
                  {item.ticket && (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      • Stall {item.ticket.stallNumber}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {verificationHistory.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                No scan events processed yet during this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
