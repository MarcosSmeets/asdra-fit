import {
  activitiesTraining,
  isTrainableAttribute,
  type AdariAttributeProgress,
  type AttributeSet,
} from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import { ACTIVITY_LABELS, ATTRIBUTE_LABELS } from '../../constants/labels';
import { useTheme } from '../../theme/ThemeProvider';
import { AttributeIcon, type AttributeIconKey } from '../icons/AttributeIcon';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';

const ROWS: { key: AttributeIconKey; max: number }[] = [
  { key: 'strength', max: 60 },
  { key: 'endurance', max: 60 },
  { key: 'agility', max: 60 },
  { key: 'discipline', max: 60 },
  { key: 'recovery', max: 60 },
  { key: 'spirit', max: 60 },
  { key: 'health', max: 200 },
  { key: 'energy', max: 100 },
];

/** O que cada atributo representa, em uma linha. */
const ATTRIBUTE_DESCRIPTIONS: Record<string, string> = {
  strength: 'Potência bruta em cada golpe.',
  endurance: 'Fôlego para sustentar o esforço.',
  agility: 'Velocidade, reflexo e mobilidade.',
  discipline: 'Constância que sustenta a jornada.',
  recovery: 'Rapidez para recuperar o Vigor.',
  spirit: 'Vontade e presença nas horas difíceis.',
  health: 'Vitalidade total em batalha.',
  energy: 'Vigor atual — descansa com o tempo.',
};

export interface AdariStatsProps {
  attributes: AttributeSet;
  /** Progresso de treino por atributo. Quando presente, mostra "42/100". */
  progress?: readonly AdariAttributeProgress[];
  /** Mostra as atividades que desenvolvem cada atributo. */
  showTrainingHints?: boolean;
}

/**
 * Atributos do Adari: valor, barra, progresso de treino rumo ao próximo ponto
 * e — quando pedido — quais atividades desenvolvem cada um.
 */
export function AdariStats({
  attributes,
  progress = [],
  showTrainingHints = false,
}: AdariStatsProps): React.ReactElement {
  const theme = useTheme();
  const progressByAttribute = new Map(progress.map((entry) => [entry.attribute as string, entry]));

  return (
    <View style={{ gap: theme.spacing.md }}>
      {ROWS.map(({ key, max }) => {
        const value = attributes[key];
        const training = progressByAttribute.get(key);
        const trainedBy = showTrainingHints && isTrainableAttribute(key)
          ? activitiesTraining(key).map((type) => ACTIVITY_LABELS[type] ?? type)
          : [];
        return (
          <View key={key} style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <AttributeIcon attribute={key} color={theme.colors.brandTeal} size={18} />
              <Text variant="label" style={{ width: 96 }}>
                {ATTRIBUTE_LABELS[key] ?? key}
              </Text>
              <View style={{ flex: 1 }}>
                <ProgressBar
                  value={Math.min(value / max, 1)}
                  color="brandTeal"
                  height={8}
                  accessibilityLabel={`${ATTRIBUTE_LABELS[key] ?? key}: ${value}`}
                />
              </View>
              <Text variant="label" color="textMuted" style={{ width: 34, textAlign: 'right' }}>
                {value}
              </Text>
            </View>

            {training ? (
              <View style={{ paddingLeft: 26, gap: 2 }}>
                <Text
                  variant="caption"
                  color="textMuted"
                  accessibilityLabel={`${training.trainingProgress} de ${training.progressRequired} para o próximo ponto`}
                >
                  {training.trainingProgress}/{training.progressRequired} para o próximo ponto
                </Text>
                <ProgressBar
                  value={training.trainingProgress / training.progressRequired}
                  color="brandGold"
                  height={5}
                />
              </View>
            ) : null}

            {showTrainingHints ? (
              <View style={{ paddingLeft: 26, gap: 2 }}>
                <Text variant="caption" color="textMuted">{ATTRIBUTE_DESCRIPTIONS[key]}</Text>
                {trainedBy.length > 0 ? (
                  <Text variant="caption" color="brandTeal">
                    Desenvolvida por: {trainedBy.join(', ')}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
