import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatAuthError, FormattedAuthError } from '../lib/authErrors';
import { X, Lock, Mail, User, Phone, Briefcase, AlertCircle, Loader2, ExternalLink, HelpCircle, Compass } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithGoogleRedirect, loginWithEmail, signupWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<FormattedAuthError | null>(null);

  const isInIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setErrorDetails(null);
      setLoading(true);
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorDetails(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectSignIn = async () => {
    try {
      setErrorDetails(null);
      setLoading(true);
      await loginWithGoogleRedirect();
    } catch (err: any) {
      console.error('Google Redirect Sign-In Error:', err);
      setErrorDetails(formatAuthError(err));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        if (!fullName.trim()) {
          throw new Error('Full Legal Name is required to register a stall');
        }
        await signupWithEmail(email, password, fullName, phone, businessName);
      }
      onClose();
    } catch (err: any) {
      console.error('Email Authentication Error:', err);
      setErrorDetails(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStandalone = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-white dark:from-emerald-950 dark:via-slate-900 dark:to-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              {mode === 'signin' ? 'Sign In to EketSpace' : 'Create Vendor Profile'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'signin'
                ? 'Access your market stall reservations and tickets'
                : 'Register as an official vendor in Eket LGA'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorDetails && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs space-y-2">
              <div className="flex items-start gap-2 text-rose-800 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{errorDetails.title}</div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300/90 mt-0.5 leading-relaxed">
                    {errorDetails.message}
                  </div>
                </div>
              </div>

              {errorDetails.actionHint && (
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorDetails.actionHint}</span>
                </div>
              )}

              {errorDetails.isIframeNotice && (
                <div className="pt-2 space-y-1.5">
                  <button
                    type="button"
                    onClick={handleOpenStandalone}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Direct Browser Tab</span>
                  </button>
                  {errorDetails.canRedirect && (
                    <button
                      type="button"
                      onClick={handleGoogleRedirectSignIn}
                      disabled={loading}
                      className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Try Redirect Sign-In Flow</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Google One-Click Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition shadow-sm border border-slate-300 dark:border-slate-700 disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Sign-In</span>
          </button>

          {isInIframe && !errorDetails && (
            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Running in embedded preview</span>
              <button
                type="button"
                onClick={handleOpenStandalone}
                className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                Open in tab <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            <span className="px-3 text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">or email</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Anthony Ekong"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Trading / Business Name
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Ekong Fabrics & Boutique"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{mode === 'signin' ? 'Sign In' : 'Complete Vendor Registration'}</span>
            </button>
          </form>

          {/* Toggle mode */}
          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'signin' ? (
              <span>
                New vendor in Eket?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setErrorDetails(null);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Register here
                </button>
              </span>
            ) : (
              <span>
                Already registered?{' '}
                <button
                  onClick={() => {
                    setMode('signin');
                    setErrorDetails(null);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
