import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, View, type ViewStyle } from 'react-native';
import {
  ACTIVITY_TYPES,
  ADARI_STAGE_LABEL,
  CREATURES,
  GOALS,
  ISO_WEEKDAYS,
  type ActivityType,
  type Goal,
} from '@ad-sidera/shared';
import {
  AdariCard,
  AdariPortrait,
  Button,
  Card,
  Chip,
  Input,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { ACTIVITY_LABELS, GOAL_LABELS, WEEKDAY_LABELS } from '@/constants/labels';
import { BRAND } from '@/constants/brand';
import { scheduleWeeklyReminders } from '@/services/notificationService';
import {
  completeOnboarding,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingData,
  type OnboardingDraft,
} from '@/services/onboardingService';
import { ONBOARDING_STEP_KEYS, type OnboardingStepKey } from '@/domain/userProgress';
import { useGameStore } from '@/stores/gameStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

// Derivado do domínio: a ordem dos passos é fonte única em ONBOARDING_STEP_KEYS.
const STEP_KEYS = ONBOARDING_STEP_KEYS;
const TOTAL_STEPS = STEP_KEYS.length;

const ARCHETYPE_LABELS: Record<string, string> = {
  forca: 'Força',
  resistencia: 'Resistência',
  equilibrio: 'Equilíbrio',
};

function toggleValue<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
  formatValue,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  formatValue?: (v: number) => string;
  accessibilityLabel: string;
}): React.ReactElement {
  const theme = useTheme();
  const buttonStyle: ViewStyle = {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
      }}
    >
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Diminuir"
        style={[buttonStyle, { opacity: value <= min ? 0.4 : 1 }]}
      >
        <Text variant="title">−</Text>
      </Pressable>
      <View style={{ minWidth: 96, alignItems: 'center' }}>
        <Text variant="display" accessibilityLabel={accessibilityLabel}>
          {formatValue ? formatValue(value) : String(value)}
        </Text>
      </View>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Aumentar"
        style={[buttonStyle, { opacity: value >= max ? 0.4 : 1 }]}
      >
        <Text variant="title">+</Text>
      </Pressable>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <Text variant="label" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

