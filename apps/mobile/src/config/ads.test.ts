import {
  AD_SLOT_HEIGHT,
  adsEnabled,
  BANNER_MAX_HEIGHT_DP,
  BANNER_SIZE,
  GOOGLE_TEST_BANNER_UNIT_ID,
  resolveBannerUnitId,
} from './ads';

const REAL_UNIT = 'ca-app-pub-1234567890123456/1234567890';

describe('adsEnabled', () => {
  it('só liga com a string exata "true"', () => {
    expect(adsEnabled('true')).toBe(true);
  });

  it.each(['false', 'True', '1', '', undefined])('mantém desligado para %p', (value) => {
    expect(adsEnabled(value)).toBe(false);
  });
});

describe('tamanho do anúncio', () => {
  // Estes dois números NÃO são detalhe de implementação: o dono validou o
  // banner no aparelho e definiu que tem de ser exatamente este tamanho
  // (MRK-C). Aumentar significa reabrir a decisão de produto, não ajustar
  // layout — por isso o valor está fixado aqui e não só no módulo.
  it('mantém o menor formato do AdMob', () => {
    expect(BANNER_SIZE).toBe('BANNER');
    expect(BANNER_MAX_HEIGHT_DP[BANNER_SIZE]).toBe(50);
  });

  it('mantém o slot em 56 dp', () => {
    expect(AD_SLOT_HEIGHT).toBe(56);
  });

  // O slot tem overflow:hidden. Se ficar menor que o anúncio, o corte é uma
  // violação de política ("conteúdo obscurecendo anúncio") que pode suspender a
  // conta AdMob. Este teste é o que impede alguém de aumentar BANNER_SIZE sem
  // perceber que o slot precisa crescer junto.
  it('nunca corta o anúncio do formato escolhido', () => {
    expect(AD_SLOT_HEIGHT).toBeGreaterThanOrEqual(BANNER_MAX_HEIGHT_DP[BANNER_SIZE]);
  });
});

describe('resolveBannerUnitId', () => {
  it('usa o unit ID real em build de produção', () => {
    expect(resolveBannerUnitId(REAL_UNIT, 'android', false)).toBe(REAL_UNIT);
    expect(resolveBannerUnitId(REAL_UNIT, 'ios', false)).toBe(REAL_UNIT);
  });

  it('ignora o unit ID real em desenvolvimento', () => {
    expect(resolveBannerUnitId(REAL_UNIT, 'android', true)).toBe(
      GOOGLE_TEST_BANNER_UNIT_ID.android,
    );
    expect(resolveBannerUnitId(REAL_UNIT, 'ios', true)).toBe(GOOGLE_TEST_BANNER_UNIT_ID.ios);
  });

  // O perfil `preview` do EAS não define as variáveis: um valor ausente NUNCA
  // pode virar anúncio real, senão testadores geram tráfego inválido.
  it.each([undefined, '', 'minha-unit', 'ca-app-pub'])(
    'cai no ID de teste quando o valor é %p',
    (raw) => {
      expect(resolveBannerUnitId(raw, 'android', false)).toBe(GOOGLE_TEST_BANNER_UNIT_ID.android);
    },
  );

  it('não confunde as plataformas', () => {
    expect(GOOGLE_TEST_BANNER_UNIT_ID.android).not.toBe(GOOGLE_TEST_BANNER_UNIT_ID.ios);
  });
});
