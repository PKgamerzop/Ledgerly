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
  BookOpen,
  Feather,
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
        setError(null);
      } else if (errObj.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      } else if (errObj.code === 'auth/unauthorized-domain' || errObj.message?.includes('unauthorized-domain')) {
        setError(
          `Domain authorization required by Firebase for (${window.location.hostname}). You can sign in immediately using Email & Password or Explore in Demo Mode below!`
        );
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
    <div className="min-h-screen bg-[#f4ede1] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md vintage-card overflow-hidden shadow-2xl relative">
        {/* Vintage leather trim border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#85261c] via-[#c59b27] to-[#265c3b]"></div>

        {/* Vintage Bookkeeper Header */}
        <div className="p-7 text-center border-b border-[#dfd1bd] bg-[#f4ede1]">
          <div className="w-16 h-16 mx-auto rounded-2xl mb-3.5 shadow-md overflow-hidden border-2 border-[#c59b27] bg-[#28130a] flex items-center justify-center">
            <img src="/logo.svg" alt="Ledgerly" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#24140a]">
            The Vintage Bookkeeper
          </h1>
          <p className="font-serif text-xs text-[#6e5340] mt-1 italic">
            Physical, leather-bound accounting &amp; personal ledger
          </p>

          <div className="mt-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-serif text-[#6b4028] bg-[#ffffff] border border-[#d8c7b0] py-0.5 px-3 rounded-full font-bold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#265c3b]" />
            <span>Private Double-Entry Ledger</span>
          </div>
        </div>

        {/* Tab switch: Sign In vs Create Account */}
        <div className="flex border-b border-[#dfd1bd] bg-[#ede2ce]">
          <button
            type="button"
            id="tab-sign-in"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-serif font-bold uppercase tracking-wider transition cursor-pointer ${
              !isSignUp
                ? 'bg-[#fcf9f2] text-[#2c1810] border-b-2 border-[#85261c]'
                : 'text-[#7d6350] hover:text-[#2c1810]'
            }`}
          >
            Access Account
          </button>
          <button
            type="button"
            id="tab-create-account"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-serif font-bold uppercase tracking-wider transition cursor-pointer ${
              isSignUp
                ? 'bg-[#fcf9f2] text-[#2c1810] border-b-2 border-[#85261c]'
                : 'text-[#7d6350] hover:text-[#2c1810]'
            }`}
          >
            Open New Ledger
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-4 bg-[#fcf9f2]">
          {/* Continue with Google */}
          <button
            type="button"
            id="btn-google-sign-in"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 font-serif font-bold text-xs rounded-xl bg-[#ffffff] border border-[#cfbeaa] hover:border-[#6b4028] text-[#2c1810] shadow-2xs transition cursor-pointer disabled:opacity-50"
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
            <span>{googleLoading ? 'Connecting...' : 'Sign In with Google Account'}</span>
          </button>
          <p className="text-[11px] text-center text-[#7d6350] font-serif italic px-1">
            Archival synchronization directly to your secure cloud database
          </p>

          {/* Divider */}
          <div className="relative my-2.5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#dfd1bd]"></div>
            </div>
            <span className="relative bg-[#fcf9f2] px-3 text-[10px] font-serif text-[#8c7361] font-bold uppercase tracking-wider">
              Or Sign In With Email
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-[#fbf0ee] border border-[#e8b6b0] text-[#a63428] text-xs rounded-xl font-medium">
              <AlertCircle className="w-4 h-4 text-[#a63428] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-3" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bookkeeper@ledger.com"
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#ffffff] border border-[#cfbeaa] rounded-xl text-[#24140a] placeholder:text-[#a89584] focus:border-[#6b4028] outline-none transition shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-3" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#ffffff] border border-[#cfbeaa] rounded-xl text-[#24140a] placeholder:text-[#a89584] focus:border-[#6b4028] outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-serif font-bold text-[#594132] uppercase tracking-wider mb-1.5">
                  Confirm Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8c7361] absolute left-3.5 top-3" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 text-xs bg-[#ffffff] border border-[#cfbeaa] rounded-xl text-[#24140a] placeholder:text-[#a89584] focus:border-[#6b4028] outline-none transition shadow-2xs"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 font-serif font-bold text-xs rounded-xl btn-leather transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Open Ledger Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate &amp; Open Ledger</span>
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-serif font-bold rounded-xl bg-[#ffffff] hover:bg-[#ede2ce] border border-[#cfbeaa] text-[#4a2c1d] transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#85261c]" />
              <span>Explore in Guest Ledger Mode</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8c7361] ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
