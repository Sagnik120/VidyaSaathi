import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { useI18n } from '@/providers/i18n';
import { Button, type IconType } from './button';
import { Dialog } from './overlay';
import { Txt } from './text';

/* In-app replacement for a system confirm: back / backdrop cancel, and the
   confirm button shows progress while the action runs. */
export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, icon: Icon = Trash2 }: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  icon?: IconType;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    const step = (deg: number) => withTiming(deg, { duration: 100 });
    wiggle.set(withDelay(150, withSequence(step(-12), step(10), step(-6), step(0))));
  }, [open, wiggle]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));

  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} dismissable={!busy}>
      <Animated.View style={[tw('h-11 w-11 items-center justify-center rounded-full bg-rose-100'), iconStyle]}>
        <Icon size={20} color={COLORS.rose} />
      </Animated.View>
      <Txt accessibilityRole="header" style={tw('mt-4 font-display text-2xl text-ink')}>{title}</Txt>
      {body ? <Txt style={tw('mt-1.5 text-sm text-ink-2')}>{body}</Txt> : null}
      <View style={tw('mt-6 flex-row justify-end gap-2')}>
        <Button variant="ghost" onPress={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant="danger" onPress={run} status={busy ? 'loading' : 'idle'} icon={Trash2} testID="confirm-action">{confirmLabel ?? t('common.delete')}</Button>
      </View>
    </Dialog>
  );
}
