/**
 * Configuração de anúncios (MRK-C). Este módulo é PURO de propósito: não importa
 * `react-native` nem `react-native-google-mobile-ads`, para continuar rodando no
 * jest em Node e para que a escolha do unit ID seja testável sem módulo nativo.
 * A resolução que depende de `Platform`/`__DEV__` vive em `components/ads/adUnit.ts`.
 */

export type AdPlatform = 'ios' | 'android';

/**
 * Tamanho do banner. Trocar aqui muda o app inteiro — é o único ponto de
 * decisão sobre quanta tela o anúncio ocupa.
 *
 * `LARGE_ANCHORED_ADAPTIVE_BANNER` é o sucessor oficial (o `ANCHORED_ADAPTIVE_BANNER`
 * está `@deprecated` no SDK), mas é bem mais alto. `BANNER` é o 320x50 fixo de
 * sempre: menor receita por impressão, footprint mínimo.
 */
export type BannerSizeChoice = 'LARGE_ANCHORED_ADAPTIVE_BANNER' | 'BANNER';

/**
 * `BANNER` (320×50) por decisão de produto: o anúncio tem de ser discreto e não
 * atrapalhar o uso. O `LARGE_ANCHORED_ADAPTIVE_BANNER` chega a 150 dp — quase
 * 20% da tela, permanente — e comia a cena do Adari na home.
 *
 * 50 dp é o CHÃO do AdMob: não existe formato de banner mais baixo. Se um dia
 * quiser mais receita por impressão, é aqui que se troca — e a home é o que
 * precisa ser reavaliado.
 */
export const BANNER_SIZE: BannerSizeChoice = 'BANNER';

/**
 * Altura MÁXIMA em dp de cada tamanho, segundo a documentação do Google. O valor
 * exato é calculado pelo SDK nativo por aparelho e não é replicável aqui, então
 * isto é um teto para dimensionar o placeholder — o banner real pode vir menor.
 *
 * Large anchored adaptive: "entre 50 e 150 dp, nunca mais que 20% da altura em
 * retrato". BANNER: 320x50 fixo.
 * https://developers.google.com/admob/android/banner/anchored-adaptive
 */
export const BANNER_MAX_HEIGHT_DP: Record<BannerSizeChoice, number> = {
  LARGE_ANCHORED_ADAPTIVE_BANNER: 150,
  BANNER: 50,
};

/** Teto real considerando o limite de 20% da altura do aparelho. */
export function bannerMaxHeight(size: BannerSizeChoice, screenHeight: number): number {
  const cap = size === 'LARGE_ANCHORED_ADAPTIVE_BANNER' ? screenHeight * 0.2 : Infinity;
  return Math.round(Math.min(BANNER_MAX_HEIGHT_DP[size], cap));
}

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
