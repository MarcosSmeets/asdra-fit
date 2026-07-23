import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, type TextColor } from '../Text';

export interface LeagueScoreBreakdownProps {
  /** Meta semanal em dias (pode não vir no payload). */
  targetDays?: number | null;
  /** Dias concluídos (pode não vir no payload). */
  completedDays?: number | null;
  /** Percentual da meta pessoal, já em 0..100. */
  percentage: number;
  /** Bônus por sequência. */
  streakBonus: number;
  /** Bônus por meta concluída. */
  completionBonus: number;
  /** Pontuação final da temporada. */
  total: number;
}

function formatSigned(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : '+'}${Math.abs(rounded)}`;
}

function BreakdownRow({
  label,
  value,
  valueColor = 'text',
  emphasis = false,
}: {
  label: string;
  value: string;
  valueColor?: TextColor;
  emphasis?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderTopWidth: emphasis ? 1 : 0,
        borderTopColor: theme.colors.border,
        marginTop: emphasis ? theme.spacing.xs : 0,
      }}
    >
      <Text
        variant={emphasis ? 'section' : 'label'}
        color={emphasis ? 'text' : 'textMuted'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      <Text variant={emphasis ? 'section' : 'label'} color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Detalhamento transparente da pontuação da liga. Mostra como o percentual da
 * meta e os bônus formam a pontuação total, com a explicação da competição justa.
 */
export function LeagueScoreBreakdown({
  targetDays,
  completedDays,
  percentage,
  streakBonus,
  completionBonus,
  total,
}: LeagueScoreBreakdownProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      {typeof targetDays === 'number' ? (
        <BreakdownRow
          label="Meta semanal"
          value={`${targetDays} ${targetDays === 1 ? 'dia' : 'dias'}`}
        />
      ) : null}
      {typeof completedDays === 'number' ? (
        <BreakdownRow label="Dias concluídos" value={String(completedDays)} />
      ) : null}
      <BreakdownRow label="Percentual" value={`${Math.round(percentage)}%`} />
      <BreakdownRow
        label="Bônus de sequência"
        value={formatSigned(streakBonus)}
        valueColor="brandTeal"
      />
      <BreakdownRow
        label="Bônus de meta concluída"
        value={formatSigned(completionBonus)}
        valueColor="brandTeal"
      />
      <BreakdownRow
        label="Pontuação total"
        value={String(Math.round(total))}
        valueColor="brandGold"
        emphasis
      />
      <Text variant="caption" color="textMuted" style={{ marginTop: theme.spacing.sm }}>
        Apenas a primeira atividade válida de cada dia aumenta o progresso da liga. Assim, pessoas com
        rotinas diferentes competem de forma justa.
      </Text>
    </View>
  );
}
