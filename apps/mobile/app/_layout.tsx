import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PixelifySans_600SemiBold,
  PixelifySans_700Bold,
} from '@expo-google-fonts/pixelify-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ONLINE_FEATURES_ENABLED } from '../src/config/features';
import { getDatabase } from '../src/db/database';
import { initializeAds } from '../src/services/adsConsentService';
import { track } from '../src/services/analyticsService';
import { startAutoSync } from '../src/sync/autoSync';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useSessionStore } from '../src/stores/sessionStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function BootstrapState({
  error,
  onRetry,
}: {
  error?: string;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 32,
            backgroundColor: '#0E1428',
          }}
        >
          {error ? (
            <>
              <Text
                accessibilityRole="alert"
                style={{ color: '#F4F1E8', fontSize: 16, textAlign: 'center' }}
              >
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={({ pressed }) => ({
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  backgroundColor: '#E4B85A',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: '#0E1428', fontSize: 16, fontWeight: '700' }}>
                  Tentar novamente
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color="#E4B85A" size="large" />
              <Text style={{ color: '#C6CBD8', fontSize: 16 }}>Preparando sua jornada…</Text>
            </>
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent({ onRetry }: { onRetry: () => void }): React.ReactElement {
  const loadSession = useSessionStore((s) => s.load);
  const [dbReady, setDbReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    PixelifySans_600SemiBold,
    PixelifySans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await getDatabase();
        await loadSession();
        if (mounted) {
          setDbReady(true);
        }
      } catch (cause) {
        if (__DEV__) console.error('[bootstrap] Falha ao iniciar o app.', cause);
        if (mounted) {
          setBootstrapError('Não foi possível preparar os dados deste dispositivo.');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadSession]);

  useEffect(() => {
    if (!dbReady) return undefined;
    void track('app_opened');
    void initializeAds();
    return ONLINE_FEATURES_ENABLED ? startAutoSync() : undefined;
  }, [dbReady]);

  if (bootstrapError || fontError) {
    return (
      <BootstrapState
        error={bootstrapError ?? 'Não foi possível carregar os recursos visuais do app.'}
        onRetry={onRetry}
      />
    );
  }

  if (!dbReady || !fontsLoaded) {
    return <BootstrapState onRetry={onRetry} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout(): React.ReactElement {
  const [attempt, setAttempt] = useState(0);
  return <RootLayoutContent key={attempt} onRetry={() => setAttempt((value) => value + 1)} />;
}
