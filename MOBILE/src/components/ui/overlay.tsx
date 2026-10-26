/**
 * Dialogs and bottom sheets. Both dim the page, close on a backdrop tap or
 * the Android back button, and animate in and out with the house easing.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { EASE_OUT } from '@/components/motion';
import { Portal } from './portal';

/** Keeps content mounted while it animates out. `p` runs 0 → 1 → 0. */
function usePresence(open: boolean, duration: number) {
  const [mounted, setMounted] = useState(open);
  const p = useSharedValue(0);
  useEffect(() => {
    if (open) {
      setMounted(true);
      p.set(withTiming(1, { duration, easing: EASE_OUT }));
    } else {
      p.set(withTiming(0, { duration: duration * 0.7, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      }));
    }
  }, [open, duration, p]);
  return { mounted: mounted || open, p };
}

function useBackToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [open, onClose]);
}

function Backdrop({ p, onPress, tint = 0.25 }: { p: { value: number }; onPress: () => void; tint?: number }) {
  const animated = useAnimatedStyle(() => ({ opacity: p.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color('ink', tint) }, animated]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessibilityLabel="Close" />
    </Animated.View>
  );
}

/** A centred card (the website's in-page dialogs). */
export function Dialog({ open, onClose, children, style, dismissable = true, maxWidth = 448, align = 'center', tint }: {
  open: boolean; onClose: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; dismissable?: boolean; maxWidth?: number;
  /** 'top' hangs the card below the status bar (the command palette) */
  align?: 'center' | 'top'; tint?: number;
}) {
  const { mounted, p } = usePresence(open, 280);
  const insets = useSafeAreaInsets();
  useBackToClose(open && dismissable, onClose);
  const card = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 14 }, { scale: 0.96 + 0.04 * p.value }],
  }));
  if (!mounted) return null;
  return (
    <Portal>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[StyleSheet.absoluteFill, tw('items-center px-4'), align === 'top' ? { justifyContent: 'flex-start', paddingTop: insets.top + 56 } : { justifyContent: 'center' }]}
      >
        <Backdrop p={p} tint={tint} onPress={() => dismissable && onClose()} />
        <Animated.View accessibilityViewIsModal style={[tw('w-full rounded-[26px] border border-line bg-surface p-6'), { maxWidth, boxShadow: SHADOW.lift }, style, card]}>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Portal>
  );
}

/** A panel that rises from the bottom edge (pickers, the question on a phone). */
export function Sheet({ open, onClose, children, style, dismissable = true, scroll = true, dim = 0.25 }: {
  open: boolean; onClose: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; dismissable?: boolean; scroll?: boolean; dim?: number;
}) {
  const { mounted, p } = usePresence(open, 380);
  const insets = useSafeAreaInsets();
  useBackToClose(open && dismissable, onClose);
  const panel = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ translateY: (1 - p.value) * 60 }] }));
  if (!mounted) return null;
  const body = <View style={[tw('px-5 pt-3'), { paddingBottom: Math.max(insets.bottom, 12) + 8 }, style]}>{children}</View>;
  return (
    <Portal>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, tw('justify-end')]}>
        <Backdrop p={p} tint={dim} onPress={() => dismissable && onClose()} />
        <Animated.View accessibilityViewIsModal style={[tw('rounded-t-[26px] border border-line bg-surface'), { maxHeight: '88%', boxShadow: SHADOW.lift }, panel]}>
          <View style={tw('items-center pt-2.5')}><View style={tw('h-1 w-10 rounded-full bg-line-2')} /></View>
          {scroll ? <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>{body}</ScrollView> : body}
        </Animated.View>
      </KeyboardAvoidingView>
    </Portal>
  );
}

/** A full-height panel that slides in from the right edge (a detail view over a list). */
export function Drawer({ open, onClose, children, maxWidth = 512 }: { open: boolean; onClose: () => void; children: ReactNode; maxWidth?: number }) {
  const { mounted, p } = usePresence(open, 340);
  const insets = useSafeAreaInsets();
  useBackToClose(open, onClose);
  const panel = useAnimatedStyle(() => ({ transform: [{ translateX: `${(1 - p.value) * 100}%` }] }));
  if (!mounted) return null;
  return (
    <Portal>
      <View style={[StyleSheet.absoluteFill, tw('items-end')]}>
        <Backdrop p={p} tint={0.3} onPress={onClose} />
        <Animated.View accessibilityViewIsModal style={[tw('h-full w-full bg-paper'), { maxWidth, boxShadow: SHADOW.lift }, panel]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={[tw('p-6'), { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Portal>
  );
}
