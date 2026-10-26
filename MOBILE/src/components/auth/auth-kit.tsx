/** Small shared pieces for the auth screens. */
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { Logo } from '@/components/brand/logo';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { EASE_OUT, Reveal } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';

export type PendingOtp = { email: string; code?: string; purpose: 'verify_email' | 'reset_password'; staff?: boolean };

/** The demo code travels in memory between two screens, never in the URL. */
let pending: PendingOtp | null = null;
export const pendingOtp = {
  save(p: PendingOtp) { pending = p; },
  load(): PendingOtp | null { return pending; },
  clear() { pending = null; },
};

export const errText = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error ? e.message : fallback);

/** Auth pages: the logo and language switch above a calm, single form. */
export function AuthScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw('flex-1 bg-paper')}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[tw('grow px-5'), { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={tw('flex-row items-center justify-between')}>
          <Press href="/" replace accessibilityLabel="VidyaSaathi" hitSlop={8}><Logo size={30} withWord={false} /></Press>
          <LanguageToggle />
        </View>
        <View style={[tw('w-full flex-1 justify-center self-center py-10'), { maxWidth: 448 }]}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthHeading({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <Reveal y={10} duration={0.5} style={tw('mb-8')}>
      <Txt accessibilityRole="header" style={[tw('font-display text-ink'), { fontSize: 41.6, lineHeight: 44 }]}>{title}</Txt>
      {sub ? <Txt style={tw('mt-2 text-ink-2')}>{sub}</Txt> : null}
    </Reveal>
  );
}

export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <Reveal y={-4} duration={0.3}>
      <View accessibilityRole="alert" style={[tw('rounded-2xl border px-4 py-3'), { borderColor: color('rose', 0.3), backgroundColor: color('rose', 0.05) }]}>
        <Txt style={tw('text-sm text-rose')} testID="form-alert">{children}</Txt>
      </View>
    </Reveal>
  );
}

export function scorePassword(pw: string) {
  if (pw.length < 8) return 0;
  let s = 0;
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s++;
  if (/[^a-z0-9]/i.test(pw) || /[A-Z]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  return Math.max(1, s);
}

export function passwordOk(pw: string) {
  return scorePassword(pw) > 0 && /\d/.test(pw) && /[a-z]/i.test(pw);
}

function StrengthBar({ on, tint }: { on: boolean; tint: string }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => { p.set(withTiming(on ? 1 : 0, { duration: 350, easing: EASE_OUT })); }, [on, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={tw('h-1.5 flex-1 overflow-hidden rounded-full bg-line')}>
      <Animated.View style={[tw('h-full rounded-full'), { backgroundColor: tint }, fill]} />
    </View>
  );
}

export function StrengthMeter({ password }: { password: string }) {
  const { t } = useI18n();
  const s = scorePassword(password);
  const tints = [COLORS.rose, COLORS.amber, COLORS['sky-500'], COLORS.sage];
  return (
    <View style={tw('mt-2')} accessibilityLiveRegion="polite">
      <View style={tw('flex-row gap-1.5')}>
        {[0, 1, 2].map((i) => <StrengthBar key={i} on={!!password && i < Math.max(s, 1)} tint={tints[s]} />)}
      </View>
      <Txt style={tw('mt-1.5 text-xs text-ink-3')}>{password ? t(`auth.strength${s}` as 'auth.strength0') : t('auth.passwordRule')}</Txt>
    </View>
  );
}

/** On-screen demo code (no email is sent) with a one-tap fill. */
export function DemoCode({ code, onFill }: { code?: string; onFill: () => void }) {
  const { t } = useI18n();
  if (!code) return null;
  return (
    <Reveal y={8} duration={0.5} rotate={-0.5} style={tw('mb-6')}>
      <View style={[tw('rounded-2xl border px-5 py-4 -rotate-1'), { borderColor: color('amber', 0.4), backgroundColor: 'rgba(251, 240, 217, 0.7)', boxShadow: SHADOW.soft }]}>
        <View style={[tw('absolute left-6 h-5 w-16 rounded-sm'), { top: -10, backgroundColor: color('marigold', 0.4), transform: [{ rotate: '-4deg' }] }]} />
        <Txt style={tw('text-sm text-ink-2')}>{t('auth.demoCode')}</Txt>
        <View style={tw('mt-1 flex-row items-center justify-between gap-3')}>
          <Txt testID="demo-code" style={[tw('font-display text-3xl text-ink'), { letterSpacing: 9 }]}>{code}</Txt>
          <Press onPress={onFill} style={[tw('rounded-xl bg-surface px-3 py-1.5'), { boxShadow: SHADOW.soft }]} activeStyle={{ backgroundColor: COLORS['sky-50'] }} testID="demo-fill">
            <Txt style={tw('text-sm font-medium text-sky-700')}>{t('auth.fillForMe')}</Txt>
          </Press>
        </View>
      </View>
    </Reveal>
  );
}

/** Resend with a 30s cooldown. */
export function useCooldown(seconds = 30) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return { left, restart: () => setLeft(seconds) };
}

/** A text link with a finger-sized target, in the form's own voice. */
export function TextLink({ children, onPress, tone = 'sky', weight = '500', testID }: {
  children: ReactNode; onPress: () => void; tone?: 'sky' | 'muted'; weight?: '400' | '500'; testID?: string;
}) {
  return (
    <Press onPress={onPress} scaleTo={1} hitSlop={10} testID={testID} accessibilityRole="link" activeStyle={{ opacity: 0.6 }}>
      <Txt style={{ color: tone === 'sky' ? COLORS['sky-700'] : COLORS['ink-3'], fontWeight: weight, fontSize: 14, lineHeight: 20 }}>{children}</Txt>
    </Press>
  );
}

/** "New here? Create an account" — a sentence that ends in a link, centred, wrapping together. */
export function LinkLine({ lead, children }: { lead: string; children: ReactNode }) {
  return (
    <View style={tw('flex-row flex-wrap items-center justify-center gap-x-1.5')}>
      <Txt style={tw('text-center text-sm text-ink-2')}>{lead}</Txt>
      {children}
    </View>
  );
}
