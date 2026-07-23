import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';
import { ISO_WEEKDAYS } from '@ad-sidera/shared';
import { Button, Card, Chip, Screen, SectionHeader, Text } from '@/components';
import { WEEKDAY_LABELS } from '@/constants/labels';
import { cancelAllReminders, scheduleWeeklyReminders } from '@/services/notificationService';
import { useTheme } from '@/theme/ThemeProvider';

function toggleValue<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}): React.ReactElement {
  const theme = useTheme();
  return (
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
          <Text variant="label">{title}</Text>
          <Text variant="caption" color="textMuted">
            {description}
          </Text>
        </View>
        <Switch value={value} onValueChange={onValueChange} accessibilityLabel={title} />
      </View>
    </Card>
  );
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
  formatValue: (v: number) => string;
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
          {formatValue(value)}
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

export default function NotificationSettings(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  // MVP: apenas o "Lembrete de atividade" é realmente agendado via scheduleWeeklyReminders.
  // As demais preferências por tipo (Meta semanal, Evolução, Liga) são apenas de UI por
  // enquanto — persisti-las e conectá-las a notificações específicas é um follow-up documentado.
  const [activityReminder, setActivityReminder] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(true);
  const [evolution, setEvolution] = useState(true);
  const [league, setLeague] = useState(true);
  const [hour, setHour] = useState(18);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  const allEnabled = activityReminder && weeklyGoal && evolution && league;

  const setAll = (next: boolean): void => {
    setActivityReminder(next);
    setWeeklyGoal(next);
    setEvolution(next);
    setLeague(next);
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      if (activityReminder) {
        await scheduleWeeklyReminders({
          hour,
          minute: 0,
          weekdays: days.length > 0 ? days : [1, 2, 3, 4, 5],
        });
      } else {
        await cancelAllReminders();
      }
      router.back();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Notificações' }} />
      <SectionHeader
        title="Notificações"
        subtitle="Todas as notificações são locais, ficam só no seu dispositivo e servem para encorajar — nunca para cobrar ou culpar."
      />

      <ToggleRow
        title="Ativar tudo"
        description="Liga ou desliga todos os lembretes de uma vez."
        value={allEnabled}
        onValueChange={setAll}
      />

      <SectionHeader title="Por tipo" />
      <ToggleRow
        title="Lembrete de atividade"
        description="Um empurrãozinho gentil nos dias escolhidos."
        value={activityReminder}
        onValueChange={setActivityReminder}
      />
      <ToggleRow
        title="Meta semanal"
        description="Resumo do seu progresso na semana."
        value={weeklyGoal}
        onValueChange={setWeeklyGoal}
      />
      <ToggleRow
        title="Evolução"
        description="Quando seu Adari evolui."
        value={evolution}
        onValueChange={setEvolution}
      />
      <ToggleRow
        title="Liga"
        description="Novidades da sua liga entre amigos."
        value={league}
        onValueChange={setLeague}
      />

      {activityReminder && (
        <Card style={{ gap: theme.spacing.md }}>
          <Text variant="heading">Lembrete de atividade</Text>
          <Text variant="label" color="textMuted" center>
            Horário
          </Text>
          <NumberStepper
            value={hour}
            min={0}
            max={23}
            onChange={setHour}
            formatValue={(v) => `${String(v).padStart(2, '0')}:00`}
            accessibilityLabel={`Horário ${String(hour).padStart(2, '0')} horas`}
          />
          <Text variant="label" color="textMuted">
            Dias
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {ISO_WEEKDAYS.map((d) => (
              <Chip
                key={d}
                label={WEEKDAY_LABELS[d] ?? String(d)}
                selected={days.includes(d)}
                onPress={() => setDays((prev) => toggleValue(prev, d))}
              />
            ))}
          </View>
        </Card>
      )}

      <Button
        label="Salvar"
        onPress={() => {
          void save();
        }}
        loading={saving}
        disabled={saving}
      />
    </Screen>
  );
}
