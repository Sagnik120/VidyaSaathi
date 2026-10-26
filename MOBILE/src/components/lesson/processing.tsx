import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, FileText, Loader2, Sparkles, Type } from 'lucide-react-native';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { ProgressBar, Reveal, Spin } from '@/components/motion';
import { Txt } from '@/components/ui/text';

/* Seconds since mount, ticking every 250 ms; drives the server-side stages,
   which report no progress of their own. */
function useElapsed(active = true) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => setS((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

function Steps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <View style={tw('mt-4 gap-2')}>
      {steps.map((label, i) => {
        const done = i < active, now = i === active;
        return (
          <View key={label} style={tw('flex-row items-center gap-3')}>
            <View style={[tw('h-5 w-5 items-center justify-center rounded-full border'),
              done ? { borderColor: COLORS.sage, backgroundColor: COLORS['sage-100'] } : now ? { borderColor: '#7fa5dd' } : { borderColor: COLORS.line }]}>
              {done ? <Check size={12} color={COLORS.sage} /> : now ? <Spin><Loader2 size={12} color={COLORS['sky-600']} /></Spin> : null}
            </View>
            <Txt style={[tw('flex-1 text-sm'), { color: done ? COLORS['ink-2'] : now ? COLORS.ink : COLORS['ink-3'], fontWeight: now ? '500' : '400' }]}>{label}</Txt>
          </View>
        );
      })}
    </View>
  );
}

const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/* ── document upload ───────────────────────────────────────────────────── */

/** The light bar sweeping down a page while it's being read. */
function Scanner({ fast }: { fast: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(0);
    p.set(withRepeat(withTiming(1, { duration: fast ? 1100 : 1800, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(p);
  }, [p, fast]);
  const style = useAnimatedStyle(() => ({ top: -13 + 77 * p.value }));
  return (
    <Animated.View style={[tw('absolute inset-x-0 h-4'), style]}>
      <LinearGradient colors={['rgba(156,188,232,0)', 'rgba(156,188,232,0.6)', 'rgba(156,188,232,0)']} style={tw('flex-1')} />
    </Animated.View>
  );
}

export function UploadProgress({ name, size, pct }: { name: string; size?: number; pct: number }) {
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const uploaded = pct >= 100;
  const since = useElapsed(uploaded);
  // Upload fills the first 60%; server work then eases toward 96% until it answers.
  const overall = uploaded ? 60 + 36 * (1 - Math.exp(-since / 9)) : pct * 0.6;
  const stage = !uploaded ? 0 : since < 3 ? 1 : since < 7 ? 2 : 3;
  const steps = hi
    ? [`अपलोड हो रहा है · ${pct}%`, 'पन्ने पढ़े जा रहे हैं', 'अध्याय और विषय पहचाने जा रहे हैं', 'खोज के लिए इंडेक्स बन रहा है']
    : [`Uploading · ${pct}%`, 'Reading the pages', 'Finding chapters and key terms', 'Building the search index'];

  return (
    <View style={tw('rounded-3xl border border-line bg-surface p-5')} accessibilityLiveRegion="polite" testID="upload-progress">
      <View style={tw('flex-row items-center gap-4')}>
        {/* a page being scanned */}
        <View style={tw('h-16 w-12 overflow-hidden rounded-lg border border-line-2 bg-paper')}>
          {[0, 1, 2, 3, 4].map((i) => <View key={i} style={[tw('absolute rounded bg-line-2'), { left: 8, right: i === 4 ? 18 : 8, top: 10 + i * 9, height: 3 }]} />)}
          <Scanner fast={uploaded} />
        </View>
        <View style={tw('min-w-0 flex-1')}>
          <Txt numberOfLines={1} style={tw('font-medium text-ink')}>{name}</Txt>
          <Txt style={tw('text-xs text-ink-3')}>{size ? `${kb(size)} · ` : ''}{Math.round(overall)}%</Txt>
          <ProgressBar value={overall} duration={0.4} style={tw('mt-2')} />
        </View>
      </View>
      <Steps steps={steps} active={stage} />
      {uploaded && since > 12 && (
        <Txt style={tw('mt-3 text-xs text-ink-3')}>{hi ? 'बड़ी फ़ाइलों में एक मिनट तक लग सकता है।' : 'Large files can take up to a minute.'}</Txt>
      )}
    </View>
  );
}

/* ── plan generation ───────────────────────────────────────────────────── */

function Dot({ delay }: { delay: number }) {
  const p = useSharedValue(0.2);
  useEffect(() => {
    p.set(withDelay(delay * 1000, withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0.2, { duration: 600 })), -1, false)));
    return () => cancelAnimation(p);
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: p.value }));
  return <Animated.View style={[tw('h-1.5 w-1.5 rounded-full'), { backgroundColor: '#7fa5dd' }, style]} />;
}

