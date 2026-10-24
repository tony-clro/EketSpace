import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { QuotaBanner } from './components/QuotaBanner';
import { AuthModal } from './components/AuthModal';
import { BookingTicketModal } from './components/BookingTicketModal';
import { AiAssistantModal } from './components/AiAssistantModal';

import { HomePage } from './pages/HomePage';
import { MarketsPage } from './pages/MarketsPage';
import { StallsPage } from './pages/StallsPage';
import { StallDetailPage } from './pages/StallDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { VendorDashboard } from './pages/VendorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { VerificationOfficerPage } from './pages/VerificationOfficerPage';

import { Market, Stall, BookingTicket, Reservation, PaymentRecord } from './types';
import { INITIAL_MARKETS, INITIAL_STALLS } from './lib/seedData';
import { db } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';

function MainApp() {
  const { currentUser, isAdmin, isOfficer } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);

  // Modals State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState<boolean>(false);
  const [activeTicketModal, setActiveTicketModal] = useState<BookingTicket | null>(null);

  // Firestore Data State
  const [markets, setMarkets] = useState<Market[]>(INITIAL_MARKETS);
  const [stalls, setStalls] = useState<Stall[]>(INITIAL_STALLS);
  const [tickets, setTickets] = useState<BookingTicket[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // 1. Sync Markets from Firestore (fallback to initial dataset if not yet seeded)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'markets'),
      (snap) => {
        if (!snap.empty) {
          const list: Market[] = [];
          snap.forEach((d) => list.push(d.data() as Market));
          setMarkets(list);
        } else {
          setMarkets(INITIAL_MARKETS);
        }
      },
      (error) => {
        console.warn('Could not sync markets from Firestore, using initial seed catalog:', error);
        setMarkets(INITIAL_MARKETS);
      }
    );
    return () => unsub();
  }, []);

  // 2. Sync Stalls from Firestore (fallback to initial dataset if not yet seeded)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'stalls'),
      (snap) => {
        if (!snap.empty) {
          const list: Stall[] = [];
          snap.forEach((d) => list.push(d.data() as Stall));
          setStalls(list);
        } else {
          setStalls(INITIAL_STALLS);
        }
      },
      (error) => {
        console.warn('Could not sync stalls from Firestore, using initial seed catalog:', error);
        setStalls(INITIAL_STALLS);
      }
    );
    return () => unsub();
  }, []);

  // 3. Sync User Tickets & Reservations when logged in
  useEffect(() => {
    if (!currentUser) {
      setTickets([]);
      setReservations([]);
      setPayments([]);
      return;
    }

    const isPrivileged = isAdmin || isOfficer;

    // Ordinary vendors must query by vendorId == uid to comply with Firestore Security Rules
    const ticketsQuery = isPrivileged
      ? collection(db, 'bookingTickets')
      : query(collection(db, 'bookingTickets'), where('vendorId', '==', currentUser.uid));

    const reservationsQuery = isPrivileged
      ? collection(db, 'reservations')
      : query(collection(db, 'reservations'), where('vendorId', '==', currentUser.uid));

    const paymentsQuery = isAdmin
      ? collection(db, 'payments')
      : query(collection(db, 'payments'), where('vendorId', '==', currentUser.uid));

    const unsubTickets = onSnapshot(
      ticketsQuery,
      (snap) => {
        const list: BookingTicket[] = [];
        snap.forEach((d) => {
          const data = d.data() as BookingTicket;
          if (isPrivileged || data.vendorId === currentUser.uid) {
            list.push(data);
          }
        });
        setTickets(list);
      },
      (err) => {
        console.warn('Could not sync user tickets from Firestore:', err);
      }
    );

    const unsubReservations = onSnapshot(
      reservationsQuery,
      (snap) => {
        const list: Reservation[] = [];
        snap.forEach((d) => {
          const data = d.data() as Reservation;
          if (isPrivileged || data.vendorId === currentUser.uid) {
            list.push(data);
          }
        });
        setReservations(list);
      },
      (err) => {
        console.warn('Could not sync user reservations from Firestore:', err);
      }
    );

    const unsubPayments = onSnapshot(
      paymentsQuery,
      (snap) => {
        const list: PaymentRecord[] = [];
        snap.forEach((d) => {
          const data = d.data() as PaymentRecord;
          if (isAdmin || data.vendorId === currentUser.uid) {
            list.push(data);
          }
        });
        setPayments(list);
      },
      (err) => {
        console.warn('Could not sync user payments from Firestore:', err);
      }
    );

    return () => {
      unsubTickets();
      unsubReservations();
      unsubPayments();
    };
  }, [currentUser, isAdmin, isOfficer]);

  // Handlers
  const handleSelectMarket = (market: Market) => {
    setSelectedMarketId(market.id);
    setCurrentTab('stalls');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReserveStall = (stall: Stall) => {
    if (!currentUser) {
      setSelectedStall(stall);
      setAuthModalOpen(true);
      return;
    }
    setSelectedStall(stall);
    setCurrentTab('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewStallDetails = (stall: Stall) => {
    setSelectedStall(stall);
    setCurrentTab('stall_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentSuccess = async (ticket: BookingTicket) => {
    setActiveTicketModal(ticket);
    setCurrentTab('dashboard');

    // Update stall status to occupied in Firestore
    if (selectedStall) {
      try {
        await updateDoc(doc(db, 'stalls', selectedStall.id), {
          status: 'occupied',
          currentReservationId: ticket.reservationId,
          currentVendorId: currentUser?.uid,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not update stall in Firestore:', err);
      }
    }

    // Persist ticket in Firestore
    try {
      await setDoc(doc(db, 'bookingTickets', ticket.id), ticket);
    } catch (err) {
      console.warn('Could not save ticket in Firestore:', err);
    }
  };

  const handleAddMarket = async (marketData: Partial<Market>) => {
    const id = `market-${Date.now()}`;
    const newMarket: Market = {
      id,
      name: marketData.name || 'New Market',
      code: marketData.code || 'EKET-NEW',
      description: marketData.description || '',
      address: marketData.address || 'Eket',
      lga: 'Eket LGA',
      state: 'Akwa Ibom State',
      category: marketData.category || 'general',
      coordinates: marketData.coordinates || { lat: 4.643, lng: 7.928 },
      image: marketData.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
      operatingHours: '08:00 AM - 08:00 PM',
      totalStalls: marketData.totalStalls || 20,
      availableStalls: marketData.availableStalls || 20,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'markets', id), newMarket);
    } catch (e) {
      setMarkets((prev) => [newMarket, ...prev]);
    }
  };

  const handleAddStall = async (stallData: Partial<Stall>) => {
    const id = `stall-${Date.now()}`;
    const newStall: Stall = {
      id,
      marketId: stallData.marketId || markets[0]?.id || 'market-eket',
      marketName: stallData.marketName || 'Eket Market',
      stallNumber: stallData.stallNumber || 'STALL-00',
      section: stallData.section || 'General Area',
      category: stallData.category || 'standard',
      dimensions: stallData.dimensions || '4.0m x 4.0m',
      dailyRateNgn: stallData.dailyRateNgn || 4000,
      monthlyRateNgn: stallData.monthlyRateNgn || 85000,
      features: stallData.features || ['Standard space'],
      status: 'available',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'stalls', id), newStall);
    } catch (e) {
      setStalls((prev) => [newStall, ...prev]);
    }
  };

  const handleUpdateStallStatus = async (stallId: string, status: Stall['status']) => {
    try {
      await updateDoc(doc(db, 'stalls', stallId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setStalls((prev) => prev.map((s) => (s.id === stallId ? { ...s, status } : s)));
    }
  };

  const currentStallMarket = selectedStall
    ? markets.find((m) => m.id === selectedStall.marketId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950 transition-colors">
      {/* Two-tier Google Maps quota banner required by GMP guidelines */}
      <QuotaBanner />

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenAiAssistant={() => setAiAssistantOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            markets={markets}
            stalls={stalls}
            onSelectMarket={handleSelectMarket}
            onReserveStall={handleReserveStall}
            onBrowseMarkets={() => setCurrentTab('markets')}
            onBrowseStalls={() => setCurrentTab('stalls')}
            onOpenAiGuide={() => setAiAssistantOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'markets' && (
          <MarketsPage
            markets={markets}
            onSelectMarket={handleSelectMarket}
            onBrowseMarketStalls={(marketId) => {
              setSelectedMarketId(marketId);
              setCurrentTab('stalls');
            }}
          />
        )}

        {currentTab === 'stalls' && (
          <StallsPage
            stalls={stalls}
            markets={markets}
            initialMarketId={selectedMarketId || 'all'}
            onReserveStall={handleReserveStall}
            onViewStallDetails={handleViewStallDetails}
          />
        )}

        {currentTab === 'stall_detail' && selectedStall && (
          <StallDetailPage
            stall={selectedStall}
            market={currentStallMarket}
            onBack={() => setCurrentTab('stalls')}
            onReserve={handleReserveStall}
          />
        )}

        {currentTab === 'checkout' && selectedStall && (
          <CheckoutPage
            stall={selectedStall}
            market={currentStallMarket}
            onBack={() => setCurrentTab('stalls')}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {currentTab === 'dashboard' && (
          <VendorDashboard
            tickets={tickets}
            reservations={reservations}
            payments={payments}
            onViewTicket={(t) => setActiveTicketModal(t)}
            onBrowseStalls={() => setCurrentTab('stalls')}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            markets={markets}
            stalls={stalls}
            tickets={tickets}
            reservations={reservations}
            payments={payments}
            onAddMarket={handleAddMarket}
            onAddStall={handleAddStall}
            onUpdateStallStatus={handleUpdateStallStatus}
          />
        )}

        {currentTab === 'officer' && (
          <VerificationOfficerPage recentTickets={tickets} />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <AiAssistantModal
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />

      <BookingTicketModal
        ticket={activeTicketModal}
        onClose={() => setActiveTicketModal(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
