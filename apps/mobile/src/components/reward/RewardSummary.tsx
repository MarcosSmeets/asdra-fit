import type { ActivityReward } from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { useTheme } from '../../theme/ThemeProvider';
import { AdariPortrait } from '../adari/AdariPortrait';
import { CelestialDivider } from '../CelestialDivider';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';
import { rewardTier } from './rewardTier';

export interface RewardSummaryProps {
  creatureKey: string;
  adariName: string;
  evolved?: boolean;
  reward: ActivityReward;
  leveledUp: boolean;
  evolutionAvailable: boolean;
  weeklyValid: number;
  weeklyTarget: number;
  currentStreak: number;
}

/** Conteúdo da tela/modal de recompensa após registrar uma atividade. */
export function RewardSummary({
  creatureKey,
  adariName,
  evolved,
  reward,
  leveledUp,
  evolutionAvailable,
  weeklyValid,
  weeklyTarget,
  currentStreak,
}: RewardSummaryProps): React.ReactElement {
  const theme = useTheme();
  const tier = rewardTier(reward.dailyRewardMultiplier);
  const attributes = Object.entries(reward.finalAttributeChanges).filter(
    ([, v]) => typeof v === 'number' && v !== 0,
  );

  const title =
    tier === 'full'
      ? 'Atividade concluída!'
      : tier === 'reduced'
        ? 'Treino extra registrado!'
        : 'Atividade registrada!';

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      <AdariPortrait creatureKey={creatureKey} size={120} mood="happy" evolved={evolved} />
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
            <Text variant="heading" color="brandGold">
              +{reward.finalXp} XP
            </Text>
            <Text variant="heading" color="brandTeal">
              +{reward.finalEnergy} energia
            </Text>
          </View>
          {attributes.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {attributes.map(([key, value]) => (
                <Text key={key} variant="label" color="text">
                  +{value} {ATTRIBUTE_LABELS[key] ?? key}
                </Text>
              ))}
            </View>
          ) : null}
          {tier === 'reduced' ? (
            <Text variant="caption" color="textMuted" center>
              Recompensa reduzida (25%). Atividades extras continuam no seu diário.
            </Text>
          ) : null}
        </View>
      )}

      {leveledUp ? (
        <Text variant="body" color="success" center>
          {adariName} subiu de nível!
        </Text>
      ) : null}
      {evolutionAvailable ? (
        <Text variant="body" color="brandGold" center>
          Evolução disponível! Confira na sua jornada.
        </Text>
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
