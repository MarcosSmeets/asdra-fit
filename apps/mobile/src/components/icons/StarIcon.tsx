import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface StarIconProps {
  size?: number;
  color: string;
  /** true = brilho de 4 pontas (sparkle); false = estrela de 5 pontas. */
  sparkle?: boolean;
}

/** Marca estelar original (SVG). Usada em divisores, emblemas e destaques. */
export function StarIcon({ size = 16, color, sparkle = true }: StarIconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {sparkle ? (
        <Path d="M12 1 L13.7 9.4 L22 12 L13.7 14.6 L12 23 L10.3 14.6 L2 12 L10.3 9.4 Z" fill={color} />
      ) : (
        <Path
          d="M12 2 L14.6 8.6 L21.7 9 L16.2 13.5 L18 20.4 L12 16.5 L6 20.4 L7.8 13.5 L2.3 9 L9.4 8.6 Z"
          fill={color}
        />
      )}
    </Svg>
  );
}
