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

export const STORAGE_KEYS = {
  DRIVE_LINKED: 'ledgerly_drive_linked',
  ACCESS_TOKEN: 'ledgerly_drive_access_token',
  TOKEN_EXPIRES_AT: 'ledgerly_drive_token_expires_at',
  USER: 'ledgerly_drive_user',
};

let cachedAccessToken: string | null = null;
let cachedGoogleUser: { uid: string; email: string; displayName: string; photoURL?: string } | null = null;

// Initialize from storage on module load
try {
  const savedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const savedExpiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
  if (savedToken && Date.now() < savedExpiresAt - 30000) {
    cachedAccessToken = savedToken;
  }
  const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
  if (savedUser) {
    cachedGoogleUser = JSON.parse(savedUser);
  }
} catch (e) {
  // localStorage might be restricted
}

/**
 * Check if the device is persistently linked to Google Drive
 */
export const isDriveLinkedOnDevice = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.DRIVE_LINKED) === 'true';
  } catch {
    return false;
  }
};

/**
 * Get stored token information including expiry state
 */
export const getStoredDriveToken = (): {
  token: string | null;
  isExpired: boolean;
  expiresAt: number;
} => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT) || '0', 10);
    const isExpired = !token || Date.now() >= expiresAt - 60000;
    return { token, isExpired, expiresAt };
  } catch {
    return { token: null, isExpired: true, expiresAt: 0 };
  }
};

/**
 * Save persistent Drive authentication session to device
 */
export const saveDriveAuthSession = (
  user: any,
  token: string,
  expiresInSecs: number = 3599
) => {
  const expiresAt = Date.now() + Math.max(expiresInSecs - 60, 300) * 1000;
  try {
    localStorage.setItem(STORAGE_KEYS.DRIVE_LINKED, 'true');
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  } catch (e) {
    console.warn('Storage save notice:', e);
  }
  cachedAccessToken = token;
  if (user) {
    cachedGoogleUser = user;
  }
};

/**
 * Clear persistent Drive session (called on manual Sign Out / Unlink)
 */
export const clearDriveAuthSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRIVE_LINKED);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (e) {
    // ignore
  }
  cachedAccessToken = null;
  cachedGoogleUser = null;
};

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
        } else if (cachedGoogleUser && isDriveLinkedOnDevice()) {
          if (onSuccess) onSuccess(cachedGoogleUser, cachedAccessToken);
        } else if (!isDriveLinkedOnDevice()) {
          cachedAccessToken = null;
          if (onFailure) onFailure();
        }
      });
    } catch (e) {
      console.warn('onAuthStateChanged notice:', e);
    }
  }

  // If Firebase Auth is not active, check if Drive is linked on device
  if (isDriveLinkedOnDevice()) {
    const userToReport = cachedGoogleUser || {
      uid: 'google_linked_device_user',
      email: 'drive_linked@google.com',
      displayName: 'Google Drive User',
    };
    if (onSuccess) onSuccess(userToReport, cachedAccessToken);
  } else {
    if (onFailure) onFailure();
  }

  return () => {};
};

/**
 * Sign in or refresh token using Google Identity Services (GSI) OAuth 2.0 token client
 * When prompt is '' (empty), skips consent screen if user previously consented.
 */
async function signInWithGSI(
  clientId: string,
  forceConsent = false
): Promise<{ user: any; accessToken: string }> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2?.initTokenClient) {
      return reject(
        new Error('Google Identity Services script is loading. Please wait a moment and try again.')
      );
    }

    try {
      let userEmail = cachedGoogleUser?.email;
      if (!userEmail) {
        try {
          const storedUserRaw = localStorage.getItem(STORAGE_KEYS.USER);
          if (storedUserRaw) {
            userEmail = JSON.parse(storedUserRaw)?.email;
          }
        } catch (e) {}
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES.join(' '),
        prompt: forceConsent ? 'consent' : '',
        hint: userEmail || undefined,
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
          const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3599;

          try {
            // Fetch basic profile info
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = await userRes.json();

            const userInfo = {
              uid: profile.sub || cachedGoogleUser?.uid || 'usr_g_' + Date.now(),
              email: profile.email || userEmail || 'google_user@gmail.com',
              displayName: profile.name || profile.email?.split('@')[0] || 'Google User',
              photoURL: profile.picture,
            };

            saveDriveAuthSession(userInfo, accessToken, expiresIn);
            resolve({ user: userInfo, accessToken });
          } catch (profileErr) {
            // Fallback if profile request fails
            const fallbackUser = cachedGoogleUser || {
              uid: 'usr_g_' + Date.now(),
              email: userEmail || 'google_user@gmail.com',
              displayName: 'Google Account',
            };
            saveDriveAuthSession(fallbackUser, accessToken, expiresIn);
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

/**
 * Ensure a valid, non-expired Google OAuth token is available.
 * If token is expired and device is linked, seamlessly refreshes token.
 */
export const ensureValidGoogleToken = async (interactive = false): Promise<string | null> => {
  // 1. Check in-memory token
  const stored = getStoredDriveToken();
  if (cachedAccessToken && !stored.isExpired) {
    return cachedAccessToken;
  }

  // 2. Check stored token in localStorage
  if (stored.token && !stored.isExpired) {
    cachedAccessToken = stored.token;
    return stored.token;
  }

  // 3. Token is expired or missing. If device is linked, refresh it
  if (isDriveLinkedOnDevice()) {
    if (interactive && GOOGLE_OAUTH_CLIENT_ID && (window as any).google?.accounts?.oauth2) {
      try {
        const res = await signInWithGSI(GOOGLE_OAUTH_CLIENT_ID, false);
        return res.accessToken;
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user') {
          return null;
        }
        console.warn('Google token renewal notice:', err);
        return null;
      }
    }
  }

  return null;
};

// Sign in with Google (tries Firebase Auth if configured, otherwise uses direct GSI)
export const signInWithGoogleOAuth = async (forceConsent = false): Promise<{ user: any; accessToken: string }> => {
  const authInstance = getFirebaseAuth();

  // 1. If Firebase Auth is configured with an API key, attempt Firebase popup
  if (authInstance) {
    try {
      const result = await signInWithPopup(authInstance, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Google Sign-In completed, but no access token was returned.');
      }
      const accessToken = credential.accessToken;
      saveDriveAuthSession(result.user, accessToken, 3599);
      return { user: result.user, accessToken };
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
          const gsiResult = await signInWithGSI(GOOGLE_OAUTH_CLIENT_ID, forceConsent);
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
    return await signInWithGSI(GOOGLE_OAUTH_CLIENT_ID, forceConsent);
  }

  throw new Error(
    'Google Sign-In is initializing. Please ensure Google services are enabled or use local account sign in.'
  );
};

export const getGoogleAccessToken = (): string | null => {
  const stored = getStoredDriveToken();
  if (cachedAccessToken && !stored.isExpired) {
    return cachedAccessToken;
  }
  if (stored.token && !stored.isExpired) {
    cachedAccessToken = stored.token;
    return stored.token;
  }
  return null;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    saveDriveAuthSession(cachedGoogleUser, token, 3599);
  } else {
    clearDriveAuthSession();
  }
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
  clearDriveAuthSession();
};
