import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookOpen, Brain, Hand, Lightbulb, Map, RefreshCw, Search, SkipForward, Wand2 } from 'lucide-react-native';
import { api } from '@/core/api';
import type { WhyEntry } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { Reveal } from '@/components/motion';
import type { IconType } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';

type Lang = 'en' | 'hi';
type Tint = { fg: string; bg: string };
const list = (xs: unknown) => (Array.isArray(xs) ? xs.filter(Boolean).join(', ') : '');
const tag = (t: unknown) => (typeof t === 'string' ? t.replace(/_/g, ' ') : '');

const SKY: Tint = { fg: COLORS['sky-700'], bg: COLORS['sky-50'] };
const QUIET: Tint = { fg: COLORS['ink-2'], bg: COLORS['paper-3'] };
const MARIGOLD: Tint = { fg: COLORS['marigold-600'], bg: COLORS['marigold-100'] };

/* One sentence per decision, in the learner's language. */
function phrase(e: WhyEntry, lang: Lang): { text: string; icon: IconType; tone: Tint } | null {
  const p = e.params, c = e.concept ? `“${e.concept}”` : lang === 'hi' ? 'इस हिस्से' : 'this part';
  const hi = lang === 'hi';
  switch (e.kind) {
    case 'memory':
      return { icon: Brain, tone: SKY, text: hi
        ? `पिछले पाठों से याद रखा: ${list(p.weak) || list(p.misconceptions)} पर आपको और मदद चाहिए थी, इसलिए योजना में इसे ध्यान में रखा।`
        : `Remembered from earlier lessons: you found ${list(p.weak) || list(p.misconceptions)} hard, so the plan accounts for it.` };
    case 'plan':
      return { icon: Map, tone: SKY, text: hi
        ? `${p.parts ?? ''} हिस्सों की योजना बनाई${p.from_document ? ', आपके दस्तावेज़ से' : ''}${p.used_memory ? ', आपकी पिछली प्रगति के अनुसार' : ''}।`
        : `Planned ${p.parts ?? ''} parts${p.from_document ? ' from your document' : ''}${p.used_memory ? ', shaped by your past progress' : ''}.` };
    case 'path': {
      const bits = hi
        ? [`यह पाठ “${p.goal}” तक के आपके रास्ते का एक कदम है।`,
           list(p.skipped) && `${list(p.skipped)} आप जानते हैं, इसलिए दोबारा नहीं पढ़ाया।`,
           list(p.recap) && `${list(p.recap)} की छोटी दोहराई जोड़ी।`,
           p.retry_percent != null && `पिछली बार ${p.retry_percent}% आया था, इसलिए नए तरीके से समझाया।`,
           p.next && `अंत में “${p.next}” से जोड़ा।`]
        : [`This lesson is a step on your route to “${p.goal}”.`,
           list(p.skipped) && `Didn't re-teach ${list(p.skipped)}: you know it.`,
           list(p.recap) && `Added a quick recap of ${list(p.recap)}.`,
           p.retry_percent != null && `You scored ${p.retry_percent}% last time, so it's explained from a new angle.`,
           p.next && `Ends with a bridge to “${p.next}”.`];
      return { icon: SkipForward, tone: SKY, text: bits.filter(Boolean).join(' ') };
    }
    case 'refined_search':
      return { icon: Search, tone: QUIET, text: hi ? `${c} के लिए आपके दस्तावेज़ में बेहतर खोज की।` : `Searched your document again with a sharper query for ${c}.` };
    case 'no_context':
      return { icon: BookOpen, tone: { fg: COLORS.amber, bg: COLORS['amber-100'] }, text: hi ? `आपके नोट्स में ${c} नहीं था, इसलिए सामान्य ज्ञान से पढ़ाया।` : `Your notes didn't cover ${c}, so it was taught from general knowledge.` };
    case 'adapt_modify':
      return { icon: RefreshCw, tone: MARIGOLD, text: hi
        ? `${c} को नए उदाहरण से फिर समझाया${p.misconception ? ` (आपके उत्तर में “${tag(p.misconception)}” वाली गलती दिखी)` : ''}।`
        : `Re-explained ${c} with a new example${p.misconception ? `: your answer showed “${tag(p.misconception)}”` : ''}.` };
    case 'adapt_regenerate':
      return { icon: Wand2, tone: MARIGOLD, text: hi
        ? `${c} को शुरू से सरल कदमों में दोबारा बनाया: यह ${p.attempt ?? 2}वाँ प्रयास था।`
        : `Rebuilt ${c} from scratch in simpler steps: attempt ${p.attempt ?? 2} on the same idea.` };
    case 'adapt_human':
    case 'mentor':
      return { icon: Hand, tone: { fg: COLORS.rose, bg: COLORS['rose-100'] }, text: hi ? `${c} पर कई प्रयासों के बाद आपके मेंटर को आपके उत्तरों के साथ सूचित किया।` : `Told your mentor about ${c}, with your answers, after several tries.` };
    case 'escalation_continued':
      return { icon: Hand, tone: QUIET, text: hi ? `मेंटर की मदद के बाद ${c} से आगे बढ़े।` : `Continued past ${c} after help from your mentor.` };
    case 'escalation_skipped':
      return { icon: SkipForward, tone: QUIET, text: hi ? `${c} को बाद में दोहराने के लिए छोड़ा।` : `Set ${c} aside to review later.` };
    case 'level': {
      const up = Number(p.to) > Number(p.frm);
      const why = p.reason === 'streak' ? (hi ? 'लगातार 2 सही' : '2 right in a row') : p.reason === 'miss' ? (hi ? 'एक उत्तर चूका' : 'a missed answer') : '';
      return { icon: up ? ArrowUp : ArrowDown, tone: up ? { fg: COLORS.sage, bg: COLORS['sage-100'] } : SKY, text: hi
        ? `स्तर ${p.frm} → ${p.to}${why ? ` (${why})` : ''}। अगला हिस्सा ${up ? 'थोड़ा गहरा' : 'आसान'} होगा।`
        : `Level ${p.frm} → ${p.to}${why ? ` (${why})` : ''}. The next part goes ${up ? 'a little deeper' : 'simpler'}.` };
    }
    default:
      return null;
  }
}

