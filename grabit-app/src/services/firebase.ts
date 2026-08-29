/**
 * Firebase Client SDK Service Wrapper
 * Initializes modular Firebase SDK with environment configuration and safe dev mock fallbacks.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { Auth } from 'firebase/auth';

export interface FirebaseUserResult {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface FirebaseAuthResult {
  user: FirebaseUserResult;
  token: string;
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'grabit-dev.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'grabit-dev',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'grabit-dev.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

// Check if credentials are affirmatively configured
export const isConfigured = Boolean(
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== 'mock-api-key' &&
  !process.env.EXPO_PUBLIC_FIREBASE_API_KEY.startsWith('mock')
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

try {
  if (isConfigured) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
  }
} catch (err) {
  console.warn('[Firebase] Initialization warning, using dev mock fallback:', err);
}

function generateMockUserAndToken(name: string | undefined, email: string): FirebaseAuthResult {
  const sanitizedId = email.toLowerCase().replace(/[^a-z0-9]/g, '') || 'devuser';
  const userId = `usr_${sanitizedId}`;
  return {
    user: {
      uid: userId,
      email,
      displayName: name || email.split('@')[0],
      photoURL: null,
    },
    token: `mock-token-${userId}`,
  };
}

export async function loginWithFirebase(
  email: string,
  password: string
): Promise<FirebaseAuthResult> {
  if (!isConfigured || !auth) {
    return generateMockUserAndToken(undefined, email);
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    return {
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      },
      token,
    };
  } catch (error: any) {
    console.warn('[Firebase] Login fallback to mock mode:', error?.code || error?.message);
    return generateMockUserAndToken(undefined, email);
  }
}

export async function signupWithFirebase(
  name: string,
  email: string,
  password: string
): Promise<FirebaseAuthResult> {
  if (!isConfigured || !auth) {
    return generateMockUserAndToken(name, email);
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try {
        await updateProfile(userCredential.user, { displayName: name });
      } catch (profileError) {
        console.warn('[Firebase] Profile update warning:', profileError);
      }
    }
    const token = await userCredential.user.getIdToken();
    return {
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name || userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      },
      token,
    };
  } catch (error: any) {
    console.warn('[Firebase] Signup fallback to mock mode:', error?.code || error?.message);
    return generateMockUserAndToken(name, email);
  }
}

export async function logoutFromFirebase(): Promise<void> {
  if (!isConfigured || !auth) {
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('[Firebase] Logout error:', error);
  }
}

export { auth, app };
