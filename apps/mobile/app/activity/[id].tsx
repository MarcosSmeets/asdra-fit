import type { SyncStatus } from '@ad-sidera/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import {
  ActivityRewardBadge,
  BottomSheet,
  Button,
  Card,
  Chip,
  Input,
  LoadingState,
  EmptyState,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import {
  ACTIVITY_LABELS,
  INTENSITY_LABELS,
  MOOD_LABELS,
} from '@/constants/labels';
import { getDatabase } from '@/db/database';
import type { ActivityRecord } from '@/db/models';
import { profileRepository } from '@/db/repositories/profileRepository';
import {
  deleteActivity,
  getActivity,
  getRewardSummaries,
  updateActivity,
} from '@/services/activityService';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/datetime';

type RewardData = NonNullable<ReturnType<Awaited<ReturnType<typeof getRewardSummaries>>['get']>>;

const SYNC_LABELS: Record<SyncStatus, string> = {
  local_only: 'Somente neste dispositivo',
  pending: 'Aguardando sincronização',
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  failed: 'Falha ao sincronizar',
};

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
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

export default function ActivityDetailScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [reward, setReward] = useState<RewardData | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editDuration, setEditDuration] = useState(30);
  const [editIntensity, setEditIntensity] = useState<string>('moderada');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const db = await getDatabase();
    const [record, profile, summaries] = await Promise.all([
      getActivity(id),
      profileRepository.get(db),
      getRewardSummaries([id]),
    ]);
    setTimezone(profile?.timezone ?? 'UTC');
    setActivity(record);
    setReward(summaries.get(id) ?? null);
    if (record) {
      setEditDuration(record.durationMinutes);
      setEditIntensity(record.perceivedIntensity);
      setEditNotes(record.notes ?? '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveEdit = useCallback(async () => {
    if (!id || saving) {
      return;
    }
    setSaving(true);
    try {
      await updateActivity(id, {
        durationMinutes: Math.max(1, Math.min(1440, editDuration)),
        perceivedIntensity: editIntensity,
        notes: editNotes.trim(),
      });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }, [id, saving, editDuration, editIntensity, editNotes, load]);

  const handleDelete = useCallback(async () => {
    if (!id || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await deleteActivity(id, true);
      setConfirmDelete(false);
      router.back();
    } finally {
      setDeleting(false);
    }
  }, [id, deleting, router]);

  const gap = theme.spacing.md;

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Carregando atividade…" />
      </Screen>
    );
  }

  if (!activity) {
    return (
      <Screen>
        <EmptyState
          title="Atividade não encontrada"
          description="Este registro pode ter sido removido."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="activity-detail-screen">
      <Text variant="title">{ACTIVITY_LABELS[activity.activityType]}</Text>

      {activity.hasLocalPhoto && activity.localPhotoUri ? (
        <Image
          source={{ uri: activity.localPhotoUri }}
          accessibilityLabel="Foto privada da atividade"
          style={{ width: '100%', height: 220, borderRadius: theme.radius.md }}
          resizeMode="cover"
        />
      ) : null}

      <Card style={{ gap: theme.spacing.sm }}>
        <DetailRow label="Quando" value={formatDateTime(activity.occurredAt, timezone)} />
        <DetailRow label="Duração" value={`${activity.durationMinutes} min`} />
        <DetailRow label="Intensidade" value={INTENSITY_LABELS[activity.perceivedIntensity]} />
        {activity.notes ? <DetailRow label="Observação" value={activity.notes} /> : null}
        {activity.moodBefore ? (
          <DetailRow label="Humor antes" value={MOOD_LABELS[activity.moodBefore]} />
        ) : null}
        {activity.moodAfter ? (
          <DetailRow label="Humor depois" value={MOOD_LABELS[activity.moodAfter]} />
        ) : null}
        {activity.location ? <DetailRow label="Local" value={activity.location} /> : null}
        <DetailRow label="Sincronização" value={SYNC_LABELS[activity.syncStatus]} />
      </Card>

      {/* Recompensa desta atividade (economia v2). */}
      {reward ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <SectionHeader title="Recompensa" />
          <ActivityRewardBadge multiplier={reward.dailyRewardMultiplier} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <Text variant="label" color="brandGold">
              +{reward.finalXp} XP
            </Text>
            <Text variant="label" color="brandTeal">
              +{reward.finalEnergy} energia
            </Text>
          </View>
        </Card>
      ) : null}

      {editing ? (
        <Card style={{ gap }}>
          <Text variant="heading">Editar</Text>
          <Text variant="caption" color="textMuted">
            Alterar esta atividade pode recalcular as recompensas deste dia.
          </Text>

          <Text variant="label" color="textMuted">
            Duração (minutos)
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
            <Button
              label="−"
              variant="secondary"
              fullWidth={false}
              onPress={() => setEditDuration((d) => Math.max(1, d - 5))}
              accessibilityHint="Diminui a duração em 5 minutos."
            />
            <View style={{ flex: 1 }}>
              <Input
                value={String(editDuration)}
                onChangeText={(t) => {
                  const n = Number(t.replace(/[^0-9]/g, ''));
                  setEditDuration(Number.isNaN(n) ? 1 : Math.max(1, Math.min(1440, n)));
                }}
                keyboardType="number-pad"
                accessibilityLabel="Duração em minutos"
                style={{ textAlign: 'center' }}
              />
            </View>
            <Button
              label="+"
              variant="secondary"
              fullWidth={false}
              onPress={() => setEditDuration((d) => Math.min(1440, d + 5))}
              accessibilityHint="Aumenta a duração em 5 minutos."
            />
          </View>

          <Text variant="label" color="textMuted">
            Intensidade
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(INTENSITY_LABELS).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={editIntensity === key}
                onPress={() => setEditIntensity(key)}
              />
            ))}
          </View>

          <Text variant="label" color="textMuted">
            Observação
          </Text>
          <Input
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Como foi o treino?"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <Button label="Salvar alterações" onPress={() => void handleSaveEdit()} loading={saving} />
          <Button
            label="Cancelar"
            variant="ghost"
            onPress={() => {
              setEditing(false);
              setEditDuration(activity.durationMinutes);
              setEditIntensity(activity.perceivedIntensity);
              setEditNotes(activity.notes ?? '');
            }}
          />
        </Card>
      ) : (
        <Button
          label="Editar"
          variant="secondary"
          onPress={() => setEditing(true)}
          accessibilityHint="Edita duração, intensidade e observação."
        />
      )}

      <Button
        label="Excluir"
        variant="danger"
        onPress={() => setConfirmDelete(true)}
        accessibilityHint="Abre a confirmação para excluir esta atividade."
      />

      <BottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir atividade"
      >
        <Text variant="body">Excluir esta atividade? A foto local também será removida.</Text>
        <Button label="Excluir" variant="danger" onPress={() => void handleDelete()} loading={deleting} />
        <Button label="Cancelar" variant="ghost" onPress={() => setConfirmDelete(false)} />
      </BottomSheet>
    </Screen>
  );
}
