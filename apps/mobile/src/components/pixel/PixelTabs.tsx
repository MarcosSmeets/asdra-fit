import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { PixelFrame } from './PixelFrame';

export interface PixelTabItem<T extends string> {
  value: T;
  label: string;
}

export interface PixelTabsProps<T extends string> {
  items: readonly PixelTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Abas segmentadas com moldura pixel (filtros e alternância de painéis). */
export function PixelTabs<T extends string>({ items, value, onChange }: PixelTabsProps<T>): React.ReactElement {
  const theme = useTheme();
  return (
    <PixelFrame fill={theme.colors.surfaceAlt} padding={theme.pixelUnit}>
      <View style={{ flexDirection: 'row', gap: theme.pixelUnit }}>
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <Pressable
              key={item.value}
              onPress={() => onChange(item.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              style={{
                flex: 1,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? theme.colors.primary : 'transparent',
              }}
            >
              <Text variant="hud" color={selected ? 'onPrimary' : 'textMuted'}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </PixelFrame>
  );
}
