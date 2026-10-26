/**
 * Runs before the shared API client is evaluated (see ./api.ts). The client was
 * written framework-free for exactly this: it only needs somewhere to keep the
 * session and the address of the backend.
 *
 *  - storage: the client talks to `localStorage`. On a phone that becomes the
 *    device keychain / keystore (expo-secure-store), behind the same interface.
 *  - backend: the client reads NEXT_PUBLIC_BACKEND_URL. Here it comes from
 *    EXPO_PUBLIC_BACKEND_URL, or — while developing — from the computer that
 *    is serving this app, so a phone on the same Wi-Fi needs no configuration.
 */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/* -- storage --------------------------------------------------------------- */

type KeyValue = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

function secureStorage(): KeyValue {
  // Reads are served from memory after the first hit, so a request never
  // waits on the keychain. An empty string means "removed": writing it is
  // synchronous, so a sign-out can never race the sign-in that follows it.
  const cache = new Map<string, string>();
  return {
    getItem(key) {
      if (!cache.has(key)) {
        let stored: string | null = null;
        try { stored = SecureStore.getItem(key); } catch { /* unreadable: treat as signed out */ }
        cache.set(key, stored ?? '');
      }
      return cache.get(key) || null;
    },
    setItem(key, value) {
      cache.set(key, String(value));
      try { SecureStore.setItem(key, String(value)); } catch { /* the session lasts until the app closes */ }
    },
    removeItem(key) {
      cache.set(key, '');
      try { SecureStore.setItem(key, ''); } catch { /* nothing to clean up */ }
    },
  };
}

function memoryStorage(): KeyValue {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
  };
}

const globals = globalThis as unknown as { localStorage?: KeyValue; sessionStorage?: KeyValue };
if (Platform.OS !== 'web') {
  globals.localStorage = secureStorage();
  globals.sessionStorage = memoryStorage();
}

/** The same store the API client uses — for the app's own small preferences. */
export const storage: KeyValue = {
  getItem: (key) => { try { return globals.localStorage?.getItem(key) ?? null; } catch { return null; } },
  setItem: (key, value) => { try { globals.localStorage?.setItem(key, value); } catch { /* not persisted */ } },
  removeItem: (key) => { try { globals.localStorage?.removeItem(key); } catch { /* nothing to remove */ } },
};

/* -- backend address ------------------------------------------------------- */

const BACKEND_PORT = 8000;

function developmentHost(): string | null {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : null;
  }
  // "192.168.1.20:8081" while running under `expo start`; absent in a built app.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host || null;
}

function resolveBackendOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const host = developmentHost();
  return host ? `http://${host}:${BACKEND_PORT}` : `http://localhost:${BACKEND_PORT}`;
}

export const RESOLVED_BACKEND_ORIGIN = resolveBackendOrigin();
process.env.NEXT_PUBLIC_BACKEND_URL = RESOLVED_BACKEND_ORIGIN;
