import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Switch, View, type ViewStyle } from 'react-native';
import { ISO_WEEKDAYS } from '@ad-sidera/shared';
import { Button, Card, Chip, LoadingState, Screen, SectionHeader, Text } from '@/components';
import { WEEKDAY_LABELS } from '@/constants/labels';
import {
  cancelAllReminders,
  loadActivityReminderConfig,
  scheduleWeeklyReminders,
} from '@/services/notificationService';
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

  const [activityReminder, setActivityReminder] = useState(false);
  const [hour, setHour] = useState(18);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadActivityReminderConfig()
      .then((config) => {
        if (!mounted) return;
        setActivityReminder(config.enabled);
        setHour(config.hour);
        setDays(config.weekdays);
      })
      .catch(() => {
        if (mounted) setError('Não foi possível carregar o lembrete local.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      if (activityReminder) {
        const granted = await scheduleWeeklyReminders({
          hour,
          minute: 0,
          weekdays: days.length > 0 ? days : [1, 2, 3, 4, 5],
        });
        if (!granted) {
          setActivityReminder(false);
          setError('A permissão de notificações foi negada. Você pode reativá-la nos ajustes do sistema.');
          return;
        }
      } else {
        await cancelAllReminders();
      }
      router.back();
    } catch {
      setError('Não foi possível salvar o lembrete. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Screen><LoadingState label="Carregando lembrete…" /></Screen>;
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Notificações' }} />
      <SectionHeader
        title="Notificações"
        subtitle="Todas as notificações são locais, ficam só no seu dispositivo e servem para encorajar — nunca para cobrar ou culpar."
      />

      <ToggleRow
        title="Lembrete de atividade"
        description="Um empurrãozinho gentil nos dias escolhidos."
        value={activityReminder}
        onValueChange={setActivityReminder}
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

      {error ? (
        <Card>
          <Text variant="label" color="error" accessibilityLiveRegion="assertive">
            {error}
          </Text>
          <Text variant="caption" color="textMuted">
            Ajuste as opções, se necessário, e toque em Salvar para tentar novamente.
          </Text>
        </Card>
      ) : null}

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
