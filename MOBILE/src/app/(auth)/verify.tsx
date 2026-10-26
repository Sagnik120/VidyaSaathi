import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/core/api';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { AuthHeading, AuthScreen, DemoCode, FormAlert, TextLink, errText, pendingOtp, useCooldown, type PendingOtp } from '@/components/auth/auth-kit';
import { NamasteOverlay } from '@/components/auth/namaste';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { OtpInput, type OtpHandle } from '@/components/ui/otp-input';
import { Txt } from '@/components/ui/text';

export default function VerifyPage() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [dest, setDest] = useState<'/dashboard' | '/admin'>('/dashboard');
  const otp = useRef<OtpHandle>(null);
  const cooldown = useCooldown(30);

  useEffect(() => {
    const p = pendingOtp.load();
    if (!p || p.purpose !== 'verify_email') router.replace(p?.staff ? '/staff/signup' : '/signup');
    else setPending(p);
  }, []);

  const verify = async (value = code) => {
    if (!pending || value.length !== 6 || status === 'loading') return;
    setError('');
    setStatus('loading');
    try {
      const tok = await api.verifyEmail(pending.email, value);
      signIn(tok);
      setDest(tok.user.role === 'admin' || tok.user.role === 'teacher' ? '/admin' : '/dashboard');
      pendingOtp.clear();
      setStatus('success');
      haptic.success();
      setDone(true);
    } catch (err) {
      setStatus('idle');
      setError(errText(err, t('common.error')));
      otp.current?.shake();
    }
  };

  const resend = async () => {
    if (!pending) return;
    try {
      const r = await api.resendOtp(pending.email, 'verify_email');
      const next = { ...pending, code: r.dev_otp };
      pendingOtp.save(next);
      setPending(next);
      cooldown.restart();
      otp.current?.clear();
    } catch (err) {
      setError(errText(err, t('common.error')));
    }
  };

  const finish = useCallback(() => router.replace(dest), [dest]);
  if (!pending) return <View style={tw('flex-1 bg-paper')} />;

  return (
    <AuthScreen>
      <AuthHeading title={t('auth.verifyTitle')} sub={t('auth.verifySub', { email: pending.email })} />
      <DemoCode code={pending.code} onFill={() => pending.code && otp.current?.fill(pending.code)} />
      <View style={tw('gap-5')}>
        <OtpInput ref={otp} value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={status === 'loading' || done} />
        <FormAlert>{error}</FormAlert>
        <Button block size="lg" status={status} loadingLabel={t('auth.verifying')} disabled={code.length !== 6} onPress={() => void verify()} testID="submit">{t('auth.verify')}</Button>
      </View>
      <View style={tw('mt-6 flex-row items-center justify-between')}>
        <TextLink tone="muted" weight="400" onPress={() => router.replace(pending.staff ? '/staff/signup' : '/signup')}>{t('common.back')}</TextLink>
        {cooldown.left > 0
          ? <Txt style={tw('text-sm font-medium text-ink-3')}>{t('auth.resendIn', { n: cooldown.left })}</Txt>
          : <TextLink onPress={() => void resend()} testID="resend">{t('auth.resend')}</TextLink>}
      </View>
      {done && <NamasteOverlay onDone={finish} />}
    </AuthScreen>
  );
}
