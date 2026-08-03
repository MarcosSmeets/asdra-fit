import { forgotPasswordSchema, resetPasswordSchema } from '@ad-sidera/shared';
import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { requestPasswordReset, resetPassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button, Card, Input, Screen, Text } from '@/components';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { useTheme } from '@/theme/ThemeProvider';

type Step = 'request' | 'reset' | 'done';

interface FieldErrors {
  email?: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function ForgotPassword(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = useCallback(async (): Promise<void> => {
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setFieldErrors({ email: 'Informe um e-mail válido.' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await requestPasswordReset(parsed.data.email);
      setStep('reset');
    } catch {
      setFormError('Não foi possível pedir o código agora. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  const submitReset = useCallback(async (): Promise<void> => {
    setFormError(null);
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'As senhas não coincidem.' });
      return;
    }
    const parsed = resetPasswordSchema.safeParse({
      email: email.trim(),
      code: code.trim(),
      newPassword,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ code: flat.code?.[0], newPassword: flat.newPassword?.[0] });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await resetPassword(parsed.data);
      setStep('done');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
        setFormError('Código inválido ou expirado. Confira o código ou peça um novo.');
      } else {
        setFormError('Não foi possível redefinir agora. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [code, confirmPassword, email, newPassword]);

  return (
    <Screen scroll testID="forgot-password-screen">
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="title">Recuperar acesso</Text>
        <Text variant="body" color="textMuted">
          {step === 'request'
            ? 'Informe o e-mail da sua conta e enviaremos um código de redefinição.'
            : step === 'reset'
              ? 'Digite o código recebido e escolha uma nova senha.'
              : 'Senha redefinida.'}
        </Text>
      </View>

      {step === 'request' ? (
        <>
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={() => {
              void submitRequest();
            }}
            editable={!submitting}
            placeholder="voce@exemplo.com"
            error={fieldErrors.email}
          />
          {formError ? (
            <Text variant="label" color="error" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
          <Button
            label="Enviar código"
            onPress={() => {
              void submitRequest();
            }}
            loading={submitting}
            accessibilityHint="Envia um código de redefinição para o e-mail informado."
            testID="forgot-password-submit"
          />
        </>
      ) : null}

      {step === 'reset' ? (
        <>
          <Card variant="surfaceAlt">
            <Text variant="body" accessibilityLiveRegion="polite">
              Se existir uma conta com este e-mail, um código de 6 dígitos foi enviado. Ele vale por
              30 minutos. Confira também a caixa de spam.
            </Text>
          </Card>
          <View style={{ gap: theme.spacing.lg }}>
            <Input
              label="Código de 6 dígitos"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              editable={!submitting}
              placeholder="000000"
              error={fieldErrors.code}
            />
            <Input
              label="Nova senha"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!submitting}
              placeholder="Ao menos 8 caracteres"
              error={fieldErrors.newPassword}
            />
            <Input
              label="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => {
                void submitReset();
              }}
              editable={!submitting}
              placeholder="Repita a nova senha"
              error={fieldErrors.confirmPassword}
            />
          </View>
          {formError ? (
            <Text variant="label" color="error" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
          <Button
            label="Redefinir senha"
            onPress={() => {
              void submitReset();
            }}
            loading={submitting}
            accessibilityHint="Redefine a senha usando o código recebido."
            testID="reset-password-submit"
          />
          <Text
            variant="label"
            color="primary"
            center
            onPress={() => {
              void submitRequest();
            }}
            accessibilityRole="link"
            accessibilityHint="Envia um novo código para o mesmo e-mail."
          >
            Reenviar código
          </Text>
        </>
      ) : null}

      {step === 'done' ? (
        <>
          <Card variant="surfaceAlt">
            <Text variant="body" accessibilityLiveRegion="polite">
              Sua senha foi redefinida e as sessões antigas foram encerradas. Entre com a nova
              senha.
            </Text>
          </Card>
          <Button
            label="Ir para o login"
            onPress={() => router.replace('/(auth)/login')}
            accessibilityHint="Abre a tela de login."
          />
        </>
      ) : null}

      {step !== 'done' ? (
        <Text
          variant="label"
          color="primary"
          center
          onPress={() => router.back()}
          accessibilityRole="link"
          accessibilityHint="Volta para a tela de login."
        >
          Voltar para entrar
        </Text>
      ) : null}
    </Screen>
  );
}

export default function ForgotPasswordRoute(): React.ReactElement {
  if (!ONLINE_FEATURES_ENABLED) return <Redirect href="/" />;
  return <ForgotPassword />;
}
