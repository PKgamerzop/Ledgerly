import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase/config';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isOffline: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEMO_USER_KEY = 'ledgerly_demo_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    // Monitor online/offline network status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if demo user is stored in localStorage
    const savedDemoUser = localStorage.getItem(DEMO_USER_KEY);
    let initialDemoUser: AppUser | null = null;
    if (savedDemoUser) {
      try {
        initialDemoUser = JSON.parse(savedDemoUser);
      } catch (e) {
        console.warn('Failed to parse saved demo user:', e);
      }
    }

    // Monitor Firebase Auth state (persistent across browser reloads)
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          photoURL: currentUser.photoURL,
          isDemo: false,
        });
        localStorage.removeItem(DEMO_USER_KEY);
      } else if (initialDemoUser) {
        setUser(initialDemoUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    localStorage.removeItem(DEMO_USER_KEY);
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    setUser({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      photoURL: result.user.photoURL,
      isDemo: false,
    });
  };

  const signup = async (email: string, pass: string) => {
    localStorage.removeItem(DEMO_USER_KEY);
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    setUser({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      photoURL: result.user.photoURL,
      isDemo: false,
    });
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem(DEMO_USER_KEY);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    setUser({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      photoURL: result.user.photoURL,
      isDemo: false,
    });
  };

  const quickDemoLogin = async () => {
    // Provide instant responsive demo account that stores locally and never throws operation-not-allowed
    const demoUser: AppUser = {
      uid: 'demo-user-guest',
      email: 'demo@ledgerly.app',
      displayName: 'Demo User',
      isDemo: true,
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = async () => {
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOffline,
        login,
        signup,
        loginWithGoogle,
        quickDemoLogin,
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
