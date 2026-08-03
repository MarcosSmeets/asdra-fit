import React from 'react';
import { PixelButton } from './pixel/PixelButton';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** Alias legado — todo botão do app é o PixelButton do design system 32-bit. */
export function Button(props: ButtonProps): React.ReactElement {
  return <PixelButton {...props} />;
}
