import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, signup, loginWithGoogle, quickDemoLogin } = useAuth();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'auth/popup-closed-by-user') {
        // User voluntarily dismissed popup
        setError(null);
      } else if (errObj.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      } else {
        setError(errObj.message || 'Could not complete Google sign-in.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await quickDemoLogin();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'Quick demo sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header with Ledgerly Logo */}
        <div className="bg-gradient-to-b from-[#0c3744] to-[#124d5e] p-8 text-center text-white relative">
          <div className="w-20 h-20 mx-auto bg-white p-2 rounded-2xl shadow-lg mb-3 flex items-center justify-center">
            <img src="/logo.svg" alt="Ledgerly Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-wider uppercase">LEDGERLY</h1>
          <p className="text-teal-200 text-xs mt-1 font-medium">Personal Spending & Debt Tracking PWA</p>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-teal-300/90 bg-black/20 py-1 px-3 rounded-full w-max mx-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Persistent Session Active Across Reboots</span>
          </div>
        </div>

        {/* Tab switch: Sign In vs Create Account */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            id="tab-sign-in"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              !isSignUp
                ? 'border-teal-600 text-teal-900 bg-teal-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            id="tab-create-account"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              isSignUp
                ? 'border-teal-600 text-teal-900 bg-teal-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-4">
          {/* Continue with Google */}
          <button
            type="button"
            id="btn-google-sign-in"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 px-4 rounded-xl font-bold text-sm shadow-xs transition hover:shadow cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>
          <p className="text-[11px] text-center text-teal-700 font-medium px-1">
            ✨ Enables seamless sync between Mobile & PC via your free Google Drive
          </p>

          {/* Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Or with Email & Password
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-1 flex items-center justify-center gap-2 bg-[#0c3744] hover:bg-[#114b5d] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Free Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In with Email
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-demo-mode"
              onClick={handleDemoClick}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200/80 py-2.5 px-4 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Explore in Demo Mode (Instant Access)</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-600 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
