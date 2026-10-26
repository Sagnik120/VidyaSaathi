/**
 * The VidyaSaathi API client — the website's own client, shared as-is, plus the
 * few things only a phone needs (files picked from the device, media that
 * must carry the session). `./setup` has to run first: it gives the client
 * its storage and the backend address.
 */
import './setup';

import { Platform } from 'react-native';
import { ApiError, BACKEND_ORIGIN, api, tokens } from '../../../FRONTEND/src/core/api';
import type { DocumentInfo, User } from './types';

export * from '../../../FRONTEND/src/core/api';
export { RESOLVED_BACKEND_ORIGIN, storage } from './setup';

/** A file chosen on the device. On the web build `file` is the browser's own File. */
export type PickedFile = { uri: string; name: string; mimeType?: string | null; file?: File | null };

/** What FormData needs: a real File on the web, a { uri, name, type } descriptor on a phone. */
function formPart(picked: PickedFile): File {
  if (Platform.OS === 'web' && picked.file) return picked.file;
  return { uri: picked.uri, name: picked.name, type: picked.mimeType || 'application/octet-stream' } as unknown as File;
}

export const uploads = {
  document: (picked: PickedFile, onProgress?: (pct: number) => void): Promise<DocumentInfo> =>
    api.uploadDocument(formPart(picked), onProgress),
  avatar: (picked: PickedFile): Promise<User> => api.uploadAvatar(formPart(picked)),
};

export const absoluteUrl = (url: string) => (url.startsWith('http') ? url : `${BACKEND_ORIGIN}${url}`);

function accessExpiresSoon(): boolean {
  const token = tokens.access;
  if (!token) return true;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(globalThis.atob(part)) as { exp?: number };
    return !exp || exp * 1000 - Date.now() < 90_000;
  } catch {
    return false; // not a readable JWT: let the server decide
  }
}

/**
 * Media is fetched by the player, not by `request`, so it can't refresh an
 * expired session by itself. Asking for the profile first lets the client's
 * normal 401 → refresh → retry run when the token is about to lapse.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  if (accessExpiresSoon() && tokens.refresh) {
    try { await api.me(); } catch { /* the player will surface the failure */ }
  }
  return tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {};
}

/** Owner-scoped text (captions, notes export) with the session attached. */
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(absoluteUrl(url), { headers: await authHeaders() });
  if (!res.ok) throw new ApiError('media', res.status, null);
  return res.text();
}

/** What a video player needs to play owner-scoped media. Call `release` when done with it. */
export type PlayableMedia = { uri: string; headers?: Record<string, string>; release?: () => void };

/**
 * A lesson video, ready for the player. A phone's player streams it straight
 * from the server with the session attached; the web build can't send headers
 * from a <video>, so it downloads the file first, exactly as the website does.
 */
export async function playableMedia(url: string): Promise<PlayableMedia> {
  if (Platform.OS === 'web') {
    const uri = await api.mediaObjectUrl(url);
    return { uri, release: () => URL.revokeObjectURL(uri) };
  }
  return { uri: absoluteUrl(url), headers: await authHeaders() };
}
