import type { ActivityType, SyncStatus } from '@ad-sidera/shared';
import { getWeekBounds } from '@ad-sidera/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  ActivityRewardBadge,
  Card,
  Chip,
  DailyRewardExplanation,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components';
import { ACTIVITY_LABELS, ATTRIBUTE_LABELS, INTENSITY_LABELS } from '@/constants/labels';
import type { ActivityRecord } from '@/db/models';
import { getRewardSummaries, listActivities } from '@/services/activityService';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDate, nowIso } from '@/utils/datetime';

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  local_only: 'Somente neste dispositivo',
  pending: 'Aguardando sincronização',
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  failed: 'Falha ao sincronizar',
};

type PeriodFilter = 'all' | 'week';
type TypeFilter = ActivityType | 'all';
type RewardMap = Awaited<ReturnType<typeof getRewardSummaries>>;

interface DayGroup {
  key: string;
  items: ActivityRecord[];
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function DiaryScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const timezone = useMemo(() => deviceTimezone(), []);

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [rewards, setRewards] = useState<RewardMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setActivities(await listActivities(100));
    } catch {
      setError('Não foi possível carregar o Diário. Seus registros continuam salvos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadActivities();
  }, [loadActivities]));

  // Recompensas (badges) para as atividades carregadas; ausência = recompensa completa.
  useEffect(() => {
    const ids = activities.filter((a) => a.deletedAt === null).map((a) => a.id);
    if (ids.length === 0) {
      setRewards(new Map());
      return;
    }
    let active = true;
    void getRewardSummaries(ids)
      .then((map) => {
        if (active) {
          setRewards(map);
        }
      })
      .catch(() => {
        if (active) {
          setRewards(new Map());
        }
      });
    return () => {
      active = false;
    };
  }, [activities]);

  const typesPresent = useMemo(() => {
    const set = new Set<ActivityType>();
    for (const activity of activities) {
      set.add(activity.activityType);
    }
    return [...set];
  }, [activities]);

  const filtered = useMemo(() => {
    let list = activities.filter((activity) => activity.deletedAt === null);
    if (typeFilter !== 'all') {
      list = list.filter((activity) => activity.activityType === typeFilter);
    }
    if (period === 'week') {
      const bounds = getWeekBounds(nowIso(), timezone);
      list = list.filter(
        (activity) =>
          activity.occurredAt >= bounds.weekStart && activity.occurredAt <= bounds.weekEnd,
      );
    }
    return [...list].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }, [activities, typeFilter, period, timezone]);

  // Agrupa por dia (a lista já vem ordenada por data desc).
  const groups = useMemo(() => {
    const out: DayGroup[] = [];
    for (const item of filtered) {
      const key = formatDate(item.occurredAt, timezone);
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.items.push(item);
      } else {
        out.push({ key, items: [item] });
      }
    }
    return out;
  }, [filtered, timezone]);

  return (
    <Screen scroll>
      <Text variant="title">Diário</Text>

      <DailyRewardExplanation />

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="label" color="textMuted">
          Período
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Chip label="Tudo" selected={period === 'all'} onPress={() => setPeriod('all')} />
          <Chip
            label="Esta semana"
            selected={period === 'week'}
            onPress={() => setPeriod('week')}
          />
        </View>
      </View>

      {typesPresent.length > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color="textMuted">
            Tipo
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Chip label="Todos" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
            {typesPresent.map((type) => (
              <Chip
                key={type}
                label={ACTIVITY_LABELS[type]}
                selected={typeFilter === type}
                onPress={() => setTypeFilter(type)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={{ gap: theme.spacing.md }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadActivities()} />
      ) : filtered.length === 0 ? (
        activities.length === 0 ? (
          <EmptyState
            title="Seu diário está vazio"
            description="Registre sua primeira atividade e comece a acompanhar sua jornada."
            actionLabel="Registrar atividade"
            onAction={() => router.push('/activity/new')}
          />
        ) : (
          <EmptyState
            title="Nada por aqui"
            description="Nenhuma atividade corresponde a esses filtros."
          />
        )
      ) : (
        <View style={{ gap: theme.spacing.xl }}>
          {groups.map((group) => (
            <View key={group.key} style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title={group.key}
                action={
                  <Text variant="caption" color="textMuted">
                    {group.items.length}{' '}
                    {group.items.length === 1 ? 'atividade' : 'atividades'}
                  </Text>
                }
              />
              {group.items.map((item) => {
                const reward = rewards.get(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/activity/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${ACTIVITY_LABELS[item.activityType]}, ${formatDate(item.occurredAt, timezone)}`}
                  >
                    <Card>
                      <View style={{ gap: theme.spacing.xs }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: theme.spacing.sm,
                          }}
                        >
                          <Text variant="heading">{ACTIVITY_LABELS[item.activityType]}</Text>
                          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                            {/* Selo informativo; a ausência nunca é destacada como negativa. */}
                            {item.movementSignal === 'confirmed' ? (
                              <View
                                style={{
                                  paddingVertical: 2,
                                  paddingHorizontal: theme.spacing.sm,
                                  borderRadius: theme.radius.pill,
                                  backgroundColor: theme.colors.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: theme.colors.brandTeal,
                                }}
                              >
                                <Text variant="caption" color="brandTeal">
                                  Movimento confirmado
                                </Text>
                              </View>
                            ) : null}
                            {item.hasLocalPhoto ? (
                              <View
                                style={{
                                  paddingVertical: 2,
                                  paddingHorizontal: theme.spacing.sm,
                                  borderRadius: theme.radius.pill,
                                  backgroundColor: theme.colors.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: theme.colors.border,
                                }}
                              >
                                <Text variant="caption" color="textMuted">
                                  Foto
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Text variant="label">
                          {`${item.durationMinutes} min · ${INTENSITY_LABELS[item.perceivedIntensity]}`}
                        </Text>
                        {/* Recompensa: sem registro = recompensa completa. Nunca destacado como negativo. */}
                        <ActivityRewardBadge multiplier={reward?.dailyRewardMultiplier ?? 1} />
                        {reward ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                            {reward.finalXp > 0 ? (
                              <Text variant="caption" color="brandGold">+{reward.finalXp} XP</Text>
                            ) : null}
                            {reward.finalEnergy > 0 ? (
                              <Text variant="caption" color="brandTeal">+{reward.finalEnergy} Vigor</Text>
                            ) : null}
                            {/* Atributos treinados por esta atividade (não só o XP). */}
                            {Object.entries(reward.finalAttributeChanges)
                              .filter(([, points]) => (points ?? 0) > 0)
                              .map(([attribute, points]) => (
                                <Text key={attribute} variant="caption" color="text">
                                  +{points} {ATTRIBUTE_LABELS[attribute] ?? attribute}
                                </Text>
                              ))}
                          </View>
                        ) : null}
                        <Text variant="caption" color="textMuted">
                          {SYNC_STATUS_LABELS[item.syncStatus]}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
