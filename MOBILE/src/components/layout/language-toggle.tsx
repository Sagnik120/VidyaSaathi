/** EN / हिं pill with a sliding paper background — every string switches, nothing reflows away. */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LANGS } from '@/core/i18n';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { SlidingPill } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

export function LanguageToggle({ style }: { style?: StyleProp<ViewStyle> }) {
  const { lang, setLang, t } = useI18n();
  return (
    <View style={[tw('self-start rounded-full border border-line bg-paper-2 p-0.5'), style]}>
      <SlidingPill
        value={lang}
        onChange={setLang}
        accessibilityLabel={t('common.language')}
        stretch={false}
        items={LANGS.map((l) => ({ value: l.code, label: l.short }))}
        style={tw('flex-row')}
        itemStyle={tw('min-w-11 items-center rounded-full px-3 py-1')}
        pillStyle={[tw('rounded-full bg-surface'), { boxShadow: SHADOW.soft }]}
        renderItem={(item, active) => (
          <Txt style={[tw('text-xs font-semibold'), { color: active ? COLORS.ink : COLORS['ink-3'] }]}>{item.label}</Txt>
        )}
      />
    </View>
  );
}
