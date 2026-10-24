import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookingTicket, Reservation, PaymentRecord } from '../types';
import {
  User,
  Store,
  QrCode,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

interface VendorDashboardProps {
  tickets: BookingTicket[];
  reservations: Reservation[];
  payments: PaymentRecord[];
  onViewTicket: (ticket: BookingTicket) => void;
  onBrowseStalls: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  tickets,
  reservations,
  payments,
  onViewTicket,
  onBrowseStalls,
}) => {
  const { currentUser, profile, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'reservations' | 'payments' | 'profile'>('tickets');

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [businessName, setBusinessName] = useState(profile?.businessName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile({ fullName, phone, businessName });
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const formatNgn = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Header Profile Summary */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/20">
            {profile?.fullName?.charAt(0) || currentUser?.email?.charAt(0) || 'V'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {profile?.fullName || 'Eket Vendor'}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {profile?.role || 'Vendor'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{profile?.businessName || 'Independent Merchant'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-500">{currentUser?.email} • {profile?.phone || 'No phone set'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBrowseStalls}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            + Reserve New Stall
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'tickets'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>My Digital Tickets ({tickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reservations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'reservations'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Active Bookings ({reservations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'payments'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Receipts ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Vendor Profile</span>
        </button>
      </div>

      {/* Tab: Digital Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {tickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onViewTicket(t)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {t.ticketNumber}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {t.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                        Stall {t.stallNumber}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.marketName}</p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                      <div className="flex items-center justify-between">
                        <span>Validity Period:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {t.validityStart} - {t.validityEnd}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Scanned Check-ins:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t.checkInCount}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-600 text-slate-800 dark:text-white group-hover:text-white font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View Official QR Pass</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
              <QrCode className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">No active digital passes yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Once you select an available stall and complete Paystack payment verification, your tamper-proof QR pass will appear here.
              </p>
              <button
                onClick={onBrowseStalls}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                Browse & Reserve Stalls
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Reservations */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {reservations.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Ref Number</th>
                      <th className="px-5 py-3.5 font-bold">Stall</th>
                      <th className="px-5 py-3.5 font-bold">Market</th>
                      <th className="px-5 py-3.5 font-bold">Duration</th>
                      <th className="px-5 py-3.5 font-bold">Total Amount</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {reservations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {r.reservationNumber}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{r.stallNumber || r.stallId}</td>
                        <td className="px-5 py-3.5">{r.marketName || 'Eket Market'}</td>
                        <td className="px-5 py-3.5">{r.durationMonths} month(s)</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{formatNgn(r.totalAmountNgn)}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'confirmed'
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : r.status === 'pending_payment'
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
              <Store className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">No active reservations found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select an open stall to place a booking reservation.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Payment Receipts */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {payments.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Transaction Reference</th>
                      <th className="px-5 py-3.5 font-bold">Gateway</th>
                      <th className="px-5 py-3.5 font-bold">Amount (NGN)</th>
                      <th className="px-5 py-3.5 font-bold">Channel</th>
                      <th className="px-5 py-3.5 font-bold">Verified Date</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {p.reference}
                        </td>
                        <td className="px-5 py-3.5 uppercase font-semibold text-slate-700 dark:text-slate-300">Paystack</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{formatNgn(p.amountNgn)}</td>
                        <td className="px-5 py-3.5 capitalize">{p.channel || 'Card / Transfer'}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{p.paidAt || p.createdAt}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
              <CreditCard className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">No payment records yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified Paystack transaction receipts will show here.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-xl shadow-xs space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Vendor Registration Record</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Maintained in Eket Local Government commercial registry</p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-white px-3 py-1.5 rounded-xl font-medium transition"
              >
                Edit Details
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Business / Brand Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-xs"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between shadow-xs">
                <span className="text-slate-500 dark:text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">{profile?.fullName}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between shadow-xs">
                <span className="text-slate-500 dark:text-slate-500">Business Title</span>
                <span className="font-semibold text-slate-900 dark:text-white">{profile?.businessName || 'Not specified'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between shadow-xs">
                <span className="text-slate-500 dark:text-slate-500">Email Address</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currentUser?.email}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between shadow-xs">
                <span className="text-slate-500 dark:text-slate-500">Phone</span>
                <span className="font-semibold text-slate-900 dark:text-white">{profile?.phone || 'Not specified'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between shadow-xs">
                <span className="text-slate-500 dark:text-slate-500">Jurisdiction</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Eket Local Government Area, Akwa Ibom</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
