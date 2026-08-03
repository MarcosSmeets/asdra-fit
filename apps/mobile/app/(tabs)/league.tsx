import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import {
  BottomSheet,
  Button,
  Card,
  CelestialDivider,
  EmptyState,
  ErrorState,
  Input,
  LeagueScoreBreakdown,
  LoadingState,
  OfflineBanner,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { ApiError, apiRequest } from '@/api/client';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { ACCOUNT_BENEFITS } from '@/constants/accountBenefits';
import { useOnline } from '@/hooks/useOnline';
import { useSessionStore } from '@/stores/sessionStore';
import { useTheme } from '@/theme/ThemeProvider';

interface LeagueListItem {
  id: string;
  name: string;
  /** Só vem preenchido para quem administra a liga. */
  inviteCode?: string | null;
  memberCount?: number;
  _count?: { members: number };
}

interface RankingRow {
  userId: string;
  position: number;
  finalScore: number;
  /** 0..1 (percentual da meta pessoal). */
  goalPercentage: number;
  displayName: string;
  creatureLevel: number | null;
  /** Campos opcionais do detalhamento — usados quando o backend os envia. */
  streakBonus?: number;
  completionBonus?: number;
  targetDays?: number;
  completedDays?: number;
}

interface RankingResponse {
  ranking: RankingRow[];
}

/** Compartilha o convite pelo share nativo, sem depender de clipboard extra. */
async function shareInvite(leagueName: string, code: string): Promise<void> {
  try {
    await Share.share({
      message: `Entre na minha liga "${leagueName}" no Asdra Fit com o código ${code}.`,
    });
  } catch {
    // Compartilhamento cancelado pelo usuário: não é erro.
  }
}

function memberCountOf(item: LeagueListItem): number | null {
  if (typeof item.memberCount === 'number') {
    return item.memberCount;
  }
  if (item._count && typeof item._count.members === 'number') {
    return item._count.members;
  }
  return null;
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

function LeagueScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const myUserId = useSessionStore((s) => s.user?.id ?? null);
  const online = useOnline();

  const [leagues, setLeagues] = useState<LeagueListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingRow[] | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);

  const [breakdownRow, setBreakdownRow] = useState<RankingRow | null>(null);

  const loadLeagues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<LeagueListItem[]>('/leagues');
      setLeagues(data);
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível carregar suas ligas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (mode === 'account' && online) {
        void loadLeagues();
      }
    }, [mode, online, loadLeagues]),
  );

  const openRanking = useCallback(
    async (id: string) => {
      if (selectedId === id) {
        setSelectedId(null);
        return;
      }
      setSelectedId(id);
      setRanking(null);
      setRankingError(null);
      setRankingLoading(true);
      try {
        const res = await apiRequest<RankingResponse>(`/leagues/${id}/ranking`);
        setRanking(res.ranking);
      } catch (e) {
        setRankingError(errorMessage(e, 'Não foi possível carregar o ranking.'));
      } finally {
        setRankingLoading(false);
      }
    },
    [selectedId],
  );

  const handleCreate = useCallback(async () => {
    const name = createName.trim();
    if (name.length < 2 || creating) {
      return;
    }
    setCreating(true);
    setActionError(null);
    try {
      await apiRequest('/leagues', { method: 'POST', body: { name } });
      setCreateName('');
      await loadLeagues();
    } catch (e) {
      setActionError(errorMessage(e, 'Não foi possível criar a liga.'));
    } finally {
      setCreating(false);
    }
  }, [createName, creating, loadLeagues]);

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim();
    if (code.length < 4 || joining) {
      return;
    }
    setJoining(true);
    setActionError(null);
    try {
      await apiRequest('/leagues/join', { method: 'POST', body: { code } });
      setJoinCode('');
      await loadLeagues();
    } catch (e) {
      setActionError(errorMessage(e, 'Convite inválido.'));
    } finally {
      setJoining(false);
    }
  }, [joinCode, joining, loadLeagues]);

  const gap = theme.spacing.md;

  // Sem conta: ligas privadas exigem conta.
  if (mode !== 'account') {
    return (
      <Screen scroll testID="league-screen">
        <SectionHeader
          title="Ligas"
          subtitle="Compare seu progresso com amigos, de forma justa e sem cobrança."
        />
        <Card style={{ gap }}>
          <Text variant="section">Ligas privadas exigem uma conta</Text>
          <Text variant="body" color="textMuted">
            {`${ACCOUNT_BENEFITS.requiresAccount} ${ACCOUNT_BENEFITS.keepsLocalProgress}`}
          </Text>
          <Button
            label="Criar conta"
            onPress={() => router.push('/(auth)/register')}
            accessibilityHint="Abre a tela de criação de conta."
          />
          <Button
            label="Já tenho conta / Entrar"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
            accessibilityHint="Abre a tela de login."
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="league-screen">
      <SectionHeader
        title="Ligas"
        subtitle="Uma competição gentil: o esforço de cada pessoa conta no seu próprio ritmo."
      />

      {online ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="section">Duelos amistosos</Text>
          <Text variant="body" color="textMuted">
            Desafie membros da sua liga em duelos rápidos e equilibrados — só diversão, sem afetar
            seu progresso.
          </Text>
          <Button
            label="Abrir duelos"
            variant="secondary"
            onPress={() => router.push('/duels')}
            accessibilityHint="Abre a tela de duelos amistosos."
          />
        </Card>
      ) : null}

      {!online ? (
        <>
          <OfflineBanner />
          <Text variant="body" color="textMuted">
            As ligas precisam de conexão com a internet. Seu progresso local continua salvo e a lista
            aparece assim que a conexão voltar.
          </Text>
        </>
      ) : (
        <>
          {/* Criar liga */}
          <Card style={{ gap }}>
            <Text variant="section">Criar liga</Text>
            <Input
              label="Nome da liga"
              value={createName}
              onChangeText={setCreateName}
              placeholder="Ex.: Amigos da corrida"
              maxLength={60}
              autoCapitalize="sentences"
            />
            <Button
              label="Criar liga"
              onPress={() => void handleCreate()}
              loading={creating}
              disabled={createName.trim().length < 2}
              accessibilityHint="Cria uma nova liga privada com esse nome."
            />
          </Card>

          {/* Entrar por código */}
          <Card style={{ gap }}>
            <Text variant="section">Entrar por código</Text>
            <Input
              label="Código de convite"
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Ex.: AB12CD"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <Button
              label="Entrar na liga"
              onPress={() => void handleJoin()}
              loading={joining}
              disabled={joinCode.trim().length < 4}
              accessibilityHint="Entra em uma liga usando um código de convite."
            />
          </Card>

          {actionError ? (
            <Text variant="label" color="error">
              {actionError}
            </Text>
          ) : null}

          {/* Minhas ligas */}
          <SectionHeader title="Minhas ligas" />
          {loading ? (
            <LoadingState label="Carregando ligas…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void loadLeagues()} />
          ) : leagues.length === 0 ? (
            <EmptyState
              title="Você ainda não está em nenhuma liga"
              description="Crie uma liga ou entre em uma usando um código de convite."
            />
          ) : (
            leagues.map((league) => {
              const count = memberCountOf(league);
              const open = selectedId === league.id;
              return (
                <Card key={league.id} style={{ gap }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="section">{league.name}</Text>
                      {count !== null ? (
                        <Text variant="caption" color="textMuted">
                          {count} {count === 1 ? 'participante' : 'participantes'}
                        </Text>
                      ) : null}
                    </View>
                    <Button
                      label={open ? 'Ocultar' : 'Ver ranking'}
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => void openRanking(league.id)}
                      accessibilityHint={`Mostra o ranking da liga ${league.name}.`}
                    />
                  </View>

                  {/* O código existe no servidor desde a criação da liga, mas não
                      era exibido em lugar nenhum — o dono era mandado convidar
                      pessoas com um código que o app nunca mostrava. */}
                  {league.inviteCode ? (
                    <View style={{ gap: theme.spacing.xs }}>
                      <Text variant="caption" color="textMuted">
                        Código de convite — compartilhe para alguém entrar
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                        }}
                      >
                        <Text
                          variant="heading"
                          color="brandGold"
                          selectable
                          accessibilityLabel={`Código de convite: ${league.inviteCode.split('').join(' ')}`}
                        >
                          {league.inviteCode}
                        </Text>
                        <Button
                          label="Compartilhar"
                          variant="secondary"
                          fullWidth={false}
                          onPress={() => void shareInvite(league.name, league.inviteCode!)}
                          accessibilityHint={`Compartilha o código de convite da liga ${league.name}.`}
                        />
                      </View>
                    </View>
                  ) : null}

                  {open ? (
                    rankingLoading ? (
                      <LoadingState label="Carregando ranking…" />
                    ) : rankingError ? (
                      <ErrorState
                        message={rankingError}
                        onRetry={() => void openRanking(league.id)}
                      />
                    ) : ranking && ranking.length > 0 ? (
                      <View style={{ gap: theme.spacing.xs }}>
                        <Text variant="caption" color="textMuted">
                          Toque no seu nome para ver como a pontuação é calculada. Apenas a primeira
                          atividade válida de cada dia conta para a liga — assim, rotinas diferentes
                          competem de forma justa.
                        </Text>
                        {ranking.map((row) => {
                          const isMe = myUserId !== null && row.userId === myUserId;
                          return (
                            <Pressable
                              key={row.userId}
                              onPress={() => setBreakdownRow(row)}
                              accessibilityRole="button"
                              accessibilityLabel={`${row.position}º lugar, ${row.displayName}${
                                isMe ? ', você' : ''
                              }, ${Math.round(row.goalPercentage * 100)} por cento, ${Math.round(
                                row.finalScore,
                              )} pontos`}
                              accessibilityHint="Abre o detalhamento da pontuação."
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: theme.spacing.sm,
                                minHeight: 44,
                                paddingVertical: theme.spacing.sm,
                                paddingHorizontal: theme.spacing.sm,
                                borderRadius: theme.radius.md,
                                borderWidth: isMe ? 1 : 0,
                                borderColor: theme.colors.brandGold,
                                backgroundColor: isMe
                                  ? theme.colors.primaryMuted
                                  : 'transparent',
                              }}
                            >
                              <Text
                                variant="section"
                                color={isMe ? 'primary' : 'textMuted'}
                                style={{ minWidth: 30 }}
                              >
                                {row.position}
                              </Text>
                              <View style={{ flex: 1, gap: 2 }}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: theme.spacing.sm,
                                  }}
                                >
                                  <Text variant="label" style={{ flexShrink: 1 }}>
                                    {row.displayName}
                                  </Text>
                                  {isMe ? (
                                    <View
                                      style={{
                                        paddingHorizontal: theme.spacing.sm,
                                        paddingVertical: 2,
                                        borderRadius: theme.radius.pill,
                                        backgroundColor: theme.colors.primary,
                                      }}
                                    >
                                      <Text variant="caption" color="onPrimary">
                                        Você
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                                {row.creatureLevel !== null ? (
                                  <Text variant="caption" color="textMuted">
                                    Nível {row.creatureLevel}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text variant="label" color="brandGold">
                                  {Math.round(row.finalScore)} pts
                                </Text>
                                <Text variant="caption" color="textMuted">
                                  {Math.round(row.goalPercentage * 100)}%
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <EmptyState
                        title="Ranking ainda vazio"
                        description="Assim que os participantes registrarem atividades nesta temporada, o ranking aparece aqui."
                      />
                    )
                  ) : null}
                </Card>
              );
            })
          )}
        </>
      )}

      <BottomSheet
        visible={breakdownRow !== null}
        onClose={() => setBreakdownRow(null)}
        title="Como esta pontuação é calculada"
      >
        {breakdownRow ? (
          <>
            <Text variant="label" color="textMuted">
              {breakdownRow.displayName}
            </Text>
            <LeagueScoreBreakdown
              targetDays={breakdownRow.targetDays ?? null}
              completedDays={breakdownRow.completedDays ?? null}
              percentage={breakdownRow.goalPercentage * 100}
              streakBonus={breakdownRow.streakBonus ?? 0}
              completionBonus={breakdownRow.completionBonus ?? 0}
              total={breakdownRow.finalScore}
            />
            <CelestialDivider />
            <Button label="Fechar" variant="ghost" onPress={() => setBreakdownRow(null)} />
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

export default function LeagueRoute(): React.ReactElement {
  if (!ONLINE_FEATURES_ENABLED) return <Redirect href="/(tabs)" />;
  return <LeagueScreen />;
}
