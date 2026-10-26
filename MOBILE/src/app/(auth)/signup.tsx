import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { api } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { AuthHeading, AuthScreen, FormAlert, LinkLine, StrengthMeter, TextLink, errText, passwordOk, pendingOtp } from '@/components/auth/auth-kit';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { EMAIL_RE, Field } from '@/components/ui/field';
import { Input, PasswordInput, SlidingPill } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
type Level = (typeof LEVELS)[number];
type Errors = Partial<Record<'name' | 'email' | 'password' | 'mentor_email', string>>;

export default function SignupPage() {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [level, setLevel] = useState<Level>('beginner');
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (status === 'loading') return;
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t('err.name');
    if (!EMAIL_RE.test(email.trim())) next.email = t('err.email');
    if (!passwordOk(password)) next.password = t('err.password');
    if (mentorEmail.trim() && !EMAIL_RE.test(mentorEmail.trim())) next.mentor_email = t('err.mentorEmail');
    setErrors(next);
    if (Object.keys(next).length) { haptic.warning(); return; }
    setError('');
    setStatus('loading');
    try {
      const address = email.trim();
      const r = await api.signup({
        full_name: name.trim(), email: address, password,
        grade: grade.trim() || null, preferred_language: lang, preferred_level: level,
        mentor_name: mentorName.trim() || null, mentor_email: mentorEmail.trim() || null,
      });
      pendingOtp.save({ email: address, code: r.dev_otp, purpose: 'verify_email' });
      setStatus('success');
      router.push('/verify');
      setTimeout(() => setStatus('idle'), 600);
    } catch (err) {
      setStatus('error');
      haptic.error();
      setError(errText(err, t('common.error')));
      setTimeout(() => setStatus('idle'), 1200);
    }
  };

  const opt = t('common.optionalTag');
  return (
    <AuthScreen>
      <AuthHeading title={t('auth.createTitle')} sub={t('auth.createSub')} />
      <View style={tw('gap-5')}>
        <Field label={t('auth.fullName')} error={errors.name} index={0}>
          <Input testID="name" value={name} onChangeText={setName} invalid={!!errors.name} autoComplete="name" textContentType="name" autoCapitalize="words"
            returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()} />
        </Field>
        <Field label={t('auth.email')} error={errors.email} index={1}>
          <Input ref={emailRef} testID="email" value={email} onChangeText={setEmail} invalid={!!errors.email}
            keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
            returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordRef.current?.focus()} />
        </Field>
        <View>
          <Field label={t('auth.password')} error={errors.password} index={2}>
            <PasswordInput ref={passwordRef} testID="password" value={password} onChangeText={setPassword} invalid={!!errors.password}
              autoComplete="new-password" textContentType="newPassword" showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
          </Field>
          <StrengthMeter password={password} />
        </View>
        <Field label={t('auth.grade')} optional={opt} index={3}>
          <Input testID="grade" value={grade} onChangeText={setGrade} />
        </Field>
        <Field label={t('auth.level')} index={4}>
          <View style={tw('rounded-2xl border border-line bg-paper-2 p-1')}>
            <SlidingPill
              value={level}
              onChange={setLevel}
              items={LEVELS.map((l) => ({ value: l, label: t(`auth.level${l[0].toUpperCase()}${l.slice(1)}` as 'auth.levelBeginner') }))}
              style={tw('flex-row')}
              itemStyle={tw('items-center rounded-xl px-1 py-2')}
              pillStyle={[tw('rounded-xl bg-surface'), { boxShadow: SHADOW.soft }]}
              renderItem={(item, active) => (
                <Txt numberOfLines={1} style={[tw('text-xs font-medium'), { color: active ? COLORS.ink : COLORS['ink-3'] }]}>{item.label}</Txt>
              )}
            />
          </View>
        </Field>
        <View style={tw('mt-3 rounded-2xl border border-dashed border-line-2 px-4 pb-4')}>
          {/* the fieldset's legend sits on the dashed border */}
          <View style={[tw('self-start bg-paper px-1'), { marginTop: -14, marginLeft: -4 }]}>
            <Txt style={tw('font-hand text-lg text-sky-700')}>{t('auth.mentorHint')}</Txt>
          </View>
          <View style={tw('gap-4 pt-2')}>
            <Field label={t('auth.mentorName')} optional={opt} index={5}>
              <Input testID="mentor-name" value={mentorName} onChangeText={setMentorName} autoComplete="off" autoCapitalize="words" />
            </Field>
            <Field label={t('auth.mentorEmail')} optional={opt} error={errors.mentor_email} index={6}>
              <Input testID="mentor-email" value={mentorEmail} onChangeText={setMentorEmail} invalid={!!errors.mentor_email}
                keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} autoComplete="off" />
            </Field>
          </View>
        </View>
        <FormAlert>{error}</FormAlert>
        <Button block size="lg" status={status} loadingLabel={t('auth.creating')} icon={ArrowRight} onPress={() => void submit()} testID="submit">{t('auth.create')}</Button>
      </View>
      <View style={tw('mt-8')}>
        <LinkLine lead={t('auth.haveAccount')}>
          <TextLink onPress={() => router.replace('/login')} testID="to-login">{t('auth.signIn')}</TextLink>
        </LinkLine>
      </View>
      <View style={tw('mt-2 items-center')}>
        <TextLink tone="muted" weight="400" onPress={() => router.replace('/staff/signup')}>{t('staff.signupLink')}</TextLink>
      </View>
    </AuthScreen>
  );
}
