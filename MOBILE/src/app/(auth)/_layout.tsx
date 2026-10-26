import { Stack } from 'expo-router';
import { COLORS } from '@/theme/tokens';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.paper } }} />;
}
