import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, View } from 'react-native';
import { Button, Card, ProgressBar, Screen, Text } from '@/components';
import { GETTING_STARTED_STEPS, isGettingStartedReplay } from '@/domain/gettingStarted';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function GettingStartedScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { replay: replayParam } = useLocalSearchParams<{ replay?: string | string[] }>();
  const replay = isGettingStartedReplay(replayParam);
  const { progress, tutorialCompleted, completeTutorial } = useSessionStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = GETTING_STARTED_STEPS[stepIndex]!;
  const isLast = stepIndex === GETTING_STARTED_STEPS.length - 1;

  useEffect(() => {
    if (!progress.hasCompletedOnboarding || (tutorialCompleted && !replay)) return;
    AccessibilityInfo.announceForAccessibility(
      `Passo ${stepIndex + 1} de ${GETTING_STARTED_STEPS.length}. ${step.title}. ${step.description}`,
    );
  }, [progress.hasCompletedOnboarding, replay, step.description, step.title, stepIndex, tutorialCompleted]);

  if (!progress.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
  if (tutorialCompleted && !replay) return <Redirect href="/(tabs)" />;

  const finish = async (destination: 'activity' | 'adari'): Promise<void> => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (!replay) await completeTutorial();
      router.replace(destination === 'activity' ? '/activity/new' : '/(tabs)');
    } catch {
      setError('Não foi possível salvar esta etapa. Tente novamente.');
      setSaving(false);
    }
  };

  const confirmSkip = (): void => {
    Alert.alert(
      'Pular explicação?',
      'Você poderá rever este guia no Perfil. A Linha Evolutiva também mostra os requisitos de cada forma.',
      [
        { text: 'Continuar guia', style: 'cancel' },
        { text: 'Pular', style: 'destructive', onPress: () => void finish('adari') },
      ],
    );
  };

  return (
    <Screen scroll testID="getting-started-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="caption" color="textMuted">
          {replay ? 'COMO JOGAR' : 'SUA JORNADA COMEÇA AQUI'}
        </Text>
        {replay ? (
          <Button label="Voltar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        ) : (
          <Button label="Pular" variant="ghost" fullWidth={false} onPress={confirmSkip} />
        )}
      </View>

      <ProgressBar
        value={(stepIndex + 1) / GETTING_STARTED_STEPS.length}
        color="brandGold"
        accessibilityLabel={`Passo ${stepIndex + 1} de ${GETTING_STARTED_STEPS.length}`}
      />

      <Card>
        <View
          style={{ gap: theme.spacing.md, minHeight: 280, justifyContent: 'center' }}
          accessible
          accessibilityLabel={`${step.eyebrow}. ${step.title}. ${step.description} ${step.details.join(' ')}`}
        >
          <Text variant="caption" color="brandGold">
            {step.eyebrow}
          </Text>
          <Text variant="display">{step.title}</Text>
          <Text variant="body" color="textMuted">
            {step.description}
          </Text>
          <View style={{ gap: theme.spacing.sm }}>
            {step.details.map((detail) => (
              <View key={detail} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Text variant="label" color="brandTeal" importantForAccessibility="no">
                  ◆
                </Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {detail}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {error ? (
        <Text variant="label" color="error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {isLast ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Registrar minha primeira atividade"
            loading={saving}
            onPress={() => void finish('activity')}
            accessibilityHint="Conclui o guia e abre o registro de atividade."
          />
          <Button
            label="Ir para Meu Adari"
            variant="secondary"
            disabled={saving}
            onPress={() => void finish('adari')}
            accessibilityHint="Conclui o guia e abre o Observatório do seu Adari."
          />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {stepIndex > 0 ? (
            <Button
              label="Voltar"
              variant="secondary"
              onPress={() => setStepIndex((current) => Math.max(0, current - 1))}
            />
          ) : null}
          <Button
            label="Continuar"
            onPress={() => setStepIndex((current) => Math.min(GETTING_STARTED_STEPS.length - 1, current + 1))}
          />
        </View>
      )}

      <Text variant="caption" color="textMuted" center>
        {`${stepIndex + 1} de ${GETTING_STARTED_STEPS.length}`}
      </Text>
    </Screen>
  );
}
