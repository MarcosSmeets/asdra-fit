import { DEFAULT_PLAYER_AVATAR_APPEARANCE, checkEvolution, getCreatureByKey, hoursUntilFullVigor, vigorCostForBattle, type PlayerAvatarAppearance } from '@ad-sidera/shared';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import {
  AdariPortrait,
  AdariStats,
  BottomSheet,
  Button,
  Card,
  CampaignMap,
  CelestialDivider,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { companionDisplayName } from '@/constants/brand';
import type { RegionState } from '@/domain/campaign';
import type { AdversaryState } from '@/domain/campaign';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme/ThemeProvider';
import { getPlayerAvatarAppearance } from '@/services/playerAvatarService';

/** Rótulo do estágio de evolução para exibição. */
function stageLabel(stage: number): string {
  return stage === 0 ? 'Forma inicial' : `Estágio evoluído ${stage}`;
}

export default function JourneyScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const { creature, campaign, streak, dailyBattle, loading, error, load, evolve } = useGameStore();

  const [didAttempt, setDidAttempt] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<AdversaryState | null>(null);
  const [avatarAppearance, setAvatarAppearance] = useState<PlayerAvatarAppearance>(DEFAULT_PLAYER_AVATAR_APPEARANCE);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getPlayerAvatarAppearance().then((appearance) => {
        if (active) setAvatarAppearance(appearance);
      });
      void load().finally(() => {
        if (active) {
          setDidAttempt(true);
        }
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const handleEvolve = useCallback(async () => {
    if (evolving) {
      return;
    }
    setEvolving(true);
    try {
      await evolve();
      setCelebrate(true);
    } finally {
      setEvolving(false);
    }
  }, [evolve, evolving]);

  const openBattle = useCallback(
    (adversaryId: string) => {
      const selected = useGameStore.getState().campaign
        .flatMap((region) => region.adversaries)
        .find((item) => item.adversary.id === adversaryId) ?? null;
      setSelectedChallenge(selected);
    },
    [],
  );

  if (!creature) {
    if (!didAttempt || loading) {
      return (
        <Screen>
          <LoadingState label="Carregando sua jornada…" />
        </Screen>
      );
    }
    if (error) {
      return (
        <Screen>
          <ErrorState message={error} onRetry={() => void load()} />
        </Screen>
      );
    }
    return <Redirect href="/onboarding" />;
  }

  const definition = getCreatureByKey(creature.creatureKey);
  const speciesName = definition?.name;
  const heroName = companionDisplayName(creature.nickname ?? speciesName);
  const evolved = creature.evolutionStage > 0;
  const evolution = definition?.evolution ?? null;

  const evolutionCheck =
    creature.evolutionStage === 0 && evolution
      ? checkEvolution(
          {
            level: creature.level,
            weeksGoalMet: streak?.completedWeeks ?? 0,
            totalActivities: creature.totalActivities,
            attributes: creature.attributes,
            defeatedMilestones: creature.defeatedMilestones,
          },
          evolution.requirements,
        )
      : null;

  const totalAdversaries = campaign.reduce((sum, r) => sum + r.adversaries.length, 0);
  const defeatedAdversaries = campaign.reduce(
    (sum, r) => sum + r.adversaries.filter((a) => a.defeated).length,
    0,
  );

  const gap = theme.spacing.md;
  const activeRegionKey = campaign.find((region) =>
    region.unlocked && region.adversaries.some((item) => item.unlocked && !item.defeated),
  )?.region.key ?? [...campaign].reverse().find((region) => region.unlocked)?.region.key;

  return (
    <Screen scroll testID="journey-screen">
      <Text variant="title">Sua jornada</Text>

      <SectionHeader
        title="Mapa da Jornada"
        subtitle="Toque em um nó desbloqueado. Seu Explorador seguirá apenas os caminhos conectados."
      />
      {campaign.map((region: RegionState) => (
        <CampaignMap
          key={region.region.key}
          region={region.region}
          adversaries={region.adversaries}
          onSelect={openBattle}
          avatarAppearance={avatarAppearance}
          creatureKey={creature.creatureKey}
          showTravelers={region.region.key === activeRegionKey}
        />
      ))}

      <CelestialDivider />

      {/* Adari atual */}
      <Card style={{ gap, alignItems: 'center' }}>
        <AdariPortrait
          creatureKey={creature.creatureKey}
          size={120}
          evolved={evolved}
          mood="ready"
          accessibilityLabel={`${heroName}, ${stageLabel(creature.evolutionStage)}, nível ${creature.level}`}
        />
        <Text variant="heading" center>
          {heroName}
        </Text>
        {speciesName && speciesName !== heroName ? (
          <Text variant="label" color="brandTeal">
            {speciesName}
          </Text>
        ) : null}
        <Text variant="label" color="textMuted">
          Nível {creature.level} · {stageLabel(creature.evolutionStage)}
        </Text>
      </Card>

      {/* Atributos */}
      <Card style={{ gap }}>
        <SectionHeader title="Atributos" />
        <AdariStats attributes={creature.attributes} />
      </Card>

      {/* Vigor (descanso) */}
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Vigor" subtitle="Recurso de descanso — recupera com o tempo, nunca é comprado." />
        <Text variant="label" color="brandTeal">
          {creature.attributes.energy}/{creature.maxVigor}
        </Text>
        <ProgressBar
          value={creature.maxVigor > 0 ? creature.attributes.energy / creature.maxVigor : 0}
          color="brandTeal"
          accessibilityLabel={`Vigor ${creature.attributes.energy} de ${creature.maxVigor}`}
        />
        {creature.attributes.energy < creature.maxVigor ? (
          <Text variant="caption" color="textMuted">
            Cheio em aproximadamente{' '}
            {Math.max(
              1,
              Math.ceil(
                hoursUntilFullVigor({
                  currentVigor: creature.attributes.energy,
                  maxVigor: creature.maxVigor,
                  vigorRecoveryRate: creature.vigorRecoveryRate,
                  lastVigorCalculationAt: creature.lastVigorCalculationAt,
                }),
              ),
            )}
            h de descanso.
          </Text>
        ) : (
          <Text variant="caption" color="textMuted">
            Vigor completo — seu Adari está pronto para a jornada.
          </Text>
        )}
        {dailyBattle ? (
          <Text variant="label" color="textMuted">
            Vitórias recompensadas hoje: {dailyBattle.rewardedWinsToday}/{dailyBattle.winLimit}
          </Text>
        ) : null}
      </Card>

      {/* Habilidades */}
      <Card style={{ gap }}>
        <SectionHeader
          title="Habilidades"
          subtitle="Equipe até 4 habilidades para as batalhas."
        />
        <Button
          label="Ver habilidades"
          variant="secondary"
          onPress={() => router.push('/abilities')}
          accessibilityHint="Abre a tela de habilidades do seu Adari."
        />
      </Card>

      {/* Evolução */}
      {evolution ? (
        <Card style={{ gap }}>
          <SectionHeader title="Evolução" subtitle={evolved ? undefined : `Próxima forma: ${evolution.toName}`} />
          {evolved ? (
            <Text variant="body" color="success">
              Evolução concluída. Seu Adari alcançou uma nova forma.
            </Text>
          ) : (
            <>
              <Text variant="body" color="textMuted">
                {evolution.description}
              </Text>
              {evolutionCheck ? (
                <View style={{ gap: theme.spacing.sm }}>
                  {evolutionCheck.requirements.map((req) => (
                    <View
                      key={req.key}
                      style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}
                    >
                      <Text
                        variant="label"
                        color={req.met ? 'success' : 'textMuted'}
                        accessibilityLabel={req.met ? 'Concluído' : 'Pendente'}
                      >
                        {req.met ? '✓' : '○'}
                      </Text>
                      <Text
                        variant="label"
                        color={req.met ? 'text' : 'textMuted'}
                        style={{ flex: 1 }}
                      >
                        {req.label}
                        {typeof req.current === 'number' && typeof req.needed === 'number'
                          ? ` (${req.current}/${req.needed})`
                          : ''}
                      </Text>
                    </View>
                  ))}
                  {evolutionCheck.available ? (
                    <Button
                      label="Evoluir"
                      onPress={() => void handleEvolve()}
                      loading={evolving}
                      accessibilityHint="Evolui seu Adari para a próxima forma."
                    />
                  ) : (
                    <Text variant="caption" color="textMuted">
                      Continue no seu ritmo — cada passo aproxima seu Adari da próxima forma.
                    </Text>
                  )}
                </View>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      <CelestialDivider />

      {/* Campanha — trilha estelar por região */}
      {/* Conquistas */}
      <Card style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Conquistas" />
        <Text variant="body" color="textMuted">
          {defeatedAdversaries} de {totalAdversaries} adversários vencidos.
        </Text>
        <ProgressBar
          value={totalAdversaries > 0 ? defeatedAdversaries / totalAdversaries : 0}
          color="brandGold"
          accessibilityLabel={`${defeatedAdversaries} de ${totalAdversaries} adversários vencidos`}
        />
      </Card>

      <BottomSheet visible={celebrate} onClose={() => setCelebrate(false)} title="Evolução concluída!">
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <AdariPortrait
            creatureKey={creature.creatureKey}
            size={128}
            evolved
            mood="happy"
            accessibilityLabel={`${heroName} evoluído, radiante`}
          />
          <Text variant="body" center>
            Seu Adari evoluiu. A constância trouxe uma nova forma cheia de energia.
          </Text>
        </View>
        <Button label="Ver minha jornada" onPress={() => setCelebrate(false)} />
      </BottomSheet>

      <BottomSheet
        visible={Boolean(selectedChallenge)}
        onClose={() => setSelectedChallenge(null)}
        title={selectedChallenge?.adversary.name ?? 'Próximo desafio'}
      >
        {selectedChallenge ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="body" color="textMuted">{selectedChallenge.adversary.description}</Text>
            <Text variant="label" color="brandGold">
              {selectedChallenge.adversary.difficultyType === 'boss' ? 'Chefe' : selectedChallenge.adversary.difficultyType === 'elite' ? 'Elite' : 'Batalha comum'}
            </Text>
            <Text variant="body">
              Custo: {vigorCostForBattle(selectedChallenge.adversary.difficultyType === 'boss' ? 'bossPve' : selectedChallenge.adversary.difficultyType === 'elite' ? 'elitePve' : 'normalPve')} de Vigor
            </Text>
            <Text variant="body">Nível recomendado: {selectedChallenge.adversary.minLevel}–{selectedChallenge.adversary.maxLevel}</Text>
            <Text variant="body" color="textMuted">
              Mecânica: {selectedChallenge.adversary.difficultyType === 'boss'
                ? 'golpes anunciados, fases e aberturas temporárias'
                : selectedChallenge.adversary.difficultyType === 'elite'
                  ? 'defesa, recarga e uma abertura após o especial'
                  : 'ritmo de ataque com um golpe forte anunciado'}
            </Text>
            {selectedChallenge.adversary.difficultyType === 'boss' ? (
              <Text variant="label" color="brandTeal">Pista: observe quando o Guardião concentra energia.</Text>
            ) : null}
            <Text variant="body" color="textMuted">
              Vitórias PvE restantes: {dailyBattle ? Math.max(0, dailyBattle.winLimit - dailyBattle.rewardedWinsToday) : '—'}
            </Text>
            <Text variant="body" color="textMuted">
              Recompensa prevista: {dailyBattle && dailyBattle.rewardedWinsToday < dailyBattle.winLimit ? '6% do XP-base diário' : 'desafio sem XP adicional hoje'}
            </Text>
            <Button
              label={selectedChallenge.unlocked ? 'Preparar batalha' : 'Desafio bloqueado'}
              disabled={!selectedChallenge.unlocked}
              onPress={() => {
                const id = selectedChallenge.adversary.id;
                setSelectedChallenge(null);
                router.push(`/battle/${id}`);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
