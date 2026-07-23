import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Card, Screen, SectionHeader, Text } from '@/components';
import { BRAND } from '@/constants/brand';
import { useTheme } from '@/theme/ThemeProvider';

export default function About(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Sobre' }} />

      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="display">{BRAND.appName}</Text>
        <Text variant="body" color="textMuted">
          {BRAND.tagline}
        </Text>
        <Text variant="caption" color="textMuted">{`Versão ${version}`}</Text>
      </View>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Nossa missão</Text>
        <Text variant="body" color="textMuted">
          Ajudar você a construir constância — não excesso. Aqui não existe pay-to-win: seu
          progresso vem do seu esforço real. Privacidade por padrão em cada decisão.
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Conteúdo original</Text>
        <Text variant="body" color="textMuted">
          {`Os ${BRAND.companionPlural}, os nomes, as histórias e as ilustrações do ${BRAND.appName} são 100% originais, criados especialmente para este app.`}
        </Text>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Documentos" />
        <Text
          variant="label"
          color="primary"
          accessibilityRole="link"
          onPress={() => router.push('/settings/privacy')}
        >
          Termos de uso
        </Text>
        <Text
          variant="label"
          color="primary"
          accessibilityRole="link"
          onPress={() => router.push('/settings/privacy')}
        >
          Política de privacidade
        </Text>
      </View>
    </Screen>
  );
}
