import { Platform } from 'react-native';
import { ADS_ENABLED } from '@/config/ads';
import { loadGoogleMobileAds } from '@/components/ads/googleMobileAds';

/**
 * Consentimento de anúncios (MRK-C). O formulário UMP do Google é quem governa
 * a personalização: com consentimento negado a própria SDK passa a servir
 * anúncio não personalizado, então NÃO forçamos `requestNonPersonalizedAdsOnly`
 * por fora — isso mascararia a escolha real do usuário.
 *
 * Nada aqui lança: anúncio é receita, não funcionalidade. Se o consentimento
 * falhar, o app segue normalmente e o banner simplesmente não preenche.
 */

/** Roda uma vez na abertura: coleta consentimento, pede ATT no iOS e inicializa a SDK. */
export async function initializeAds(): Promise<void> {
  if (!ADS_ENABLED) return;
  const ads = loadGoogleMobileAds();
  if (!ads) return;

  try {
    await ads.AdsConsent.gatherConsent();
  } catch {
    // Sem informação de consentimento, o caminho seguro é o menos invasivo.
    try {
      await ads.default().setRequestConfiguration({ maxAdContentRating: 'PG' });
      await ads.default().initialize();
    } catch {
      /* SDK indisponível: o banner simplesmente não aparece. */
    }
    return;
  }

  // O prompt de rastreamento da Apple vem DEPOIS do formulário UMP, como a
  // própria orientação do Google pede. No Android é um no-op.
  if (Platform.OS === 'ios') {
    try {
      // Carregado por `require` pelo mesmo motivo da SDK de anúncios: o módulo
      // nativo não existe no Expo Go e o import estático quebraria a abertura.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tracking = require('expo-tracking-transparency') as {
        requestTrackingPermissionsAsync: () => Promise<unknown>;
      };
      await tracking.requestTrackingPermissionsAsync();
    } catch {
      /* Sem ATT o anúncio continua servindo, só não personalizado. */
    }
  }

  try {
    // A configuração precisa vir antes do initialize: anúncios podem começar a
    // ser pré-carregados já dentro dele.
    await ads.default().setRequestConfiguration({ maxAdContentRating: 'PG' });
    await ads.default().initialize();
  } catch {
    /* SDK indisponível: o banner simplesmente não aparece. */
  }
}

/** `true` quando o usuário precisa ter acesso ao formulário de opções de privacidade. */
export async function arePrivacyOptionsRequired(): Promise<boolean> {
  if (!ADS_ENABLED) return false;
  const ads = loadGoogleMobileAds();
  if (!ads) return false;
  try {
    const info = await ads.AdsConsent.getConsentInfo();
    // Comparado como string para não precisar importar o enum, que é valor de runtime.
    return String(info.privacyOptionsRequirementStatus) === 'REQUIRED';
  } catch {
    return false;
  }
}

/** Reabre o formulário do UMP para o usuário mudar de ideia. */
export async function showAdsPrivacyOptions(): Promise<void> {
  const ads = loadGoogleMobileAds();
  if (!ads) return;
  try {
    await ads.AdsConsent.showPrivacyOptionsForm();
  } catch {
    /* Formulário indisponível: nada a fazer além de não quebrar a tela. */
  }
}
