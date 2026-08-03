import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Button, Card, Screen, SectionHeader, Text } from '@/components';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { ACCOUNT_BENEFITS } from '@/constants/accountBenefits';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Oferece conta ou modo local logo depois do onboarding.
 *
 * Precisa vir DEPOIS de `completeOnboarding()`, não como um passo do onboarding:
 * `getLocalConversionContext()` devolve `null` enquanto perfil e criatura não
 * existirem, e nesse caso o cadastro viraria uma conta nova em vez de converter o
 * perfil local — jogando fora tudo que o usuário acabou de escolher.
 */
export default function AccountChoice(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const onboardingComplete = useSessionStore((s) => s.onboardingComplete);

  // Redirect, e não useEffect, para não haver um flash que o Maestro capture.
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  // Build offline-first não deve sequer oferecer conta.
  if (!ONLINE_FEATURES_ENABLED) return <Redirect href="/getting-started" />;
  if (mode === 'account') return <Redirect href="/getting-started" />;

  const gap = theme.spacing.md;

  return (
    <Screen scroll testID="account-choice">
      <Stack.Screen options={{ headerShown: false }} />
      <SectionHeader
        title="Quer criar uma conta?"
        subtitle="Seu Adari já está com você. A conta é opcional."
      />

      <Card style={{ gap }}>
        <Text variant="section">O que a conta libera</Text>
        <Text variant="body" color="textMuted">{ACCOUNT_BENEFITS.requiresAccount}</Text>
        <Text variant="body" color="textMuted">{ACCOUNT_BENEFITS.keepsLocalProgress}</Text>
      </Card>

      <Card variant="surfaceAlt" style={{ gap }}>
        <Text variant="section">O que funciona sem conta</Text>
        <Text variant="body" color="textMuted">{ACCOUNT_BENEFITS.worksOffline}</Text>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label="Criar conta"
          onPress={() => router.push('/(auth)/register')}
          accessibilityHint="Abre a criação de conta. Seu perfil local é convertido, sem perder progresso."
        />
        <Button
          label="Já tenho conta / Entrar"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
          accessibilityHint="Abre a tela de login."
        />
        <Button
          label="Continuar sem conta"
          variant="ghost"
          onPress={() => router.replace('/getting-started')}
          accessibilityHint="Segue no modo local. Você pode criar uma conta depois, pelo Perfil."
        />
      </View>
    </Screen>
  );
}
