import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { tw } from '@/theme/tw';
import {
  AuthHeading, AuthScreen, DemoCode, FormAlert, StrengthMeter, TextLink, errText, passwordOk, pendingOtp, useCooldown, type PendingOtp,
} from '@/components/auth/auth-kit';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { OtpInput, type OtpHandle } from '@/components/ui/otp-input';
import { PasswordInput } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

export default function ResetPage() {
  const { t } = useI18n();
  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const otp = useRef<OtpHandle>(null);
  const cooldown = useCooldown(30);

  useEffect(() => {
    const p = pendingOtp.load();
    if (!p || p.purpose !== 'reset_password') router.replace('/forgot');
    else setPending(p);
  }, []);

  const submit = async () => {
    if (!pending || status === 'loading') return;
    if (code.length !== 6) { otp.current?.shake(); return; }
    if (!passwordOk(password)) return setPwError(t('err.password'));
    setPwError(null);
    setError('');
    setStatus('loading');
    try {
      await api.resetPassword(pending.email, code, password);
      pendingOtp.clear();
      setStatus('success');
      toast.success(t('auth.resetDone'));
      router.replace('/login');
    } catch (err) {
      setStatus('idle');
      setError(errText(err, t('common.error')));
    }
  };

  const resend = async () => {
    if (!pending) return;
    try {
      const r = await api.forgotPassword(pending.email);
      const next = { ...pending, code: r.dev_otp };
      pendingOtp.save(next);
      setPending(next);
      cooldown.restart();
    } catch (err) {
      setError(errText(err, t('common.error')));
    }
  };

  if (!pending) return <View style={tw('flex-1 bg-paper')} />;
  return (
    <AuthScreen>
      <AuthHeading title={t('auth.resetTitle')} sub={t('auth.verifySub', { email: pending.email })} />
      <DemoCode code={pending.code} onFill={() => pending.code && otp.current?.fill(pending.code)} />
      <View style={tw('gap-5')}>
        <OtpInput ref={otp} value={code} onChange={setCode} />
        <View>
          <Field label={t('auth.newPassword')} error={pwError}>
            <PasswordInput testID="password" value={password} onChangeText={setPassword} invalid={!!pwError}
              autoComplete="new-password" textContentType="newPassword" showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
          </Field>
          <StrengthMeter password={password} />
        </View>
        <FormAlert>{error}</FormAlert>
        <Button block size="lg" status={status} onPress={() => void submit()} testID="submit">{t('auth.resetTitle')}</Button>
      </View>
      <View style={tw('mt-6 self-start')}>
        {cooldown.left > 0
          ? <Txt style={tw('text-sm font-medium text-ink-3')}>{t('auth.resendIn', { n: cooldown.left })}</Txt>
          : <TextLink onPress={() => void resend()} testID="resend">{t('auth.resend')}</TextLink>}
      </View>
    </AuthScreen>
  );
}
