import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { buildTheme, type Theme } from './tokens';

// Modo claro é a experiência principal: default light; escuro só quando o SO pede.
const ThemeContext = createContext<Theme>(buildTheme('light'));
const ReducedMotionContext = createContext<boolean>(false);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const scheme = useColorScheme();
  const theme = useMemo(() => buildTheme(scheme === 'dark' ? 'dark' : 'light'), [scheme]);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReducedMotion(enabled);
        }
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <ReducedMotionContext.Provider value={reducedMotion}>
        {children}
      </ReducedMotionContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useReducedMotion(): boolean {
  return useContext(ReducedMotionContext);
}
