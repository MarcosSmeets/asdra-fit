import { adsEnabled, GOOGLE_TEST_BANNER_UNIT_ID, resolveBannerUnitId } from './ads';

const REAL_UNIT = 'ca-app-pub-1234567890123456/1234567890';

describe('adsEnabled', () => {
  it('só liga com a string exata "true"', () => {
    expect(adsEnabled('true')).toBe(true);
  });

  it.each(['false', 'True', '1', '', undefined])('mantém desligado para %p', (value) => {
    expect(adsEnabled(value)).toBe(false);
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
