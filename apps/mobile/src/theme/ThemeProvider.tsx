import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { buildTheme, type Theme } from './tokens';

// Build 5: identidade cósmica escura ÚNICA — o tema não segue mais o SO.
const ThemeContext = createContext<Theme>(buildTheme());
const ReducedMotionContext = createContext<boolean>(false);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const theme = buildTheme();

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
