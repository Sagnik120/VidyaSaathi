import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth';
import { FONT_ASSETS } from '@/theme/fonts';
import { COLORS } from '@/theme/tokens';
import { PageLoader } from '@/components/brand/page-loader';
import { PortalHost } from '@/components/ui/portal';
import { Toaster } from '@/components/ui/toast';

// The native splash stays up until the fonts are ready; then our own
// loader (the page folding into a plane) takes over.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(FONT_ASSETS);
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: COLORS.paper }}>
        <RootNavigator />
        <PortalHost />
        <Toaster />
        <PageLoader />
      </View>
    </AppProviders>
  );
}

function RootNavigator() {
  const { signedIn } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.paper } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      {/* Signed-out visitors can't reach the app; signing out lands back on the welcome page. */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(focus)" />
      </Stack.Protected>
    </Stack>
  );
}
