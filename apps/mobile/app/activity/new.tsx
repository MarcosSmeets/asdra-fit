import { getCreatureByKey, type ActivityReward } from '@ad-sidera/shared';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import {
  ActivityRewardPreview,
  BottomSheet,
  Button,
  Card,
  Chip,
  Input,
  RewardSummary,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { BRAND } from '@/constants/brand';
import { ACTIVITY_LABELS, INTENSITY_LABELS, MOOD_LABELS } from '@/constants/labels';
import { previewReward, type RegisterActivityResult } from '@/services/activityService';
import { deletePrivatePhoto, storePrivatePhoto } from '@/services/photoService';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme/ThemeProvider';
import { nowIso } from '@/utils/datetime';

const MIN_DURATION = 1;
const MAX_DURATION = 1440;

/** Grupo de chips selecionáveis. onSelect recebe a chave; o pai decide alternância. */
function ChipGroup({
  options,
  value,
  onSelect,
}: {
  options: [string, string][];
  value: string | null;
  onSelect: (key: string) => void;
}): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([key, label]) => (
        <Chip key={key} label={label} selected={value === key} onPress={() => onSelect(key)} />
      ))}
    </View>
  );
}

export default function NewActivityScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const creature = useGameStore((s) => s.creature);
  const streak = useGameStore((s) => s.streak);

  // "Agora" é capturado uma vez ao abrir a tela — usado tanto na prévia quanto ao salvar,
  // para que a posição/recompensa exibida seja a mesma que será registrada.
  const [occurredAtIso] = useState(() => nowIso());

  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [moodAfter, setMoodAfter] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [showMore, setShowMore] = useState(false);

  const [preview, setPreview] = useState<ActivityReward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterActivityResult | null>(null);

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const setDurationSafe = useCallback((next: number) => {
    if (Number.isNaN(next)) {
      setDuration(MIN_DURATION);
      return;
    }
    setDuration(Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(next))));
  }, []);

  // Prévia viva da recompensa: recalcula ao mudar tipo/intensidade/duração.
  useEffect(() => {
    if (!activityType || !intensity) {
      setPreview(null);
      return;
    }
    let active = true;
    void previewReward(
      { activityType, perceivedIntensity: intensity, durationMinutes: duration },
      occurredAtIso,
    )
      .then((next) => {
        if (active) {
          setPreview(next);
        }
      })
      .catch(() => {
        if (active) {
          setPreview(null);
        }
      });
    return () => {
      active = false;
    };
  }, [activityType, intensity, duration, occurredAtIso]);

  const pickPhoto = useCallback(
    async (source: 'camera' | 'library') => {
      setError(null);
      try {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(
            source === 'camera'
              ? 'Permita o acesso à câmera para adicionar uma foto.'
              : 'Permita o acesso às fotos para escolher uma imagem.',
          );
          return;
        }
        const picked =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.6,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.6,
              });
        if (picked.canceled) {
          return;
        }
        const asset = picked.assets[0];
        if (!asset) {
          return;
        }
        const stored = await storePrivatePhoto(asset.uri);
        if (localPhotoUri) {
          await deletePrivatePhoto(localPhotoUri);
        }
        setLocalPhotoUri(stored);
      } catch {
        setError('Não foi possível carregar a foto. Tente novamente.');
      }
    },
    [localPhotoUri],
  );

  const removePhoto = useCallback(async () => {
    if (localPhotoUri) {
      await deletePrivatePhoto(localPhotoUri);
    }
    setLocalPhotoUri(null);
  }, [localPhotoUri]);

  const handleSave = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }
    if (!activityType || !intensity) {
      setError('Escolha o tipo de atividade e a intensidade.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await useGameStore.getState().register({
        activityType,
        perceivedIntensity: intensity,
        durationMinutes: duration,
        occurredAt: occurredAtIso,
        notes: notes.trim() || undefined,
        location: location.trim() || undefined,
        moodBefore: moodBefore ?? undefined,
        moodAfter: moodAfter ?? undefined,
        localPhotoUri: localPhotoUri ?? undefined,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível registrar. Tente novamente.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    activityType,
    intensity,
    duration,
    occurredAtIso,
    notes,
    location,
    moodBefore,
    moodAfter,
    localPhotoUri,
  ]);

  const handleFinish = useCallback(() => {
    router.replace({ pathname: '/(tabs)', params: { reaction: 'activity' } });
  }, [router]);

  const handleSeeAdari = useCallback(() => {
    router.replace('/(tabs)/journey');
  }, [router]);

  const gap = theme.spacing.md;

  const definition = creature ? getCreatureByKey(creature.creatureKey) : undefined;
  const adariFallback = definition?.name ?? BRAND.companionSingular;
  const adariName =
    creature && creature.nickname && creature.nickname.length > 0
      ? creature.nickname
      : adariFallback;

  return (
    <Screen scroll testID="new-activity-screen">
      <Text variant="title">Registrar atividade</Text>

      {/* ---------- Camada 1: essencial (sempre visível) ---------- */}

      {/* Foto (opcional, privada) */}
      <Card style={{ gap }}>
        <SectionHeader
          title="Foto (opcional)"
          subtitle="A foto é privada e fica somente neste dispositivo. Não é enviada para lugar nenhum."
        />
        {localPhotoUri ? (
          <View style={{ gap }}>
            <Image
              source={{ uri: localPhotoUri }}
              accessibilityLabel="Pré-visualização da foto da atividade"
              style={{ width: '100%', height: 200, borderRadius: theme.radius.md }}
              resizeMode="cover"
            />
            <Button
              label="Remover foto"
              variant="ghost"
              onPress={() => void removePhoto()}
              accessibilityHint="Remove a foto deste registro."
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Câmera"
                variant="secondary"
                onPress={() => void pickPhoto('camera')}
                accessibilityHint="Abre a câmera para tirar uma foto."
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Galeria"
                variant="secondary"
                onPress={() => void pickPhoto('library')}
                accessibilityHint="Escolhe uma foto da galeria."
              />
            </View>
          </View>
        )}
      </Card>

      {/* Tipo */}
      <Card style={{ gap }}>
        <SectionHeader title="Tipo de atividade" />
        <ChipGroup
          options={Object.entries(ACTIVITY_LABELS)}
          value={activityType}
          onSelect={setActivityType}
        />
      </Card>

      {/* Duração */}
      <Card style={{ gap }}>
        <SectionHeader title="Duração (minutos)" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
          <Button
            label="−"
            variant="secondary"
            fullWidth={false}
            onPress={() => setDurationSafe(duration - 5)}
            accessibilityHint="Diminui a duração em 5 minutos."
          />
          <View style={{ flex: 1 }}>
            <Input
              value={String(duration)}
              onChangeText={(t) => setDurationSafe(Number(t.replace(/[^0-9]/g, '')))}
              keyboardType="number-pad"
              accessibilityLabel="Duração em minutos"
              style={{ textAlign: 'center' }}
            />
          </View>
          <Button
            label="+"
            variant="secondary"
            fullWidth={false}
            onPress={() => setDurationSafe(duration + 5)}
            accessibilityHint="Aumenta a duração em 5 minutos."
          />
        </View>
      </Card>

      {/* Intensidade */}
      <Card style={{ gap }}>
        <SectionHeader title="Intensidade percebida" />
        <ChipGroup
          options={Object.entries(INTENSITY_LABELS)}
          value={intensity}
          onSelect={setIntensity}
        />
      </Card>

      {/* Quando */}
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Quando" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          <Chip label="Agora" selected onPress={() => undefined} />
          <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
            Registrado no momento atual.
          </Text>
        </View>
      </Card>

      {/* Prévia viva da recompensa */}
      {preview ? (
        <ActivityRewardPreview reward={preview} />
      ) : (
        <Text variant="caption" color="textMuted">
          Escolha o tipo e a intensidade para ver a recompensa estimada.
        </Text>
      )}

      {/* ---------- Camada 2: detalhes opcionais (recolhível) ---------- */}
      <Button
        label={showMore ? 'Ocultar detalhes' : 'Adicionar mais detalhes'}
        variant="ghost"
        onPress={() => setShowMore((v) => !v)}
        accessibilityHint="Mostra ou oculta campos opcionais: observação, humor e local."
      />

      {showMore ? (
        <>
          <Card style={{ gap }}>
            <SectionHeader title="Observação (opcional)" />
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Como foi o treino?"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>

          <Card style={{ gap }}>
            <SectionHeader title="Humor antes (opcional)" />
            <ChipGroup
              options={Object.entries(MOOD_LABELS)}
              value={moodBefore}
              onSelect={(key) => setMoodBefore((prev) => (prev === key ? null : key))}
            />
            <SectionHeader title="Humor depois (opcional)" />
            <ChipGroup
              options={Object.entries(MOOD_LABELS)}
              value={moodAfter}
              onSelect={(key) => setMoodAfter((prev) => (prev === key ? null : key))}
            />
          </Card>

          <Card style={{ gap }}>
            <SectionHeader title="Local (opcional)" />
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="Ex.: Parque, academia, casa"
              maxLength={120}
            />
          </Card>
        </>
      ) : null}

      {error ? (
        <Text variant="label" color="error">
          {error}
        </Text>
      ) : null}

      <Button
        label="Salvar"
        onPress={() => void handleSave()}
        loading={submitting}
        disabled={!activityType || !intensity}
        accessibilityHint="Salva o registro da atividade."
      />

      {/* Resumo da recompensa (economia v2) */}
      <BottomSheet visible={result !== null} onClose={handleFinish}>
        {result && creature ? (
          <View style={{ gap: theme.spacing.md }}>
            <RewardSummary
              creatureKey={creature.creatureKey}
              adariName={adariName}
              evolved={creature.evolutionStage > 0}
              reward={result.reward}
              leveledUp={result.leveledUp}
              evolutionAvailable={result.evolutionAvailable}
              weeklyValid={result.weeklyProgress?.validActivityCount ?? 0}
              weeklyTarget={result.weeklyProgress?.targetCount ?? 0}
              currentStreak={streak?.currentStreak ?? 0}
            />
            <Button
              label="Concluir"
              onPress={handleFinish}
              accessibilityHint="Volta para o início."
            />
            <Button
              label={`Ver ${adariName}`}
              variant="ghost"
              onPress={handleSeeAdari}
              accessibilityHint="Abre a sua jornada."
            />
          </View>
        ) : (
          <Text variant="body">Registrando…</Text>
        )}
      </BottomSheet>
    </Screen>
  );
}
