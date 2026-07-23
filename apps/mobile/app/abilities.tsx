import type { AbilitySlot, AbilityType } from '@ad-sidera/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, ErrorState, LoadingState, Screen, Text } from '@/components';
import { companionDisplayName } from '@/constants/brand';
import {
  getAbilitiesState,
  setEquippedAbilities,
  type AbilitiesState,
  type AbilityView,
} from '@/services/abilityService';
import { useTheme } from '@/theme/ThemeProvider';

const SLOT_LABEL: Record<AbilitySlot, string> = {
  basicAttack: 'Ataque básico',
  basicDefense: 'Defesa básica',
  special: 'Especial',
  tactical: 'Tática',
};

const TYPE_LABEL: Record<AbilityType, string> = {
  damage: 'Dano',
  defense: 'Defesa',
  shield: 'Escudo',
  heal: 'Cura',
  buff: 'Reforço',
  debuff: 'Enfraquecer',
  control: 'Controle',
  counter: 'Contra-ataque',
  damageOverTime: 'Dano contínuo',
  cooldownReduction: 'Reduz recarga',
};

function cooldownLabel(cooldown: number): string {
  if (cooldown <= 0) {
    return 'Sem recarga';
  }
  return `Recarga: ${cooldown} ${cooldown === 1 ? 'turno' : 'turnos'}`;
}

export default function AbilitiesScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();

  const [state, setState] = useState<AbilitiesState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAbilitiesState();
      setState(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const persist = useCallback(async (ids: string[]) => {
    setSaving(true);
    setMessage(null);
    try {
      const next = await setEquippedAbilities(ids);
      setState(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }, []);

  const equipped = useMemo(() => state?.equippedIds ?? [], [state]);

  const toggle = useCallback(
    (id: string, isEquipped: boolean) => {
      const next = isEquipped ? equipped.filter((x) => x !== id) : [...equipped, id];
      void persist(next);
    },
    [equipped, persist],
  );

  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = equipped.indexOf(id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= equipped.length) {
        return;
      }
      const next = [...equipped];
      const a = next[idx];
      const b = next[target];
      if (a === undefined || b === undefined) {
        return;
      }
      next[idx] = b;
      next[target] = a;
      void persist(next);
    },
    [equipped, persist],
  );

  if (loading && !state) {
    return (
      <Screen>
        <LoadingState label="Carregando habilidades…" />
      </Screen>
    );
  }

  if (!state) {
    return (
      <Screen>
        <ErrorState
          message="Seu Adari ainda não está pronto."
          onRetry={() => router.back()}
        />
      </Screen>
    );
  }

  const name = companionDisplayName(state.creatureName);

  return (
    <Screen scroll testID="abilities-screen">
      <Text variant="title">Habilidades de {name}</Text>
      <Text variant="body" color="textMuted">
        Equipe até 4 habilidades. O ataque básico fica sempre equipado e você precisa de ao menos
        uma defesa. Em batalha, cada habilidade tem sua própria recarga — sem custo de energia.
      </Text>

      {message ? (
        <Card style={{ borderColor: theme.colors.error, gap: theme.spacing.xs }}>
          <Text variant="label" color="error">
            {message}
          </Text>
        </Card>
      ) : null}

      {state.abilities.map((view) => (
        <AbilityRow
          key={view.ability.id}
          view={view}
          equippedCount={equipped.length}
          saving={saving}
          onToggle={toggle}
          onMove={move}
        />
      ))}

      <Button
        label="Voltar à jornada"
        variant="ghost"
        onPress={() => router.back()}
        accessibilityHint="Volta para a tela anterior."
      />
    </Screen>
  );
}

function AbilityRow({
  view,
  equippedCount,
  saving,
  onToggle,
  onMove,
}: {
  view: AbilityView;
  equippedCount: number;
  saving: boolean;
  onToggle: (id: string, isEquipped: boolean) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}): React.ReactElement {
  const theme = useTheme();
  const { ability, unlocked, equipped, equippedOrder } = view;
  const atMax = equippedCount >= 4;

  return (
    <Card style={{ gap: theme.spacing.sm, opacity: unlocked ? 1 : 0.55 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="heading">{ability.name}</Text>
        {equipped ? (
          <Text variant="label" color="brandGold">
            Equipada {equippedOrder}
          </Text>
        ) : null}
      </View>

      <Text variant="body" color="textMuted">
        {ability.description}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Chip label={SLOT_LABEL[ability.slot]} />
        <Chip label={TYPE_LABEL[ability.type]} />
        <Chip label={cooldownLabel(ability.cooldown)} />
      </View>

      {!unlocked ? (
        <Text variant="label" color="textMuted">
          Desbloqueia no nível {ability.unlockLevel}.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Button
              label={equipped ? 'Desequipar' : 'Equipar'}
              variant={equipped ? 'ghost' : 'primary'}
              disabled={saving || (!equipped && atMax)}
              onPress={() => onToggle(ability.id, equipped)}
              accessibilityHint={
                equipped ? 'Remove esta habilidade do conjunto.' : 'Adiciona esta habilidade ao conjunto.'
              }
            />
          </View>
          {equipped ? (
            <>
              <Button
                label="↑"
                variant="secondary"
                fullWidth={false}
                disabled={saving}
                onPress={() => onMove(ability.id, -1)}
                accessibilityHint="Move a habilidade para cima na ordem."
              />
              <Button
                label="↓"
                variant="secondary"
                fullWidth={false}
                disabled={saving}
                onPress={() => onMove(ability.id, 1)}
                accessibilityHint="Move a habilidade para baixo na ordem."
              />
            </>
          ) : null}
        </View>
      )}
    </Card>
  );
}
