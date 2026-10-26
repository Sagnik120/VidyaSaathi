import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ShieldCheck, Sparkles } from 'lucide-react-native';
import { api, ApiError } from '@/core/api';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { EMAIL_RE, Field } from '@/components/ui/field';
import { Input, PasswordInput } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';
import { AuthHeading, AuthScreen, FormAlert, LinkLine, TextLink, errText, pendingOtp } from './auth-kit';

const DEMO = {
  student: { email: 'demo@vidyasaathi.in', password: 'DemoStudent@123' },
  staff: { email: 'admin@vidyasaathi.in', password: 'DemoStudent@123' },
};

/** Student and staff sign-in share one form; staff mode only admits admins/teachers and opens the portal. */
export function LoginForm({ staff = false }: { staff?: boolean }) {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const passwordRef = useRef<TextInput>(null);

  const submit = async (demoCreds?: { email: string; password: string }) => {
    if (status === 'loading') return;
    const creds = demoCreds ?? { email: email.trim(), password };
    const next: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(creds.email)) next.email = t('err.email');
    if (!creds.password) next.password = t('err.passwordEmpty');
    setErrors(next);
    if (Object.keys(next).length) { haptic.warning(); return; }
    setError('');
    setStatus('loading');
    try {
      const tok = await api.login(creds.email.trim(), creds.password);
      const isStaff = tok.user.role === 'admin' || tok.user.role === 'teacher';
      if (staff && !isStaff) {
        void api.revokeRefresh(tok.refresh_token);
        setStatus('idle');
        setError(t('staff.notStaff'));
        return;
      }
      signIn(tok);
      setStatus('success');
      haptic.success();
      toast.success(t('auth.signedIn'));
      router.replace(staff || isStaff ? '/admin' : '/dashboard');
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiError && err.status === 403 && /verify/i.test(err.message)) {
        const r = await api.resendOtp(creds.email.trim()).catch(() => null);
        pendingOtp.save({ email: creds.email.trim(), code: r?.dev_otp, purpose: 'verify_email', staff });
        setStatus('idle');
        router.push('/verify');
        return;
      }
      haptic.error();
      setError(errText(err, t('common.error')));
      setTimeout(() => setStatus('idle'), 1200);
    }
  };

  const demo = staff ? DEMO.staff : DEMO.student;
  return (
    <AuthScreen>
      {staff && (
        <View style={tw('mb-2 flex-row items-center gap-1.5 self-start rounded-full bg-ink px-3 py-1')}>
          <ShieldCheck size={14} color={COLORS.white} />
          <Txt style={tw('text-xs font-semibold text-white')}>{t('staff.kicker')}</Txt>
        </View>
      )}
      <AuthHeading title={staff ? t('staff.loginTitle') : t('auth.welcomeBack')} sub={staff ? t('staff.loginSub') : t('auth.loginSub')} />
      <View style={tw('gap-5')}>
        <Field label={t('auth.email')} error={errors.email} index={0}>
          <Input
            testID="email" value={email} onChangeText={setEmail} invalid={!!errors.email}
            keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
            returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} submitBehavior="submit"
          />
        </Field>
        <Field label={t('auth.password')} error={errors.password} index={1}
          hint={<TextLink onPress={() => router.push('/forgot')} weight="400">{t('auth.forgot')}</TextLink>}>
          <PasswordInput
            ref={passwordRef} testID="password" value={password} onChangeText={setPassword} invalid={!!errors.password}
            autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => void submit()}
            showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')}
          />
        </Field>
        <FormAlert>{error}</FormAlert>
        <Button block size="lg" variant={staff ? 'ink' : 'primary'} status={status} loadingLabel={t('auth.signingIn')} onPress={() => void submit()} testID="submit">
          {t('auth.signIn')}
        </Button>
        <Button block variant="soft" icon={Sparkles} testID="demo-login"
          onPress={() => { setEmail(demo.email); setPassword(demo.password); void submit(demo); }}>
          {t('auth.demo')}
        </Button>
      </View>
      <View style={tw('mt-8 items-center gap-2')}>
        <LinkLine lead={staff ? t('staff.newAccount') : t('auth.noAccount')}>
          <TextLink onPress={() => router.push(staff ? '/staff/signup' : '/signup')} testID="to-signup">{t('auth.createOne')}</TextLink>
        </LinkLine>
        <TextLink tone="muted" weight="400" onPress={() => router.replace(staff ? '/login' : '/staff/login')} testID="switch-door">
          {staff ? t('staff.studentLink') : t('staff.link')}
        </TextLink>
      </View>
    </AuthScreen>
  );
}
