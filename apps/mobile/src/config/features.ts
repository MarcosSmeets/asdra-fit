/** Recursos que dependem da API ficam fora do beta fechado offline-first. */
export function onlineFeaturesEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export const ONLINE_FEATURES_ENABLED = onlineFeaturesEnabled(
  process.env.EXPO_PUBLIC_ENABLE_ONLINE_FEATURES,
);
