import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorState, LoadingState, Screen, SectionHeader, Text } from '@/components';
import { ApiError } from '@/api/client';
import {
  challengeDuel,
  getDuelHistory,
  getDuelOpponents,
  type DuelOpponent,
  type DuelResult,
  type DuelSummary,
} from '@/services/duelService';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme/ThemeProvider';

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError || e instanceof Error) {
    return e.message || fallback;
  }
  return fallback;
}

function resultLabel(result: DuelSummary['result']): string {
  return result === 'win' ? 'Vitória' : result === 'loss' ? 'Derrota' : 'Empate';
}

export default function DuelsScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const reloadGame = useGameStore((s) => s.load);

  const [opponents, setOpponents] = useState<DuelOpponent[] | null>(null);
  const [history, setHistory] = useState<DuelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DuelResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [opps, hist] = await Promise.all([getDuelOpponents(), getDuelHistory()]);
      setOpponents(opps);
      setHistory(hist);
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível carregar os duelos. Verifique sua conexão.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const challenge = useCallback(
    async (opponent: DuelOpponent) => {
      setChallenging(opponent.userId);
      setMessage(null);
      setLastResult(null);
      try {
        const { result } = await challengeDuel(opponent.userId);
        setLastResult(result);
        // Atualiza o Vigor exibido no restante do app.
        await reloadGame();
        await load();
      } catch (e) {
        setMessage(errorMessage(e, 'Não foi possível iniciar o duelo.'));
      } finally {
        setChallenging(null);
      }
    },
    [reloadGame, load],
  );

  if (loading && !opponents) {
    return (
      <Screen>
        <LoadingState label="Carregando duelos…" />
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

  const gap = theme.spacing.md;

  return (
    <Screen scroll testID="duels-screen">
      <SectionHeader
        title="Duelos amistosos"
        subtitle="Desafie membros da sua liga. Equilibrado por padrão, só por diversão — sem XP nem efeito no seu progresso."
      />

      {message ? (
        <Card style={{ borderColor: theme.colors.error, gap: theme.spacing.xs }}>
          <Text variant="label" color="error">
            {message}
          </Text>
        </Card>
      ) : null}

      {/* Resultado do último duelo */}
      {lastResult ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text
            variant="heading"
            color={lastResult.winner === 'challenger' ? 'success' : lastResult.winner === 'draw' ? 'text' : 'textMuted'}
          >
            {lastResult.winner === 'challenger'
              ? 'Você venceu!'
              : lastResult.winner === 'draw'
                ? 'Empate!'
                : `${lastResult.opponentName} venceu`}
          </Text>
          <Text variant="body" color="textMuted">
            Duelo equilibrado em {lastResult.rounds} rodadas. Custou {lastResult.vigorSpent} de Vigor.
          </Text>
          <Text variant="caption" color="textMuted">
            Sua Vida: {lastResult.challengerHealth} · {lastResult.opponentName}:{' '}
            {lastResult.opponentHealth}
          </Text>
        </Card>
      ) : null}

      {/* Oponentes */}
      <Card style={{ gap }}>
        <Text variant="section">Membros da liga</Text>
        {opponents && opponents.length > 0 ? (
          opponents.map((opp) => (
            <View
              key={opp.userId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="label">{opp.displayName}</Text>
                <Text variant="caption" color="textMuted">
                  {opp.creatureLevel ? `Nível ${opp.creatureLevel}` : 'Adari pronto'}
                </Text>
              </View>
              <Button
                label="Desafiar"
                variant="secondary"
                fullWidth={false}
                loading={challenging === opp.userId}
                disabled={challenging !== null}
                onPress={() => void challenge(opp)}
                accessibilityHint={`Desafia ${opp.displayName} para um duelo amistoso.`}
              />
            </View>
          ))
        ) : (
          <Text variant="body" color="textMuted">
            Nenhum membro de liga disponível ainda. Convide amigos para a sua liga e desafie-os aqui.
          </Text>
        )}
      </Card>

      {/* Histórico */}
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Histórico</Text>
        {history.length === 0 ? (
          <Text variant="body" color="textMuted">
            Seus duelos aparecerão aqui.
          </Text>
        ) : (
          history.map((duel) => (
            <View
              key={duel.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}
            >
              <Text variant="label" style={{ flex: 1 }}>
                {duel.role === 'challenger' ? 'Você × ' : 'Desafiado por '}
                {duel.opponentName}
              </Text>
              <Text
                variant="label"
                color={duel.result === 'win' ? 'success' : duel.result === 'loss' ? 'textMuted' : 'text'}
              >
                {resultLabel(duel.result)}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Button
        label="Voltar"
        variant="ghost"
        onPress={() => router.back()}
        accessibilityHint="Volta para a tela anterior."
      />
    </Screen>
  );
}
