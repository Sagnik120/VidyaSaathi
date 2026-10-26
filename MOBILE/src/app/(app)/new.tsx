import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CircleCheck, FileText, PauseCircle, Pencil, Sparkles, UploadCloud, X } from 'lucide-react-native';
import { api, uploads, type PickedFile } from '@/core/api';
import type { MessageKey } from '@/core/i18n';
import type { DocumentInfo } from '@/core/types';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { errText } from '@/components/auth/auth-kit';
import { Page } from '@/components/layout/page';
import { PlanBuilding, UploadProgress } from '@/components/lesson/processing';
import { Reveal } from '@/components/motion';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { GlassSlider } from '@/components/ui/glass-slider';
import { Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Badge, Card, Input, Label, SlidingPill, Tabs } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

type Source = 'topic' | 'doc';
type PlanNode = { concept: string; depth?: string; est_minutes?: number; checkpoint_question?: boolean; visual_type?: string };
const STOPS = [5, 10, 15, 25, 40];
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const STYLES: Array<[string, MessageKey]> = [['visual', 'new.styleVisual'], ['analogy', 'new.styleAnalogy'], ['exam', 'new.styleExam'], ['step', 'new.styleStep']];
const DOC_TYPES = [
  'application/pdf', 'text/plain', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
const DOC_EXT = /\.(pdf|docx|pptx|txt|md)$/i;

/** A fresh form each time the page is opened, as a page load gives on the web. */
export default function NewLessonPage() {
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => () => setVisit((v) => v + 1), []));
  return <NewLesson key={visit} />;
}

