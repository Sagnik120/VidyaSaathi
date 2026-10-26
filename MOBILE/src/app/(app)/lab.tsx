import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Brain, Code2, Eye, FlaskConical, Mountain, Spline, Trophy } from 'lucide-react-native';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { CHALLENGES, CodeChallenges, readSolved } from '@/components/lab/code-challenge';
import { LABS, Lab, type LabId } from '@/components/lab/labs';
import { Page } from '@/components/layout/page';
import type { IconType } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { Card, SlidingPill } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

type Tab = 'sim' | 'code';

const META: Record<LabId, { icon: IconType; en: string; hi: string }> = {
  gd: { icon: Mountain, en: 'How a model walks downhill to learn', hi: 'मॉडल ढलान पर चलकर कैसे सीखता है' },
  fit: { icon: Spline, en: 'When memorising beats understanding', hi: 'जब रटना समझ से आगे निकल जाए' },
  neuron: { icon: Brain, en: 'Draw one line to split the data', hi: 'एक रेखा से डेटा बाँटिए' },
  attn: { icon: Eye, en: 'Which words a word looks at', hi: 'एक शब्द किन शब्दों को देखता है' },
};

export default function LabPage() {
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const params = useLocalSearchParams<{ sim?: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>('sim');
  const [sim, setSim] = useState<LabId>('gd');
  const [solved, setSolved] = useState(() => readSolved().length);
  const onSolved = useCallback((n: number) => setSolved(n), []);

  // Opened from a path step (/lab?sim=…) or a link to the challenges (/lab?tab=code).
  useEffect(() => {
    if (LABS.some((l) => l.id === params.sim)) { setSim(params.sim as LabId); setTab('sim'); }
    if (params.tab === 'code') setTab('code');
  }, [params.sim, params.tab]);

  const current = LABS.find((l) => l.id === sim)!;

  return (
    <Page style={tw('gap-6')}>
      <View style={tw('gap-4 pb-2')}>
        <View>
          <View style={tw('flex-row items-center gap-3')}>
            <FlaskConical size={36} color={COLORS['sky-600']} />
            <Txt accessibilityRole="header" style={tw('flex-1 font-display text-5xl text-ink')}>{hi ? 'प्रैक्टिस लैब' : 'Practice Lab'}</Txt>
          </View>
          <Txt style={tw('mt-2 text-ink-2')}>{hi ? 'AI को करके सीखें: अनुमान लगाइए, चलाइए, फिर कोड लिखकर साबित कीजिए।' : 'Learn AI by doing: predict, run it, then prove it in code.'}</Txt>
        </View>
        <View style={tw('flex-row items-center gap-2 self-start rounded-full border border-line bg-surface px-4 py-2')}>
          <Trophy size={16} color={COLORS['marigold-600']} />
          <Txt testID="solved-count" style={tw('text-sm font-semibold text-ink')}>{solved}/{CHALLENGES.length}</Txt>
          <Txt style={tw('text-sm text-ink-2')}>{hi ? 'चुनौतियाँ हल' : 'challenges solved'}</Txt>
        </View>
      </View>

      <View style={tw('self-start rounded-2xl border border-line bg-paper-2 p-1')}>
        <SlidingPill<Tab>
          value={tab}
          onChange={setTab}
          stretch={false}
          items={[{ value: 'sim' }, { value: 'code' }]}
          style={tw('flex-row')}
          itemStyle={tw('rounded-xl px-4 py-2')}
          pillStyle={[tw('rounded-xl bg-surface'), { boxShadow: SHADOW.soft }]}
          renderItem={(item, active) => {
            const tint = active ? COLORS.ink : COLORS['ink-3'];
            return (
              <View style={tw('flex-row items-center gap-2')} testID={`lab-tab-${item.value}`}>
                {item.value === 'sim' ? <FlaskConical size={16} color={tint} /> : <Code2 size={16} color={tint} />}
                <Txt style={[tw('text-sm font-medium'), { color: tint }]}>{item.value === 'sim' ? (hi ? 'सिमुलेशन' : 'Simulations') : (hi ? 'कोड चुनौतियाँ' : 'Code challenges')}</Txt>
              </View>
            );
          }}
        />
      </View>

      {tab === 'sim' ? (
        <View style={tw('gap-5')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={tw('gap-2 px-4 pb-1')}>
            {LABS.map((l) => {
              const on = sim === l.id;
              const Icon = META[l.id].icon;
              return (
                <Press key={l.id} onPress={() => { haptic.tap(); setSim(l.id); }} testID={`lab-${l.id}`}
                  style={[tw('flex-row items-center gap-3 rounded-2xl border px-3 py-2.5'),
                    on ? { borderColor: '#7fa5dd', backgroundColor: COLORS['sky-50'], boxShadow: SHADOW.soft } : { borderColor: COLORS.line, backgroundColor: COLORS.surface }]}>
                  <View style={[tw('h-7 w-7 items-center justify-center rounded-lg'), { backgroundColor: on ? COLORS['sky-600'] : COLORS['paper-3'] }]}>
                    <Icon size={16} color={on ? COLORS.white : COLORS['ink-3']} />
                  </View>
                  <Txt style={tw('text-sm font-medium text-ink')}>{hi ? l.hi : l.en}</Txt>
                </Press>
              );
            })}
          </ScrollView>
          <Card style={tw('p-5')}>
            <Txt style={tw('font-display text-3xl text-ink')}>{hi ? current.hi : current.en}</Txt>
            <Txt style={tw('mb-5 mt-1 text-sm text-ink-2')}>{hi ? META[sim].hi : META[sim].en}</Txt>
            <Lab key={sim} id={sim} />
          </Card>
        </View>
      ) : (
        <CodeChallenges onSolvedChange={onSolved} />
      )}
    </Page>
  );
}
