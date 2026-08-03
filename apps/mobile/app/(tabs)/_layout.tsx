import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { AdBanner, TAB_ICONS, type TabIconName } from '@/components';
import { ONLINE_FEATURES_ENABLED } from '@/config/features';
import { useTheme } from '@/theme/ThemeProvider';
import { useSessionStore } from '@/stores/sessionStore';

interface TabConfig {
  name: TabIconName;
  title: string;
}

const TAB_CONFIG: readonly TabConfig[] = [
  { name: 'index', title: 'Meu Adari' },
  { name: 'diary', title: 'Diário' },
  { name: 'journey', title: 'Jornada' },
  { name: 'league', title: 'Liga' },
  { name: 'profile', title: 'Perfil' },
];

/**
 * Navegação principal por abas. Ícones SVG originais (react-native-svg), rótulos
 * padronizados e cores derivadas do tema (claro/escuro). A barra respeita a área
 * segura automaticamente e o estado ativo é reforçado por cor + traço mais espesso.
 */
export default function TabsLayout(): React.ReactElement {
  const theme = useTheme();
  const { ready, progress, tutorialCompleted } = useSessionStore();

  if (ready && !progress.hasCompletedOnboarding) return <Redirect href="/onboarding" />;
  if (ready && !tutorialCompleted) return <Redirect href="/getting-started" />;

  return (
    <Tabs
      // `tabBar` customizada é a única forma de o banner ficar ENTRE o conteúdo e
      // as abas: como irmão de <Tabs> num flex column ele cairia abaixo da barra,
      // por cima do indicador de home.
      tabBar={(props: BottomTabBarProps) => (
        <View style={{ backgroundColor: theme.colors.surfaceElevated }}>
          <AdBanner placement="tabs" />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.sansMedium,
          fontSize: theme.fontSize.xs,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceElevated,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      {TAB_CONFIG.map(({ name, title }) => {
        const Icon = TAB_ICONS[name];
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              href: name === 'league' && !ONLINE_FEATURES_ENABLED ? null : undefined,
              tabBarAccessibilityLabel: title,
              tabBarIcon: ({ color, focused }) => (
                <Icon color={color} focused={focused} size={24} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