export default function Onboarding(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(0);
  // Toda condicional de render e validação passa pela chave, nunca pelo índice.
  const stepKey = STEP_KEYS[step] ?? 'summary';
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStepKey[]>([]);

  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [targetCount, setTargetCount] = useState(3);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(18);
  const [creatureKey, setCreatureKey] = useState<string | null>(null);

  const trimmedName = displayName.trim();
  const selectedCreature = CREATURES.find((c) => c.key === creatureKey) ?? null;

  useEffect(() => {
    let active = true;
    void loadOnboardingDraft()
      .then((draft) => {
        if (!active) return;
        setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, draft.step)));
        setDisplayName(draft.displayName);
        setGoal(draft.goal);
        setTargetCount(draft.targetCount);
        setActivityTypes(draft.activityTypes as ActivityType[]);
        setPreferredDays(draft.preferredDays);
        setRemindersEnabled(draft.remindersEnabled);
        setReminderHour(draft.reminderHour);
        setCreatureKey(draft.creatureKey);
        setCompletedSteps(draft.completedSteps);
      })
      .catch(() => {
        if (active) setSaveError('Não foi possível restaurar o rascunho. Você pode continuar do início.');
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const draft: OnboardingDraft = {
      step,
      displayName,
      goal,
      targetCount,
      preferredDays,
      activityTypes,
      remindersEnabled,
      reminderHour,
      creatureKey,
      completedSteps,
    };
    void saveOnboardingDraft(draft).catch(() => {
      setSaveError('Não foi possível salvar o rascunho neste momento.');
    });
  }, [
    hydrated, step, displayName, goal, targetCount, preferredDays, activityTypes,
    remindersEnabled, reminderHour, creatureKey, completedSteps,
  ]);

  const isStepValid = (): boolean => {
    switch (stepKey) {
      case 'profile':
        return trimmedName.length > 0 && trimmedName.length <= 60;
      case 'objective':
        return goal !== null;
      case 'activities':
        return activityTypes.length >= 1;
      case 'adari':
        return creatureKey !== null;
      default:
        return true;
    }
  };

  const goNext = (): void => {
    if (step < TOTAL_STEPS - 1) {
      const key = STEP_KEYS[step];
      if (key) setCompletedSteps((current) => current.includes(key) ? current : [...current, key]);
      setStep((s) => s + 1);
    }
  };
  const goBack = (): void => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const finish = async (): Promise<void> => {
    if (!goal || !creatureKey || saving) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const data: OnboardingData = {
      displayName: trimmedName,
      goal,
      targetCount,
      preferredDays,
      activityTypes,
      creatureKey,
      timezone,
    };
    try {
      const finishedSteps = [...new Set([...completedSteps, ...STEP_KEYS])];
      setCompletedSteps(finishedSteps);
      await saveOnboardingDraft({
        step: TOTAL_STEPS - 1,
        displayName,
        goal,
        targetCount,
        preferredDays,
        activityTypes,
        remindersEnabled,
        reminderHour,
        creatureKey,
        completedSteps: finishedSteps,
      });
      if (remindersEnabled) {
        const granted = await scheduleWeeklyReminders({
          hour: reminderHour,
          minute: 0,
          weekdays: preferredDays.length > 0 ? preferredDays : [1, 2, 3, 4, 5],
        });
        if (!granted) {
          Alert.alert(
            'Lembrete não ativado',
            'A permissão foi negada. Você pode continuar normalmente e reativá-la nos ajustes do sistema.',
          );
        }
      }
      await completeOnboarding(data);
      await useSessionStore.getState().completeOnboarding();
      await useGameStore.getState().load();
      // A escolha entre conta e modo local vem aqui, com perfil e criatura já
      // persistidos — é o que permite converter o perfil local em vez de criar
      // uma conta nova. A própria tela redireciona para /getting-started quando
      // não faz sentido oferecer (build offline ou usuário já logado).
      router.replace('/account-choice');
    } catch {
      setSaveError('Não foi possível concluir agora. Seus dados foram preservados; tente novamente.');
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <ProgressBar
        value={(step + 1) / TOTAL_STEPS}
        color="brandGold"
        accessibilityLabel={`Passo ${step + 1} de ${TOTAL_STEPS}`}
      />
      <Text variant="caption" color="textMuted">{`Passo ${step + 1} de ${TOTAL_STEPS}`}</Text>

      {stepKey === 'profile' && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title">Como podemos te chamar?</Text>
          <Text variant="body" color="textMuted">
            Use seu nome ou um apelido. Você pode mudar depois.
          </Text>
          <Input
            label="Nome ou apelido"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={60}
            autoFocus
            placeholder="Ex.: Marina"
            returnKeyType="done"
          />
        </View>
      )}

      {stepKey === 'objective' && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title">Qual é o seu objetivo inicial?</Text>
          <Text variant="body" color="textMuted">
            Escolha o que mais combina com este momento.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {GOALS.map((g) => (
              <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
            ))}
          </View>
        </View>
      )}

      {stepKey === 'goal' && (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="title">Sua meta semanal</Text>
          <Text variant="body" color="textMuted">
            Quantas atividades por semana? Comece com uma meta realista — você pode mudar depois.
          </Text>
          <NumberStepper
            value={targetCount}
            min={1}
            max={14}
            onChange={setTargetCount}
            accessibilityLabel={`${targetCount} atividades por semana`}
          />
          <Text variant="caption" color="textMuted" center>
            atividades por semana
          </Text>
        </View>
      )}

      {stepKey === 'activities' && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title">Que atividades você curte?</Text>
          <Text variant="body" color="textMuted">
            Selecione ao menos uma. Dá para incluir novas depois.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {ACTIVITY_TYPES.map((a) => (
              <Chip
                key={a}
                label={ACTIVITY_LABELS[a]}
                selected={activityTypes.includes(a)}
                onPress={() => setActivityTypes((prev) => toggleValue(prev, a))}
              />
            ))}
          </View>
        </View>
      )}

      {stepKey === 'preferredDays' && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title">Dias preferenciais</Text>
          <Text variant="body" color="textMuted">
            Opcional. Ajuda a planejar lembretes gentis — sem cobrança.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {ISO_WEEKDAYS.map((d) => (
              <Chip
                key={d}
                label={WEEKDAY_LABELS[d] ?? String(d)}
                selected={preferredDays.includes(d)}
                onPress={() => setPreferredDays((prev) => toggleValue(prev, d))}
              />
            ))}
          </View>
        </View>
      )}

      {stepKey === 'notifications' && (
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="title">Lembretes gentis</Text>
          <Text variant="body" color="textMuted">
            Lembretes locais e encorajadores ajudam a manter a constância — nunca para cobrar ou
            culpar. Eles ficam só no seu dispositivo.
          </Text>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="label">Ativar lembretes</Text>
                <Text variant="caption" color="textMuted">
                  Pediremos permissão só se você ativar.
                </Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                accessibilityLabel="Ativar lembretes"
              />
            </View>
          </Card>
          {remindersEnabled && (
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="label" color="textMuted" center>
                Horário do lembrete
              </Text>
              <NumberStepper
                value={reminderHour}
                min={0}
                max={23}
                onChange={setReminderHour}
                formatValue={(v) => `${String(v).padStart(2, '0')}:00`}
                accessibilityLabel={`Horário ${String(reminderHour).padStart(2, '0')} horas`}
              />
            </View>
          )}
        </View>
      )}

      {stepKey === 'adari' && (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Escolha seu primeiro Adari"
            subtitle="Ele desperta e evolui com a sua constância. Dá para dar um apelido depois."
          />
          {CREATURES.map((c) => (
            <AdariCard
              key={c.key}
              creatureKey={c.key}
              name={c.name}
              archetypeLabel={ARCHETYPE_LABELS[c.archetype] ?? c.archetype}
              personality={c.personality}
              selected={creatureKey === c.key}
              onPress={() => setCreatureKey(c.key)}
              testID={`onboarding-creature-${c.key}`}
            />
          ))}
          {selectedCreature ? (
            <Card variant="surfaceAlt" style={{ alignItems: 'center', gap: theme.spacing.sm }}>
              <Text variant="body" center>
                {`Você deseja começar sua jornada com ${selectedCreature.name}?`}
              </Text>
              {/* Linha evolutiva completa: dá para ver no que cada Adari se torna. */}
              <Text variant="hud" color="brandGold">Linha evolutiva</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: theme.spacing.xs }}>
                {selectedCreature.stages.map((stageDefinition, stageInt) => (
                  <View key={stageDefinition.key} style={{ alignItems: 'center', width: 74, gap: 2 }}>
                    <AdariPortrait
                      creatureKey={selectedCreature.key}
                      stage={stageInt}
                      size={58}
                      mood={stageInt === 0 ? 'happy' : 'normal'}
                      accessibilityLabel={`${stageDefinition.name}, ${ADARI_STAGE_LABEL[stageDefinition.stage]}`}
                    />
                    <Text variant="caption" color={stageInt === 0 ? 'text' : 'textMuted'} center numberOfLines={1}>
                      {stageDefinition.name}
                    </Text>
                    <Text variant="caption" color="textMuted" center numberOfLines={1}>
                      {ADARI_STAGE_LABEL[stageDefinition.stage]}
                    </Text>
                  </View>
                ))}
              </View>
              <Text variant="caption" color="textMuted" center>
                Todo Adari desperta na forma Base — as demais chegam com a sua constância.
              </Text>
              <Text variant="caption" color="brandGold" center>
                Toque em Continuar para seguir com {selectedCreature.name}.
              </Text>
            </Card>
          ) : null}
        </View>
      )}

      {stepKey === 'summary' && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title">Tudo pronto!</Text>
          <Text variant="body" color="textMuted">
            Confira suas escolhas. Você pode ajustar tudo depois nas configurações.
          </Text>
          {selectedCreature ? (
            <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
              <AdariPortrait creatureKey={selectedCreature.key} size={96} mood="happy" />
              <Text variant="heading">{selectedCreature.name}</Text>
            </View>
          ) : null}
          <Card style={{ gap: theme.spacing.sm }}>
            <SummaryRow label="Nome" value={trimmedName} />
            <SummaryRow label="Objetivo" value={goal ? GOAL_LABELS[goal] : '—'} />
            <SummaryRow label="Meta semanal" value={`${targetCount} atividade(s)`} />
            <SummaryRow
              label="Atividades"
              value={
                activityTypes.length > 0
                  ? activityTypes.map((a) => ACTIVITY_LABELS[a]).join(', ')
                  : '—'
              }
            />
            <SummaryRow
              label="Dias"
              value={
                preferredDays.length > 0
                  ? [...preferredDays]
                      .sort((a, b) => a - b)
                      .map((d) => WEEKDAY_LABELS[d] ?? String(d))
                      .join(', ')
                  : 'Sem preferência'
              }
            />
            <SummaryRow
              label="Lembretes"
              value={
                remindersEnabled
                  ? `Ativos às ${String(reminderHour).padStart(2, '0')}:00`
                  : 'Desativados'
              }
            />
            <SummaryRow
              label={BRAND.companionSingular}
              value={selectedCreature ? selectedCreature.name : '—'}
            />
          </Card>
        </View>
      )}

      {saveError ? (
        <Text variant="label" color="error" accessibilityLiveRegion="assertive">
          {saveError}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button label="Voltar" variant="ghost" onPress={goBack} disabled={saving} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {step < TOTAL_STEPS - 1 ? (
            <Button label="Continuar" onPress={goNext} disabled={!isStepValid()} />
          ) : (
            <Button
              label="Concluir"
              onPress={() => {
                void finish();
              }}
              loading={saving}
              disabled={saving}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
