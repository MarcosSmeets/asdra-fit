// Primitivos
export { Text, type TextColor } from './Text';
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { ProgressBar } from './ProgressBar';
export { Chip } from './Chip';
export { Screen } from './Screen';
export { BottomSheet } from './BottomSheet';
export { SectionHeader } from './SectionHeader';
export { CelestialDivider } from './CelestialDivider';
export { WeeklyGoalCard } from './WeeklyGoalCard';
export { LoadingState, EmptyState, ErrorState, OfflineBanner, Skeleton } from './StateViews';
export { SyncStatus, type SyncStatusProps } from './SyncStatus';

// Design system pixel 32-bit (Build 5) — API canônica para novas telas
export * from './pixel';

// Ícones (SVG)
export { StarIcon } from './icons/StarIcon';
export { AttributeIcon, type AttributeIconKey } from './icons/AttributeIcon';
export {
  HomeIcon,
  DiaryIcon,
  CompassIcon,
  TrophyIcon,
  PersonIcon,
  TAB_ICONS,
  type TabIconName,
  type TabIconProps,
} from './icons/TabIcons';

// Liga
export {
  LeagueScoreBreakdown,
  type LeagueScoreBreakdownProps,
} from './league/LeagueScoreBreakdown';

// Adari
export { AdariPortrait, type AdariMood } from './adari/AdariPortrait';
export { AdariAnimator } from './adari/AdariAnimator';
export { AdariRenderer, type AdariRendererProps } from './adari/AdariRenderer';
export { AdariHero } from './adari/AdariHero';
export { AdariStats } from './adari/AdariStats';
export { AdariCard } from './adari/AdariCard';
export { CharacterSprite, type CharacterSpriteKind } from './characters/CharacterSprite';
export { PlayerAvatar } from './avatar/PlayerAvatar';
export { AvatarCustomizer } from './avatar/AvatarCustomizer';

// Recompensa (economia v2)
export { ActivityRewardBadge } from './reward/ActivityRewardBadge';
export { ActivityRewardPreview } from './reward/ActivityRewardPreview';
export { DailyRewardExplanation } from './reward/DailyRewardExplanation';
export { RewardSummary } from './reward/RewardSummary';
export { rewardTier, REWARD_TIER_LABEL, type RewardTier } from './reward/rewardTier';

// Campanha (mapa da jornada)
export {
  CampaignNode,
  CampaignMap,
  CAMPAIGN_ROW_HEIGHT,
  CAMPAIGN_NODE_GUTTER,
  type CampaignNodeProps,
  type CampaignNodeState,
  type CampaignMapProps,
} from './campaign';

// Batalha (arena v2)
export {
  BattleStage,
  BattleHealthBar,
  BattleEnergyBar,
  BattleActionButton,
  type BattleStageProps,
  type BattleStageFeedback,
  type BattleHealthBarProps,
  type BattleEnergyBarProps,
  type BattleActionButtonProps,
  type BattleActionVariant,
} from './battle';
