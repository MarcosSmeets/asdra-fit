import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';
import {
  ACTIVITY_TYPES,
  CREATURES,
  GOALS,
  ISO_WEEKDAYS,
  type ActivityType,
  type Goal,
  DEFAULT_PLAYER_AVATAR_APPEARANCE,
  type PlayerAvatarAppearance,
} from '@ad-sidera/shared';
import {
  AdariCard,
  AvatarCustomizer,
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
import { requestPermission, scheduleWeeklyReminders } from '@/services/notificationService';
import {
  completeOnboarding,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingData,
  type OnboardingDraft,
} from '@/services/onboardingService';
import type { OnboardingStepKey } from '@/domain/userProgress';
import { useGameStore } from '@/stores/gameStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

const TOTAL_STEPS = 9;
const STEP_KEYS: readonly OnboardingStepKey[] = [
  'profile', 'objective', 'activities', 'goal', 'preferredDays', 'avatar', 'notifications', 'adari', 'summary',
];

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
  const [saving, setSaving] = useState(false);
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
  const [avatarAppearance, setAvatarAppearance] = useState<PlayerAvatarAppearance>(
    DEFAULT_PLAYER_AVATAR_APPEARANCE,
  );

  const trimmedName = displayName.trim();
  const selectedCreature = CREATURES.find((c) => c.key === creatureKey) ?? null;

  useEffect(() => {
    let active = true;
    void loadOnboardingDraft().then((draft) => {
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
      setAvatarAppearance(draft.avatarAppearance);
      setCompletedSteps(draft.completedSteps);
      setHydrated(true);
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
      avatarAppearance,
      completedSteps,
    };
    void saveOnboardingDraft(draft);
  }, [
    hydrated, step, displayName, goal, targetCount, preferredDays, activityTypes,
    remindersEnabled, reminderHour, creatureKey, avatarAppearance, completedSteps,
  ]);

  const isStepValid = (): boolean => {
    switch (step) {
      case 0:
        return trimmedName.length > 0 && trimmedName.length <= 60;
      case 1:
        return goal !== null;
      case 2:
        return activityTypes.length >= 1;
      case 7:
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
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const data: OnboardingData = {
      displayName: trimmedName,
      goal,
      targetCount,
      preferredDays,
      activityTypes,
      creatureKey,
      timezone,
      avatarAppearance,
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
        avatarAppearance,
        completedSteps: finishedSteps,
      });
      if (remindersEnabled) {
        await requestPermission();
        await scheduleWeeklyReminders({
          hour: reminderHour,
          minute: 0,
          weekdays: preferredDays.length > 0 ? preferredDays : [1, 2, 3, 4, 5],
        });
      }
      await completeOnboarding(data);
      await useSessionStore.getState().completeOnboarding();
      await useGameStore.getState().load();
      router.replace('/(tabs)');
    } catch {
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

      {step === 0 && (
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

      {step === 1 && (
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

      {step === 3 && (
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

      {step === 2 && (
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

      {step === 4 && (
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

      {step === 5 && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="title">Como é seu Explorador?</Text>
          <Text variant="body" color="textMuted">
            Escolha uma aparência visual. Ela não define sua identidade e pode ser alterada no Perfil.
          </Text>
          <AvatarCustomizer value={avatarAppearance} onChange={setAvatarAppearance} compact />
        </View>
      )}

      {step === 6 && (
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

      {step === 7 && (
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
            <Card variant="surfaceAlt" style={{ alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="body" center>
                {`Você deseja começar sua jornada com ${selectedCreature.name}?`}
              </Text>
              <Text variant="caption" color="brandGold" center>
                Toque em Continuar para seguir com {selectedCreature.name}.
              </Text>
            </Card>
          ) : null}
        </View>
      )}

      {step === 8 && (
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
            <SummaryRow label="Explorador" value={avatarAppearance.bodyModel === 'feminine' ? 'Modelo feminino' : 'Modelo masculino'} />
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
