import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  signInWithGoogleOAuth,
  getGoogleAccessToken,
  setGoogleAccessToken,
  signOutGoogle,
  initGoogleAuth,
  isDriveLinkedOnDevice,
  getStoredDriveToken,
  ensureValidGoogleToken,
  clearDriveAuthSession,
} from '../services/googleAuth';
import {
  syncVaultWithGoogleDrive,
  subscribeSyncState,
  SyncStatus,
} from '../services/googleDriveSync';
import { LOCAL_EDIT_EVENT } from '../db/storage';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

interface StoredCredential {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: number;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isOffline: boolean;
  googleToken: string | null;
  isDriveLinked: boolean;
  syncStatus: SyncStatus;
  lastSyncTimestamp: number | null;
  syncError: string | null;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  syncNow: (forceDirection?: 'push' | 'pull', isInteractive?: boolean) => Promise<void>;
  unlinkDrive: () => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_SESSION_KEY = 'ledgerly_auth_session';
const REGISTERED_USERS_KEY = 'ledgerly_registered_users';
const DEMO_USER_KEY = 'ledgerly_demo_user';

// SHA-256 password hasher using standard Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate consistent, safe UID for an email address
function generateUserUid(email: string): string {
  const clean = email.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const prefix = clean.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return `usr_${prefix}_${Math.abs(hash).toString(36)}`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [googleToken, setGoogleTokenState] = useState<string | null>(() => {
    const stored = getStoredDriveToken();
    return stored.token && !stored.isExpired ? stored.token : null;
  });
  const [isDriveLinked, setIsDriveLinked] = useState<boolean>(() => isDriveLinkedOnDevice());
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    isDriveLinkedOnDevice() ? 'idle' : 'unlinked'
  );
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);

  // Subscribe to drive sync state changes
  useEffect(() => {
    const unsub = subscribeSyncState((state) => {
      setSyncStatus(state.status);
      setLastSyncTimestamp(state.lastSyncTimestamp);
      setSyncError(state.error);
    });
    return unsub;
  }, []);

  // Online / Offline monitor & Session Loading
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if an active persistent session is stored in localStorage
    const savedSession = localStorage.getItem(AUTH_SESSION_KEY);
    const savedDemoUser = localStorage.getItem(DEMO_USER_KEY);

    if (savedSession) {
      try {
        const initialUser: AppUser = JSON.parse(savedSession);
        setUser(initialUser);
      } catch (e) {
        console.warn('Failed to parse stored session:', e);
      }
    } else if (savedDemoUser) {
      try {
        const initialDemoUser: AppUser = JSON.parse(savedDemoUser);
        setUser(initialDemoUser);
      } catch (e) {
        console.warn('Failed to parse saved demo user:', e);
      }
    }

    // Check if device is linked to Drive
    if (isDriveLinkedOnDevice()) {
      setIsDriveLinked(true);
      setSyncStatus('idle');
      const stored = getStoredDriveToken();
      if (stored.token) {
        setGoogleTokenState(stored.token);
      }
      // Attempt silent background renewal if available
      ensureValidGoogleToken(false).then((freshToken) => {
        if (freshToken) {
          setGoogleTokenState(freshToken);
          setSyncStatus('idle');
        }
      }).catch(() => {});
    }

    setLoading(false);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for Google Auth state
  useEffect(() => {
    const unsubGoogle = initGoogleAuth(
      (googleUser, token) => {
        if (token) {
          setGoogleTokenState(token);
          setIsDriveLinked(true);
          setSyncStatus('idle');
        } else if (isDriveLinkedOnDevice()) {
          setIsDriveLinked(true);
          setSyncStatus('idle');
        }
      },
      () => {
        if (!isDriveLinkedOnDevice()) {
          setGoogleTokenState(null);
          setIsDriveLinked(false);
          setSyncStatus('unlinked');
        }
      }
    );
    return unsubGoogle;
  }, []);

  // Synchronize with Google Drive on demand (interactive by default)
  const syncNow = useCallback(
    async (forceDirection?: 'push' | 'pull', isInteractive: boolean = true) => {
      let token = googleToken || getGoogleAccessToken();

      // If token missing or expired, attempt renewal if linked
      if (!token && isDriveLinked) {
        token = await ensureValidGoogleToken(isInteractive);
        if (token) {
          setGoogleTokenState(token);
        }
      }

      // If still no token and user explicitly requested sync, request quick renewal
      if (!token && isDriveLinked && isInteractive) {
        try {
          const res = await signInWithGoogleOAuth(false);
          token = res.accessToken;
          setGoogleTokenState(token);
        } catch (e: any) {
          if (e?.code === 'auth/popup-closed-by-user') {
            return;
          }
          console.warn('Sync token acquisition notice:', e);
        }
      }

      if (!token || !user) {
        return;
      }

      try {
        await syncVaultWithGoogleDrive(token, user.uid, forceDirection);
      } catch (err: any) {
        // If expired during operation and interactive, retry once with fresh token
        if (isInteractive && (err?.message?.includes('session expired') || err?.status === 401)) {
          try {
            const res = await signInWithGoogleOAuth(false);
            token = res.accessToken;
            setGoogleTokenState(token);
            await syncVaultWithGoogleDrive(token, user.uid, forceDirection);
            return;
          } catch (retryErr) {
            console.warn('Retry after token refresh failed:', retryErr);
          }
        }
        console.error('Manual sync failed:', err);
        throw err;
      }
    },
    [googleToken, isDriveLinked, user]
  );

  // Auto-sync on app startup if Drive is linked and user is loaded
  useEffect(() => {
    if (isDriveLinked && user && !user.isDemo) {
      const token = googleToken || getGoogleAccessToken();
      if (token) {
        syncVaultWithGoogleDrive(token, user.uid).catch((err) => {
          console.warn('Startup Drive sync notice:', err);
        });
      }
    }
  }, [isDriveLinked, user?.uid]);

  // Auto-sync debounce on data changes when logged in with Google or Drive is linked
  useEffect(() => {
    const handleDataChanged = () => {
      if (!isDriveLinked || !user || user.isDemo) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        let token = googleToken || getGoogleAccessToken();
        if (!token) {
          token = await ensureValidGoogleToken(false);
          if (token) setGoogleTokenState(token);
        }
        if (!token) return;

        syncVaultWithGoogleDrive(token, user.uid).catch((err) => {
          console.warn('Background Drive auto-sync error:', err);
        });
      }, 1500);
    };

    window.addEventListener(LOCAL_EDIT_EVENT, handleDataChanged);
    return () => {
      window.removeEventListener(LOCAL_EDIT_EVENT, handleDataChanged);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDriveLinked, googleToken, user]);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !pass) {
      throw new Error('Please enter both email and password.');
    }

    const pwdHash = await hashPassword(pass);
    const storedUsersRaw = localStorage.getItem(REGISTERED_USERS_KEY);
    const storedUsers: Record<string, StoredCredential> = storedUsersRaw
      ? JSON.parse(storedUsersRaw)
      : {};

    const existing = storedUsers[cleanEmail];
    if (existing) {
      if (existing.passwordHash !== pwdHash) {
        throw new Error('Incorrect password. Please verify and try again.');
      }
    } else {
      const newUid = generateUserUid(cleanEmail);
      storedUsers[cleanEmail] = {
        uid: newUid,
        email: cleanEmail,
        passwordHash: pwdHash,
        displayName: cleanEmail.split('@')[0],
        createdAt: Date.now(),
      };
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(storedUsers));
    }

    const appUser: AppUser = {
      uid: storedUsers[cleanEmail].uid,
      email: cleanEmail,
      displayName: storedUsers[cleanEmail].displayName || cleanEmail.split('@')[0],
      isDemo: false,
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(appUser));
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(appUser);
    setSyncStatus('unlinked');
  };

  const signup = async (email: string, pass: string) => {
    const cleanEmail = email.toLowerCase().trim();

    if (pass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const storedUsersRaw = localStorage.getItem(REGISTERED_USERS_KEY);
    const storedUsers: Record<string, StoredCredential> = storedUsersRaw
      ? JSON.parse(storedUsersRaw)
      : {};

    if (storedUsers[cleanEmail]) {
      throw new Error('An account with this email already exists. Please Sign In.');
    }

    const pwdHash = await hashPassword(pass);
    const newUid = generateUserUid(cleanEmail);
    const displayName = cleanEmail.split('@')[0];

    storedUsers[cleanEmail] = {
      uid: newUid,
      email: cleanEmail,
      passwordHash: pwdHash,
      displayName,
      createdAt: Date.now(),
    };
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(storedUsers));

    const appUser: AppUser = {
      uid: newUid,
      email: cleanEmail,
      displayName,
      isDemo: false,
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(appUser));
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(appUser);
    setSyncStatus('unlinked');
  };

  const loginWithGoogle = async () => {
    try {
      localStorage.removeItem(DEMO_USER_KEY);
      const { user: gUser, accessToken } = await signInWithGoogleOAuth(false);

      const appUser: AppUser = {
        uid: gUser.uid,
        email: gUser.email,
        displayName: gUser.displayName || gUser.email?.split('@')[0] || 'Google User',
        photoURL: gUser.photoURL,
        isDemo: false,
      };

      setGoogleAccessToken(accessToken);
      setGoogleTokenState(accessToken);
      setIsDriveLinked(true);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(appUser));
      setUser(appUser);
      setSyncStatus('idle');

      // Perform initial bidirectional sync with Google Drive
      try {
        await syncVaultWithGoogleDrive(accessToken, gUser.uid);
      } catch (syncErr) {
        console.warn('Initial Drive sync notice:', syncErr);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed popup - do not log error
        throw err;
      }
      console.warn('Google Sign-In notice:', err?.message || err);
      throw err;
    }
  };

  const quickDemoLogin = async () => {
    const demoUser: AppUser = {
      uid: 'demo-user-guest',
      email: 'demo@ledgerly.app',
      displayName: 'Demo User',
      isDemo: true,
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    localStorage.removeItem(AUTH_SESSION_KEY);
    setUser(demoUser);
  };

  const unlinkDrive = async () => {
    try {
      await signOutGoogle();
    } catch (e) {
      // ignore
    }
    clearDriveAuthSession();
    setGoogleAccessToken(null);
    setGoogleTokenState(null);
    setIsDriveLinked(false);
    setSyncStatus('unlinked');
  };

  const logout = async () => {
    try {
      await signOutGoogle();
    } catch (e) {
      // ignore
    }
    clearDriveAuthSession();
    setGoogleAccessToken(null);
    setGoogleTokenState(null);
    setIsDriveLinked(false);
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
    setSyncStatus('unlinked');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOffline,
        googleToken,
        isDriveLinked,
        syncStatus,
        lastSyncTimestamp,
        syncError,
        login,
        signup,
        loginWithGoogle,
        quickDemoLogin,
        syncNow,
        unlinkDrive,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
