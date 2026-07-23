import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Atlas original gerado para o MVP: avatar, Brontu, Velune e Myrin em 4 colunas.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CHARACTER_ATLAS = require('../../../assets/characters/ad-sidera-character-lineup-v1.png');

export type CharacterSpriteKind = 'avatar' | 'terravok' | 'lumora' | 'solivar';
export type CharacterSpriteMood = 'normal' | 'happy' | 'resting' | 'ready';

const COLUMN: Record<CharacterSpriteKind, number> = {
  avatar: 0,
  terravok: 1,
  lumora: 2,
  solivar: 3,
};

export interface CharacterSpriteProps {
  kind: CharacterSpriteKind;
  size: number;
  mood?: CharacterSpriteMood;
  evolved?: boolean;
  accessibilityLabel: string;
}

export function CharacterSprite({
  kind,
  size,
  mood = 'normal',
  evolved = false,
  accessibilityLabel,
}: CharacterSpriteProps): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const columnWidth = size * 0.75;
  const left = -COLUMN[kind] * columnWidth + (size - columnWidth) / 2;
  const moodTransform = mood === 'happy' ? 1.04 : mood === 'ready' ? 1.02 : mood === 'resting' ? 0.96 : 1;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.frame, { width: size, height: size }]}
    >
      {evolved ? <View style={[styles.aura, { width: size * 0.86, height: size * 0.86 }]} /> : null}
      {failed ? (
        <View style={[styles.fallback, { width: size * 0.54, height: size * 0.68 }]}>
          <View style={styles.fallbackCrest} />
          <View style={styles.fallbackBody} />
        </View>
      ) : (
        <Image
          source={CHARACTER_ATLAS}
          resizeMode="stretch"
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            left,
            top: mood === 'resting' ? size * 0.06 : 0,
            width: size * 3,
            height: size,
            transform: [{ scale: moodTransform }],
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  aura: { position: 'absolute', bottom: 0, borderRadius: 999, backgroundColor: 'rgba(232,192,112,0.2)' },
  fallback: { alignItems: 'center', justifyContent: 'flex-end' },
  fallbackCrest: { width: 18, height: 20, transform: [{ rotate: '45deg' }], backgroundColor: '#E8C070' },
  fallbackBody: { width: '72%', height: '62%', borderRadius: 12, backgroundColor: '#334A62', borderWidth: 2, borderColor: '#E8C070' },
});
