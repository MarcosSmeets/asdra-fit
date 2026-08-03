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
 * `BANNER` (320×50) por decisão de produto, validada no aparelho pelo dono em
 * 2026-08-03: o anúncio tem de ser discreto e não atrapalhar ninguém. O
 * `LARGE_ANCHORED_ADAPTIVE_BANNER` chega a 150 dp — quase 20% da tela, de forma
 * permanente — e comia a cena do Adari na home.
 *
 * 50 dp é o CHÃO do AdMob: não existe formato de banner mais baixo. Trocar isto
 * por um formato maior é REABRIR a decisão de produto, não ajustar layout — o
 * teste em `ads.test.ts` fixa o valor justamente para a mudança ser deliberada.
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

/**
 * Altura fixa do slot. O anúncio é centralizado dentro dela e o container tem
 * `overflow: hidden`, então a barra tem sempre a mesma altura e o conteúdo não
 * dá pulo quando o anúncio carrega.
 *
 * INVARIANTE: precisa ser >= à altura do formato escolhido. A política do Google
 * proíbe conteúdo do publisher obscurecer, mesmo parcialmente, um anúncio — um
 * slot menor que o anúncio o cortaria e é motivo de suspensão da conta. O teste
 * em `ads.test.ts` falha se alguém aumentar BANNER_SIZE sem mexer aqui.
 * https://support.google.com/publisherpolicies/answer/11191353
 */
export const AD_SLOT_HEIGHT = 56;

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
