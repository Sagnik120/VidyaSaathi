import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ApiError } from '@/core/api';
import { AuthProvider } from './auth';
import { I18nProvider } from './i18n';

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            // Don't hammer a server that said "no": only retry network blips.
            retry: (count, error) => count < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
          },
        },
      }),
  );

  // "Window focus" on a phone is the app coming back to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
