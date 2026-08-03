import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, CampaignMap, LoadingState, Screen, SectionHeader, Text } from '@/components';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function WalkScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { campaign, creature, load } = useGameStore();
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    void load();
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
          creatureKey={creature.creatureKey}
          showTravelers
          onSelect={setArrivedAt}
        />
      ) : null}
      <Button label="Voltar ao Meu Adari" variant="ghost" onPress={() => router.back()} />
      <BottomSheet visible={Boolean(arrivedAt)} onClose={() => setArrivedAt(null)} title="Ponto de interesse">
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body">Seu Adari chegou junto. Este caminho também leva aos desafios da Jornada.</Text>
          <Button label="Ir para a Jornada" onPress={() => { setArrivedAt(null); router.replace('/(tabs)/journey'); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

