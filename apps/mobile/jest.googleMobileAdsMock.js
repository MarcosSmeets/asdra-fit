/**
 * Stub da SDK de anúncios para o jest. Mapeado por `moduleNameMapper` (e não por
 * um diretório `__mocks__/`), porque `roots` está restrito a `<rootDir>/src` e um
 * mock de node_modules não seria aplicado automaticamente.
 */
const React = require('react');

const mobileAds = () => ({
  initialize: jest.fn().mockResolvedValue([]),
  setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
});

module.exports = {
  __esModule: true,
  default: mobileAds,
  MobileAds: mobileAds,
  BannerAd: (props) => React.createElement('BannerAd', props),
  BannerAdSize: {
    BANNER: 'BANNER',
    LARGE_ANCHORED_ADAPTIVE_BANNER: 'LARGE_ANCHORED_ADAPTIVE_BANNER',
  },
  AdsConsent: {
    gatherConsent: jest.fn().mockResolvedValue({ canRequestAds: true }),
    getConsentInfo: jest
      .fn()
      .mockResolvedValue({ privacyOptionsRequirementStatus: 'NOT_REQUIRED' }),
    showPrivacyOptionsForm: jest.fn().mockResolvedValue({}),
  },
  TestIds: { ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741' },
};
