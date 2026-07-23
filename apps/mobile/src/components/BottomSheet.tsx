import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps): React.ReactElement {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}
        onPress={onClose}
        accessibilityLabel="Fechar"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.border,
            }}
          />
          {title ? <Text variant="heading">{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
