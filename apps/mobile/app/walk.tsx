import { DEFAULT_PLAYER_AVATAR_APPEARANCE, type PlayerAvatarAppearance } from '@ad-sidera/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, CampaignMap, LoadingState, Screen, SectionHeader, Text } from '@/components';
import { getPlayerAvatarAppearance } from '@/services/playerAvatarService';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function WalkScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { campaign, creature, load } = useGameStore();
  const [avatar, setAvatar] = useState<PlayerAvatarAppearance>(DEFAULT_PLAYER_AVATAR_APPEARANCE);
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    void load();
    void getPlayerAvatarAppearance().then(setAvatar);
  }, [load]));
  if (!creature) return <Screen><LoadingState label="Preparando o passeio…" /></Screen>;
  const region = campaign.find((item) => item.unlocked && item.adversaries.some((node) => node.unlocked && !node.defeated))
    ?? [...campaign].reverse().find((item) => item.unlocked);
  return (
    <Screen scroll>
      <SectionHeader title="Passear" subtitle="Escolha um ponto do caminho; vocês caminharão juntos automaticamente." />
      <Text variant="body" color="textMuted">
        O passeio usa rotas definidas e pontos de interesse. Não há movimentação livre neste modo.
      </Text>
      {region ? (
        <CampaignMap
          region={region.region}
          adversaries={region.adversaries}
          avatarAppearance={avatar}
          creatureKey={creature.creatureKey}
          showTravelers
          onSelect={setArrivedAt}
        />
      ) : null}
      <Button label="Voltar ao Meu Adari" variant="ghost" onPress={() => router.back()} />
      <BottomSheet visible={Boolean(arrivedAt)} onClose={() => setArrivedAt(null)} title="Ponto de interesse">
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body">Seu Explorador e seu Adari chegaram juntos. Este caminho também leva aos desafios da Jornada.</Text>
          <Button label="Ir para a Jornada" onPress={() => { setArrivedAt(null); router.replace('/(tabs)/journey'); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

