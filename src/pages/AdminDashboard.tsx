import React, { useState } from 'react';
import { Market, Stall, BookingTicket, Reservation, PaymentRecord } from '../types';
import { exportToGoogleSheets, seedFirestoreDatabase } from '../services/api';
import {
  ShieldCheck,
  Store,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
  Database,
  CreditCard,
  Plus,
  CheckCircle,
  Download,
  Loader2,
} from 'lucide-react';

interface AdminDashboardProps {
  markets: Market[];
  stalls: Stall[];
  tickets: BookingTicket[];
  reservations: Reservation[];
  payments: PaymentRecord[];
  onAddMarket: (market: Partial<Market>) => Promise<void>;
  onAddStall: (stall: Partial<Stall>) => Promise<void>;
  onUpdateStallStatus: (stallId: string, status: Stall['status']) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  markets,
  stalls,
  tickets,
  reservations,
  payments,
  onAddMarket,
  onAddStall,
  onUpdateStallStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'markets' | 'stalls' | 'bookings' | 'reports'>('overview');

  // Google Sheets Export State
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sheetsFeedback, setSheetsFeedback] = useState<{ message: string; url?: string } | null>(null);

  // Firestore Seeding State
  const [seedingFirestore, setSeedingFirestore] = useState(false);
  const [seedingFeedback, setSeedingFeedback] = useState<string | null>(null);

  const handleSeedFirestore = async () => {
    setSeedingFirestore(true);
    setSeedingFeedback(null);
    try {
      const res = await seedFirestoreDatabase();
      setSeedingFeedback(res.message);
    } catch (err: any) {
      setSeedingFeedback(err.message || 'Failed to seed database');
    } finally {
      setSeedingFirestore(false);
    }
  };

  // New Market Modal State
  const [showAddMarketModal, setShowAddMarketModal] = useState(false);
  const [marketName, setMarketName] = useState('');
  const [marketCode, setMarketCode] = useState('');
  const [marketAddress, setMarketAddress] = useState('');
  const [marketCategory, setMarketCategory] = useState<'event' | 'general' | 'specialty'>('event');
  const [marketLat, setMarketLat] = useState('4.6462');
  const [marketLng, setMarketLng] = useState('7.9315');
  const [marketDesc, setMarketDesc] = useState('');

  // New Stall Modal State
  const [showAddStallModal, setShowAddStallModal] = useState(false);
  const [stallNumber, setStallNumber] = useState('');
  const [stallMarketId, setStallMarketId] = useState(markets[0]?.id || '');
  const [stallSection, setStallSection] = useState('Block A');
  const [stallCategory, setStallCategory] = useState<Stall['category']>('lockup');
  const [stallDimensions, setStallDimensions] = useState('4.0m x 4.0m');
  const [stallMonthlyRate, setStallMonthlyRate] = useState(85000);
  const [stallDailyRate, setStallDailyRate] = useState(4000);

  // Stats calculation
  const totalStallsCount = stalls.length;
  const occupiedStallsCount = stalls.filter((s) => s.status === 'occupied').length;
  const reservedStallsCount = stalls.filter((s) => s.status === 'reserved').length;
  const availableStallsCount = stalls.filter((s) => s.status === 'available').length;
  const occupancyRate = totalStallsCount > 0 ? Math.round(((occupiedStallsCount + reservedStallsCount) / totalStallsCount) * 100) : 0;

  const totalRevenueNgn = payments
    .filter((p) => p.status === 'success')
    .reduce((sum, p) => sum + (p.amountNgn || 0), 0);

  const formatNgn = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  const handleExportSheets = async () => {
    setExportingSheets(true);
    setSheetsFeedback(null);
    try {
      const res = await exportToGoogleSheets();
      setSheetsFeedback({
        message: `Successfully synchronized ${res.rowsExported} operational booking records to Google Sheets!`,
        url: res.spreadsheetUrl,
      });

      // Also trigger browser CSV download for immediate offline auditing
      if (res.csvData) {
        const blob = new Blob([res.csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `EketSpace_Occupancy_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error('Google Sheets export error:', err);
      setSheetsFeedback({
        message: err.message || 'Failed to export reports to Google Sheets.',
      });
    } finally {
      setExportingSheets(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketName.trim() || !marketCode.trim()) return;

    await onAddMarket({
      name: marketName,
      code: marketCode.toUpperCase(),
      address: marketAddress,
      category: marketCategory,
      coordinates: {
        lat: parseFloat(marketLat) || 4.643,
        lng: parseFloat(marketLng) || 7.928,
      },
      description: marketDesc,
      lga: 'Eket LGA',
      state: 'Akwa Ibom State',
      operatingHours: '08:00 AM - 08:00 PM',
      totalStalls: 20,
      availableStalls: 20,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=80',
    });

    setShowAddMarketModal(false);
    setMarketName('');
    setMarketCode('');
  };

  const handleCreateStall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stallNumber.trim() || !stallMarketId) return;

    const parentMarket = markets.find((m) => m.id === stallMarketId);

    await onAddStall({
      stallNumber,
      marketId: stallMarketId,
      marketName: parentMarket?.name || 'Eket Market',
      section: stallSection,
      category: stallCategory,
      dimensions: stallDimensions,
      monthlyRateNgn: Number(stallMonthlyRate),
      dailyRateNgn: Number(stallDailyRate),
      features: ['Security shutter', 'Standard power connection'],
      status: 'available',
    });

    setShowAddStallModal(false);
    setStallNumber('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Eket LGA Commercial Administration Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative market stall allocation oversight, revenue monitoring, and Google Sheets synchronization.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddMarketModal(true)}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition border border-slate-300 dark:border-slate-700 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Add Market Center</span>
          </button>
          <button
            onClick={() => setShowAddStallModal(true)}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition border border-slate-300 dark:border-slate-700 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Add New Stall</span>
          </button>
          <button
            onClick={handleSeedFirestore}
            disabled={seedingFirestore}
            className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
          >
            {seedingFirestore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-amber-100" />
            )}
            <span>Seed Firestore Stalls</span>
          </button>
          <button
            onClick={handleExportSheets}
            disabled={exportingSheets}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            {exportingSheets ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Export to Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Firestore Seeding Feedback Toast */}
      {seedingFeedback && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700/60 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{seedingFeedback}</span>
          </div>
          <button
            onClick={() => setSeedingFeedback(null)}
            className="text-amber-700 dark:text-amber-400 hover:underline font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sheets Feedback Toast */}
      {sheetsFeedback && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/60 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{sheetsFeedback.message}</span>
          </div>
          <button
            onClick={() => setSheetsFeedback(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Stalls</span>
            <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalStallsCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Across {markets.length} configured Eket markets</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Occupancy Rate</span>
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{occupancyRate}%</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{occupiedStallsCount + reservedStallsCount} allocated or locked</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Capacity</span>
            <CheckCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-700 dark:text-cyan-300">{availableStallsCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Ready for immediate vendor booking</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Revenue</span>
            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{formatNgn(totalRevenueNgn)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Authoritatively verified via Paystack</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview & Stalls' },
          { id: 'markets', label: `Markets (${markets.length})` },
          { id: 'bookings', label: `Allocations & Tickets (${tickets.length})` },
          { id: 'reports', label: 'Google Sheets Reporting' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview / Stalls Management */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Stall Allocation Registry</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Update rates and availability status</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Stall No.</th>
                    <th className="px-5 py-3.5 font-bold">Market</th>
                    <th className="px-5 py-3.5 font-bold">Section</th>
                    <th className="px-5 py-3.5 font-bold">Category</th>
                    <th className="px-5 py-3.5 font-bold">Monthly Fee (NGN)</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Admin Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {stalls.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white font-mono">{s.stallNumber}</td>
                      <td className="px-5 py-3.5">{s.marketName || s.marketId}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{s.section}</td>
                      <td className="px-5 py-3.5 capitalize">{s.category}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{formatNgn(s.monthlyRateNgn)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'available'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : s.status === 'reserved'
                              ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : s.status === 'occupied'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              : 'bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={s.status}
                          onChange={(e) => onUpdateStallStatus(s.id, e.target.value as any)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 shadow-xs"
                        >
                          <option value="available">Available</option>
                          <option value="reserved">Reserved</option>
                          <option value="occupied">Occupied</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Markets Management */}
      {activeTab === 'markets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Configured Markets in Eket LGA</h2>
            <button
              onClick={() => setShowAddMarketModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Market Center</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{m.code}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {m.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{m.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{m.address}</span>
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{m.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>GPS: {m.coordinates.lat.toFixed(4)}, {m.coordinates.lng.toFixed(4)}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{m.availableStalls} / {m.totalStalls} Open</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Bookings & Tickets */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Issued Verifiable Allocation Passes</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Cryptographically verifiable gate passes</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Ticket Number</th>
                    <th className="px-5 py-3.5 font-bold">Stall</th>
                    <th className="px-5 py-3.5 font-bold">Market</th>
                    <th className="px-5 py-3.5 font-bold">Allocated Vendor</th>
                    <th className="px-5 py-3.5 font-bold">Validity</th>
                    <th className="px-5 py-3.5 font-bold">Gate Check-ins</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{t.ticketNumber}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{t.stallNumber}</td>
                      <td className="px-5 py-3.5">{t.marketName}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{t.vendorName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.vendorEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{t.validityStart} - {t.validityEnd}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">{t.checkInCount} scan(s)</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 dark:text-slate-500">
                        No official tickets have been issued yet. Verified bookings will be listed here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Google Sheets Reporting */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xs space-y-6 max-w-3xl transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Google Sheets Administrative Synchronization</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                As authorized under Google Workspace OAuth integration, administrators can synchronize real-time stall allocations, occupancy ratios, vendor contact logs, and Paystack revenue reconciliation directly into Google Sheets.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white">Included Operational Fields:</h3>
            <ul className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>• Market Center Title & LGA Code</li>
              <li>• Allocated Stall Number & Section</li>
              <li>• Unique Cryptographic Ticket Number</li>
              <li>• Vendor Legal Name & Contact Phone</li>
              <li>• Allocation Start & Expiration Date</li>
              <li>• Verified Amount in Nigerian Naira (₦)</li>
              <li>• Gate Officer Check-in Timestamp Log</li>
              <li>• Real-Time Occupancy Classification</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportSheets}
              disabled={exportingSheets}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-6 rounded-2xl flex items-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              {exportingSheets ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Synchronize & Export Report</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Market Modal */}
      {showAddMarketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Add New Market Center in Eket</h3>
            <form onSubmit={handleCreateMarket} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Market Name</label>
                <input
                  type="text"
                  required
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  placeholder="e.g. Eket Christmas Village"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Market Code</label>
                <input
                  type="text"
                  required
                  value={marketCode}
                  onChange={(e) => setMarketCode(e.target.value)}
                  placeholder="e.g. EKET-XMAS"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Address / Location</label>
                <input
                  type="text"
                  required
                  value={marketAddress}
                  onChange={(e) => setMarketAddress(e.target.value)}
                  placeholder="Stadium Road, Eket"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={marketLat}
                    onChange={(e) => setMarketLat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={marketLng}
                    onChange={(e) => setMarketLng(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={marketDesc}
                  onChange={(e) => setMarketDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition shadow-xs"
                >
                  Create Market
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMarketModal(false)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stall Modal */}
      {showAddStallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Configure New Commercial Stall</h3>
            <form onSubmit={handleCreateStall} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Target Market</label>
                <select
                  value={stallMarketId}
                  onChange={(e) => setStallMarketId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Stall Number</label>
                  <input
                    type="text"
                    required
                    value={stallNumber}
                    onChange={(e) => setStallNumber(e.target.value)}
                    placeholder="e.g. XMAS-C04"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    value={stallSection}
                    onChange={(e) => setStallSection(e.target.value)}
                    placeholder="e.g. Food Court"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={stallCategory}
                    onChange={(e) => setStallCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  >
                    <option value="lockup">Lock-up</option>
                    <option value="food">Food Court</option>
                    <option value="premium">Premium</option>
                    <option value="open">Open Shed</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Dimensions</label>
                  <input
                    type="text"
                    value={stallDimensions}
                    onChange={(e) => setStallDimensions(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Monthly Rate (NGN)</label>
                  <input
                    type="number"
                    value={stallMonthlyRate}
                    onChange={(e) => setStallMonthlyRate(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Daily Rate (NGN)</label>
                  <input
                    type="number"
                    value={stallDailyRate}
                    onChange={(e) => setStallDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white shadow-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition shadow-xs"
                >
                  Save Stall Space
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStallModal(false)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
