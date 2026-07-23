import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';
import { ACTIVITY_TYPES, ISO_WEEKDAYS, getWeekBounds, type ActivityType } from '@ad-sidera/shared';
import { Button, Card, Chip, Screen, SectionHeader, Text } from '@/components';
import { ACTIVITY_LABELS, WEEKDAY_LABELS } from '@/constants/labels';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme/ThemeProvider';
import { nowIso } from '@/utils/datetime';

function toggleValue<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
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
          {String(value)}
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

export default function GoalSettings(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const goal = useGameStore((s) => s.goal);

  const [targetCount, setTargetCount] = useState(goal?.targetCount ?? 3);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(goal?.activityTypes ?? []);
  const [preferredDays, setPreferredDays] = useState<number[]>(goal?.preferredDays ?? []);
  const [allowExtra, setAllowExtra] = useState(goal?.allowExtraActivities ?? true);
  const [saving, setSaving] = useState(false);

  // Sincroniza os campos quando a meta é carregada/atualizada na store.
  useEffect(() => {
    if (goal) {
      setTargetCount(goal.targetCount);
      setActivityTypes(goal.activityTypes);
      setPreferredDays(goal.preferredDays);
      setAllowExtra(goal.allowExtraActivities);
    }
  }, [goal]);

  const canSave = activityTypes.length >= 1 && !saving;

  const save = async (): Promise<void> => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startsAt = getWeekBounds(nowIso(), deviceTz).weekStart;
    try {
      await useGameStore.getState().updateGoal({
        targetCount,
        preferredDays,
        activityTypes,
        startsAt,
        allowExtraActivities: allowExtra,
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Meta semanal' }} />
      <SectionHeader
        title="Meta semanal"
        subtitle="Ajuste sua meta quando quiser. Metas realistas sustentam a constância."
      />

      <Card style={{ gap: theme.spacing.md, alignItems: 'center' }}>
        <Text variant="label" color="textMuted">
          Atividades por semana
        </Text>
        <NumberStepper
          value={targetCount}
          min={1}
          max={14}
          onChange={setTargetCount}
          accessibilityLabel={`${targetCount} atividades por semana`}
        />
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Tipos de atividade" subtitle="Escolha o que faz sentido para você." />
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
        {activityTypes.length === 0 && (
          <Text variant="caption" color="warning">
            Selecione ao menos um tipo.
          </Text>
        )}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Dias preferenciais" subtitle="Opcional." />
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
            <Text variant="label">Permitir atividades extras</Text>
            <Text variant="caption" color="textMuted">
              Conte também atividades além das planejadas.
            </Text>
          </View>
          <Switch
            value={allowExtra}
            onValueChange={setAllowExtra}
            accessibilityLabel="Permitir atividades extras"
          />
        </View>
      </Card>

      <Button
        label="Salvar"
        onPress={() => {
          void save();
        }}
        loading={saving}
        disabled={!canSave}
      />
    </Screen>
  );
}
