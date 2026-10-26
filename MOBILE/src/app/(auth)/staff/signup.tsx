import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { api } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { AuthHeading, AuthScreen, FormAlert, LinkLine, StrengthMeter, TextLink, errText, passwordOk, pendingOtp } from '@/components/auth/auth-kit';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { EMAIL_RE, Field } from '@/components/ui/field';
import { Input, PasswordInput, Tabs } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'code', string>>;

export default function StaffSignupPage() {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [role, setRole] = useState<'admin' | 'teacher'>('admin');
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [error, setError] = useState('');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (status === 'loading') return;
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t('err.name');
    if (!EMAIL_RE.test(email.trim())) next.email = t('err.email');
    if (!passwordOk(password)) next.password = t('err.password');
    if (!accessCode.trim()) next.code = t('err.code');
    setErrors(next);
    if (Object.keys(next).length) { haptic.warning(); return; }
    setError('');
    setStatus('loading');
    try {
      const address = email.trim();
      const r = await api.signupStaff({ full_name: name.trim(), email: address, password, role, access_code: accessCode.trim(), preferred_language: lang });
      pendingOtp.save({ email: address, code: r.dev_otp, purpose: 'verify_email', staff: true });
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

  return (
    <AuthScreen>
      <View style={tw('mb-2 flex-row items-center gap-1.5 self-start rounded-full bg-ink px-3 py-1')}>
        <ShieldCheck size={14} color={COLORS.white} />
        <Txt style={tw('text-xs font-semibold text-white')}>{t('staff.kicker')}</Txt>
      </View>
      <AuthHeading title={t('staff.signupTitle')} sub={t('staff.signupSub')} />
      <View style={tw('gap-5')}>
        <Field label={t('staff.role')} index={0}>
          <Tabs value={role} onChange={setRole} items={[{ value: 'admin', label: t('staff.admin') }, { value: 'teacher', label: t('staff.teacher') }]} />
        </Field>
        <Field label={t('auth.fullName')} error={errors.name} index={1}>
          <Input testID="name" value={name} onChangeText={setName} invalid={!!errors.name} autoComplete="name" textContentType="name" autoCapitalize="words"
            returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()} />
        </Field>
        <Field label={t('auth.email')} error={errors.email} index={2}>
          <Input ref={emailRef} testID="email" value={email} onChangeText={setEmail} invalid={!!errors.email}
            keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
            returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordRef.current?.focus()} />
        </Field>
        <View>
          <Field label={t('auth.password')} error={errors.password} index={3}>
            <PasswordInput ref={passwordRef} testID="password" value={password} onChangeText={setPassword} invalid={!!errors.password}
              autoComplete="new-password" textContentType="newPassword" showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
          </Field>
          <StrengthMeter password={password} />
        </View>
        <Field label={t('staff.code')} hint={t('staff.codeHint')} error={errors.code} index={4}>
          <Input testID="access-code" value={accessCode} onChangeText={setAccessCode} invalid={!!errors.code} autoComplete="off" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <FormAlert>{error}</FormAlert>
        <Button block size="lg" variant="ink" status={status} loadingLabel={t('auth.creating')} onPress={() => void submit()} testID="submit">{t('auth.create')}</Button>
      </View>
      <View style={tw('mt-8 items-center gap-2')}>
        <LinkLine lead={t('staff.haveAccount')}>
          <TextLink onPress={() => router.replace('/staff/login')}>{t('auth.signIn')}</TextLink>
        </LinkLine>
        <TextLink tone="muted" weight="400" onPress={() => router.replace('/signup')}>{t('auth.createTitle')} →</TextLink>
      </View>
    </AuthScreen>
  );
}
