import { Platform } from 'react-native';
import { resolveBannerUnitId, type AdPlatform } from '@/config/ads';

const PLATFORM: AdPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * O Babel do Expo faz inline estático de `process.env.EXPO_PUBLIC_*`, então cada
 * variável precisa aparecer como member expression literal. `process.env[chave]`
 * não é substituído e chegaria `undefined` no bundle.
 */
const RAW_UNIT_ID =
  PLATFORM === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;

export const BANNER_UNIT_ID = resolveBannerUnitId(RAW_UNIT_ID, PLATFORM, __DEV__);
