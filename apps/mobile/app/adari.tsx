import { bondTierFor, getAdariBehaviorProfile, getCreatureByKey, levelFromTotalXp, satietyLabel } from '@ad-sidera/shared';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AdariPortrait, AdariStats, Button, Card, LoadingState, ProgressBar, Screen, SectionHeader, Text } from '@/components';
import type { CreatureState } from '@/db/models';
import { loadObservatory } from '@/services/observatoryService';
import { useTheme } from '@/theme/ThemeProvider';

export default function AdariDetailsScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [creature, setCreature] = useState<CreatureState | null>(null);

  useEffect(() => {
    void loadObservatory().then((snapshot) => setCreature(snapshot.creature));
  }, []);

  if (!creature) return <Screen><LoadingState label="Consultando o Espelho Astral…" /></Screen>;
  const definition = getCreatureByKey(creature.creatureKey);
  const behavior = getAdariBehaviorProfile(creature.creatureKey);
  const name = creature.nickname || definition?.name || 'Adari';
  const xp = levelFromTotalXp(creature.xp);
  const tier = bondTierFor(creature.bond);

  return (
    <Screen scroll testID="adari-details-screen">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Button label="Voltar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        <Text variant="title">Espelho Astral</Text>
      </View>
      <Card style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <AdariPortrait creatureKey={creature.creatureKey} evolved={creature.evolutionStage > 0} size={150} mood="happy" />
        <Text variant="title">{name}</Text>
        <Text variant="body" color="textMuted">{definition?.personality}</Text>
        <Text variant="label" color="brandGold">Nível {creature.level} · {creature.evolutionStage > 0 ? definition?.evolution.toName : 'Forma inicial'}</Text>
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="História compartilhada" subtitle={tier.label} />
        <Text variant="label">Vínculo {creature.bond}/100</Text>
        <ProgressBar value={creature.bond / 100} color="brandGold" accessibilityLabel={`Vínculo ${creature.bond} de 100, ${tier.label}`} />
        <Text variant="caption" color="textMuted">{behavior.affectionReaction}</Text>
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Estado atual" />
        <Text variant="label">Vigor {creature.attributes.energy}/{creature.maxVigor}</Text>
        <ProgressBar value={creature.attributes.energy / creature.maxVigor} color="brandTeal" />
        <Text variant="label">Saciedade {creature.satiety}/100</Text>
        <ProgressBar value={creature.satiety / 100} color="brandGold" />
        <Text variant="caption" color="textMuted">{satietyLabel(creature.satiety)}. A Saciedade altera apenas falas e animações.</Text>
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Experiência" />
        <Text variant="body">XP total: {creature.xp}</Text>
        <ProgressBar value={xp.progress} color="brandGold" accessibilityLabel={`XP no nível: ${xp.xpIntoLevel} de ${xp.xpForLevel}`} />
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Atributos" />
        <AdariStats attributes={creature.attributes} />
      </Card>
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Habilidades e evolução" />
        <Text variant="body">{definition?.basicAbility.name} · {definition?.specialAbility.name}</Text>
        <Text variant="caption" color="textMuted">{definition?.evolution.description}</Text>
        <Button label="Gerenciar habilidades" variant="secondary" onPress={() => router.push('/abilities')} />
      </Card>
    </Screen>
  );
}

