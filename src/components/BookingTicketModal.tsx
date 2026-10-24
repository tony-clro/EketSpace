import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BookingTicket } from '../types';
import { CheckCircle2, QrCode, Printer, X, ShieldCheck, MapPin, Calendar, Store, User } from 'lucide-react';

interface BookingTicketModalProps {
  ticket: BookingTicket | null;
  onClose: () => void;
}

export const BookingTicketModal: React.FC<BookingTicketModalProps> = ({ ticket, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (ticket) {
      QRCode.toDataURL(ticket.qrVerificationCode || ticket.ticketNumber, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [ticket]);

  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-100/50 dark:from-emerald-900/60 dark:via-slate-900 dark:to-emerald-950/60 p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Official Stall Allocation Ticket</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">Eket Local Government Area Commercial Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close ticket modal"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket Content */}
        <div className="p-6 overflow-y-auto space-y-6 printable-ticket">
          {/* Status Badge & Ticket Ref */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Booking Reference</div>
              <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">{ticket.ticketNumber}</div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-700/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{ticket.status === 'valid' ? 'Verified Allocation' : ticket.status.toUpperCase()}</span>
            </div>
          </div>

          {/* QR Code and Verification Hash */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border border-slate-200 text-slate-900">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Allocation QR Pass" className="w-48 h-48 rounded-lg shadow-sm" />
            ) : (
              <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 rounded-lg">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}
            <div className="mt-3 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Officer Verification Hash</span>
              <p className="font-mono text-xs font-bold text-slate-800 break-all select-all">{ticket.qrVerificationCode}</p>
            </div>
          </div>

          {/* Stall & Market Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Stall Number
              </span>
              <div className="font-bold text-sm text-slate-900 dark:text-white">{ticket.stallNumber}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Market Location
              </span>
              <div className="font-bold text-slate-900 dark:text-white truncate">{ticket.marketName}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Allocated Vendor
              </span>
              <div className="font-medium text-slate-900 dark:text-white truncate">{ticket.vendorName}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{ticket.vendorEmail}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Validity Period
              </span>
              <div className="font-medium text-slate-900 dark:text-white">{ticket.validityStart}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">to {ticket.validityEnd}</div>
            </div>
          </div>

          {/* Verification Notice */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
            <p>
              Present this digital pass or a printed copy to the designated verification officer at the market gate. Single-use scan policy applies upon entry.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
