import React from 'react';
import { Stall } from '../types';
import { Store, CheckCircle, Clock, Ban, Wrench, Check } from 'lucide-react';

interface StallCardProps {
  stall: Stall;
  onReserve: (stall: Stall) => void;
  onViewDetails?: (stall: Stall) => void;
}

export const StallCard: React.FC<StallCardProps> = ({ stall, onReserve, onViewDetails }) => {
  const getStatusBadge = (status: Stall['status']) => {
    switch (status) {
      case 'available':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Available
          </span>
        );
      case 'reserved':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Pending Lock
          </span>
        );
      case 'occupied':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            <Ban className="w-3 h-3 text-slate-500" /> Allocated
          </span>
        );
      case 'maintenance':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
            <Wrench className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Maintenance
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getCategoryColor = (cat: Stall['category']) => {
    switch (cat) {
      case 'premium':
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80';
      case 'food':
        return 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80';
      case 'lockup':
        return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80';
      case 'open':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80';
      default:
        return 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const formatNgn = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl overflow-hidden p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getCategoryColor(stall.category)}`}>
            {stall.category}
          </span>
          {getStatusBadge(stall.status)}
        </div>

        {/* Title & Section */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
              {stall.stallNumber}
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{stall.section}</p>
        </div>

        {/* Dimensions & Market */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 space-y-1">
          {stall.marketName && (
            <p className="text-slate-700 dark:text-slate-300 font-medium truncate">{stall.marketName}</p>
          )}
          <p className="text-slate-500 dark:text-slate-400">Dimensions: {stall.dimensions}</p>
        </div>

        {/* Features */}
        {stall.features && stall.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {stall.features.slice(0, 3).map((feat, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1"
              >
                <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate max-w-[130px]">{feat}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pricing & CTA */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-medium">Monthly Rate</div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">{formatNgn(stall.monthlyRateNgn)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-medium">Daily Rate</div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatNgn(stall.dailyRateNgn)}/day</div>
          </div>
        </div>

        <div className="flex gap-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(stall)}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs py-2 px-3 rounded-xl font-medium transition"
            >
              Details
            </button>
          )}
          <button
            onClick={() => onReserve(stall)}
            disabled={stall.status !== 'available'}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              stall.status === 'available'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{stall.status === 'available' ? 'Reserve Now' : 'Not Available'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
