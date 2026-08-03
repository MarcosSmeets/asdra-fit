import { Redirect, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { PixelButton, PixelPanel, Screen, Text } from '@/components';
import { ADARI_ASSET_MANIFESTS } from '@/content/adari';
import {
  clearSpriteDiagnostics,
  readSpriteDiagnostics,
  type SpriteFailure,
} from '@/features/diagnostics/spriteDiagnostics';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ENEMY_ATLAS = require('../../assets/enemies/sheets/enemy-action-atlas-v2.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FOOD_ATLAS = require('../../assets/foods/ad-sidera-food-atlas-v1.png');

interface ProbeResult {
  label: string;
  uri?: string;
  width?: number;
  height?: number;
  ok: boolean;
  error?: string;
}

/**
 * Diagnóstico de carregamento de assets. Existe para separar duas causas que
 * produzem o mesmo sintoma ("sumiram todas as imagens") e pedem correções opostas:
 * falha de transporte (o Metro não serviu) e falha de decodificação (memória).
 *
 * Se TODOS os assets falharem, é transporte. Se só os grandes falharem, é memória.
 */
export default function AssetDiagnostics(): React.ReactElement {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);
  const [failures, setFailures] = useState<SpriteFailure[]>(readSpriteDiagnostics().failures);

  const probe = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const targets = buildTargets();
    const collected: ProbeResult[] = [];
    for (const target of targets) {
      const resolved = safeResolve(target.source);
      try {
        if (!resolved?.uri) throw new Error('sem URI resolvida');
        await Image.prefetch(resolved.uri);
        collected.push({
          label: target.label,
          uri: resolved.uri,
          width: resolved.width,
          height: resolved.height,
          ok: true,
        });
      } catch (error) {
        collected.push({
          label: target.label,
          uri: resolved?.uri,
          width: resolved?.width,
          height: resolved?.height,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      setResults([...collected]);
    }
    setRunning(false);
  }, []);

  if (!__DEV__) return <Redirect href="/(tabs)" />;

  const failed = results.filter((item) => !item.ok);
  const verdict = results.length === 0
    ? null
    : failed.length === 0
      ? 'Todos os assets carregaram. O transporte está saudável neste momento.'
      : failed.length === results.length
        ? 'TODOS falharam → transporte (Metro/túnel não está servindo os assets).'
        : `${failed.length} de ${results.length} falharam. Se forem só os maiores, suspeite de memória.`;

  return (
    <Screen scroll testID="asset-diagnostics">
      <Stack.Screen options={{ headerShown: true, title: 'Diagnóstico de assets' }} />
      <Text variant="title">Diagnóstico de assets</Text>
      <Text variant="body" color="textMuted">
        Rota apenas de desenvolvimento. Rode o teste no momento em que as imagens sumirem — é o
        resultado dele que diz se a causa é rede ou memória.
      </Text>

      <View style={styles.controls}>
        <PixelButton label={running ? 'Testando…' : 'Testar carga de todos os atlas'}
          variant="primary" fullWidth={false} onPress={() => void probe()} />
        <PixelButton label="Limpar log" variant="secondary" fullWidth={false}
          onPress={() => { clearSpriteDiagnostics(); setFailures([]); }} />
        <PixelButton label="Atualizar log" variant="secondary" fullWidth={false}
          onPress={() => setFailures(readSpriteDiagnostics().failures)} />
      </View>

      {verdict ? (
        <PixelPanel variant="surface" padding={10}>
          <Text variant="hud" color={failed.length > 0 ? 'error' : 'brandGold'}>{verdict}</Text>
        </PixelPanel>
      ) : null}

      {results.length > 0 ? (
        <PixelPanel variant="surface" padding={10}>
          <Text variant="heading">Resultado do teste</Text>
          {results.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text variant="caption" color={item.ok ? 'brandTeal' : 'error'}>
                {item.ok ? 'ok' : 'FALHOU'} · {item.label}
                {item.width ? ` · ${item.width}×${item.height}` : ''}
              </Text>
              {item.uri ? <Text variant="caption" color="textMuted">{item.uri}</Text> : null}
              {item.error ? <Text variant="caption" color="error">{item.error}</Text> : null}
            </View>
          ))}
        </PixelPanel>
      ) : null}

      <PixelPanel variant="surface" padding={10}>
        <Text variant="heading">Falhas registradas ({failures.length})</Text>
        {failures.length === 0 ? (
          <Text variant="caption" color="textMuted">Nenhuma falha de sprite desde que o app abriu.</Text>
        ) : (
          failures.slice().reverse().map((item, index) => (
            <View key={`${item.at}-${index}`} style={styles.row}>
              <Text variant="caption" color="error">
                {item.tag ?? item.sourceKey} · tentativa {item.attempt}
              </Text>
              {item.error ? <Text variant="caption" color="textMuted">{item.error}</Text> : null}
              {item.uri ? <Text variant="caption" color="textMuted">{item.uri}</Text> : null}
            </View>
          ))
        )}
      </PixelPanel>
    </Screen>
  );
}

function buildTargets(): { label: string; source: number }[] {
  const targets: { label: string; source: number }[] = [];
  const seen = new Set<number>();
  const push = (label: string, source: number): void => {
    if (typeof source !== 'number' || seen.has(source)) return;
    seen.add(source);
    targets.push({ label, source });
  };
  for (const manifest of Object.values(ADARI_ASSET_MANIFESTS)) {
    push(`${manifest.key} atlas`, manifest.atlas.source as number);
    push(`${manifest.key} retrato`, manifest.portrait as number);
    push(`${manifest.key} silhueta`, manifest.silhouette as number);
  }
  push('inimigos atlas', ENEMY_ATLAS);
  push('comidas atlas', FOOD_ATLAS);
  return targets;
}

function safeResolve(source: number): { uri?: string; width?: number; height?: number } | undefined {
  try {
    return Image.resolveAssetSource(source);
  } catch {
    return undefined;
  }
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { gap: 2, paddingVertical: 4 },
});
