import React from 'react';
import { PixelProgressBar, type PixelBarColor } from './pixel/PixelBars';

export interface ProgressBarProps {
  /** 0..1 (valores acima de 1 são exibidos cheios). */
  value: number;
  color?: PixelBarColor;
  height?: number;
  accessibilityLabel?: string;
}

/** Alias legado — toda barra do app é a PixelProgressBar (HUD 32-bit). */
export function ProgressBar(props: ProgressBarProps): React.ReactElement {
  return <PixelProgressBar {...props} />;
}
