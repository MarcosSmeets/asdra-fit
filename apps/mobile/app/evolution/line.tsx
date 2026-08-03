import {
  ADARI_STAGE_LABEL,
  AdariEvolutionStage,
  getEvolutionLine,
  stageFromInt,
  stageToInt,
  type AdariStageDefinition,
  type RequirementStatus,
} from '@ad-sidera/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import {
  Button,
  LoadingState,
  PixelBadge,
  PixelCard,
  PixelPortrait,
  PixelProgressBar,
  Screen,
  Text,
} from '@/components';
import { AdariActionSprite } from '@/components/adari/AdariActionSprite';
import { resolveAdariManifest } from '@/content/adari';
import { STAGE_STATUS_LABEL, stageStatusFor, type StageStatus } from '@/features/evolution/stageStatus';
import { evolutionOverview, type EvolutionOverview } from '@/services/creatureService';
import { useTheme } from '@/theme/ThemeProvider';

const STATUS_TONE: Record<StageStatus, 'success' | 'gold' | 'teal' | 'neutral'> = {
  completed: 'success',
  current: 'gold',
  available: 'teal',
  blocked: 'neutral',
};

function RequirementRow({ requirement }: { requirement: RequirementStatus }): React.ReactElement {
  const theme = useTheme();
  const numeric = typeof requirement.needed === 'number' && typeof requirement.current === 'number';
  return (
    <View style={{ gap: theme.spacing.xs }}
      accessible
      accessibilityLabel={`${requirement.label}: ${requirement.met ? 'cumprido' : 'pendente'}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <Text variant="caption" color={requirement.met ? 'success' : 'textMuted'}>
          {requirement.met ? '✓' : '◇'} {requirement.label}
        </Text>
        {numeric ? (
          <Text variant="caption" color="textMuted">
            {Math.min(Number(requirement.current), Number(requirement.needed))}/{Number(requirement.needed)}
          </Text>
        ) : null}
      </View>
      {numeric && !requirement.met ? (
        <PixelProgressBar
          value={Number(requirement.needed) > 0 ? Number(requirement.current) / Number(requirement.needed) : 0}
          color="brandTeal"
          height={6}
        />
      ) : null}
    </View>
  );
}

function StageCard({ stage, status, creatureKey, requirements }: {
  stage: AdariStageDefinition;
  status: StageStatus;
  creatureKey: string;
  /** Status detalhado apenas para o PRÓXIMO estágio; demais bloqueados mostram pista. */
  requirements: RequirementStatus[] | null;
}): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const stageInt = stageToInt(stage.stage);
  const manifest = resolveAdariManifest(creatureKey, stageInt);
  const revealed = status === 'completed' || status === 'current' || status === 'available';
  const perfect = stage.stage === AdariEvolutionStage.PERFECT;
  return (
    <PixelCard variant={status === 'current' ? 'elevated' : 'surface'} padding={theme.spacing.md}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <PixelPortrait size={72} accessibilityLabel={revealed ? stage.name : 'Forma ainda não revelada'}>
          {/* Forma revelada usa o MESMO sprite das outras telas; bloqueada, a silhueta. */}
          {revealed ? (
            <AdariActionSprite
              creatureKey={creatureKey}
              state="idle"
              size={64}
              stage={stageInt}
              reduceMotion
              accessibilityLabel={stage.name}
            />
          ) : (
            <Image source={manifest.silhouette} style={{ width: 64, height: 64 }} resizeMode="contain" />
          )}
        </PixelPortrait>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Text variant="section">{revealed ? stage.name : '???'}</Text>
            <PixelBadge label={ADARI_STAGE_LABEL[stage.stage]} tone={perfect ? 'gold' : 'violet'} />
            <PixelBadge label={STAGE_STATUS_LABEL[status]} tone={STATUS_TONE[status]} />
          </View>
          <Text variant="caption" color="textMuted">
            {revealed ? stage.description : stage.narrative}
          </Text>
        </View>
      </View>
      {requirements ? (
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          <Text variant="hud" color="brandGold">Requisitos</Text>
          {requirements.map((requirement) => (
            <RequirementRow key={requirement.key} requirement={requirement} />
          ))}
        </View>
      ) : null}
      {status === 'available' ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button label="Evoluir agora" onPress={() => router.push('/evolution/ceremony')} />
        </View>
      ) : null}
    </PixelCard>
  );
}

export default function EvolutionLineScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [overview, setOverview] = useState<EvolutionOverview | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    void evolutionOverview().then((data) => {
      setOverview(data);
      setLoaded(true);
    });
  }, []));

  if (!loaded) return <Screen><LoadingState label="Lendo a linha evolutiva…" /></Screen>;
  if (!overview) {
    return (
      <Screen>
        <Text variant="body" color="textMuted">Selecione um Adari para ver a linha evolutiva.</Text>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const { creature, check } = overview;
  const line = getEvolutionLine(creature.creatureKey);
  const currentStage = creature.evolutionStage;
  const nextStageInt = currentStage + 1;

  return (
    <Screen scroll testID="evolution-line-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Button label="Voltar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        <Text variant="title">Linha Evolutiva</Text>
      </View>
      <Text variant="body" color="textMuted">
        Evoluir exige treino registrado e a combinação de requisitos mostrada abaixo. Batalhas
        ajudam na Jornada, mas vencer batalhas sozinho não faz seu Adari evoluir.
      </Text>
      {line?.stages.map((stage) => {
        const stageInt = stageToInt(stage.stage);
        const status = stageStatusFor(stageInt, currentStage, overview.available);
        return (
          <StageCard
            key={stage.key}
            stage={stage}
            status={status}
            creatureKey={creature.creatureKey}
            requirements={stageInt === nextStageInt ? check?.requirements ?? null : null}
          />
        );
      })}
      <Text variant="caption" color="textMuted" center>
        Estágio atual: {ADARI_STAGE_LABEL[stageFromInt(currentStage)]}
      </Text>
    </Screen>
  );
}
