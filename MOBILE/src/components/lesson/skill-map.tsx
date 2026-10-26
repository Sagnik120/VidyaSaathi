import { useMemo, useState } from 'react';
import { Platform, TextInput, View, type TextStyle } from 'react-native';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Flag, Loader2, Plus, Search, Sparkles, X } from 'lucide-react-native';
import { api } from '@/core/api';
import type { SkillConcept } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { fontFamily, hasDevanagari } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { ProgressBar, Reveal, Spin } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

export const COURSE_GOAL = '__all__';
export const trackGoal = (track: string) => `__track_${track}`;

/* The learner's own map + saved goal; shared by the Progress map and the home goal card. */
export function useSkillGoal() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['skill-map', 'me'], queryFn: () => api.skillMap(), placeholderData: keepPreviousData, refetchOnMount: 'always' });
  const [saving, setSaving] = useState(false);
  const setGoal = async (goal: string | null) => {
    setSaving(true);
    try { qc.setQueryData(['skill-map', 'me'], await api.setSkillGoal(goal)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  return { q, data: q.data, setGoal, saving };
}

const TXT = {
  en: {
    title: 'Your AI skill map', sub: "Pick what you want to understand. VidyaSaathi routes you there, skipping what you've mastered.",
    goal: 'Your goal', search: 'Search a concept, or type any new AI topic…', add: 'Add “{t}” to the map', adding: 'Placing it on the map…',
    route: 'Your route', steps: '{n} steps to go', done: "You've mastered everything on this route.", clear: 'Clear goal',
    next: 'Up next', practice: 'Practise again', started: 'In progress', start: 'Start', mastered: 'mastered',
    legend: ['Mastered', 'Needs practice', 'Started', 'On your route'], hint: 'Tap any concept to make it your goal. Hold one to see what it builds on.',
    added: 'Added to the map', custom: 'new', recap: 'Quick recap', course: 'Learn AI from zero',
  },
  hi: {
    title: 'आपका AI स्किल मैप', sub: 'चुनिए आप क्या समझना चाहते हैं। शिक्षक वहाँ तक का रास्ता बनाता है, जो आप जानते हैं उसे छोड़कर।',
    goal: 'आपका लक्ष्य', search: 'कोई अवधारणा खोजें, या कोई नया AI विषय लिखें…', add: '“{t}” को मैप में जोड़ें', adding: 'मैप में जोड़ा जा रहा है…',
    route: 'आपका रास्ता', steps: '{n} कदम बाकी', done: 'इस रास्ते की हर चीज़ में आपको महारत है।', clear: 'लक्ष्य हटाएँ',
    next: 'अगला', practice: 'फिर अभ्यास करें', started: 'जारी', start: 'शुरू करें', mastered: 'महारत',
    legend: ['महारत', 'अभ्यास चाहिए', 'शुरू किया', 'आपके रास्ते पर'], hint: 'किसी भी अवधारणा को छूकर लक्ष्य बनाइए। दबाए रखें तो उसकी नींव दिखेगी।',
    added: 'मैप में जोड़ा गया', custom: 'नया', recap: 'जल्दी दोहराएँ', course: 'शुरू से AI सीखें',
  },
};

const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function SkillMap() {
  const { lang, n } = useI18n();
  const tx = TXT[lang === 'hi' ? 'hi' : 'en'];
  const qc = useQueryClient();
  const { q, data, setGoal: saveGoal, saving } = useSkillGoal();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const setGoal = (g: string | null) => { haptic.tap(); setQuery(''); void saveGoal(g); };
  const byId = useMemo(() => new Map((data?.concepts ?? []).map((c) => [c.id, c])), [data]);
  const onRoute = useMemo(() => new Set((data?.route ?? []).map((s) => s.id)), [data]);
  const heldPre = useMemo(() => new Set(held ? byId.get(held)?.prereqs ?? [] : []), [held, byId]);

  const term = query.trim().toLowerCase();
  const matches = term ? (data?.concepts ?? []).filter((c) => c.title.toLowerCase().includes(term)).slice(0, 6) : [];
  const exact = matches.some((c) => c.title.toLowerCase() === term);

  const addTopic = async () => {
    setAdding(true);
    try {
      const c = await api.addSkillConcept(query.trim());
      if (!c.existing) toast.success(tx.added);
      await qc.invalidateQueries({ queryKey: ['skill-map'] });
      await saveGoal(c.id);
      setQuery('');
    } catch (e) { toast.error((e as Error).message); } finally { setAdding(false); }
  };

  if (q.isLoading || !data) return <Skeleton style={tw('h-96 rounded-[14px]')} />;

  return (
    <Card style={tw('p-5')} testID="skill-map">
      <Txt style={tw('font-display text-3xl text-ink')}>{tx.title}</Txt>
      <Txt style={tw('mt-1 text-sm text-ink-2')}>{tx.sub}</Txt>
      <Txt style={tw('mt-2 text-sm font-medium text-ink-2')}>{n(data.mastered_count)} / {n(data.concepts.length)} {tx.mastered}</Txt>

      {/* goal picker */}
      <View style={tw('mt-5')}>
        <View style={[tw('flex-row items-center gap-2 rounded-2xl border bg-paper px-4'), { borderColor: focused ? '#7fa5dd' : COLORS.line, height: 46 }]}>
          <Search size={16} color={COLORS['ink-3']} />
          <TextInput
            testID="skill-search"
            value={query}
            onChangeText={setQuery}
            placeholder={tx.search}
            placeholderTextColor={COLORS['ink-3']}
            selectionColor={COLORS['sky-500']}
            maxLength={80}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => {
              if (!term) return;
              if (matches[0] && (exact || matches.length === 1)) setGoal(matches[0].id);
              else void addTopic();
            }}
            style={[tw('min-w-0 flex-1'), { fontSize: 14, color: COLORS.ink, paddingVertical: 0, fontFamily: fontFamily({ role: 'sans', weight: 400, italic: false, devanagari: hasDevanagari(query) }) }, NO_OUTLINE]}
          />
        </View>
        {term ? (
          <Reveal y={-4} duration={0.2} style={[tw('mt-1 rounded-2xl border border-line bg-surface'), { boxShadow: SHADOW.lift }]}>
            <View style={tw('overflow-hidden rounded-2xl')}>
              {matches.map((c) => (
                <Press key={c.id} scaleTo={0.99} onPress={() => setGoal(c.id)} style={tw('flex-row items-center gap-2 px-4 py-2.5')} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
                  <Flag size={14} color={COLORS['ink-3']} />
                  <Txt numberOfLines={1} style={tw('flex-1 text-sm text-ink')}>{c.title}</Txt>
                </Press>
              ))}
              {!exact && term.length >= 2 && (
                <Press scaleTo={0.99} onPress={() => void addTopic()} disabled={adding} testID="skill-add"
                  style={[tw('flex-row items-center gap-2 px-4 py-2.5'), matches.length ? tw('border-t border-line') : null]} activeStyle={{ backgroundColor: COLORS['sky-50'] }}>
                  {adding ? <Spin><Loader2 size={14} color={COLORS['sky-700']} /></Spin> : <Plus size={14} color={COLORS['sky-700']} />}
                  <Txt numberOfLines={1} style={tw('flex-1 text-sm text-sky-700')}>{adding ? tx.adding : tx.add.replace('{t}', query.trim())}</Txt>
                </Press>
              )}
            </View>
          </Reveal>
        ) : null}
      </View>

      <View style={tw('mt-3 flex-row flex-wrap items-center gap-1.5')}>
        <Press onPress={() => setGoal(COURSE_GOAL)} testID="goal-course"
          style={[tw('flex-row items-center gap-1 rounded-full border px-2.5 py-1'),
            data.goal === COURSE_GOAL ? { borderColor: COLORS['marigold-600'], backgroundColor: COLORS['marigold-100'] } : { borderColor: COLORS['sky-200'], backgroundColor: COLORS['sky-50'] }]}>
          <Sparkles size={12} color={data.goal === COURSE_GOAL ? COLORS.ink : COLORS['sky-700']} />
          <Txt style={[tw('text-xs font-medium'), { color: data.goal === COURSE_GOAL ? COLORS.ink : COLORS['sky-700'] }]}>{tx.course}</Txt>
        </Press>
        {data.tracks.map((t) => {
          const on = data.goal === trackGoal(t.id);
          return (
            <Press key={t.id} onPress={() => setGoal(trackGoal(t.id))}
              style={[tw('rounded-full border px-2.5 py-1'), on ? { borderColor: COLORS['marigold-600'], backgroundColor: COLORS['marigold-100'] } : { borderColor: COLORS.line }]}>
              <Txt style={[tw('text-xs'), { color: on ? COLORS.ink : COLORS['ink-2'] }]}>{t.title}</Txt>
            </Press>
          );
        })}
        {data.goal && !saving && (
          <Press onPress={() => setGoal(null)} hitSlop={6} style={tw('flex-row items-center gap-1 px-1.5 py-1')} testID="goal-clear">
            <X size={12} color={COLORS['ink-3']} />
            <Txt style={tw('text-xs text-ink-3')}>{tx.clear}</Txt>
          </Press>
        )}
        {saving && <Spin><Loader2 size={14} color={COLORS['ink-3']} /></Spin>}
      </View>

      {/* map */}
      <View style={tw('mt-6 gap-4')}>
        {data.tracks.map((track) => {
          const cs = data.concepts.filter((c) => c.track === track.id);
          const m = cs.filter((c) => c.mastery?.state === 'mastered').length;
          return (
            <View key={track.id} style={[tw('rounded-2xl border border-line p-3.5'), { backgroundColor: color('paper', 0.4) }]}>
              <View style={tw('flex-row items-center justify-between gap-2')}>
                <Txt numberOfLines={1} style={[tw('flex-1 text-xs font-semibold uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{track.title}</Txt>
                <Txt style={[tw('text-ink-3'), { fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] }]}>{m}/{cs.length}</Txt>
              </View>
              <ProgressBar value={cs.length ? (m / cs.length) * 100 : 0} color={COLORS.sage} height={4} duration={0.8} style={tw('mt-2')} />
              <View style={tw('mt-3 flex-row flex-wrap gap-1.5')}>
                {cs.map((c) => (
                  <Chip key={c.id} c={c} goal={c.id === data.goal} route={onRoute.has(c.id)} pre={heldPre.has(c.id)}
                    onHold={setHeld} onPick={() => setGoal(c.id)} customLabel={tx.custom} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      <View style={tw('mt-4 flex-row flex-wrap items-center gap-x-4 gap-y-1')}>
        {([[COLORS.sage, tx.legend[0]], [COLORS.amber, tx.legend[1]], ['#7fa5dd', tx.legend[2]]] as const).map(([c, l]) => (
          <View key={l} style={tw('flex-row items-center gap-1.5')}>
            <View style={[tw('h-2.5 w-2.5 rounded-full'), { backgroundColor: c }]} />
            <Txt style={tw('text-xs text-ink-3')}>{l}</Txt>
          </View>
        ))}
        <View style={tw('flex-row items-center gap-1.5')}>
          <View style={[tw('h-2.5 w-2.5 rounded-full bg-surface'), { borderWidth: 2, borderColor: COLORS['sky-300'] }]} />
          <Txt style={tw('text-xs text-ink-3')}>{tx.legend[3]}</Txt>
        </View>
      </View>
      <View style={tw('mt-1 flex-row items-start gap-1.5')}>
        <View style={{ marginTop: 2 }}><Sparkles size={12} color={COLORS['ink-3']} /></View>
        <Txt style={tw('flex-1 text-xs text-ink-3')}>{tx.hint}</Txt>
      </View>
    </Card>
  );
}

function Chip({ c, goal, route, pre, onHold, onPick, customLabel }: {
  c: SkillConcept; goal: boolean; route: boolean; pre: boolean; onHold: (id: string | null) => void; onPick: () => void; customLabel: string;
}) {
  const st = c.mastery?.state;
  const look =
    goal ? { borderColor: COLORS['marigold-600'], backgroundColor: COLORS['marigold-100'] } :
    st === 'mastered' ? { borderColor: color('sage', 0.4), backgroundColor: COLORS['sage-100'] } :
    st === 'practice' ? { borderColor: color('amber', 0.5), backgroundColor: COLORS['amber-100'] } :
    st === 'started' ? { borderColor: COLORS['sky-200'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line };
  return (
    // the outer ring marks concepts on the learner's route
    <View style={[tw('rounded-full'), { padding: 2, margin: -2, borderWidth: 2, borderColor: route && !goal ? COLORS['sky-300'] : 'transparent' }, pre ? { transform: [{ scale: 1.05 }] } : null]}>
      <Press
        onPress={onPick} onLongPress={() => { haptic.press(); onHold(c.id); }} onPressOut={() => onHold(null)} delayLongPress={280}
        accessibilityLabel={c.mastery?.score != null ? `${c.title}, ${Math.round(c.mastery.score * 100)}%` : c.title}
        style={[tw('flex-row items-center gap-1.5 rounded-full border px-2.5 py-1'), { maxWidth: 256 }, look,
          pre ? { borderColor: COLORS['sky-500'], boxShadow: SHADOW.soft } : null]}
      >
        {goal && <Flag size={12} color={COLORS.ink} />}
        {st === 'mastered' && !goal && <Check size={12} color={COLORS.sage} />}
        <Txt numberOfLines={1} style={[tw('shrink text-xs'), { color: goal || st ? COLORS.ink : COLORS['ink-2'], fontWeight: goal ? '600' : '400' }]}>{c.title}</Txt>
        {c.custom && (
          <View style={tw('rounded-full bg-sky-100 px-1.5')}><Txt style={[tw('text-sky-700'), { fontSize: 9.6, lineHeight: 14 }]}>{customLabel}</Txt></View>
        )}
      </Press>
    </View>
  );
}