function NewLesson() {
  const { t, n, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  // Prefill from the skill map (/new?topic=…&level=…&concept=…&goal=…).
  const params = useLocalSearchParams<{ topic?: string; level?: string; concept?: string; goal?: string }>();
  const [source, setSource] = useState<Source>('topic');
  const [topic, setTopic] = useState('');
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [level, setLevel] = useState<string>(user?.preferred_level || 'beginner');
  const [language, setLanguage] = useState<string>(user?.preferred_language === 'hi' ? 'hi' : lang);
  const [budget, setBudget] = useState<number>(STOPS.includes(user?.default_time_budget_min ?? 0) ? user!.default_time_budget_min : 15);
  const [style, setStyle] = useState<string | null>(null);
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [plan, setPlan] = useState<{ id: string; nodes: PlanNode[] } | null>(null);
  const [path, setPath] = useState<{ concept: string; goal: string } | null>(null);

  useEffect(() => {
    if (params.concept && params.goal) setPath({ concept: params.concept, goal: params.goal });
    if (params.topic) { setSource('topic'); setTopic(params.topic); }
    if (params.level && (LEVELS as readonly string[]).includes(params.level)) setLevel(params.level);
  }, [params.topic, params.level, params.concept, params.goal]);

  const ready = source === 'topic' ? topic.trim().length >= 2 : !!doc;

  const build = async () => {
    if (status === 'loading') return;
    if (!ready) { toast.error(t('new.needTopic')); return; }
    setStatus('loading');
    let id: string | null = null;
    try {
      const created = await api.createLesson({
        topic: source === 'topic' ? topic.trim() : null,
        document_id: source === 'doc' ? doc!.document_id : null,
        level, language, time_budget_min: budget, style,
        // Only while the topic is still the one the map filled in.
        ...(path && source === 'topic' ? { skill_concept_id: path.concept, skill_goal_id: path.goal } : {}),
      });
      id = created.lesson_id;
      const r = await api.generatePlan(id);
      setPlan({ id, nodes: (r.plan?.nodes ?? []) as PlanNode[] });
      setStatus('idle');
      haptic.success();
      void qc.invalidateQueries({ queryKey: ['lessons'] });
    } catch (e) {
      setStatus('idle');
      toast.error(errText(e, t('common.error')));
      // Don't leave an empty lesson in the learner's history.
      if (id) api.deleteLesson(id).catch(() => {});
    }
  };

  if (plan) {
    return (
      <Page>
        <PlanView plan={plan} onEdit={() => { api.deleteLesson(plan.id).catch(() => {}); setPlan(null); }} onStart={() => router.push(`/learn/${plan.id}`)} />
      </Page>
    );
  }

  return (
    <Page>
      <Reveal y={10} duration={0.4}>
        <Txt accessibilityRole="header" style={tw('font-display text-5xl text-ink')}>{t('new.title')}</Txt>
        <Txt style={tw('mt-2 text-ink-2')}>{t('new.sub')}</Txt>
        {path && source === 'topic' && (
          <View style={tw('mt-3 flex-row items-center gap-2 self-start rounded-2xl border border-sky-200 bg-sky-50 px-3 py-1.5')}>
            <Sparkles size={14} color={COLORS['sky-700']} />
            <Txt style={tw('shrink text-sm text-sky-700')}>{lang === 'hi' ? 'आपके रास्ते का एक कदम: यह पाठ आपकी प्रगति के अनुसार बनेगा' : 'A step on your route: this lesson is tailored to what you already know'}</Txt>
          </View>
        )}

        <View style={tw('mt-8 gap-6')}>
          <Card style={tw('p-5')}>
            <View style={tw('rounded-2xl bg-paper-2 p-1')}>
              <SlidingPill<Source>
                value={source}
                onChange={setSource}
                items={[{ value: 'topic' }, { value: 'doc' }]}
                style={tw('flex-row gap-1')}
                itemStyle={tw('rounded-xl px-3 py-2')}
                pillStyle={[tw('rounded-xl bg-surface'), { boxShadow: SHADOW.soft }]}
                renderItem={(item, active) => {
                  const tint = active ? COLORS.ink : COLORS['ink-3'];
                  return (
                    <View style={tw('flex-row items-center justify-center gap-1.5')} testID={`source-${item.value}`}>
                      {item.value === 'topic' ? <Sparkles size={16} color={tint} /> : <FileText size={16} color={tint} />}
                      <Txt numberOfLines={1} style={[tw('text-sm font-medium'), { color: tint }]}>{t(item.value === 'topic' ? 'new.fromTopic' : 'new.fromDoc')}</Txt>
                    </View>
                  );
                }}
              />
            </View>
            <View style={[tw('mt-6'), { minHeight: 240 }]}>
              {source === 'topic' ? (
                <Reveal key="t" x={-12} y={0} duration={0.25}>
                  <Label>{t('new.topicLabel')}</Label>
                  <Input testID="topic" value={topic} onChangeText={(v) => { setTopic(v); setPath(null); }} placeholder={t('new.topicPlaceholder')} maxLength={500}
                    style={{ height: 56, fontSize: 18 }} returnKeyType="go" onSubmitEditing={() => void build()} />
                  <Txt style={[tw('mt-5 text-xs font-medium uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('new.suggestions')}</Txt>
                  <View style={tw('mt-2 flex-row flex-wrap gap-2')}>
                    {(['new.sug1', 'new.sug2', 'new.sug3', 'new.sug4'] as MessageKey[]).map((k) => (
                      <Press key={k} onPress={() => { haptic.tap(); setTopic(t(k)); }}
                        style={tw('rounded-full border border-line bg-paper px-3.5 py-1.5')} activeStyle={{ borderColor: COLORS['sky-300'] }}>
                        <Txt style={tw('text-sm text-ink-2')}>{t(k)}</Txt>
                      </Press>
                    ))}
                  </View>
                </Reveal>
              ) : (
                <Reveal key="d" x={12} y={0} duration={0.25}><DocPicker doc={doc} onDoc={setDoc} /></Reveal>
              )}
            </View>
          </Card>

          <Card style={tw('gap-6 p-5')}>
            <View>
              <Label>{t('new.level')}</Label>
              <Tabs value={level} onChange={setLevel} items={LEVELS.map((l) => ({ value: l as string, label: t(`auth.level${l[0].toUpperCase()}${l.slice(1)}` as MessageKey) }))} />
            </View>
            <View>
              <Label>{t('new.language')}</Label>
              <Tabs value={language} onChange={setLanguage} items={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }]} />
            </View>
            <View>
              <Label hint={budget <= 5 ? t('new.timeQuick') : budget >= 40 ? t('new.timeDeep') : undefined}>{t('new.time')}</Label>
              <GlassSlider stops={STOPS} value={budget} onChange={setBudget} ariaLabel={t('new.time')} format={(v) => t('common.minutes', { n: n(v) })} />
            </View>
            <View>
              <Label hint={t('common.optional')}>{t('new.style')}</Label>
              <View style={tw('flex-row flex-wrap gap-2')}>
                {STYLES.map(([v, k]) => {
                  const on = style === v;
                  return (
                    <Press key={v} accessibilityState={{ selected: on }} onPress={() => { haptic.tap(); setStyle(on ? null : v); }} testID={`style-${v}`}
                      style={[tw('rounded-2xl border px-3 py-2.5'), { width: '48.5%' }, on ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line }]}>
                      <Txt style={[tw('text-sm'), { color: on ? COLORS.ink : COLORS['ink-2'] }]}>{t(k)}</Txt>
                    </Press>
                  );
                })}
              </View>
            </View>
          </Card>
        </View>

        <View style={tw('mt-6 items-end gap-4')}>
          {status === 'loading' && (
            <PlanBuilding source={source} label={source === 'doc' ? doc?.filename ?? '' : topic.trim()} terms={source === 'doc' ? doc?.key_terms : []}
              level={t(`auth.level${level[0].toUpperCase()}${level.slice(1)}` as MessageKey).toLowerCase()} minutes={budget} />
          )}
          <Button size="lg" onPress={() => void build()} status={status} loadingLabel={t('new.planning')} disabled={!ready} icon={ArrowRight} style={{ alignSelf: 'flex-end' }} testID="build-plan">{t('new.plan')}</Button>
        </View>
      </Reveal>
    </Page>
  );
}

function DocPicker({ doc, onDoc }: { doc: DocumentInfo | null; onDoc: (d: DocumentInfo | null) => void }) {
  const { t, n } = useI18n();
  const [pct, setPct] = useState<number | null>(null);
  const [file, setFile] = useState<PickedFile & { size?: number } | null>(null);
  const docs = useQuery({ queryKey: ['documents'], queryFn: api.listDocuments });

  const choose = async () => {
    let picked: (PickedFile & { size?: number }) | null = null;
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      picked = { uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file ?? null, size: a.size };
    } catch (e) {
      toast.error(errText(e, t('common.error')));
      return;
    }
    if (!DOC_EXT.test(picked.name)) { toast.error(t('new.dropSub')); return; }
    setFile(picked);
    setPct(0);
    try {
      const d = await uploads.document(picked, setPct);
      onDoc(d);
      haptic.success();
      void docs.refetch();
    } catch (e) {
      toast.error(errText(e, t('common.error')));
    } finally {
      setPct(null);
    }
  };

  if (doc) {
    return (
      <View style={[tw('rounded-2xl border p-5'), { borderColor: color('sage', 0.4), backgroundColor: 'rgba(227, 240, 231, 0.5)' }]} testID="doc-ready">
        <View style={tw('flex-row items-start gap-3')}>
          <View style={{ marginTop: 2 }}><CircleCheck size={20} color={COLORS.sage} /></View>
          <View style={tw('min-w-0 flex-1')}>
            <Txt numberOfLines={1} style={tw('font-medium')}>{doc.filename}</Txt>
            <Txt style={tw('text-sm text-ink-2')}>{t('new.indexed', { n: n(doc.chunk_count) })}</Txt>
          </View>
          <Press onPress={() => onDoc(null)} accessibilityLabel={t('new.removeDoc')} hitSlop={10}><X size={16} color={COLORS['ink-3']} /></Press>
        </View>
        {doc.key_terms?.length > 0 && (
          <>
            <Txt style={[tw('mt-4 text-xs font-medium uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('new.keyTerms')}</Txt>
            <View style={tw('mt-2 flex-row flex-wrap gap-1.5')}>{doc.key_terms.slice(0, 10).map((k) => <Badge key={k}>{k}</Badge>)}</View>
          </>
        )}
      </View>
    );
  }

  if (pct !== null && file) return <UploadProgress name={file.name} size={file.size} pct={pct} />;

  return (
    <View>
      <Press onPress={() => void choose()} scaleTo={0.985} testID="choose-document"
        style={[tw('items-center justify-center rounded-3xl border-dashed bg-paper px-6 py-10'), { borderWidth: 2, borderColor: COLORS['line-2'] }]}
        activeStyle={{ borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] }}>
        <UploadCloud size={36} color={COLORS['sky-600']} />
        <Txt style={tw('mt-3 text-center font-medium')}>{t('new.drop')}</Txt>
        <Txt style={tw('text-center text-sm text-ink-3')}>{t('new.dropSub')}</Txt>
      </Press>
      {(docs.data?.length ?? 0) > 0 && (
        <>
          <Txt style={[tw('mt-5 text-xs font-medium uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('new.recent')}</Txt>
          <ScrollView style={[tw('mt-2'), { maxHeight: 168 }]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {docs.data!.slice(0, 8).map((d) => (
              <Press key={d.document_id} onPress={() => onDoc(d)} scaleTo={0.99} style={tw('flex-row items-center gap-3 rounded-xl px-3 py-2')} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
                <FileText size={16} color={COLORS['ink-3']} />
                <Txt numberOfLines={1} style={tw('flex-1 text-sm')}>{d.filename}</Txt>
              </Press>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function PlanView({ plan, onEdit, onStart }: { plan: { id: string; nodes: PlanNode[] }; onEdit: () => void; onStart: () => void }) {
  const { t, n } = useI18n();
  const minutes = plan.nodes.reduce((s, x) => s + (x.est_minutes || 0), 0);
  return (
    <Reveal y={16} duration={0.5}>
      <Txt style={tw('font-hand text-xl text-sky-700')}>{t('new.planReady')}</Txt>
      <Txt accessibilityRole="header" testID="plan-title" style={tw('font-display text-5xl text-ink')}>{t('new.planSub', { n: n(plan.nodes.length), m: n(Math.round(minutes)) })}</Txt>
      <View style={[tw('mt-8 rounded-[28px] border border-line bg-surface'), { boxShadow: SHADOW.lift }]}>
        <Ruled style={tw('overflow-hidden rounded-[27px] py-6 pl-[76px] pr-5')}>
          <View style={tw('gap-4')}>
            {plan.nodes.map((node, i) => (
              <Reveal key={i} x={-10} y={0} delay={0.1 + i * 0.07} duration={0.45} style={tw('flex-row items-start gap-3')}>
                {/* a fixed column, so every title starts on the same line whatever the digit */}
                <Txt style={[tw('w-7 text-center font-display text-3xl text-sky-600'), { marginTop: -4 }]}>{n(i + 1)}</Txt>
                <View style={tw('min-w-0 flex-1')}>
                  <Txt style={tw('font-medium text-ink')}>{node.concept}</Txt>
                  <View style={tw('mt-0.5 flex-row flex-wrap items-center gap-2')}>
                    {node.depth ? <Badge>{node.depth}</Badge> : null}
                    {node.est_minutes != null && <Txt style={tw('text-xs text-ink-3')}>{t('common.minutes', { n: n(node.est_minutes) })}</Txt>}
                    {node.checkpoint_question ? <Badge tone="marigold" icon={<PauseCircle size={12} color={COLORS['marigold-600']} />}>{t('new.checkpoint')}</Badge> : null}
                  </View>
                </View>
              </Reveal>
            ))}
          </View>
        </Ruled>
      </View>
      <View style={tw('mt-6 gap-3')}>
        <Button size="lg" block onPress={onStart} icon={BookOpen} testID="plan-start">{t('new.start')}</Button>
        <Button variant="outline" block onPress={onEdit} icon={Pencil} testID="plan-edit">{t('new.edit')}</Button>
      </View>
    </Reveal>
  );
}