export function WhyLog({ lessonId, live = false, limit, style }: { lessonId: string; live?: boolean; limit?: number; style?: StyleProp<ViewStyle> }) {
  const { lang } = useI18n();
  const L: Lang = lang === 'hi' ? 'hi' : 'en';
  // Live view refreshes while it is open; decisions arrive as the lesson runs.
  const q = useQuery({ queryKey: ['why', lessonId], queryFn: () => api.lessonWhy(lessonId), refetchInterval: live ? 6000 : false });
  const rows = (q.data?.entries ?? []).map((e) => ({ e, f: phrase(e, L) })).filter((r) => r.f);
  const shown = limit ? rows.slice(-limit) : rows;

  if (q.isLoading) return <Txt style={[tw('text-sm text-ink-3'), style as object]}>…</Txt>;
  if (!shown.length) {
    return (
      <View style={[tw('flex-row items-start gap-2'), style]}>
        <View style={{ marginTop: 2 }}><Lightbulb size={16} color={COLORS['ink-3']} /></View>
        <Txt style={tw('flex-1 text-sm text-ink-3')}>{L === 'hi' ? 'जैसे ही शिक्षक आपके लिए कुछ बदलेगा, उसका कारण यहाँ दिखेगा।' : 'Whenever the tutor changes something for you, the reason will show up here.'}</Txt>
      </View>
    );
  }
  return (
    <View style={[tw('gap-2'), style]} testID="why-log">
      {shown.map(({ e, f }, i) => {
        const Icon = f!.icon;
        return (
          <Reveal key={`${e.kind}-${e.at}-${i}`} y={4} delay={Math.min(i, 10) * 0.03} duration={0.35} style={tw('flex-row gap-3')}>
            <View style={[tw('h-7 w-7 items-center justify-center rounded-full'), { marginTop: 2, backgroundColor: f!.tone.bg }]}><Icon size={14} color={f!.tone.fg} /></View>
            <Txt style={tw('min-w-0 flex-1 text-sm leading-relaxed text-ink-2')}>{f!.text}</Txt>
          </Reveal>
        );
      })}
    </View>
  );
}
