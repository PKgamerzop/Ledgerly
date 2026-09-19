import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

let cachedAccessToken: string | null = null;
let cachedGoogleUser: { uid: string; email: string; displayName: string; photoURL?: string } | null = null;

// Listen to auth state
export const initGoogleAuth = (
  onSuccess?: (user: any, token: string | null) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else if (cachedGoogleUser) {
      if (onSuccess) onSuccess(cachedGoogleUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

/**
 * Sign in using Google Identity Services (GSI) OAuth 2.0 token client
 * This communicates directly with accounts.google.com without going through Firebase's domain whitelist
 */
async function signInWithGSI(clientId: string): Promise<{ user: any; accessToken: string }> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2?.initTokenClient) {
      return reject(new Error('Google Identity Services script is not yet loaded.'));
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES.join(' '),
        prompt: 'select_account',
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

// Sign in with Google (tries GSI first for direct OAuth, falls back to Firebase)
export const signInWithGoogleOAuth = async (): Promise<{ user: any; accessToken: string }> => {
  const oAuthClientId = (firebaseConfig as any).oAuthClientId;

  // 1. Try Google Identity Services (GSI) first if client ID is present
  if (oAuthClientId && (window as any).google?.accounts?.oauth2) {
    try {
      const gsiResult = await signInWithGSI(oAuthClientId);
      return gsiResult;
    } catch (gsiErr: any) {
      // If user cancelled, don't fall through to popup
      if (gsiErr?.code === 'auth/popup-closed-by-user') {
        throw gsiErr;
      }
      console.warn('GSI flow notice, falling back to Firebase Auth:', gsiErr?.message || gsiErr);
    }
  }

  // 2. Fall back to Firebase Auth Popup
  try {
    const result = await signInWithPopup(auth, provider);
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

    if (errorCode === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const domainErr = new Error(
        `Firebase has not authorized domain "${window.location.hostname}". You can sign in with Email & Password or Instant Demo below without any domain setup.`
      );
      (domainErr as any).code = 'auth/unauthorized-domain';
      (domainErr as any).hostname = window.location.hostname;
      throw domainErr;
    }

    console.warn('Google Sign-In notice:', error?.message || error);
    throw error;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    // ignore
  }
  cachedAccessToken = null;
  cachedGoogleUser = null;
};
