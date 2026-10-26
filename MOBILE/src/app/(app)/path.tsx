import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Check, ChevronDown, FlaskConical, Loader2, Lock, Map as MapIcon, Play, RotateCcw } from 'lucide-react-native';
import type { JourneyStep } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { labsFor } from '@/components/lab/labs';
import { Page } from '@/components/layout/page';
import { GoalCard } from '@/components/lesson/goal-card';
import { stepHref } from '@/components/lesson/path-progress';
import { PlacementCheck } from '@/components/lesson/placement-check';
import { SkillMap, useSkillGoal } from '@/components/lesson/skill-map';
import { Collapse, Ping, ProgressBar, Reveal } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';

const TXT = {
  en: { title: 'Learning path', sub: "Your route to your goal: what's done, what's next and why.", journey: 'Your path, step by step',
    done: 'Done', review: 'Open report', refresh: 'Refresh', resume: 'Resume', start: 'Start', again: 'Practise again', recap: 'Recap', later: 'Coming up',
    more: 'Show more', less: 'Show less', lab: 'Practice Lab', labSub: 'Simulations + code challenges', noGoal: 'Pick a goal to see your route', noGoalSub: 'Choose one in the panel, or tap a concept on the skill map below.', map: 'Change goal or explore the skill map', mapSub: 'See every concept, your mastery, and pick a new destination.' },
  hi: { title: 'सीखने का रास्ता', sub: 'आपके लक्ष्य तक का रास्ता: क्या हो गया, आगे क्या है और क्यों।', journey: 'आपका रास्ता, कदम दर कदम',
    done: 'पूरा', review: 'रिपोर्ट देखें', refresh: 'दोहराएँ', resume: 'जारी रखें', start: 'शुरू करें', again: 'फिर अभ्यास करें', recap: 'दोहराएँ', later: 'आगे',
    more: 'और देखें', less: 'कम देखें', lab: 'प्रैक्टिस लैब', labSub: 'सिमुलेशन + कोड चुनौतियाँ', noGoal: 'अपना रास्ता देखने के लिए लक्ष्य चुनें', noGoalSub: 'पैनल में चुनें, या नीचे स्किल मैप में किसी अवधारणा पर टैप करें।', map: 'लक्ष्य बदलें या स्किल मैप देखें', mapSub: 'हर अवधारणा, आपकी महारत, और नया लक्ष्य चुनें।' },
};

