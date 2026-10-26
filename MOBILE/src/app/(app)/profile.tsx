import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { Camera, Check, Flame, KeyRound, Loader2, LogOut, MonitorSmartphone, Trash2, Upload } from 'lucide-react-native';
import { api, uploads } from '@/core/api';
import type { MessageKey } from '@/core/i18n';
import type { User } from '@/core/types';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS, RADIUS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { monthYear } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { relativeDays } from '@/lib/lesson';
import { isStaff } from '@/lib/staff';
import { StrengthMeter, scorePassword } from '@/components/auth/auth-kit';
import { AVATARS, Avatar, AvatarGlyph } from '@/components/brand/avatar';
import { PlaneMark } from '@/components/brand/logo';
import { Page } from '@/components/layout/page';
import { BadgeShelf, Medal } from '@/components/lesson/badges';
import { CountUp, EASE_OUT, Float, Reveal, Spin } from '@/components/motion';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { LoadError } from '@/components/ui/load-error';
import { Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Card, Input, PasswordInput, Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ focus?: string }>();
  const scroll = useRef<ScrollView>(null);
  const badgesY = useRef(0);
  const staff = isStaff(user);

  // Opened from "all badges": bring the badge shelf into view.
  useEffect(() => {
    if (params.focus !== 'badges') return;
    const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, badgesY.current - 16), animated: true }), 500);
    return () => clearTimeout(id);
  }, [params.focus]);

  if (!user) return null;
  return (
    <Page scrollRef={scroll} onRefresh={() => Promise.all([qc.invalidateQueries({ queryKey: ['journey'] }), qc.invalidateQueries({ queryKey: ['sessions'] })])}>
      <View style={tw('flex-row items-center justify-between gap-3')}>
        <Txt accessibilityRole="header" style={tw('flex-1 font-display text-5xl text-ink')}>{t('profile.title')}</Txt>
        <Button size="sm" variant="outline" icon={LogOut} onPress={() => void signOut()} style={{ alignSelf: 'center' }} testID="sign-out">{t('nav.signOut')}</Button>
      </View>
      {/* Staff profiles skip the learner-only parts (badges, mentor, journey). */}
      <View style={tw('mt-8 gap-6')}>
        <PhotoSection user={user} />
        {!staff && <View onLayout={(e) => { badgesY.current = e.nativeEvent.layout.y + 110; }}><BadgesSection /></View>}
        <DetailsSection user={user} />
        {!staff && <MentorSection user={user} />}
        {!staff && <JourneySection />}
        <SecuritySection />
        <DangerSection />
      </View>
    </Page>
  );
}

function Section({ title, children, style, testID }: { title: string; children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <Reveal y={12} duration={0.5}>
      <Card style={[tw('p-5'), style]} testID={testID}>
        <Txt style={tw('font-display text-2xl text-ink')}>{title}</Txt>
        <View style={tw('mt-5')}>{children}</View>
      </Card>
    </Reveal>
  );
}

function useSave() {
  const { setUser } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const save = async (patch: Record<string, unknown>, msg?: string) => {
    setStatus('loading');
    try {
      setUser(await api.updateProfile(patch));
      setStatus('success');
      haptic.success();
      toast.success(msg ?? t('common.saved'));
      setTimeout(() => setStatus('idle'), 1400);
    } catch (e) { setStatus('idle'); toast.error((e as Error).message); }
  };
  return { status, save };
}

/** The dashed flight path on the profile cover; it fades in along the page. */
function FlightPath() {
  const [width, setWidth] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => { p.set(withTiming(1, { duration: 1600, easing: EASE_OUT })); }, [p]);
  const ink = useAnimatedProps(() => ({ opacity: p.value }));
  return (
    <View style={[tw('absolute inset-0'), { pointerEvents: 'none' }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={160} viewBox="0 0 800 180" preserveAspectRatio="none">
          <AnimatedPath d="M-10 150 C 160 40, 300 170, 460 80 S 700 20, 820 50" fill="none" stroke={COLORS['sky-300']} strokeWidth={2} strokeDasharray="5 9" animatedProps={ink} />
        </Svg>
      )}
    </View>
  );
}

