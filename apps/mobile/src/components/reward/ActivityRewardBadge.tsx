import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text, type TextColor } from '../Text';
import { rewardTier, REWARD_TIER_LABEL, type RewardTier } from './rewardTier';

const TIER_COLOR: Record<RewardTier, TextColor> = {
  full: 'success',
  reduced: 'brandGold',
  none: 'textMuted',
};

/** Pílula neutra indicando o tipo de recompensa de uma atividade no diário. */
export function ActivityRewardBadge({ multiplier }: { multiplier: number }): React.ReactElement {
  const theme = useTheme();
  const tier = rewardTier(multiplier);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 3,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text variant="caption" color={TIER_COLOR[tier]}>
        {REWARD_TIER_LABEL[tier]}
      </Text>
    </View>
  );
}
