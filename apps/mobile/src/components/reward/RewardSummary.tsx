import {
  describeTrainingGain,
  type ActivityReward,
  type AdariAttributeProgress,
  type AttributeSet,
} from '@ad-sidera/shared';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { AdariPortrait } from '../adari/AdariPortrait';
import { Button } from '../Button';
import { CelestialDivider } from '../CelestialDivider';
import { PixelPanel } from '../pixel/PixelFrame';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';
import { AttributeTrainingRow } from './AttributeTrainingRow';
import { LevelUpCelebration } from './LevelUpCelebration';
import { rewardTier } from './rewardTier';

export interface RewardSummaryProps {
  creatureKey: string;
  adariName: string;
  /** Estágio evolutivo (0..3) para o retrato. */
  stage?: number;
  evolved?: boolean;
  reward: ActivityReward;
  leveledUp: boolean;
  evolutionAvailable: boolean;
  weeklyValid: number;
  weeklyTarget: number;
  currentStreak: number;
  /** Progresso de treino APÓS a atividade (vem do recálculo). */
  attributeProgress?: readonly AdariAttributeProgress[];
  /** Atributos antes/depois, para a celebração de nível. */
  previousAttributes?: AttributeSet | null;
  newAttributes?: AttributeSet | null;
  previousLevel?: number;
  newLevel?: number;
}

/** Contador que sobe até o valor final (XP). Respeita redução de movimento. */
function CountUp({ value, animate, suffix, color }: {
  value: number;
  animate: boolean;
  suffix: string;
  color: 'brandGold' | 'brandTeal';
}): React.ReactElement {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(animate && !reduced ? 0 : value);
  const animated = useRef(new Animated.Value(animate && !reduced ? 0 : value)).current;

  useEffect(() => {
    if (!animate || reduced) {
      setShown(value);
      return undefined;
    }
    const listener = animated.addListener(({ value: current }) => setShown(Math.round(current)));
    const timing = Animated.timing(animated, { toValue: value, duration: 700, useNativeDriver: false });
    timing.start();
    return () => { timing.stop(); animated.removeListener(listener); };
  }, [animate, animated, reduced, value]);

  return <Text variant="heading" color={color}>+{shown} {suffix}</Text>;
}

/**
 * Tela de recompensa da atividade (Build 6). Hierarquia:
 * 1) recompensas principais (XP, Vigor, meta), 2) ATRIBUTOS TREINADOS com
 * progresso anterior → novo, 3) subida de nível como ETAPA SEPARADA.
 *
 * Os dados já estão persistidos quando esta tela aparece — a animação é só
 * apresentação e pode ser pulada sem perder nada.
 */
export function RewardSummary({
  creatureKey,
  adariName,
  stage,
  evolved,
  reward,
  leveledUp,
  evolutionAvailable,
  weeklyValid,
  weeklyTarget,
  currentStreak,
  attributeProgress = [],
  previousAttributes,
  newAttributes,
  previousLevel,
  newLevel,
}: RewardSummaryProps): React.ReactElement {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [animate, setAnimate] = useState(!reduced);
  const tier = rewardTier(reward.dailyRewardMultiplier);
  const trainedRows = describeTrainingGain(attributeProgress, reward.finalTrainingChanges);
  const showLevelUp = leveledUp && previousAttributes && newAttributes;

  const title =
    tier === 'full'
      ? 'Atividade concluída!'
      : tier === 'reduced'
        ? 'Treino extra registrado!'
        : 'Atividade registrada!';

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      <AdariPortrait creatureKey={creatureKey} size={120} mood="happy" stage={stage} evolved={evolved} />
      <Text variant="title" center>
        {title}
      </Text>

      {tier === 'none' ? (
        <Text variant="body" color="textMuted" center>
          Seu progresso de hoje já recebeu as recompensas disponíveis. Este treino continua salvo no
          diário e nas suas estatísticas.
        </Text>
      ) : (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
            <CountUp value={reward.finalXp} animate={animate} suffix="XP" color="brandGold" />
            <CountUp value={reward.finalEnergy} animate={animate} suffix="Vigor" color="brandTeal" />
          </View>
          {tier === 'reduced' ? (
            <Text variant="caption" color="textMuted" center>
              Recompensa reduzida (25%). Atividades extras continuam no seu diário.
            </Text>
          ) : null}
        </View>
      )}

      {trainedRows.length > 0 ? (
        <PixelPanel variant="surface" padding={theme.spacing.md} style={{ alignSelf: 'stretch' }}>
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="hud" color="brandGold">ATRIBUTOS TREINADOS</Text>
            {trainedRows.map((row) => (
              <AttributeTrainingRow key={row.attribute} row={row} animate={animate} />
            ))}
            <Text variant="caption" color="textMuted">
              Cada {row0Required(trainedRows)} pontos de treino somam +1 ao atributo. O excedente
              nunca se perde.
            </Text>
          </View>
        </PixelPanel>
      ) : null}

      {showLevelUp ? (
        <>
          <CelestialDivider />
          <LevelUpCelebration
            adariName={adariName}
            fromLevel={previousLevel ?? 1}
            toLevel={newLevel ?? (previousLevel ?? 1) + 1}
            previousAttributes={previousAttributes}
            newAttributes={newAttributes}
            animate={animate}
          />
        </>
      ) : null}

      {evolutionAvailable ? (
        <Text variant="body" color="brandGold" center>
          Evolução disponível! Confira na sua jornada.
        </Text>
      ) : null}

      {animate && (trainedRows.length > 0 || showLevelUp) ? (
        <Button
          label="Pular animação"
          variant="ghost"
          onPress={() => setAnimate(false)}
          accessibilityHint="Mostra o resultado completo imediatamente."
        />
      ) : null}

      <CelestialDivider />

      <View style={{ alignSelf: 'stretch', gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" color="textMuted">
            Meta semanal
          </Text>
          <Text variant="label">
            {Math.min(weeklyValid, weeklyTarget)}/{weeklyTarget}
          </Text>
        </View>
        <ProgressBar value={weeklyTarget > 0 ? weeklyValid / weeklyTarget : 0} color="brandGold" />
        {currentStreak > 0 ? (
          <Text variant="caption" color="textMuted">
            Sequência atual: {currentStreak} {currentStreak === 1 ? 'semana' : 'semanas'}.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Requisito de progresso exibido na legenda (o mesmo para todos os atributos). */
function row0Required(rows: readonly { progressRequired: number }[]): number {
  return rows[0]?.progressRequired ?? 100;
}