function PhotoSection({ user }: { user: User }) {
  const { t, n, lang } = useI18n();
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const staff = isStaff(user);
  const journey = useQuery({ queryKey: ['journey'], queryFn: api.journey, enabled: !staff });
  const j = staff ? undefined : journey.data; // never show a cached learner journey on a staff profile
  const latest = (j?.badges ?? []).filter((b) => b.earned).sort((a, b) => (b.earned_at ?? '').localeCompare(a.earned_at ?? '')).slice(0, 5);

  const upload = async () => {
    if (busy) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      if ((a.fileSize ?? 0) > 4 * 1024 * 1024) { toast.error(t('profile.photoTooBig')); return; }
      setBusy(true);
      const ext = (a.mimeType?.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      setUser(await uploads.avatar({ uri: a.uri, name: a.fileName || `photo.${ext}`, mimeType: a.mimeType || 'image/jpeg', file: a.file ?? null }));
      haptic.success();
      toast.success(t('profile.photoSaved'));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const choose = async (id: string) => {
    haptic.tap();
    try { setUser(await api.updateProfile({ avatar_choice: id })); toast.success(t('profile.avatarSaved')); } catch (e) { toast.error((e as Error).message); }
  };
  const remove = async () => {
    try { setUser(await api.removeAvatar()); } catch (e) { toast.error((e as Error).message); }
  };
  const since = n(monthYear(new Date(user.created_at), lang));

  return (
    <View style={[{ borderRadius: RADIUS, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, boxShadow: SHADOW.soft }]} testID="profile-photo">
      {/* cover: a notebook page with a plane on its flight path */}
      <View style={[tw('h-40 overflow-hidden'), { borderTopLeftRadius: RADIUS - 1, borderTopRightRadius: RADIUS - 1 }]}>
        <LinearGradient colors={[COLORS['sky-50'], COLORS.paper, COLORS['marigold-50']]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={tw('absolute inset-0')} />
        <Ruled style={tw('absolute inset-0')} />
        <FlightPath />
        <Float style={[tw('absolute'), { right: '12%', top: 20 }]} tilt={4}><PlaneMark size={64} /></Float>
        {j && (
          <View style={tw('absolute left-5 top-4 flex-row flex-wrap gap-2')}>
            <View style={[tw('rounded-full px-3 py-1'), { backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)' }]}>
              <Txt style={tw('text-xs font-semibold text-sky-700')}>{t('lvl.level', { n: n(j.level.level) })} · {t(`lvl.${j.level.title}` as MessageKey)}</Txt>
            </View>
            <View style={[tw('flex-row items-center gap-1 rounded-full px-3 py-1'), { backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)' }]}>
              <Flame size={14} color={COLORS['marigold-600']} fill={COLORS['marigold-600']} />
              <Txt style={tw('text-xs font-semibold text-marigold-600')}>{t(j.streak.current === 1 ? 'cal.day1' : 'cal.days', { n: n(j.streak.current) })}</Txt>
            </View>
          </View>
        )}
      </View>

      <View style={tw('px-5 pb-6')}>
        <View style={[tw('flex-row items-end gap-4'), { marginTop: -56 }]}>
          <Press onPress={() => void upload()} disabled={busy} accessibilityLabel={t('profile.upload')} testID="avatar-button"
            style={[tw('rounded-full'), { borderWidth: 4, borderColor: COLORS.surface }]}>
            <Reveal key={(user.avatar_url ?? '') + (user.avatar_choice ?? '')} y={0} rotate={-10} duration={0.5}><Avatar user={user} size={116} /></Reveal>
            <View style={[tw('absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-ink'), { borderWidth: 3, borderColor: COLORS.surface }]}>
              {busy ? <Spin><Loader2 size={16} color={COLORS.white} /></Spin> : <Camera size={16} color={COLORS.white} />}
            </View>
          </Press>
          {latest.length > 0 && (
            <View style={tw('flex-1 flex-row justify-end pb-1')} accessibilityLabel={t('badge.title')}>
              {latest.map((b, i) => (
                <Reveal key={b.id} y={8} delay={0.3 + i * 0.08} duration={0.4} style={i ? { marginLeft: -12 } : null}><Medal group={b.group} tier={b.tier} earned size={46} /></Reveal>
              ))}
            </View>
          )}
        </View>
        <View style={tw('mt-3')}>
          <Txt style={tw('font-display text-4xl leading-tight text-ink')} testID="profile-name">{user.full_name}</Txt>
          <Txt style={tw('text-sm text-ink-2')}>{user.email}</Txt>
          <Txt style={tw('font-hand text-lg text-sky-700')}>{t(staff ? 'staff.joined' : 'profile.memberSince', { d: since })}</Txt>
        </View>

        {j && (
          <View style={tw('mt-5 flex-row rounded-2xl border border-line bg-paper')}>
            {([[j.totals.lessons_completed, t('prog.k.lessons')], [j.totals.minutes, t('prog.k.time')], [j.totals.concepts_mastered, t('prog.k.mastered')]] as const).map(([v, l], i) => (
              <View key={l} style={[tw('flex-1 items-center px-2 py-3'), i ? tw('border-l border-line') : null]}>
                <CountUp to={v} format={(x) => n(x)} style={tw('font-display text-3xl text-ink')} />
                <Txt numberOfLines={2} style={[tw('text-center text-ink-3'), { fontSize: 11.2, lineHeight: 15 }]}>{l}</Txt>
              </View>
            ))}
          </View>
        )}

        <View style={tw('mt-5 flex-row flex-wrap items-center gap-2')}>
          <Button size="sm" variant="soft" onPress={() => void upload()} icon={Upload} status={busy ? 'loading' : 'idle'} testID="upload-photo">{t('profile.upload')}</Button>
          {user.avatar_url ? <Button size="sm" variant="ghost" onPress={() => void remove()} icon={Trash2} testID="remove-photo">{t('profile.remove')}</Button> : null}
        </View>
        <Txt style={tw('mt-2 text-xs text-ink-3')}>{t('profile.photoHint')}</Txt>
        <Txt style={tw('mt-5 text-sm font-medium text-ink')}>{t('profile.chooseAvatar')}</Txt>
        <View style={tw('mt-3 flex-row flex-wrap')} accessibilityRole="radiogroup">
          {AVATARS.map((a, i) => {
            const sel = !user.avatar_url && user.avatar_choice === a.id;
            return (
              <Reveal key={a.id} y={8} delay={i * 0.03} duration={0.35} style={[tw('items-center'), { width: `${100 / 6}%`, marginBottom: 10 }]}>
                <Press onPress={() => void choose(a.id)} accessibilityRole="radio" accessibilityState={{ checked: sel }} accessibilityLabel={a.id} scaleTo={0.9} testID={`avatar-${a.id}`}>
                  <AvatarGlyph choice={a} size={42} selected={sel} />
                  {sel && (
                    <View style={[tw('absolute h-5 w-5 items-center justify-center rounded-full bg-sky-600'), { right: -2, top: -2 }]}><Check size={12} color={COLORS.white} /></View>
                  )}
                </Press>
              </Reveal>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function BadgesSection() {
  const { t } = useI18n();
  const j = useQuery({ queryKey: ['journey'], queryFn: api.journey });
  return (
    <Section title={t('badge.title')} testID="badges">
      <Txt style={[tw('mb-4 text-sm text-ink-3'), { marginTop: -12 }]}>{t('badge.sub')}</Txt>
      {j.data ? <BadgeShelf journey={j.data} /> : j.isError ? <LoadError onRetry={() => void j.refetch()} /> : <Skeleton style={tw('h-48 rounded-2xl')} />}
    </Section>
  );
}

function DetailsSection({ user }: { user: User }) {
  const { t } = useI18n();
  const { status, save } = useSave();
  const [f, setF] = useState({ full_name: user.full_name, grade: user.grade ?? '', board: user.board ?? '' });
  if (isStaff(user)) {
    // Staff: just who they are — no class or board.
    return (
      <Section title={t('profile.details')}>
        <View style={tw('gap-4')}>
          <Field label={t('auth.fullName')} index={1}><Input testID="details-name" value={f.full_name} onChangeText={(v) => setF({ ...f, full_name: v })} /></Field>
          <Button status={status} disabled={f.full_name.trim().length < 2} onPress={() => void save({ full_name: f.full_name.trim() })} style={{ alignSelf: 'flex-end' }} testID="details-save">{t('common.save')}</Button>
          <View style={tw('gap-1')}>
            <Txt style={tw('text-sm')}><Txt style={tw('text-ink-3')}>{t('auth.email')}: </Txt>{user.email}</Txt>
            <Txt style={tw('text-sm')}><Txt style={tw('text-ink-3')}>{t('staff.role')}: </Txt>{t(user.role === 'admin' ? 'staff.admin' : 'staff.teacher')}</Txt>
          </View>
        </View>
      </Section>
    );
  }
  return (
    <Section title={t('profile.details')}>
      <View style={tw('gap-4')}>
        <Field label={t('auth.fullName')} index={1}><Input testID="details-name" value={f.full_name} onChangeText={(v) => setF({ ...f, full_name: v })} /></Field>
        <View style={tw('flex-row gap-4')}>
          <Field label={t('auth.grade')} index={2} style={tw('flex-1')}><Input testID="details-grade" value={f.grade} onChangeText={(v) => setF({ ...f, grade: v })} /></Field>
          <Field label={t('profile.board')} index={3} style={tw('flex-1')}><Input testID="details-board" value={f.board} onChangeText={(v) => setF({ ...f, board: v })} /></Field>
        </View>
        <Button status={status} disabled={f.full_name.trim().length < 2} style={{ alignSelf: 'flex-end' }} testID="details-save"
          onPress={() => void save({ full_name: f.full_name.trim(), grade: f.grade.trim() || null, board: f.board.trim() || null })}>{t('common.save')}</Button>
      </View>
    </Section>
  );
}

function MentorSection({ user }: { user: User }) {
  const { t } = useI18n();
  const { status, save } = useSave();
  const [name, setName] = useState(user.mentor_name ?? '');
  const [email, setEmail] = useState(user.mentor_email ?? '');
  return (
    <Section title={t('profile.mentor')}>
      <Txt style={[tw('mb-4 text-sm text-ink-3'), { marginTop: -8 }]}>{t('auth.mentorHint')}</Txt>
      <View style={tw('gap-4')}>
        <Field label={t('auth.mentorName')} index={4}><Input testID="mentor-name" value={name} onChangeText={setName} autoCapitalize="words" /></Field>
        <Field label={t('auth.mentorEmail')} index={5}>
          <Input testID="mentor-email" value={email} onChangeText={setEmail} keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Button status={status} onPress={() => void save({ mentor_name: name.trim() || null, mentor_email: email.trim() || null })} style={{ alignSelf: 'flex-end' }} testID="mentor-save">{t('common.save')}</Button>
      </View>
    </Section>
  );
}

/** Finished lessons as milestones (Work-Experience timeline, adapted). */
function JourneySection() {
  const { t, n, lang } = useI18n();
  const q = useQuery({ queryKey: ['lessons', 'completed'], queryFn: () => api.listLessons({ status: 'completed', limit: 20 }) });
  const items = q.data?.lessons ?? [];
  return (
    <Section title={t('profile.journey')}>
      {items.length === 0 ? <Txt style={tw('text-sm text-ink-3')}>{t('profile.journeyEmpty')}</Txt> : (
        <View style={[tw('ml-3 border-dashed'), { borderLeftWidth: 2, borderColor: COLORS['line-2'] }]}>
          {items.map((l, i) => (
            <Reveal key={l.id} x={-10} y={0} delay={Math.min(i, 10) * 0.05} duration={0.4} style={[tw('pl-6'), i < items.length - 1 ? tw('pb-6') : null]}>
              {/* the milestone dot sits on the dashed line, haloed in sky */}
              <View style={[tw('absolute rounded-full bg-sky-50'), { left: -15, top: -2, padding: 4 }]}>
                <View style={[tw('h-4 w-4 rounded-full bg-sky-600'), { borderWidth: 2, borderColor: COLORS.surface }]} />
              </View>
              <Txt style={tw('text-xs text-ink-3')}>{l.completed_at ? relativeDays(l.completed_at, lang) : ''}</Txt>
              <Press href={`/report/${l.id}`} scaleTo={1}><Txt style={tw('font-medium text-ink')}>{l.title}</Txt></Press>
              <Txt style={tw('text-sm text-ink-3')}>{t('common.concepts', { n: n(l.node_count) })}{l.score_pct != null ? ` · ${t('profile.scored', { n: n(Math.round(l.score_pct)) })}` : ''}</Txt>
            </Reveal>
          ))}
        </View>
      )}
    </Section>
  );
}

type Session = { id: string; user_agent?: string; ip_address?: string; last_used_at?: string; created_at: string; current?: boolean };

function SecuritySection() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: api.listSessions });
  const list = (sessions.data ?? []) as unknown as Session[];

  const change = async () => {
    setStatus('loading');
    try {
      await api.changePassword(cur, next);
      toast.success(t('profile.passwordChanged'));
      setCur(''); setNext('');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1200);
    } catch (err) { setStatus('idle'); toast.error((err as Error).message); }
  };
  const device = (ua?: string) => {
    if (!ua) return t('profile.unknownDevice');
    // This app's own requests identify the phone's network stack, not a browser.
    if (/okhttp/i.test(ua)) return 'VidyaSaathi · Android';
    if (/CFNetwork|Darwin/i.test(ua)) return 'VidyaSaathi · iOS';
    const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const o = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
    return `${b}${o ? ` · ${o}` : ''}`;
  };

  return (
    <Section title={t('profile.security')}>
      <View style={tw('gap-4')}>
        <Field label={t('profile.currentPassword')} index={6}>
          <PasswordInput testID="current-password" autoComplete="current-password" value={cur} onChangeText={setCur} showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
        </Field>
        <View>
          <Field label={t('auth.newPassword')} index={7}>
            <PasswordInput testID="new-password" autoComplete="new-password" value={next} onChangeText={setNext} showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
          </Field>
          <StrengthMeter password={next} />
        </View>
        <Button status={status} icon={KeyRound} disabled={!cur || scorePassword(next) === 0} onPress={() => void change()} style={{ alignSelf: 'flex-end' }} testID="change-password">{t('profile.changePassword')}</Button>
      </View>
      <View style={tw('mt-8 flex-row items-center justify-between gap-2')}>
        <Txt style={tw('font-semibold')}>{t('profile.sessions')}</Txt>
        <Button size="sm" variant="ghost" icon={LogOut} style={{ alignSelf: 'center' }} testID="sign-out-others"
          onPress={async () => {
            try { await api.revokeAllSessions(); toast.success(t('profile.signedOutOthers')); void qc.invalidateQueries({ queryKey: ['sessions'] }); } catch (e) { toast.error((e as Error).message); }
          }}>{t('profile.signOutAll')}</Button>
      </View>
      <View style={tw('mt-3 rounded-2xl border border-line')}>
        {list.map((s, i) => (
          <View key={s.id} style={[tw('flex-row items-center gap-3 px-4 py-3'), i ? tw('border-t border-line') : null]}>
            <MonitorSmartphone size={20} color={COLORS['ink-3']} />
            <View style={tw('min-w-0 flex-1')}>
              <View style={tw('flex-row flex-wrap items-center gap-2')}>
                <Txt style={tw('text-sm font-medium')}>{device(s.user_agent)}</Txt>
                {s.current && <View style={tw('rounded-full bg-sage-100 px-2 py-0.5')}><Txt style={tw('text-xs text-sage')}>{t('profile.thisDevice')}</Txt></View>}
              </View>
              <Txt style={tw('text-xs text-ink-3')}>{t('profile.lastUsed', { t: relativeDays(s.last_used_at || s.created_at, lang) })}{s.ip_address ? ` · ${s.ip_address}` : ''}</Txt>
            </View>
            {!s.current && (
              <Button size="sm" variant="ghost" style={{ alignSelf: 'center' }}
                onPress={async () => { await api.revokeSession(s.id).catch((e: Error) => toast.error(e.message)); void qc.invalidateQueries({ queryKey: ['sessions'] }); }}>{t('profile.revoke')}</Button>
            )}
          </View>
        ))}
      </View>
    </Section>
  );
}

function DangerSection() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Section title={t('profile.danger')} style={{ borderColor: color('rose', 0.3) }}>
      <Txt style={[tw('text-sm text-ink-2'), { marginTop: -8 }]}>{t('profile.dangerBody')}</Txt>
      <View style={tw('mt-4 gap-3')}>
        <Field label={t('profile.typePassword')} index={8}>
          <PasswordInput testID="delete-password" value={pw} onChangeText={setPw} showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
        </Field>
        <Button variant="danger" disabled={!pw || busy} status={busy ? 'loading' : 'idle'} icon={Trash2} style={{ alignSelf: 'flex-end' }} testID="delete-account"
          onPress={async () => { setBusy(true); try { await api.deleteAccount(pw); await signOut(); } catch (e) { toast.error((e as Error).message); setBusy(false); } }}>
          {t('profile.danger')}
        </Button>
      </View>
    </Section>
  );
}
