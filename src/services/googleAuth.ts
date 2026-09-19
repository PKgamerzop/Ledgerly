import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  Auth,
} from 'firebase/auth';

const firebaseApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
const firebaseProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0847831288').trim();
const firebaseAppId = (import.meta.env.VITE_FIREBASE_APP_ID || '1:204530834598:web:66165d210a84a36266e867').trim();
const firebaseAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${firebaseProjectId}.firebaseapp.com`).trim();
export const GOOGLE_OAUTH_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
  '204530834598-qgbiket6e68flp7lvl2pns4c7h8jjs88.apps.googleusercontent.com'
).trim();

// Lazy initialization for Firebase Auth to avoid crashing when API key is not configured
let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (firebaseAuthInstance) return firebaseAuthInstance;

  // Firebase Auth strictly requires a non-empty API key; if absent, do not initialize
  if (!firebaseApiKey) {
    return null;
  }

  try {
    firebaseAppInstance =
      getApps().length === 0
        ? initializeApp({
            apiKey: firebaseApiKey,
            projectId: firebaseProjectId,
            appId: firebaseAppId,
            authDomain: firebaseAuthDomain,
          })
        : getApp();

    firebaseAuthInstance = getAuth(firebaseAppInstance);
    return firebaseAuthInstance;
  } catch (err) {
    console.warn('Firebase Auth lazy initialization notice:', err);
    return null;
  }
}

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'consent', access_type: 'offline' });

let cachedAccessToken: string | null = null;
let cachedGoogleUser: { uid: string; email: string; displayName: string; photoURL?: string } | null = null;

// Listen to auth state
export const initGoogleAuth = (
  onSuccess?: (user: any, token: string | null) => void,
  onFailure?: () => void
): (() => void) => {
  const authInstance = getFirebaseAuth();

  if (authInstance) {
    try {
      return onAuthStateChanged(authInstance, async (user: User | null) => {
        if (user) {
          if (onSuccess) onSuccess(user, cachedAccessToken);
        } else if (cachedGoogleUser) {
          if (onSuccess) onSuccess(cachedGoogleUser, cachedAccessToken);
        } else {
          cachedAccessToken = null;
          if (onFailure) onFailure();
        }
      });
    } catch (e) {
      console.warn('onAuthStateChanged notice:', e);
    }
  }

  // If Firebase Auth is not active, fallback to cached state
  if (cachedGoogleUser) {
    if (onSuccess) onSuccess(cachedGoogleUser, cachedAccessToken);
  } else {
    if (onFailure) onFailure();
  }

  return () => {};
};

/**
 * Sign in using Google Identity Services (GSI) OAuth 2.0 token client
 * This communicates directly with accounts.google.com without requiring a Firebase API key
 */
async function signInWithGSI(clientId: string): Promise<{ user: any; accessToken: string }> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2?.initTokenClient) {
      return reject(
        new Error('Google Identity Services script is loading. Please wait a moment and try again.')
      );
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES.join(' '),
        prompt: 'consent',
        callback: async (response: any) => {
          if (response.error) {
            if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
              const err = new Error('Sign-in cancelled.');
              (err as any).code = 'auth/popup-closed-by-user';
              return reject(err);
            }
            return reject(new Error(response.error_description || response.error));
          }

          if (!response.access_token) {
            return reject(new Error('No access token received from Google Identity Services.'));
          }

          const accessToken = response.access_token;
          cachedAccessToken = accessToken;

          try {
            // Fetch basic profile info
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = await userRes.json();

            const userInfo = {
              uid: profile.sub || 'usr_g_' + Date.now(),
              email: profile.email || 'google_user@gmail.com',
              displayName: profile.name || profile.email?.split('@')[0] || 'Google User',
              photoURL: profile.picture,
            };

            cachedGoogleUser = userInfo;
            resolve({ user: userInfo, accessToken });
          } catch (profileErr) {
            // Fallback if profile request fails
            const fallbackUser = {
              uid: 'usr_g_' + Date.now(),
              email: 'google_user@gmail.com',
              displayName: 'Google Account',
            };
            cachedGoogleUser = fallbackUser;
            resolve({ user: fallbackUser, accessToken });
          }
        },
      });

      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
}

// Sign in with Google (tries Firebase Auth if configured, otherwise uses direct GSI)
export const signInWithGoogleOAuth = async (): Promise<{ user: any; accessToken: string }> => {
  const authInstance = getFirebaseAuth();

  // 1. If Firebase Auth is configured with an API key, attempt Firebase popup
  if (authInstance) {
    try {
      const result = await signInWithPopup(authInstance, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Google Sign-In completed, but no access token was returned.');
      }
      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      const errorCode = error?.code || '';

      if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
        const cancelErr = new Error('Sign-in cancelled.');
        (cancelErr as any).code = 'auth/popup-closed-by-user';
        throw cancelErr;
      }

      if (errorCode === 'auth/popup-blocked') {
        const blockedErr = new Error(
          'The sign-in popup was blocked by your browser. Please allow popups or open Ledgerly in a new tab.'
        );
        (blockedErr as any).code = 'auth/popup-blocked';
        throw blockedErr;
      }

      // If Firebase domain is unauthorized or API key is invalid, attempt GSI fallback
      if (
        (errorCode === 'auth/unauthorized-domain' ||
          errorCode === 'auth/invalid-api-key' ||
          error?.message?.includes('unauthorized-domain')) &&
        GOOGLE_OAUTH_CLIENT_ID &&
        (window as any).google?.accounts?.oauth2
      ) {
        try {
          const gsiResult = await signInWithGSI(GOOGLE_OAUTH_CLIENT_ID);
          return gsiResult;
        } catch (gsiErr: any) {
          if (gsiErr?.code === 'auth/popup-closed-by-user') {
            throw gsiErr;
          }
          console.warn('GSI fallback notice:', gsiErr);
        }
      }

      throw error;
    }
  }

  // 2. Direct GSI when Firebase Auth is not configured
  if (GOOGLE_OAUTH_CLIENT_ID && (window as any).google?.accounts?.oauth2) {
    return await signInWithGSI(GOOGLE_OAUTH_CLIENT_ID);
  }

  throw new Error(
    'Google Sign-In is initializing. Please ensure Google services are enabled or use local account sign in.'
  );
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogle = async () => {
  const authInstance = getFirebaseAuth();
  if (authInstance) {
    try {
      await signOut(authInstance);
    } catch (e) {
      // ignore
    }
  }
  cachedAccessToken = null;
  cachedGoogleUser = null;
};
