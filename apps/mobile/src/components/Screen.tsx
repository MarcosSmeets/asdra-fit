import React from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  contentStyle,
  testID,
}: ScreenProps): React.ReactElement {
  const theme = useTheme();
  const padding = padded ? theme.spacing.lg : 0;
  const base: ViewStyle = { flex: 1, backgroundColor: theme.colors.background };

  return (
    <SafeAreaView style={base} edges={edges} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding, gap: theme.spacing.lg }, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding, gap: theme.spacing.lg }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
