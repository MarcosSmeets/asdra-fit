import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, CelestialDivider, Screen, SectionHeader, Text } from '@/components';
import {
  getLocalInsights,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  type LocalInsights,
} from '@/services/analyticsService';
import { wipeAllLocalData } from '@/services/privacyService';
import {
  arePrivacyOptionsRequired,
  showAdsPrivacyOptions,
} from '@/services/adsConsentService';
import { useTheme } from '@/theme/ThemeProvider';
import { ADS_ENABLED } from '@/config/ads';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { SUPPORT } from '@ad-sidera/config';

export default function PrivacySettings(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [insights, setInsights] = useState<LocalInsights | null>(null);
  const [privacyOptionsAvailable, setPrivacyOptionsAvailable] = useState(false);

  useEffect(() => {
    void (async () => {
      const enabled = await isAnalyticsEnabled();
      setAnalyticsOn(enabled);
      if (enabled) setInsights(await getLocalInsights());
      setPrivacyOptionsAvailable(await arePrivacyOptionsRequired());
    })();
  }, []);

  const toggleAnalytics = useCallback(async () => {
    const next = !analyticsOn;
    await setAnalyticsEnabled(next);
    setAnalyticsOn(next);
    setInsights(next ? await getLocalInsights() : null);
  }, [analyticsOn]);

  const performReset = async (): Promise<void> => {
    setWorking(true);
    try {
      await wipeAllLocalData();
      router.replace('/intro');
    } catch {
      setWorking(false);
      Alert.alert(
        'Não foi possível apagar tudo',
        'Algo interrompeu a remoção dos dados. Tente novamente; nenhum dado novo foi criado.',
      );
    }
  };

  const confirmReset = (): void => {
    Alert.alert(
      'Apagar dados locais?',
      ONLINE_FEATURES_ENABLED
        ? 'Isso remove permanentemente deste dispositivo: atividades, fotos privadas, seu Adari, progresso e a sessão salva. Esta ação não pode ser desfeita. Contas e ligas no servidor não são afetadas.'
        : 'Isso remove permanentemente atividades, fotos privadas, seu Adari e todo o progresso deste dispositivo. O beta não possui backup; esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: () => {
            void performReset();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: 'Privacidade' }} />
      <SectionHeader
        title="Privacidade"
        subtitle="Como cuidamos dos seus dados — com o controle nas suas mãos."
      />

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Suas fotos são só suas</Text>
        <Text variant="body" color="textMuted">
          As fotos dos seus registros são privadas e ficam apenas neste dispositivo. Elas nunca são
          enviadas para nossos servidores.
        </Text>
      </Card>

      {ADS_ENABLED ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="section">Anúncios que mantêm o app gratuito</Text>
          <Text variant="body" color="textMuted">
            O app exibe um único banner acima das abas. Nunca há anúncio em tela cheia, na
            abertura, nem em troca de recompensa — nada no jogo se compra assistindo anúncio.
          </Text>
          <Text variant="body" color="textMuted">
            Para isso, o Google AdMob pode usar o identificador de publicidade do seu aparelho.
            Suas fotos, treinos, metas e dados do seu Adari nunca são enviados para a rede de
            anúncios. Não vendemos seus dados.
          </Text>
          <Text variant="caption" color="textMuted">
            Você pode redefinir ou limitar esse identificador nas configurações do próprio
            aparelho.
          </Text>
          {privacyOptionsAvailable ? (
            <Button
              label="Opções de anúncios"
              variant="secondary"
              onPress={() => void showAdsPrivacyOptions()}
              accessibilityHint="Reabre o formulário de consentimento de anúncios."
            />
          ) : null}
        </Card>
      ) : (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="section">Seus dados não são vendidos</Text>
          <Text variant="body" color="textMuted">
            Não vendemos nem compartilhamos seus dados com terceiros para publicidade.
          </Text>
        </Card>
      )}

      {ONLINE_FEATURES_ENABLED ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="section">Sincronização mínima</Text>
          <Text variant="body" color="textMuted">
            Se você usar uma conta, a sincronização envia apenas metadados — como a contagem de
            atividades e o seu progresso. As fotos nunca saem do dispositivo.
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="section">Dados apenas neste dispositivo</Text>
          <Text variant="body" color="textMuted">
            Este beta não possui conta nem backup. Desinstalar o aplicativo ou apagar os dados do
            sistema remove permanentemente seu progresso e suas fotos privadas.
          </Text>
        </Card>
      )}

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">LGPD</Text>
        <Text variant="body" color="textMuted">
          Tratamos seus dados seguindo os princípios da LGPD: finalidade clara, coleta mínima e
          controle nas suas mãos.
        </Text>
        {ADS_ENABLED ? (
          <Text variant="body" color="textMuted">
            A base legal para o identificador de publicidade é o legítimo interesse quando os
            anúncios não são personalizados, e o seu consentimento quando são.
          </Text>
        ) : null}
        <Text variant="caption" color="textMuted">
          Dúvidas ou pedidos sobre seus dados: {SUPPORT.PRIVACY_CONTACT}
        </Text>
      </Card>

      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="section">Insights locais (opcional)</Text>
        <Text variant="body" color="textMuted">
          Quando ativado, o app conta seus próprios usos — dias ativos, atividades, batalhas —
          somente neste dispositivo. Nada é enviado a servidores. Desativar apaga o histórico.
        </Text>
        <Button
          label={analyticsOn ? 'Insights locais: ativados' : 'Insights locais: desativados'}
          variant="secondary"
          onPress={() => void toggleAnalytics()}
          accessibilityHint="Ativa ou desativa a contagem local de uso do app."
        />
        {analyticsOn && insights ? (
          <Text variant="caption" color="textMuted">
            Últimos 30 dias: {insights.activeDays30} dias ativos · {insights.activities30}{' '}
            atividades · {insights.battles30} batalhas · {insights.appOpens30} aberturas do app
          </Text>
        ) : null}
      </Card>

      {/* Ação destrutiva isolada, separada das seções informativas. */}
      <CelestialDivider />

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader
          title="Apagar dados locais"
          subtitle="Recomeçar do zero neste dispositivo."
        />
        <Button
          label="Apagar dados locais"
          variant="danger"
          onPress={confirmReset}
          loading={working}
          disabled={working}
        />
      </View>
    </Screen>
  );
}
