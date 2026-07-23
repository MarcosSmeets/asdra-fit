import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export interface TabIconProps {
  size?: number;
  color: string;
  focused?: boolean;
}

/** Espessura do traço: um pouco maior quando ativo (pista não dependente só de cor). */
function strokeFor(focused?: boolean): number {
  return focused ? 2.4 : 1.8;
}

/** Início — casa. */
export function HomeIcon({ size = 24, color, focused }: TabIconProps): React.ReactElement {
  const sw = strokeFor(focused);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 11.2 L12 4 L20.5 11.2"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 9.8 V20 H18.5 V9.8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.8 20 V14.2 H14.2 V20"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Diário — livro aberto. */
export function DiaryIcon({ size = 24, color, focused }: TabIconProps): React.ReactElement {
  const sw = strokeFor(focused);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 5.5 A1.5 1.5 0 0 1 8 4 H17.5 V17.5 H8 A1.5 1.5 0 0 0 6.5 19 Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 19 A1.5 1.5 0 0 1 8 17.5 H17.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.8 8.5 H14.6" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M9.8 11.4 H14.6" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

/** Jornada — bússola. */
export function CompassIcon({ size = 24, color, focused }: TabIconProps): React.ReactElement {
  const sw = strokeFor(focused);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.4" stroke={color} strokeWidth={sw} />
      <Path
        d="M12 7.6 L13.7 12 L12 16.4 L10.3 12 Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
      />
      <Circle cx="12" cy="12" r="1.1" fill={color} />
    </Svg>
  );
}

/** Liga — troféu. */
export function TrophyIcon({ size = 24, color, focused }: TabIconProps): React.ReactElement {
  const sw = strokeFor(focused);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.5 4 H16.5 V7.5 A4.5 4.5 0 0 1 7.5 7.5 Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.6 5 H5 V6.6 A3.2 3.2 0 0 0 8.4 9.8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16.4 5 H19 V6.6 A3.2 3.2 0 0 1 15.6 9.8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 11.8 V16" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M10.8 16 H13.2 L14 20 H10 Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Perfil — pessoa. */
export function PersonIcon({ size = 24, color, focused }: TabIconProps): React.ReactElement {
  const sw = strokeFor(focused);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.5" r="3.7" stroke={color} strokeWidth={sw} />
      <Path
        d="M5.5 19.5 A6.5 6.5 0 0 1 18.5 19.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Mapa de ícones por nome de rota da barra de abas. */
export const TAB_ICONS = {
  index: HomeIcon,
  diary: DiaryIcon,
  journey: CompassIcon,
  league: TrophyIcon,
  profile: PersonIcon,
} as const;

export type TabIconName = keyof typeof TAB_ICONS;
