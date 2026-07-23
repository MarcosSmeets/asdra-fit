import { registerSchema } from '@ad-sidera/shared';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { registerAccount } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button, Input, Screen, Text } from '@/components';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import {
  convertLocalProfile,
  getLocalConversionContext,
  LOCAL_CONVERSION_LABELS,
  type LocalConversionContext,
  type LocalConversionState,
} from '@/services/localAccountConversion';
import { fullAccountSync } from '@/sync/syncEngine';

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Register(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [conversionContext, setConversionContext] = useState<LocalConversionContext | null>(null);
  const [conversionState, setConversionState] = useState<LocalConversionState | null>(null);
  const mode = useSessionStore((state) => state.mode);

  useEffect(() => {
    if (mode !== 'local') return;
    void getLocalConversionContext().then((context) => {
      setConversionContext(context);
    });
  }, [mode]);

  const submit = useCallback(async (): Promise<void> => {
    setFormError(null);
    const parsed = registerSchema.safeParse({
      displayName: conversionContext?.displayName ?? 'Explorador',
      email: email.trim(),
      password,
      timezone: getDeviceTimezone(),
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = conversionContext
        ? await convertLocalProfile({
            email: parsed.data.email,
            password: parsed.data.password,
            timezone: parsed.data.timezone,
            context: conversionContext,
            onState: setConversionState,
          })
        : await registerAccount(parsed.data);
      await useSessionStore.getState().setUser(user);
      if (conversionContext) {
        await fullAccountSync();
        await useSessionStore.getState().refreshProgress(user.hasCreature);
      }
      const { progress } = useSessionStore.getState();
      router.replace(progress.hasCompletedOnboarding ? '/(tabs)' : '/onboarding');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(
          error.status === 409
            ? 'Já existe uma conta com este e-mail. Que tal entrar?'
            : error.message,
        );
      } else {
        setFormError(
          'Não foi possível criar sua conta agora. Verifique sua conexão e tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [conversionContext, email, password, router]);

  return (
    <Screen scroll testID="register-screen">
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="title">
          {conversionContext ? 'Converter meu perfil local em uma conta' : 'Criar uma conta'}
        </Text>
        <Text variant="body" color="textMuted">
          {conversionContext
            ? 'Seu Adari, atividades e progresso serão preservados e associados à nova conta.'
            : 'Crie seu acesso. Seu nome, objetivo e Adari serão escolhidos logo depois.'}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        {conversionContext ? (
          <Text variant="label" color="brandGold">
            Perfil de {conversionContext.displayName} pronto para conversão.
          </Text>
        ) : null}
        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!submitting}
          placeholder="voce@exemplo.com"
          error={fieldErrors.email}
        />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => {
            void submit();
          }}
          editable={!submitting}
          placeholder="Mínimo de 8 caracteres"
          hint="Use ao menos 8 caracteres."
          error={fieldErrors.password}
        />
      </View>

      {formError ? (
        <Text variant="label" color="error" accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}

      {conversionState ? (
        <Text variant="label" color={conversionState === 'failedRecoverable' ? 'warning' : 'brandTeal'} accessibilityLiveRegion="polite">
          {LOCAL_CONVERSION_LABELS[conversionState]}
        </Text>
      ) : null}

      <Button
        label={conversionContext ? 'Converter meu perfil local em uma conta' : 'Criar conta'}
        onPress={() => {
          void submit();
        }}
        loading={submitting}
        accessibilityHint="Cria sua conta e avança para a configuração inicial."
        testID="register-submit"
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: theme.spacing.xs,
        }}
      >
        <Text variant="label" color="textMuted">
          Já tem uma conta?
        </Text>
        <Text
          variant="label"
          color="primary"
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="link"
          accessibilityHint="Abre a tela para entrar."
        >
          Entrar
        </Text>
      </View>
    </Screen>
  );
}
