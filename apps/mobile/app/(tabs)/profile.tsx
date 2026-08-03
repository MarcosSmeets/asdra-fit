import { getCreatureByKey } from '@ad-sidera/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  AdariPortrait,
  Button,
  Card,
  CelestialDivider,
  Screen,
  SectionHeader,
  SyncStatus,
  Text,
} from '@/components';
import { BRAND, companionDisplayName } from '@/constants/brand';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { useOnline } from '@/hooks/useOnline';
import { useGameStore } from '@/stores/gameStore';
import { useSessionStore } from '@/stores/sessionStore';
import { flushOutbox, syncSnapshot, type SyncSnapshot } from '@/sync/syncEngine';
import { useTheme } from '@/theme/ThemeProvider';
import { ApiError } from '@/api/client';

function NavRow({
  label,
  description,
  onPress,
  accessibilityHint,
}: {
  label: string;
  description?: string;
  onPress: () => void;
  accessibilityHint?: string;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: 48,
        paddingVertical: theme.spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{label}</Text>
        {description ? (
          <Text variant="caption" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>
      <Text
        variant="heading"
        color="textMuted"
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        ›
      </Text>
    </Pressable>
  );
}

function RowDivider(): React.ReactElement {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}

function StatBlock({ value, label }: { value: string; label: string }): React.ReactElement {
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="section" color="brandGold">
        {value}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const online = useOnline();

  const creature = useGameStore((s) => s.creature);
  const streak = useGameStore((s) => s.streak);
  const mode = useSessionStore((s) => s.mode);
  const signOut = useSessionStore((s) => s.signOut);

  const [pending, setPending] = useState(0);
  const [syncInfo, setSyncInfo] = useState<SyncSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    const snapshot = await syncSnapshot(mode);
    setSyncInfo(snapshot);
    setPending(snapshot.pending);
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await useGameStore.getState().load();
        if (mode === 'account') {
          await refreshPending();
        }
      })();
    }, [mode, refreshPending]),
  );

  const onSync = useCallback(async () => {
    if (syncing) {
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      await flushOutbox();
      await refreshPending();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível sincronizar agora.';
      setSyncError(message);
      if (cause instanceof ApiError && cause.status === 401) {
        await signOut();
        router.push('/(auth)/login');
        return;
      }
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPending, router, signOut]);

  const onSignOut = useCallback(async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } finally {
      setSigningOut(false);
    }
  }, [signingOut, signOut, router]);

  const adariName = companionDisplayName(
    creature ? (creature.nickname ?? getCreatureByKey(creature.creatureKey)?.name) : null,
  );

  return (
    <Screen scroll>
      <Text variant="title">Perfil</Text>

      {/* Jornada */}
      <SectionHeader title="Jornada" subtitle="Seu Adari e sua constância" />
      <Card>
        {creature ? (
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              <AdariPortrait
                creatureKey={creature.creatureKey}
                size={72}
                stage={creature.evolutionStage}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="section">{adariName}</Text>
                <Text variant="label" color="textMuted">
                  {`Nível ${creature.level}`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <StatBlock value={String(streak?.bestStreak ?? 0)} label="Melhor sequência" />
              <StatBlock value={String(streak?.completedWeeks ?? 0)} label="Semanas concluídas" />
            </View>
          </View>
        ) : (
          <Text variant="body" color="textMuted">
            Sua jornada aparece aqui assim que seu Adari despertar.
          </Text>
        )}
      </Card>

      <CelestialDivider />

      {/* Hábitos */}
      <SectionHeader title="Hábitos" subtitle="Sua meta semanal e seus lembretes" />
      <Card>
        <NavRow
          label="Meta semanal"
          description="Atividades, tipos e dias preferenciais"
          onPress={() => router.push('/settings/goal')}
          accessibilityHint="Abre os ajustes da meta semanal."
        />
        <RowDivider />
        <NavRow
          label="Lembretes"
          description="Notificações gentis, só neste dispositivo"
          onPress={() => router.push('/settings/notifications')}
          accessibilityHint="Abre os ajustes de notificações."
        />
        <RowDivider />
        <NavRow
          label="Como jogar"
          description="Treino, progresso, cuidado, Jornada e evolução"
          onPress={() => router.push({ pathname: '/getting-started', params: { replay: '1' } })}
          accessibilityHint="Revê o guia inicial sem alterar seu progresso."
        />
      </Card>

      <CelestialDivider />

      {/* Privacidade */}
      <SectionHeader title="Privacidade" subtitle="Seus dados no seu controle" />
      <Card>
        <NavRow
          label="Privacidade e dados"
          description="Fotos, LGPD e apagar dados locais"
          onPress={() => router.push('/settings/privacy')}
          accessibilityHint="Abre as configurações de privacidade."
        />
        <RowDivider />
        <NavRow
          label={`Sobre o ${BRAND.appName}`}
          description="Missão, versão e conteúdo original"
          onPress={() => router.push('/settings/about')}
          accessibilityHint="Abre a tela sobre o app."
        />
      </Card>

      {ONLINE_FEATURES_ENABLED ? (
        <>
          <CelestialDivider />

          {/* Conta e sincronização */}
          <SectionHeader title="Conta e sincronização" />
          <Card>
            <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}
          >
            <Text variant="label">{mode === 'account' ? 'Modo: Conta' : 'Modo: Local'}</Text>
            <SyncStatus mode={mode} online={online} pending={pending} />
          </View>

          {mode === 'account' ? (
            <>
            <Button
              label="Sincronizar"
              variant="ghost"
              loading={syncing}
              disabled={!online}
              onPress={() => void onSync()}
              accessibilityHint="Envia as alterações pendentes para sua conta."
            />
            {syncInfo ? (
              <Text variant="caption" color={syncInfo.lastError ? 'warning' : 'textMuted'}>
                {syncing
                  ? 'Sincronizando alterações salvas neste dispositivo…'
                  : syncInfo.lastError
                    ? 'Seu progresso continua salvo neste dispositivo. Tentaremos novamente quando a conexão permitir.'
                    : pending > 0
                      ? `${pending} alterações salvas neste dispositivo. Sincronizamos automaticamente ao reconectar ou reabrir o app.`
                      : `Tudo sincronizado${syncInfo.lastAttemptAt ? ` · última tentativa ${new Date(syncInfo.lastAttemptAt).toLocaleString('pt-BR')}` : ''}.`}
              </Text>
            ) : null}
            {syncError ? <Text variant="caption" color="warning" accessibilityLiveRegion="polite">{syncError}</Text> : null}
            </>
          ) : (
            <>
              <Text variant="body" color="textMuted">
                Converta seu perfil local em uma conta para entrar em ligas e fazer backup do seu
                progresso. Todos os seus dados atuais são mantidos — nada é perdido.
              </Text>
              <Button
                label="Converter perfil local em conta"
                onPress={() => router.push('/(auth)/register')}
                accessibilityHint="Abre a criação de conta mantendo seu progresso local."
              />
            </>
          )}
            </View>
          </Card>

          {/* Ação destrutiva isolada, separada das ações comuns. */}
          {mode === 'account' ? (
            <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
              <CelestialDivider />
              <Button
                label="Sair"
                variant="danger"
                loading={signingOut}
                onPress={() => void onSignOut()}
                accessibilityHint="Encerra a sessão da sua conta neste dispositivo."
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
