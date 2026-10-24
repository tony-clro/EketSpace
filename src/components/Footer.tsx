import React from 'react';
import { Store, ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Store className="w-4 h-4" />
              </div>
              <span>EketSpace</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-sm">
              Smart market stall registration, transparent allocation, Paystack payment processing, and cryptographic QR ticket verification for Eket Local Government Area, Akwa Ibom State.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Google Developers Festival Hackathon Showcase</span>
            </div>
          </div>

          {/* Markets Covered */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold text-xs mb-3">Covered Markets</h4>
            <ul className="space-y-2 text-[11px]">
              <li className="hover:text-emerald-600 dark:hover:text-emerald-300 cursor-pointer transition">Eket Christmas Village & Trade Expo</li>
              <li className="hover:text-emerald-600 dark:hover:text-emerald-300 cursor-pointer transition">China Market Eket</li>
              <li className="hover:text-emerald-600 dark:hover:text-emerald-300 cursor-pointer transition">Eket Ultra-Modern Main Market (Udua Ntak Inyang)</li>
              <li className="hover:text-emerald-600 dark:hover:text-emerald-300 cursor-pointer transition">Marina Waterfront Commercial Arcade</li>
            </ul>
          </div>

          {/* Contact & Government Authority */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold text-xs mb-3">LGA Administration</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span>Eket Local Government Council Secretariat, Eket, Akwa Ibom State</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>revenue@eketspace.lga.gov.ng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>+234 (0) 85 240 100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-500">
          <div>
            © {new Date().getFullYear()} EketSpace LGA. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Google Cloud, Firebase & Gemini</span>
            <span>•</span>
            <span>Paystack Certified Nigerian Gateway</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
