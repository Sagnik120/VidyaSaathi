import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react-native';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { Page } from '@/components/layout/page';
import { SpacedReview } from '@/components/lesson/spaced-review';
import { Txt } from '@/components/ui/text';

export default function RefreshPage() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const hi = lang === 'hi';
  return (
    <Page onRefresh={() => qc.invalidateQueries({ queryKey: ['spaced-review'] })}>
      <View style={tw('flex-row items-center gap-3')}>
        <RotateCcw size={36} color={COLORS['marigold-600']} />
        <Txt accessibilityRole="header" style={tw('flex-1 font-display text-5xl text-ink')}>{hi ? 'दोहराई' : 'Refresh'}</Txt>
      </View>
      <Txt style={tw('mt-2 text-ink-2')}>{hi ? 'अवधारणाएँ भूलने से ठीक पहले लौटती हैं। हर एक पर दो छोटे प्रश्न।' : "Concepts come back just before you'd forget them. Two quick questions each."}</Txt>
      <SpacedReview />
    </Page>
  );
}
