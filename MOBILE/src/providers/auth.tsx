import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, setSessionExpiredHandler, tokens } from '@/core/api';
import type { TokenResponse, User } from '@/core/types';

type Auth = {
  signedIn: boolean;
  user: User | null;
  signIn: (data: TokenResponse) => void;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  refreshUser: () => Promise<User | null>;
};

const Ctx = createContext<Auth | null>(null);

const subscribe = (fn: () => void) => tokens.subscribe(fn) as () => void;
const snapshot = () => (tokens.isSignedIn ? tokens.access ?? '' : '');

export function AuthProvider({ children }: { children: ReactNode }) {
  // The access token as the external store: the UI follows the session.
  const access = useSyncExternalStore(subscribe, snapshot, snapshot);
  const signedIn = Boolean(access);
  const [user, setUserState] = useState<User | null>(() => (tokens.isSignedIn ? tokens.user : null));
  // Cached queries belong to whoever was signed in; drop them whenever that
  // changes so the next user never sees the previous one's data.
  const qc = useQueryClient();

  useEffect(() => {
    if (signedIn) setUserState(tokens.user);
    else { setUserState(null); qc.clear(); }
  }, [signedIn, qc]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      qc.clear();
      router.replace('/login');
    });
  }, [qc]);

  const refreshUser = useCallback(async () => {
    if (!tokens.isSignedIn) return null;
    try {
      const me = await api.me();
      tokens.saveUser(me);
      setUserState(me);
      return me;
    } catch {
      return tokens.user;
    }
  }, []);

  useEffect(() => {
    if (signedIn) void refreshUser();
  }, [signedIn, refreshUser]);

  const value = useMemo<Auth>(
    () => ({
      signedIn,
      user,
      signIn: (data) => {
        qc.clear();
        tokens.save(data);
        setUserState(data.user);
      },
      signOut: async () => {
        await api.logout();
        qc.clear();
        setUserState(null);
      },
      setUser: (u) => {
        tokens.saveUser(u);
        setUserState(u);
      },
      refreshUser,
    }),
    [signedIn, user, refreshUser, qc],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
