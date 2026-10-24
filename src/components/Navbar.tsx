import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Store, ShieldCheck, Sparkles, LogOut, Menu, X, LayoutDashboard, QrCode, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenAiAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  onOpenAiAssistant,
}) => {
  const { currentUser, profile, role, isAdmin, isOfficer, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Overview' },
    { id: 'markets', label: 'Markets' },
    { id: 'stalls', label: 'Browse Stalls' },
  ];

  if (currentUser) {
    navItems.push({ id: 'dashboard', label: 'My Bookings' });
  }

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel' });
  }

  if (isOfficer) {
    navItems.push({ id: 'officer', label: 'Verify Tickets' });
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  EketSpace
                </span>
                <span className="text-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  LGA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Market Stall Allocation & Ticketing</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                  currentTab === item.id
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center shadow-xs"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition transform rotate-0 hover:-rotate-12" />
              )}
            </button>

            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-xs"
              title="Ask EketSpace AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Ask AI Guide</span>
            </button>

            {/* Auth control */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-900 dark:text-white transition"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                    {profile?.fullName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[100px] truncate hidden sm:inline">
                    {profile?.fullName || currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700">
                    {role}
                  </span>
                </button>

                {/* Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in duration-150">
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{profile?.fullName || 'Eket User'}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        onSelectTab('dashboard');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Vendor Dashboard</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          onSelectTab('admin');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    {isOfficer && (
                      <button
                        onClick={() => {
                          onSelectTab('officer');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                      >
                        <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Officer Verification</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                Sign In
              </button>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium ${
                currentTab === item.id
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Appearance</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
