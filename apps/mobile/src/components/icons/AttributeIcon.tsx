import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type AttributeIconKey =
  | 'strength'
  | 'endurance'
  | 'agility'
  | 'discipline'
  | 'recovery'
  | 'spirit'
  | 'health'
  | 'energy';

const PATHS: Record<AttributeIconKey, string> = {
  strength: 'M12 3 L21 20 L3 20 Z',
  agility: 'M13 2 L4 14 L11 14 L9 22 L20 9 L13 9 Z',
  discipline: 'M12 2 L20 5 V11 C20 16 16 20 12 22 C8 20 4 16 4 11 V5 Z',
  recovery: 'M17 4 A8 8 0 1 0 17 20 A6 6 0 1 1 17 4 Z',
  spirit: 'M12 2 L14.6 8.6 L21.7 9 L16.2 13.5 L18 20.4 L12 16.5 L6 20.4 L7.8 13.5 L2.3 9 L9.4 8.6 Z',
  health: 'M12 21 C5 15 3 11.5 3 8.5 A4.5 4.5 0 0 1 12 6.2 A4.5 4.5 0 0 1 21 8.5 C21 11.5 19 15 12 21 Z',
  energy: 'M12 2 C12 2 5 10 5 15 A7 7 0 0 0 19 15 C19 10 12 2 12 2 Z',
  endurance: '',
};

/** Ícone SVG original por atributo. */
export function AttributeIcon({
  attribute,
  size = 18,
  color,
}: {
  attribute: AttributeIconKey;
  size?: number;
  color: string;
}): React.ReactElement {
  if (attribute === 'endurance') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Circle cx="8" cy="12" r="4.5" stroke={color} strokeWidth={2} fill="none" />
        <Circle cx="16" cy="12" r="4.5" stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d={PATHS[attribute]} fill={color} />
    </Svg>
  );
}
