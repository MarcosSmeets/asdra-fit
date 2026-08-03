import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import type { AdsConsentInterface, BannerAdProps } from 'react-native-google-mobile-ads';

/**
 * Superfície mínima da SDK que este app usa. Tipar à mão (em vez de reexportar o
 * módulo) mantém o import de tipos apagado em runtime — o `require` abaixo é o
 * ÚNICO ponto em que a lib nativa é tocada.
 */
export interface GoogleMobileAdsModule {
  BannerAd: ComponentType<BannerAdProps>;
  // Só o tamanho que o app usa. `Record<string, string>` daria `string | undefined`
  // sob `noUncheckedIndexedAccess`, e o `size` do BannerAd não aceita undefined.
  BannerAdSize: Readonly<Record<'LARGE_ANCHORED_ADAPTIVE_BANNER', string>>;
  AdsConsent: AdsConsentInterface;
  default: () => {
    initialize: () => Promise<unknown>;
    // Tipado aqui como união de literais em vez do enum `MaxAdContentRating` da
    // lib: o enum é um valor de runtime, e importá-lo anularia o carregamento
    // preguiçoso que este módulo inteiro existe para garantir.
    setRequestConfiguration: (config: {
      maxAdContentRating?: 'G' | 'PG' | 'T' | 'MA';
    }) => Promise<void>;
  };
}

/** No Expo Go (`storeClient`) nenhum módulo nativo customizado está embutido. */
export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: GoogleMobileAdsModule | null | undefined;

/**
 * Carrega a SDK de anúncios, ou devolve `null` quando ela não existe no binário.
 *
 * A checagem de Expo Go vem ANTES do `require` de propósito: no Expo Go o pacote
 * resolve normalmente em `node_modules`, mas o `TurboModuleRegistry.getEnforcing`
 * interno lança durante o import. O `try/catch` é o cinto; o `IS_EXPO_GO` é o
 * suspensório e evita pagar o custo do throw a cada abertura do app.
 */
export function loadGoogleMobileAds(): GoogleMobileAdsModule | null {
  if (cached !== undefined) return cached;
  if (IS_EXPO_GO) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
    cached = typeof mod?.BannerAd === 'function' ? mod : null;
  } catch {
    cached = null;
  }
  return cached;
}