export default function PathPage() {
  const { lang, n } = useI18n();
  const tx = TXT[lang === 'hi' ? 'hi' : 'en'];
  const { q, data } = useSkillGoal();
  const [showAll, setShowAll] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const params = useLocalSearchParams<{ focus?: string; at?: string }>();
  const scroll = useRef<ScrollView>(null);
  const mapY = useRef(0);

  // "Change goal" links open this page with focus=skill-map: open the map and bring it into view.
  useEffect(() => {
    if (params.focus !== 'skill-map') return;
    setMapOpen(true);
    const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, mapY.current - 16), animated: true }), 450);
    return () => clearTimeout(id);
  }, [params.focus, params.at]);

  const journey = data?.journey ?? [];
  const done = journey.filter((s) => s.state === 'done').length;
  const total = journey.length;
  const hasPath = !!data?.goal && total > 0;

  // Long routes: show a window around the next step, expandable.
  const nextIdx = Math.max(0, journey.findIndex((s) => s.next));
  const from = Math.max(0, nextIdx - 2);
  const to = Math.min(total, from + 7);
  const collapsible = total > 8;
  const visible = !collapsible || showAll ? journey.map((s, i) => [s, i] as const) : journey.slice(from, to).map((s, k) => [s, from + k] as const);

  const labLink = (
    <Press href="/lab" scaleTo={0.985} testID="lab-link"
      style={[tw('flex-row items-center gap-3 rounded-[24px] border border-sky-200 p-4'), { backgroundColor: color('sky-50', 0.6) }]} activeStyle={{ borderColor: '#7fa5dd' }}>
      <View style={tw('h-10 w-10 items-center justify-center rounded-xl bg-surface')}><FlaskConical size={20} color={COLORS['sky-600']} /></View>
      <View style={tw('min-w-0 flex-1')}>
        <Txt style={tw('font-semibold text-ink')}>{tx.lab}</Txt>
        <Txt style={tw('text-xs text-ink-2')}>{tx.labSub}</Txt>
      </View>
      <ArrowRight size={16} color={COLORS['sky-700']} />
    </Press>
  );

  return (
    <Page scrollRef={scroll} onRefresh={() => q.refetch()} style={tw('gap-6')}>
      <View style={tw('pb-2')}>
        <Txt accessibilityRole="header" style={tw('font-display text-5xl text-ink')}>{tx.title}</Txt>
        <Txt style={tw('mt-2 text-ink-2')}>{tx.sub}</Txt>
      </View>

      {hasPath ? (
        <View style={tw('gap-4')}>
          <GoalCard />
          {labLink}
          <PlacementCheck map={data!} />
          <View style={[tw('rounded-[28px] border border-line bg-surface p-5'), { boxShadow: SHADOW.soft }]} testID="journey">
            <View style={tw('flex-row items-center justify-between gap-3')}>
              <Txt style={tw('flex-1 font-display text-3xl text-ink')}>{tx.journey}</Txt>
              <View style={tw('rounded-full bg-sage-100 px-3 py-1')}><Txt style={tw('text-xs font-semibold text-sage')}>{n(done)} / {n(total)}</Txt></View>
            </View>
            <ProgressBar value={total ? (done / total) * 100 : 0} color={COLORS.sage} height={6} duration={0.7} style={tw('mt-3')} />
            <View style={tw('mt-5 gap-3')}>
              {/* the thread the steps hang on */}
              <LinearGradient colors={[color('sage', 0.6), COLORS['sky-300'], COLORS.line]} style={[tw('absolute rounded-full'), { left: 19, top: 42, bottom: 42, width: 2 }]} />
              {visible.map(([s, i]) => <Step key={`${s.state}-${s.id}-${i}`} s={s} i={i} goal={data!.goal!} tx={tx} />)}
            </View>
            {collapsible && (
              <Press onPress={() => setShowAll((v) => !v)} testID="journey-toggle"
                style={tw('mt-4 flex-row items-center justify-center gap-1.5 rounded-xl border border-line py-2')} activeStyle={{ borderColor: COLORS['sky-300'], backgroundColor: COLORS['sky-50'] }}>
                <View style={showAll ? { transform: [{ rotate: '180deg' }] } : null}><ChevronDown size={16} color={COLORS['sky-700']} /></View>
                <Txt style={tw('text-sm font-medium text-sky-700')}>{showAll ? tx.less : `${tx.more} (${n(total - (to - from))})`}</Txt>
              </Press>
            )}
          </View>
        </View>
      ) : (
        <View style={tw('gap-4')}>
          <GoalCard />
          {data && <PlacementCheck map={data} />}
          {labLink}
        </View>
      )}

      <View onLayout={(e) => { mapY.current = e.nativeEvent.layout.y; }}>
        {hasPath ? (
          <View>
            <Press onPress={() => setMapOpen((v) => !v)} accessibilityState={{ expanded: mapOpen }} scaleTo={0.985} testID="map-toggle"
              style={[tw('flex-row items-center gap-3 rounded-[24px] border border-line bg-surface px-5 py-4'), { boxShadow: SHADOW.soft }]} activeStyle={{ borderColor: COLORS['sky-300'] }}>
              <MapIcon size={20} color={COLORS['sky-600']} />
              <View style={tw('min-w-0 flex-1')}>
                <Txt style={tw('font-semibold text-ink')}>{tx.map}</Txt>
                <Txt style={tw('text-xs text-ink-2')}>{tx.mapSub}</Txt>
              </View>
              <View style={mapOpen ? { transform: [{ rotate: '180deg' }] } : null}><ChevronDown size={20} color={COLORS['ink-3']} /></View>
            </Press>
            <Collapse open={mapOpen}><View style={tw('pt-4')}><SkillMap /></View></Collapse>
          </View>
        ) : <SkillMap />}
      </View>
    </Page>
  );
}

