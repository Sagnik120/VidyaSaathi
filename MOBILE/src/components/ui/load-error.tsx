import { View, type StyleProp, type ViewStyle } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { tw } from '@/theme/tw';
import { useI18n } from '@/providers/i18n';
import { Button } from './button';
import { Txt } from './text';

/** Shown instead of an endless skeleton when a request fails. */
export function LoadError({ onRetry, style }: { onRetry: () => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  return (
    <View style={[tw('items-center gap-3 rounded-2xl border border-dashed border-line-2 px-6 py-10'), style]}>
      <Txt style={[tw('text-center text-sm text-ink-2'), { maxWidth: 384 }]}>{t('common.loadFailed')}</Txt>
      <Button size="sm" variant="outline" onPress={onRetry} icon={RefreshCw} style={{ alignSelf: 'center' }}>{t('common.retry')}</Button>
    </View>
  );
}
