import type { ActivityReward } from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { ActivityRewardBadge } from './ActivityRewardBadge';

/**
 * Pontos de TREINO estimados por atributo. O rótulo diz "treino" de propósito:
 * são pontos rumo ao próximo ponto de atributo, não o valor final do atributo.
 */
function TrainingPreview({ changes }: { changes: Record<string, number | undefined> }): React.ReactElement | null {
  const entries = Object.entries(changes).filter(([, v]) => typeof v === 'number' && v !== 0);
  if (entries.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {entries.map(([key, value]) => (
          <Text key={key} variant="label" color="brandTeal">
            +{value} {ATTRIBUTE_LABELS[key] ?? key}
          </Text>
        ))}
      </View>
      <Text variant="caption" color="textMuted">
        Pontos de treino — a cada 100 o atributo sobe 1.
      </Text>
    </View>
  );
}

/** Prévia da recompensa (antes de salvar): posição, multiplicador e ganhos estimados. */
export function ActivityRewardPreview({ reward }: { reward: ActivityReward }): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" color="textMuted">
          Recompensa estimada
        </Text>
        <ActivityRewardBadge multiplier={reward.dailyRewardMultiplier} />
      </View>

      {reward.eligible ? (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
            <Text variant="body" color="brandGold">
              +{reward.finalXp} XP
            </Text>
            <Text variant="body" color="brandTeal">
              +{reward.finalEnergy} Vigor
            </Text>
          </View>
          <TrainingPreview changes={reward.finalTrainingChanges} />
          <Text variant="caption" color="textMuted">
            {reward.countsTowardGoal
              ? 'Conta como o dia de hoje na sua meta semanal.'
              : 'Este registro não adiciona outro dia à meta semanal.'}
          </Text>
        </View>
      ) : (
        <Text variant="caption" color="textMuted">
          Registros com menos de 10 minutos são salvos no diário, mas não geram recompensa.
        </Text>
      )}
    </View>
  );
}
