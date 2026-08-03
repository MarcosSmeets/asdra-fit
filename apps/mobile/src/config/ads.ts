/**
 * Configuração de anúncios (MRK-C). Este módulo é PURO de propósito: não importa
 * `react-native` nem `react-native-google-mobile-ads`, para continuar rodando no
 * jest em Node e para que a escolha do unit ID seja testável sem módulo nativo.
 * A resolução que depende de `Platform`/`__DEV__` vive em `components/ads/adUnit.ts`.
 */

export type AdPlatform = 'ios' | 'android';

/**
 * IDs de teste públicos do Google (banner adaptativo). Clique em anúncio de teste
 * não gera tráfego inválido — é o único ID seguro fora de produção.
 */
export const GOOGLE_TEST_BANNER_UNIT_ID: Record<AdPlatform, string> = {
  android: 'ca-app-pub-3940256099942544/9214589741',
  ios: 'ca-app-pub-3940256099942544/2435281174',
};

/** Anúncios ficam desligados a menos que a flag diga explicitamente `true`. */
export function adsEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export const ADS_ENABLED = adsEnabled(process.env.EXPO_PUBLIC_ENABLE_ADS);

/**
 * À prova de falha em uma direção só: desenvolvimento, variável ausente ou valor
 * malformado caem SEMPRE no ID de teste. Anúncio real exige um valor válido num
 * build que não seja de desenvolvimento — nunca o contrário.
 *
 * O motivo é concreto: o perfil `preview` do EAS é distribuição interna. Se um
 * tester clicar num anúncio real, isso é tráfego inválido e pode suspender a
 * conta AdMob.
 */
export function resolveBannerUnitId(
  raw: string | undefined,
  platform: AdPlatform,
  isDev: boolean,
): string {
  if (isDev) return GOOGLE_TEST_BANNER_UNIT_ID[platform];
  return raw?.startsWith('ca-app-pub-') ? raw : GOOGLE_TEST_BANNER_UNIT_ID[platform];
}
