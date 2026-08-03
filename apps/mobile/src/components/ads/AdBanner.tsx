import React, { useState } from 'react';
import { View } from 'react-native';
import { ADS_ENABLED, BANNER_SIZE } from '@/config/ads';
import { useTheme } from '../../theme/ThemeProvider';
import { AdSlotPlaceholder } from './AdSlotPlaceholder';
import { BANNER_UNIT_ID } from './adUnit';
import { loadGoogleMobileAds } from './googleMobileAds';

/** Hoje só existe um posicionamento (MRK-C). O tipo existe para o próximo não virar string solta. */
export type AdPlacement = 'tabs';

export interface AdBannerProps {
  placement: AdPlacement;
  testID?: string;
}

/**
 * Banner ancorado, único formato de anúncio do app (MRK-C). Nunca recompensado,
 * nunca intersticial. Enquanto o anúncio não carrega — ou quando não há fill — o
 * container fica com altura zero, para não deixar uma faixa vazia permanente
 * empurrando o conteúdo.
 */
export function AdBanner({ placement, testID }: AdBannerProps): React.ReactElement | null {
  const theme = useTheme();
  const [loaded, setLoaded] = useState(false);
  const ads = loadGoogleMobileAds();

  if (!ADS_ENABLED) return null;
  if (!ads) return __DEV__ ? <AdSlotPlaceholder /> : null;

  const { BannerAd, BannerAdSize } = ads;

  return (
    <View
      testID={testID ?? `ad-banner-${placement}`}
      style={{
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        // Separação do que for clicável abaixo: banner colado em botão gera
        // clique acidental, que a política do AdMob trata como tráfego inválido.
        paddingBottom: loaded ? theme.spacing.xs : 0,
        borderTopWidth: loaded ? 1 : 0,
        borderTopColor: theme.colors.border,
      }}
    >
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize[BANNER_SIZE]}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}