function ThinkingNode() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })), -1, false));
    return () => cancelAnimation(p);
  }, [p]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * p.value }] }));
  return (
    <Animated.View style={[tw('h-11 w-11 items-center justify-center rounded-full border border-sky-200 bg-sky-50'), style]}>
      <Sparkles size={20} color={COLORS['sky-600']} />
    </Animated.View>
  );
}

export function PlanBuilding({ source, label, terms = [], level, minutes }: {
  source: 'topic' | 'doc'; label: string; terms?: string[]; level: string; minutes: number;
}) {
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const since = useElapsed();
  const steps = source === 'doc'
    ? (hi ? ['आपका दस्तावेज़ पढ़ना', 'मुख्य अवधारणाएँ चुनना', `${level} स्तर के लिए क्रम तय करना`, 'चेकपॉइंट प्रश्न रखना']
          : ['Reading your document', 'Picking the key concepts', `Ordering them for a ${level} learner`, 'Placing checkpoint questions'])
    : (hi ? ['विषय समझना', 'पूर्व-ज्ञान का नक्शा बनाना', `${minutes} मिनट में फिट करना`, 'चेकपॉइंट प्रश्न रखना']
          : ['Understanding the topic', 'Mapping what comes first', `Fitting it into ${minutes} minutes`, 'Placing checkpoint questions']);
  const active = Math.min(steps.length - 1, Math.floor(since / 3.2));
  const chips = terms.slice(0, 6);
  const rows = Math.min(5, 1 + Math.floor(since / 1.6));

  return (
    <Reveal y={8} duration={0.4} style={tw('w-full rounded-3xl border border-line bg-surface p-5')}>
      <View accessibilityLiveRegion="polite" testID="plan-building" style={tw('gap-3')}>
        {/* input */}
        <View style={tw('rounded-2xl border border-line bg-paper p-3')}>
          <View style={tw('flex-row items-center gap-2')}>
            {source === 'doc' ? <FileText size={14} color={COLORS['ink-3']} /> : <Type size={14} color={COLORS['ink-3']} />}
            <Txt style={tw('text-xs text-ink-3')}>{source === 'doc' ? (hi ? 'आपका दस्तावेज़' : 'Your document') : (hi ? 'आपका विषय' : 'Your topic')}</Txt>
          </View>
          <Txt numberOfLines={1} style={tw('mt-1 font-medium text-ink')}>{label}</Txt>
          {chips.length > 0 && (
            <View style={tw('mt-2 flex-row flex-wrap gap-1')}>
              {chips.slice(0, Math.floor(since / 0.8)).map((c) => (
                <Reveal key={c} y={0} scale={0.8} duration={0.25} style={tw('rounded-full bg-sky-50 px-2 py-0.5')}>
                  <Txt style={[tw('text-sky-700'), { fontSize: 11.2, lineHeight: 16 }]}>{c}</Txt>
                </Reveal>
              ))}
            </View>
          )}
        </View>
        {/* thinking node with flowing dots */}
        <View style={tw('flex-row items-center justify-center gap-2 py-1')}>
          {[0, 1, 2].map((i) => <Dot key={i} delay={i * 0.2} />)}
          <ThinkingNode />
          {[0, 1, 2].map((i) => <Dot key={i} delay={0.6 + i * 0.2} />)}
        </View>
        {/* plan taking shape */}
        <View style={tw('rounded-2xl border border-line bg-paper p-3')}>
          <Txt style={tw('text-xs text-ink-3')}>{hi ? 'आपका पाठ-क्रम' : 'Your lesson plan'}</Txt>
          <View style={tw('mt-2 gap-1.5')}>
            {Array.from({ length: rows }).map((_, i) => (
              <Reveal key={i} x={-6} y={0} duration={0.3} style={tw('flex-row items-center gap-2')}>
                <Txt style={tw('text-xs font-semibold text-sky-600')}>{i + 1}</Txt>
                <View style={[tw('h-2 rounded-full bg-paper-3'), { width: `${55 + ((i * 37) % 40)}%` }]} />
              </Reveal>
            ))}
          </View>
        </View>
      </View>
      <Steps steps={steps} active={active} />
    </Reveal>
  );
}
