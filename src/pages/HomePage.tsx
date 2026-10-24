import React from 'react';
import { Market, Stall } from '../types';
import { GoogleMarketMap } from '../components/GoogleMarketMap';
import { StallCard } from '../components/StallCard';
import {
  MapPin,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface HomePageProps {
  markets: Market[];
  stalls: Stall[];
  onSelectMarket: (market: Market) => void;
  onReserveStall: (stall: Stall) => void;
  onBrowseMarkets: () => void;
  onBrowseStalls: () => void;
  onOpenAiGuide: () => void;
  onOpenAuth: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  markets,
  stalls,
  onSelectMarket,
  onReserveStall,
  onBrowseMarkets,
  onBrowseStalls,
  onOpenAiGuide,
  onOpenAuth,
}) => {
  const availableStalls = stalls.filter((s) => s.status === 'available');

  return (
    <div className="space-y-16 pb-16 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 md:pt-16 pb-12 bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Official Eket LGA Market Allocation Platform • Akwa Ibom</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Transparent stall reservations for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                  Eket Christmas Village
                </span>{' '}
                & Municipal Markets.
              </h1>

              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Eliminate middlemen and manual disputes. Reserve verified market stalls in Eket remotely, pay securely in Nigerian Naira (₦) with Paystack, and enter with digital QR tickets.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onBrowseStalls}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition hover:scale-[1.02]"
                >
                  <span>Explore Available Stalls</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenAiGuide}
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm px-5 py-3 rounded-2xl flex items-center gap-2 transition shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Ask AI Guide</span>
                </button>
              </div>

              {/* Key Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800/80 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{availableStalls.length}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Stalls Open Today</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{markets.length}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Markets</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">100%</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Verified Allocation</div>
                </div>
              </div>
            </div>

            {/* Right Column Interactive Map Card */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xl backdrop-blur-sm transition-colors">
                <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Eket LGA Market Locator</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Google Maps Grounded</span>
                </div>
                <div className="rounded-2xl overflow-hidden h-[340px]">
                  <GoogleMarketMap markets={markets} onSelectMarket={onSelectMarket} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">
            Verifiable 4-Step Process
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            How Stall Allocation Works on EketSpace
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Built in compliance with Eket Local Government revenue guidelines and modern anti-fraud security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black mb-4">
              1
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Discover & Choose</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Browse stalls across Eket Christmas Village, China Market, or Udua Ntak Inyang with transparent dimensions and fees.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black mb-4">
              2
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Atomic Reservation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When you select a stall, our server creates a temporary 15-minute lock preventing duplicate or conflicting bookings.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black mb-4">
              3
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Paystack Checkout</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Pay via card, USSD, or Nigerian bank transfer in Naira. The server verifies receipt before issuing allocation rights.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black mb-4">
              4
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Cryptographic QR Pass</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Receive your tamper-proof ticket with QR code. Present it at the gate to market verification officers for scan-in.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Markets Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Configured Eket LGA Markets</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Discover trade venues, operating hours, and stall categories</p>
          </div>
          <button
            onClick={onBrowseMarkets}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition"
          >
            <span>View All Markets</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {markets.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMarket(m)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden cursor-pointer transition group shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-3 left-3 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                    {m.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition line-clamp-1">
                    {m.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    {m.address}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {m.availableStalls} stalls open
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">{m.code}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Stalls Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Recently Available Stalls</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Lock-up shops, open sheds, food stalls, and boutique kiosks</p>
          </div>
          <button
            onClick={onBrowseStalls}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition"
          >
            <span>Explore All Stalls</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableStalls.slice(0, 4).map((stall) => (
            <StallCard key={stall.id} stall={stall} onReserve={onReserveStall} />
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/60 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Ready to Secure Your Commercial Space in Eket?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Join hundreds of registered vendors at Eket Christmas Village and commercial centers. Fast, transparent, and direct to LGA administration.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={onBrowseStalls}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm px-6 py-3 rounded-2xl shadow-lg transition"
              >
                Browse Stalls & Reserve
              </button>
              <button
                onClick={onOpenAuth}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-2xl border border-slate-700 transition"
              >
                Create Vendor Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
