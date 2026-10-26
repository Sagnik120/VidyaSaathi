import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { api } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { AuthHeading, AuthScreen, FormAlert, errText, pendingOtp } from '@/components/auth/auth-kit';
import { Button, type ButtonStatus } from '@/components/ui/button';
import { EMAIL_RE, Field } from '@/components/ui/field';
import { Press } from '@/components/ui/press';
import { Input } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

export default function ForgotPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    if (status === 'loading') return;
    const address = email.trim();
    if (!EMAIL_RE.test(address)) return setFieldError(t('err.email'));
    setFieldError(null);
    setError('');
    setStatus('loading');
    try {
      const r = await api.forgotPassword(address);
      pendingOtp.save({ email: address, code: r.dev_otp, purpose: 'reset_password' });
      setStatus('idle');
      router.push('/reset');
    } catch (err) {
      setStatus('idle');
      setError(errText(err, t('common.error')));
    }
  };

  return (
    <AuthScreen>
      <Press onPress={() => router.replace('/login')} hitSlop={8} style={tw('mb-6 flex-row items-center gap-1.5 self-start')} testID="back-to-login">
        <ArrowLeft size={16} color={COLORS['ink-3']} />
        <Txt style={tw('text-sm text-ink-3')}>{t('auth.signIn')}</Txt>
      </Press>
      <AuthHeading title={t('auth.forgotTitle')} sub={t('auth.forgotSub')} />
      <View style={tw('gap-5')}>
        <Field label={t('auth.email')} error={fieldError}>
          <Input testID="email" value={email} onChangeText={setEmail} invalid={!!fieldError}
            keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
            returnKeyType="send" onSubmitEditing={() => void submit()} />
        </Field>
        <FormAlert>{error}</FormAlert>
        <Button block size="lg" status={status} onPress={() => void submit()} testID="submit">{t('auth.sendCode')}</Button>
      </View>
    </AuthScreen>
  );
}