function Step({ s, i, goal, tx }: { s: JourneyStep; i: number; goal: string; tx: (typeof TXT)['en'] }) {
  const { n } = useI18n();
  const [open, setOpen] = useState(false);
  const done = s.state === 'done';
  const resumable = !done && !!s.lesson_id && !!s.lesson_status && !['completed', 'abandoned'].includes(s.lesson_status);
  const locked = !done && !s.next && !resumable && s.blocked_by.length > 0;

  const action: { href: Href; label: string } | null = done
    ? s.lesson_id ? { href: `/report/${s.lesson_id}`, label: tx.review } : null
    : resumable ? { href: `/learn/${s.lesson_id}`, label: tx.resume }
    : !locked ? { href: stepHref(s, goal), label: s.state === 'practice' ? tx.again : tx.start } : null;

  const reason = done ? `${tx.done}${s.score != null ? ` · ${n(Math.round(s.score * 100))}%` : ''}` : s.reason || tx.later;
  const lab = labsFor(s.title)[0];

  const recapLike = s.state === 'recap' || s.state === 'practice';
  const dot = done ? { borderColor: COLORS.sage, backgroundColor: COLORS['sage-100'] }
    : s.next ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-500'] }
    : recapLike ? { borderColor: COLORS.amber, backgroundColor: COLORS['amber-100'] }
    : resumable ? { borderColor: '#7fa5dd', backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line, backgroundColor: COLORS.surface };
  const dotInk = done ? COLORS.sage : s.next ? COLORS.white : recapLike ? COLORS.ink : resumable ? COLORS['sky-700'] : COLORS['ink-3'];

  return (
    <Reveal x={-8} y={0} delay={Math.min(i, 15) * 0.03} duration={0.4} style={tw('flex-row gap-3')}>
      {/* a sliver of paper around the marker keeps the thread from touching it */}
      <View style={[tw('rounded-full bg-surface'), { marginTop: 18, padding: 4, margin: -4, alignSelf: 'flex-start' }]}>
        <View style={[tw('h-10 w-10 items-center justify-center rounded-full'), { borderWidth: 2 }, dot]}>
          {s.next && <Ping />}
          {done ? <Check size={16} color={dotInk} /> : resumable ? <Loader2 size={16} color={dotInk} /> : s.state === 'recap' ? <RotateCcw size={16} color={dotInk} />
            : locked ? <Lock size={14} color={dotInk} /> : <Txt style={[tw('text-sm font-semibold'), { color: dotInk }]}>{n(i + 1)}</Txt>}
        </View>
      </View>

      <View style={[tw('min-w-0 flex-1 rounded-2xl border'),
        s.next ? { borderColor: COLORS['sky-300'], backgroundColor: color('sky-50', 0.4), boxShadow: SHADOW.soft } : { borderColor: COLORS.line, backgroundColor: COLORS.surface },
        locked ? { opacity: 0.6 } : null]}>
        <View style={[tw('flex-row items-center gap-3 px-4'), { minHeight: 84 }]}>
          <Press onPress={() => setOpen((o) => !o)} scaleTo={1} style={tw('min-w-0 flex-1 py-3')} accessibilityState={{ expanded: open }} testID={`step-${i}`}>
            <Txt numberOfLines={open ? undefined : 1} style={tw('font-medium text-ink')}>{s.title}</Txt>
            <Txt numberOfLines={open ? undefined : 1} style={[tw('mt-0.5 text-xs'), { color: open ? COLORS['ink-2'] : COLORS['ink-3'], lineHeight: open ? 19 : 16 }]}>{reason}</Txt>
          </Press>
          <View style={tw('flex-row items-center gap-1.5')}>
            {s.review_due && (
              <Press href="/refresh" accessibilityLabel={tx.refresh} style={tw('h-8 w-8 items-center justify-center rounded-full bg-marigold-100')} activeStyle={{ backgroundColor: COLORS['marigold-200'] }}>
                <RotateCcw size={14} color={COLORS.ink} />
              </Press>
            )}
            {lab && open && (
              <Press href={{ pathname: '/lab', params: { sim: lab.id } }} accessibilityLabel="Practice Lab" style={tw('h-8 w-8 items-center justify-center rounded-full border border-line')} activeStyle={{ borderColor: COLORS['sky-300'] }}>
                <FlaskConical size={14} color={COLORS['ink-3']} />
              </Press>
            )}
            {action ? (
              <Press href={action.href} accessibilityLabel={action.label} testID={`step-action-${i}`}
                style={[tw('h-9 flex-row items-center justify-center gap-1 rounded-xl'), { minWidth: 36, paddingHorizontal: resumable ? 8 : 0 }, s.next ? tw('bg-sky-600') : tw('border border-line')]}
                activeStyle={s.next ? { backgroundColor: COLORS['sky-700'] } : { borderColor: COLORS['sky-300'], backgroundColor: COLORS['sky-50'] }}>
                {resumable ? <Play size={14} color={s.next ? COLORS.white : COLORS['sky-700']} /> : null}
                <ArrowRight size={14} color={s.next ? COLORS.white : COLORS['sky-700']} />
              </Press>
            ) : <View style={tw('w-9')} />}
          </View>
        </View>
      </View>
    </Reveal>
  );
}
