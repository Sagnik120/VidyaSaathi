import { Stack } from 'expo-router';
import { COLORS } from '@/theme/tokens';

/** Focus pages (the classroom) take the whole screen: no tab bar. */
export default function FocusLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.paper } }} />;
}
