import {
  ADARI_STAGE_LABEL,
  AdariEvolutionStage,
  bondTierFor,
  displayNameForStage,
  getAdariBehaviorProfile,
  getCreatureByKey,
  levelFromTotalXp,
  satietyLabel,
  stageFromInt,
} from '@ad-sidera/shared';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { AdariAttributeProgress } from '@ad-sidera/shared';
import { AdariStats, Button, Card, EvolutionBadge, LoadingState, PixelPortrait, ProgressBar, Screen, SectionHeader, StageBadge, Text } from '@/components';
import { AdariActionSprite } from '@/components/adari/AdariActionSprite';
import type { CreatureState } from '@/db/models';
import { attributeProgressFor, evolutionOverview } from '@/services/creatureService';
import { useTheme } from '@/theme/ThemeProvider';

export default function AdariDetailsScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [creature, setCreature] = useState<CreatureState | null>(null);
  const [evolutionAvailable, setEvolutionAvailable] = useState(false);
  const [attributeProgress, setAttributeProgress] = useState<AdariAttributeProgress[]>([]);

  useEffect(() => {
    void evolutionOverview().then(async (overview) => {
      setCreature(overview?.creature ?? null);
      setEvolutionAvailable(overview?.available ?? false);
      if (overview?.creature) {
        setAttributeProgress(await attributeProgressFor(overview.creature));
      }
    });
  }, []);

  if (!creature) return <Screen><LoadingState label="Carregando os status…" /></Screen>;
  const definition = getCreatureByKey(creature.creatureKey);
  const behavior = getAdariBehaviorProfile(creature.creatureKey);
  const stageInt = creature.evolutionStage;
  const stage = stageFromInt(stageInt);
  const name = creature.nickname || displayNameForStage(creature.creatureKey, stageInt);
  const xp = levelFromTotalXp(creature.xp);
  const tier = bondTierFor(creature.bond);

  return (
    <Screen scroll testID="adari-details-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Button label="Voltar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        <Text variant="title">Status</Text>
      </View>
      <Card style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        {/* Mesmo sprite da home: o Adari precisa ser reconhecível entre as telas. */}
        <PixelPortrait size={150} accessibilityLabel={`${name}, ${ADARI_STAGE_LABEL[stage]}`}>
          <AdariActionSprite
            creatureKey={creature.creatureKey}
            state="idle"
            size={136}
            stage={stageInt}
            reduceMotion
            accessibilityLabel={`${name}, ${ADARI_STAGE_LABEL[stage]}`}
          />
        </PixelPortrait>
        <Text variant="title">{name}</Text>
        <StageBadge label={ADARI_STAGE_LABEL[stage]} perfect={stage === AdariEvolutionStage.PERFECT} />
        <Text variant="body" color="textMuted">{definition?.personality}</Text>
        <Text variant="label" color="brandGold">Nível {creature.level} · {displayNameForStage(creature.creatureKey, stageInt)}</Text>
        {evolutionAvailable ? <EvolutionBadge /> : null}
        <Button label="Linha Evolutiva" variant="secondary" onPress={() => router.push('/evolution/line')} />
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="História compartilhada" subtitle={tier.label} />
        <Text variant="label">Vínculo {creature.bond}/100</Text>
        <ProgressBar value={creature.bond / 100} color="brandGold" accessibilityLabel={`Vínculo ${creature.bond} de 100, ${tier.label}`} />
        <Text variant="caption" color="textMuted">{behavior.affectionReaction}</Text>
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Estado atual" />
        <Text variant="label">Vigor {creature.attributes.energy}/{creature.maxVigor}</Text>
        <ProgressBar value={creature.attributes.energy / creature.maxVigor} color="brandTeal" />
        <Text variant="label">Saciedade {creature.satiety}/100</Text>
        <ProgressBar value={creature.satiety / 100} color="brandGold" />
        <Text variant="caption" color="textMuted">{satietyLabel(creature.satiety)}. A Saciedade altera apenas falas e animações.</Text>
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Experiência" />
        <Text variant="body">XP total: {creature.xp}</Text>
        <ProgressBar value={xp.progress} color="brandGold" accessibilityLabel={`XP no nível: ${xp.xpIntoLevel} de ${xp.xpForLevel}`} />
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Atributos" subtitle="Progresso de treino e o que desenvolve cada um" />
        <AdariStats attributes={creature.attributes} progress={attributeProgress} showTrainingHints />
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Habilidades e evolução" />
        <Text variant="body">{definition?.basicAbility.name} · {definition?.specialAbility.name}</Text>
        <Text variant="caption" color="textMuted">
          {stage === AdariEvolutionStage.PERFECT
            ? 'Este Adari alcançou a Evolução Perfeita.'
            : 'A Linha Evolutiva mostra o caminho até a próxima forma.'}
        </Text>
        <Button label="Gerenciar habilidades" variant="secondary" onPress={() => router.push('/abilities')} />
      </Card>
    </Screen>
  );
}

