import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { AdariPortrait, Button, Card, CelestialDivider, Screen, Text } from '@/components';
import { BRAND } from '@/constants/brand';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Welcome(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const setMode = useSessionStore((s) => s.setMode);
  const [startingLocal, setStartingLocal] = useState(false);

  const startLocal = useCallback(async (): Promise<void> => {
    setStartingLocal(true);
    try {
      await setMode('local');
      router.replace('/onboarding');
    } catch {
      // Se algo falhar ao salvar o modo, liberamos o botão para nova tentativa.
      setStartingLocal(false);
    }
  }, [router, setMode]);

  return (
    <Screen scroll contentStyle={{ flexGrow: 1, justifyContent: 'center' }} testID="welcome-screen">
      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
        <AdariPortrait creatureKey="solivar" size={132} mood="ready" evolved />
        <Text variant="display" center>
          {BRAND.appName}
        </Text>
        <Text variant="body" color="textMuted" center>
          {BRAND.tagline}
        </Text>
      </View>

      <CelestialDivider inset={theme.spacing.xxl} />

      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label="Começar em modo local"
          onPress={() => {
            void startLocal();
          }}
          loading={startingLocal}
          accessibilityHint="Começa agora, sem cadastro. Tudo fica salvo somente neste dispositivo."
          testID="welcome-local"
        />
        <Text variant="caption" color="textMuted" center>
          Sem cadastro. Tudo fica salvo somente neste dispositivo.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <Button
          label="Criar uma conta"
          variant="secondary"
          onPress={() => router.push('/(auth)/register')}
          accessibilityHint="Abre o formulário para criar uma conta."
          testID="welcome-register"
        />
        <Button
          label="Entrar"
          variant="ghost"
          onPress={() => router.push('/(auth)/login')}
          accessibilityHint="Abre a tela para entrar em uma conta existente."
          testID="welcome-login"
        />
      </View>

      <Card variant="surfaceAlt">
        <Text variant="caption" color="textMuted" center>
          A conta é opcional. Ela serve para participar de ligas com amigos e manter um backup do seu
          progresso. Você pode criar uma conta depois, quando quiser.
        </Text>
      </Card>
    </Screen>
  );
}
