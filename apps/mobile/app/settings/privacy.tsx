import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, CelestialDivider, Screen, SectionHeader, Text } from '@/components';
import { getDatabase } from '@/db/database';
import { APP_STATE_KEYS, appStateRepository } from '@/db/repositories/appStateRepository';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function PrivacySettings(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [working, setWorking] = useState(false);

  const performReset = async (): Promise<void> => {
    setWorking(true);
    try {
      const db = await getDatabase();
      // MVP SEGURO: por ora apenas reiniciamos o onboarding (não apagamos atividades,
      // o Adari ou fotos). O wipe local completo — apagar todas as tabelas locais
      // (activities, creature_state, weekly_goal, rewards) e as fotos em disco — é um
      // follow-up documentado no backlog.
      await appStateRepository.setBool(db, APP_STATE_KEYS.ONBOARDING_COMPLETE, false);
      useSessionStore.setState({ onboardingComplete: false });
      router.replace('/intro');
    } catch {
      setWorking(false);
    }
  };

  const confirmReset = (): void => {
    Alert.alert(
      'Apagar dados locais?',
      'Por segurança, esta versão apenas reinicia o app e leva você de volta ao início. A remoção completa dos dados locais está no nosso roteiro.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            void performReset();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Privacidade' }} />
      <SectionHeader
        title="Privacidade"
        subtitle="Como cuidamos dos seus dados — com o controle nas suas mãos."
      />

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Suas fotos são só suas</Text>
        <Text variant="body" color="textMuted">
          As fotos dos seus registros são privadas e ficam apenas neste dispositivo. Elas nunca são
          enviadas para nossos servidores.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Seus dados não são vendidos</Text>
        <Text variant="body" color="textMuted">
          Não vendemos nem compartilhamos seus dados com terceiros para publicidade.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Sincronização mínima</Text>
        <Text variant="body" color="textMuted">
          Se você usar uma conta, a sincronização envia apenas metadados — como a contagem de
          atividades e o seu progresso. As fotos nunca saem do dispositivo.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">LGPD</Text>
        <Text variant="body" color="textMuted">
          Tratamos seus dados seguindo os princípios da LGPD: finalidade clara, coleta mínima e
          controle nas suas mãos.
        </Text>
      </Card>

      {/* Ação destrutiva isolada, separada das seções informativas. */}
      <CelestialDivider />

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="Apagar dados locais"
          subtitle="Recomeçar do zero neste dispositivo."
        />
        <Button
          label="Apagar dados locais"
          variant="danger"
          onPress={confirmReset}
          loading={working}
          disabled={working}
        />
      </View>
    </Screen>
  );
}
