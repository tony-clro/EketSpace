import React, { useState } from 'react';
import { Market } from '../types';
import { GoogleMarketMap } from '../components/GoogleMarketMap';
import { Search, MapPin, Clock, Store, Map as MapIcon, Grid, ArrowRight } from 'lucide-react';

interface MarketsPageProps {
  markets: Market[];
  onSelectMarket: (market: Market) => void;
  onBrowseMarketStalls: (marketId: string) => void;
}

export const MarketsPage: React.FC<MarketsPageProps> = ({
  markets,
  onSelectMarket,
  onBrowseMarketStalls,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const filteredMarkets = markets.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Eket Market Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover registered municipal markets, festival trade centers, and commercial hubs in Eket LGA.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl self-start">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewMode === 'grid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Card Grid</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewMode === 'map'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search market by name, road, code (e.g. Christmas Village, China Market)..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-xs"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {['all', 'event', 'general', 'specialty'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition ${
                selectedCategory === cat
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white shadow-xs'
              }`}
            >
              {cat === 'all' ? 'All Types' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <GoogleMarketMap markets={filteredMarkets} onSelectMarket={onSelectMarket} />
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <div
              key={market.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition group"
            >
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={market.image}
                    alt={market.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
                  <span className="absolute top-3 left-3 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                    {market.category}
                  </span>
                  <span className="absolute top-3 right-3 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                    {market.code}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                    {market.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{market.address}</span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {market.description}
                  </p>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Hours:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{market.operatingHours}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-500 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Available Capacity:
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {market.availableStalls} / {market.totalStalls} Open
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-2">
                <button
                  onClick={() => onSelectMarket(market)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs py-2.5 px-3 rounded-xl font-medium transition"
                >
                  Market Details
                </button>
                <button
                  onClick={() => onBrowseMarketStalls(market.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1 transition shadow-xs"
                >
                  <span>Browse Stalls</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredMarkets.length === 0 && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <Store className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">No markets matched your query</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search keywords or filter tab.</p>
        </div>
      )}
    </div>
  );
};
