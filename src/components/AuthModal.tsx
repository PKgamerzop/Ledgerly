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
    <div className="min-h-screen bg-[#14100c] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mc-panel overflow-hidden p-0">
        {/* Header with Minecraft Banner / Logo */}
        <div className="bg-[#1c1814] border-b-2 border-[#120f0c] p-6 text-center text-white relative">
          <div className="w-16 h-16 mx-auto bg-[#120f0c] border-2 border-black p-2 mb-3 flex items-center justify-center shadow-[inset_2px_2px_0_#2a231d,inset_-2px_-2px_0_#0a0806]">
            <img src="/logo.svg" alt="Ledgerly Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-pixel text-3xl font-black tracking-wider uppercase text-[#ffd700] drop-shadow-[2px_2px_0_#000]">
            LEDGERLY
          </h1>
          <p className="font-mc text-xs text-[#a0a0a0] mt-1">Minecraft-Themed Spending & Debt Tracker</p>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#55ff55] bg-[#142814] border border-[#2a4d2a] py-1 px-3 w-max mx-auto font-mc">
            <ShieldCheck className="w-3.5 h-3.5 text-[#55ff55]" />
            <span>Persistent Session Active Across Reboots</span>
          </div>
        </div>

        {/* Tab switch: Sign In vs Create Account */}
        <div className="flex border-b-2 border-[#15120e] bg-[#221c17]">
          <button
            type="button"
            id="tab-sign-in"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-pixel uppercase tracking-wider transition cursor-pointer ${
              !isSignUp
                ? 'bg-[#3b3229] text-[#ffd700] border-b-2 border-[#ffd700]'
                : 'text-[#888888] hover:text-[#ffffff]'
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
            className={`flex-1 py-3 text-xs font-pixel uppercase tracking-wider transition cursor-pointer ${
              isSignUp
                ? 'bg-[#3b3229] text-[#ffd700] border-b-2 border-[#ffd700]'
                : 'text-[#888888] hover:text-[#ffffff]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 bg-[#2b2520]">
          {/* Continue with Google */}
          <button
            type="button"
            id="btn-google-sign-in"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="mc-button w-full flex items-center justify-center gap-3 py-2.5 px-4 font-bold text-xs cursor-pointer disabled:opacity-50"
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
            <span className="text-[#ffffff]">{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>
          <p className="font-mc text-[11px] text-center text-[#55ff55] px-1">
            ✨ Enables seamless sync between Mobile & PC via Google Drive
          </p>

          {/* Divider */}
          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-[#1a1612]"></div>
            </div>
            <span className="relative bg-[#2b2520] px-3 font-pixel text-[10px] text-[#888888] uppercase tracking-wider">
              Or with Email & Password
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 mc-panel bg-[#4a1414] border-2 border-[#1a0505] text-[#ff6b6b] text-xs">
              <AlertCircle className="w-4 h-4 text-[#ff4444] shrink-0 mt-0.5" />
              <span className="font-mc">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#888888] absolute left-3.5 top-3" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mc-input w-full pl-10 pr-4 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
                />
              </div>
            </div>

            <div>
              <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#888888] absolute left-3.5 top-3" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mc-input w-full pl-10 pr-4 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block font-pixel text-xs text-[#ffd700] uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#888888] absolute left-3.5 top-3" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mc-input w-full pl-10 pr-4 py-2 text-xs text-[#ffffff] placeholder:text-[#666666]"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="mc-button mc-button-emerald w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 font-bold text-xs disabled:opacity-50 cursor-pointer"
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
              className="mc-button w-full flex items-center justify-center gap-2 py-2.5 px-4 font-mc text-xs cursor-pointer text-[#55ffff]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#55ffff]" />
              <span>Explore in Demo Mode (Instant Access)</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#55ffff] ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
