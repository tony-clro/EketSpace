import React from 'react';
import { Stall, Market } from '../types';
import {
  MapPin,
  Check,
  ArrowLeft,
} from 'lucide-react';

interface StallDetailPageProps {
  stall: Stall;
  market?: Market | null;
  onBack: () => void;
  onReserve: (stall: Stall) => void;
}

export const StallDetailPage: React.FC<StallDetailPageProps> = ({
  stall,
  market,
  onBack,
  onReserve,
}) => {
  const formatNgn = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to stalls catalog</span>
      </button>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-colors">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {stall.category}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">ID: {stall.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Stall {stall.stallNumber}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{market?.name || stall.marketName} • {stall.section}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Monthly Rate</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatNgn(stall.monthlyRateNgn)}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatNgn(stall.dailyRateNgn)} daily equivalent</div>
            </div>
          </div>

          {/* Grid specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-slate-500 dark:text-slate-500 block mb-1">Dimensions</span>
              <strong className="text-slate-900 dark:text-white text-sm">{stall.dimensions}</strong>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-slate-500 dark:text-slate-500 block mb-1">Category</span>
              <strong className="text-slate-900 dark:text-white text-sm capitalize">{stall.category} Space</strong>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-slate-500 dark:text-slate-500 block mb-1">Availability</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm capitalize">{stall.status}</strong>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-slate-500 dark:text-slate-500 block mb-1">Authority</span>
              <strong className="text-slate-900 dark:text-white text-sm">Eket LGA</strong>
            </div>
          </div>

          {/* Features list */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Facility Amenities & Provisions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(stall.features || ['Electrical socket', 'Overhead rain protection', 'Concrete foundation']).map((feat, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 shadow-xs"
                >
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lease terms */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h4 className="font-semibold text-slate-900 dark:text-white">LGA Commercial Regulations</h4>
            <p>
              Allocations are subject to Eket Local Government Area commercial trade guidelines. Stalls are single-lease and non-transferable without written council approval. Fire safety regulations apply in all food court and textile sections.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => onReserve(stall)}
              disabled={stall.status !== 'available'}
              className={`w-full sm:w-auto flex-1 font-bold text-xs py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 ${
                stall.status === 'available'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <span>{stall.status === 'available' ? 'Proceed to Reserve Stall' : 'Stall Currently Not Available'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
