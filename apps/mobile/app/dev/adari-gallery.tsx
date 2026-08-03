import { Redirect, Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AdariActionSprite } from '@/components/adari/AdariActionSprite';
import { PixelButton, PixelPanel, Screen, Text } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

const LINES = [
  { key: 'terravok', name: 'Brontu' },
  { key: 'lumora', name: 'Velune' },
  { key: 'solivar', name: 'Myrin' },
] as const;

const STAGES = ['Base', 'EV 1', 'EV 2', 'Perfeita'] as const;
const POSES = ['Idle', 'Idle alt.', 'Carinho', 'Comendo', 'Descanso', 'Pronto', 'Ataque', 'Dano'] as const;

export default function AdariGallery(): React.ReactElement {
  const theme = useTheme();
  const [lightBackground, setLightBackground] = useState(false);
  if (!__DEV__) return <Redirect href="/(tabs)" />;

  const previewBackground = lightBackground ? theme.colors.text : theme.colors.background;
  const previewLabelColor = lightBackground ? theme.colors.background : theme.colors.textMuted;

  return (
    <Screen scroll testID="adari-gallery">
      <Stack.Screen options={{ headerShown: true, title: 'Galeria dos Adaris' }} />
      <Text variant="title">Galeria dos Adaris</Text>
      <Text variant="body" color="textMuted">
        Revisao direta dos 12 estagios e das oito colunas do atlas. Rota disponivel somente em desenvolvimento.
      </Text>
      <View style={styles.controls}>
        <PixelButton label="Fundo escuro" variant={!lightBackground ? 'primary' : 'secondary'}
          fullWidth={false} onPress={() => setLightBackground(false)} />
        <PixelButton label="Fundo claro" variant={lightBackground ? 'primary' : 'secondary'}
          fullWidth={false} onPress={() => setLightBackground(true)} />
      </View>

      {LINES.map((line) => (
        <View key={line.key} style={styles.line}>
          <Text variant="heading">{line.name}</Text>
          {STAGES.map((stage, stageIndex) => (
            <PixelPanel key={stage} variant="surface" padding={10}>
              <Text variant="hud" color="brandGold">{stage}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.poseRow}>
                {POSES.map((pose, column) => (
                  <View key={pose} style={[styles.pose, { backgroundColor: previewBackground }]}>
                    <AdariActionSprite creatureKey={line.key} stage={stageIndex} state="idle"
                      frame={column} size={88} reduceMotion accessibilityLabel={`${line.name}, ${stage}, ${pose}`} />
                    <Text variant="caption" style={{ color: previewLabelColor }}>{pose}</Text>
                  </View>
                ))}
              </ScrollView>
            </PixelPanel>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  line: { gap: 10 },
  poseRow: { gap: 8, paddingVertical: 4 },
  pose: { width: 104, minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 },
});
