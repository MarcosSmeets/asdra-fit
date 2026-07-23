import { DEFAULT_PLAYER_AVATAR_APPEARANCE, type PlayerAvatarAppearance } from '@ad-sidera/shared';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AvatarCustomizer, Button, Screen, Text } from '@/components';
import { getPlayerAvatarAppearance, savePlayerAvatarAppearance } from '@/services/playerAvatarService';
import { useTheme } from '@/theme/ThemeProvider';

export default function AvatarScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [appearance, setAppearance] = useState<PlayerAvatarAppearance>(DEFAULT_PLAYER_AVATAR_APPEARANCE);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void getPlayerAvatarAppearance().then(setAppearance); }, []);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try { await savePlayerAvatarAppearance(appearance); router.back(); }
    finally { setSaving(false); }
  };
  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="title">Meu Explorador</Text>
        <Text variant="body" color="textMuted">A aparência é visual e pode mudar quando você quiser.</Text>
      </View>
      <AvatarCustomizer value={appearance} onChange={setAppearance} />
      <Button label="Salvar aparência" loading={saving} disabled={saving} onPress={() => void save()} />
    </Screen>
  );
}

