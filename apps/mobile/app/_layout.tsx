import { Cormorant_600SemiBold, Cormorant_700Bold } from '@expo-google-fonts/cormorant';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDatabase } from '../src/db/database';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useSessionStore } from '../src/stores/sessionStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout(): React.ReactElement | null {
  const loadSession = useSessionStore((s) => s.load);
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Cormorant_600SemiBold,
    Cormorant_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await getDatabase();
      await loadSession();
      if (mounted) {
        setDbReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadSession]);

  if (!dbReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
