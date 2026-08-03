import { loginSchema } from '@ad-sidera/shared';
import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { login } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button, Input, Screen, Text } from '@/components';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fullAccountSync } from '@/sync/syncEngine';
import { entryRouteForProgress } from '@/domain/userProgress';

interface FieldErrors {
  email?: string;
  password?: string;
}

function Login(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (): Promise<void> => {
    setFormError(null);
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      await useSessionStore.getState().setUser(user);
      await fullAccountSync();
      await useSessionStore.getState().refreshProgress(user.hasCreature);
      const { mode, progress, tutorialCompleted } = useSessionStore.getState();
      router.replace(entryRouteForProgress(true, mode, progress, tutorialCompleted));
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(
          error.status === 401 || error.status === 400
            ? 'Credenciais inválidas.'
            : error.message,
        );
      } else {
        setFormError(
          error instanceof Error && error.message === 'LOCAL_PROFILE_ACCOUNT_CONFLICT'
            ? 'Há um perfil local diferente neste dispositivo. Converta esse perfil ou use outro dispositivo para entrar nesta conta.'
            : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, password, router]);

  return (
    <Screen scroll testID="login-screen">
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="title">Entrar</Text>
        <Text variant="body" color="textMuted">
          Que bom te ver de volta. Continue de onde parou.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
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
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => {
            void submit();
          }}
          editable={!submitting}
          placeholder="Sua senha"
          error={fieldErrors.password}
        />
      </View>

      <Text
        variant="label"
        color="primary"
        onPress={() => router.push('/(auth)/forgot-password')}
        accessibilityRole="link"
        accessibilityHint="Abre a tela para recuperar o acesso à sua conta."
      >
        Esqueci minha senha
      </Text>

      {formError ? (
        <Text variant="label" color="error" accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}

      <Button
        label="Entrar"
        onPress={() => {
          void submit();
        }}
        loading={submitting}
        accessibilityHint="Entra na sua conta."
        testID="login-submit"
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
          Ainda não tem conta?
        </Text>
        <Text
          variant="label"
          color="primary"
          onPress={() => router.push('/(auth)/register')}
          accessibilityRole="link"
          accessibilityHint="Abre o formulário para criar uma conta."
        >
          Criar uma conta
        </Text>
      </View>
    </Screen>
  );
}

export default function LoginRoute(): React.ReactElement {
  if (!ONLINE_FEATURES_ENABLED) return <Redirect href="/" />;
  return <Login />;
}
