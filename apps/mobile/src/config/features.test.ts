import { onlineFeaturesEnabled } from './features';

describe('onlineFeaturesEnabled', () => {
  it('mantem recursos online desligados por padrao', () => {
    expect(onlineFeaturesEnabled(undefined)).toBe(false);
    expect(onlineFeaturesEnabled('false')).toBe(false);
  });

  it('exige ativacao explicita', () => {
    expect(onlineFeaturesEnabled('true')).toBe(true);
    expect(onlineFeaturesEnabled('TRUE')).toBe(false);
  });
});
