import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ProgressBar } from './ProgressBar';
import { SectionHeader } from './SectionHeader';
import { Text } from './Text';

export interface WeeklyGoalCardProps {
  validDays: number;
  targetCount: number;
  percentageDisplayed: number;
  completed: boolean;
  remaining: number;
  currentStreak: number;
  bestStreak: number;
}

/** Card de meta semanal (progresso por DIAS válidos + sequência). */
export function WeeklyGoalCard({
  validDays,
  targetCount,
  percentageDisplayed,
  completed,
  remaining,
  currentStreak,
  bestStreak,
}: WeeklyGoalCardProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader
        title="Meta da semana"
        action={
          <Text variant="label" color={completed ? 'success' : 'brandGold'}>
            {Math.round(percentageDisplayed * 100)}%
          </Text>
        }
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="title">
          {validDays}
          <Text variant="heading" color="textMuted">
            {' '}
            de {targetCount} dias
          </Text>
        </Text>
      </View>
      <ProgressBar
        value={Math.min(percentageDisplayed, 1)}
        color={completed ? 'success' : 'brandGold'}
        height={12}
        accessibilityLabel={`Meta semanal: ${validDays} de ${targetCount} dias`}
      />
      <Text variant="caption" color="textMuted">
        {completed
          ? 'Meta concluída! Uma semana difícil não apaga sua jornada — continue construindo.'
          : `Faltam ${remaining} ${remaining === 1 ? 'dia' : 'dias'} para concluir a meta.`}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <Text variant="caption" color="textMuted">
          Sequência: <Text variant="caption" color="brandTeal">{currentStreak}</Text>
        </Text>
        <Text variant="caption" color="textMuted">
          Melhor: <Text variant="caption" color="brandGold">{bestStreak}</Text>
        </Text>
      </View>
    </View>
  );
}
