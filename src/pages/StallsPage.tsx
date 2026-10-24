import React, { useState } from 'react';
import { Market, Stall } from '../types';
import { StallCard } from '../components/StallCard';
import { Search, Store } from 'lucide-react';

interface StallsPageProps {
  stalls: Stall[];
  markets: Market[];
  initialMarketId?: string;
  onReserveStall: (stall: Stall) => void;
  onViewStallDetails?: (stall: Stall) => void;
}

export const StallsPage: React.FC<StallsPageProps> = ({
  stalls,
  markets,
  initialMarketId = 'all',
  onReserveStall,
  onViewStallDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState<string>(initialMarketId);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'number'>('price_asc');

  const filteredStalls = stalls
    .filter((stall) => {
      const matchesSearch =
        stall.stallNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stall.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stall.marketName && stall.marketName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMarket = selectedMarketId === 'all' || stall.marketId === selectedMarketId;
      const matchesCategory = selectedCategory === 'all' || stall.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || stall.status === selectedStatus;

      return matchesSearch && matchesMarket && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.monthlyRateNgn - b.monthlyRateNgn;
      if (sortBy === 'price_desc') return b.monthlyRateNgn - a.monthlyRateNgn;
      return a.stallNumber.localeCompare(b.stallNumber);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Market Stall Catalog</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore real-time available commercial spaces, lock-up shops, and food courts across Eket LGA.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stall number, section, features..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-xs"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            {/* Market selector */}
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 shadow-xs"
            >
              <option value="all">All Markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Category selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 shadow-xs"
            >
              <option value="all">All Categories</option>
              <option value="lockup">Lock-up Shop</option>
              <option value="food">Food Court</option>
              <option value="open">Open Shed</option>
              <option value="premium">Premium</option>
              <option value="standard">Standard</option>
            </select>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available Only</option>
              <option value="reserved">Pending Lock</option>
              <option value="occupied">Allocated</option>
              <option value="maintenance">Maintenance</option>
            </select>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 shadow-xs"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="number">Stall Number</option>
            </select>
          </div>
        </div>

        {/* Quick status pill counters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredStalls.length}</span> of {stalls.length} stalls
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available:{' '}
              <strong className="text-emerald-700 dark:text-emerald-300">
                {stalls.filter((s) => s.status === 'available').length}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending:{' '}
              <strong className="text-amber-700 dark:text-amber-300">
                {stalls.filter((s) => s.status === 'reserved').length}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span> Allocated:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {stalls.filter((s) => s.status === 'occupied').length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Stalls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStalls.map((stall) => (
          <StallCard
            key={stall.id}
            stall={stall}
            onReserve={onReserveStall}
            onViewDetails={onViewStallDetails}
          />
        ))}
      </div>

      {filteredStalls.length === 0 && (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <Store className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">No stalls match your filters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try resetting your status filter to 'All Statuses' or choose a different market.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedMarketId('all');
              setSelectedCategory('all');
              setSelectedStatus('all');
            }}
            className="mt-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-white px-4 py-2 rounded-xl transition"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
