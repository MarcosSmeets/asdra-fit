import {
  PLAYER_AVATAR_ACCESSORIES, PLAYER_AVATAR_BODY_MODELS, PLAYER_AVATAR_HAIR_COLORS,
  PLAYER_AVATAR_HAIR_STYLES, PLAYER_AVATAR_OUTFITS, PLAYER_AVATAR_SKIN_TONES,
  type PlayerAvatarAppearance,
} from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '../Chip';
import { Text } from '../Text';
import { PlayerAvatar } from './PlayerAvatar';
import { updateAvatarAppearance } from './avatarComposition';

const LABELS: Record<string, string> = {
  masculine: 'Modelo masculino', feminine: 'Modelo feminino',
  luminous: 'Claro', warm: 'Médio quente', brown: 'Marrom', deep: 'Profundo',
  short: 'Curto', swept: 'Preso', curly: 'Cacheado',
  midnight: 'Noturno', auburn: 'Cobre', golden: 'Dourado', silver: 'Prateado',
  astral: 'Astral', mist: 'Bruma', constellation: 'Constelação',
  none: 'Nenhum', visor: 'Visor astral', starpin: 'Broche estelar', scarf: 'Cachecol cósmico',
};

function Options<T extends string>({ title, values, selected, onSelect }: {
  title: string; values: readonly T[]; selected: T; onSelect: (value: T) => void;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label" color="textMuted">{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {values.map((value) => (
          <Chip key={value} label={LABELS[value] ?? value} selected={selected === value} onPress={() => onSelect(value)} />
        ))}
      </View>
    </View>
  );
}

export function AvatarCustomizer({ value, onChange, compact = false }: {
  value: PlayerAvatarAppearance; onChange: (next: PlayerAvatarAppearance) => void; compact?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const set = <K extends keyof PlayerAvatarAppearance>(key: K, next: PlayerAvatarAppearance[K]) =>
    onChange(updateAvatarAppearance(value, { [key]: next }));
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ alignItems: 'center' }}>
        <PlayerAvatar appearance={value} height={compact ? 150 : 210} testID="player-avatar-preview" />
      </View>
      <Options title="Modelo visual" values={PLAYER_AVATAR_BODY_MODELS} selected={value.bodyModel} onSelect={(v) => set('bodyModel', v)} />
      <Options title="Tom de pele" values={PLAYER_AVATAR_SKIN_TONES} selected={value.skinToneKey} onSelect={(v) => set('skinToneKey', v)} />
      <Options title="Cabelo" values={PLAYER_AVATAR_HAIR_STYLES} selected={value.hairStyleKey} onSelect={(v) => set('hairStyleKey', v)} />
      <Options title="Cor do cabelo" values={PLAYER_AVATAR_HAIR_COLORS} selected={value.hairColorKey} onSelect={(v) => set('hairColorKey', v)} />
      <Options title="Roupa" values={PLAYER_AVATAR_OUTFITS} selected={value.outfitKey} onSelect={(v) => set('outfitKey', v)} />
      <Options title="Acessório" values={PLAYER_AVATAR_ACCESSORIES} selected={value.accessoryKey ?? 'none'} onSelect={(v) => set('accessoryKey', v)} />
    </View>
  );
}
