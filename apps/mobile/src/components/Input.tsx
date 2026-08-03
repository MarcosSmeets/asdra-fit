import React from 'react';
import { type TextInputProps } from 'react-native';
import { PixelInput } from './pixel/PixelForm';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/** Alias legado — todo campo de texto do app é o PixelInput (fonte sans). */
export function Input(props: InputProps): React.ReactElement {
  return <PixelInput {...props} />;
}
