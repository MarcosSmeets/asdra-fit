import {
  getAdariBehaviorProfile,
  type AdariBehaviorState,
  type WorldPosition,
} from '@ad-sidera/shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { AdariPortrait } from '../../components/adari/AdariPortrait';
import { CharacterSprite } from '../../components/characters/CharacterSprite';
import { Text } from '../../components/Text';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { cameraFor, screenToWorld, type CameraState } from './camera';
import { distance, moveTowards, nearestWalkable } from './geometry';
import { updateAdariFollow, type FollowState } from './follow';
import { nearestInteractionTarget } from './interaction';
import { replaceMovementCommand } from './movement';
import type { ObservatoryRuntimeState } from './runtime';
import {
  INTERACTIVE_OBJECTS,
  OBSERVATORY_WORLD,
  type InteractiveObject,
} from './world';

// Metro resolve assets estáticos por `require`; não há import ESM equivalente tipado no RN.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ROOM_SOURCE = require('../../../assets/observatory/backgrounds/observatory-room-v1.png');

export type AvatarDirection = 'front' | 'back' | 'left' | 'right';
export type AvatarState = 'idle' | 'walking' | 'interacting' | 'petting' | 'feeding' | 'observing';

export interface ObservatorySceneProps {
  creatureKey: string;
  evolved: boolean;
  initialPlayerPosition: WorldPosition;
  movementSpeed: number;
  particlesEnabled: boolean;
  reduceMotion: boolean;
  adariState: AdariBehaviorState;
  active: boolean;
  onRuntimeStateChange: (state: ObservatoryRuntimeState) => void;
  onTargetChange: (target: InteractiveObject | null) => void;
  onPlayerSettled: (position: WorldPosition) => void;
  onDirectInteract: (target: InteractiveObject) => void;
}

function directionBetween(from: WorldPosition, to: WorldPosition): AvatarDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'back' : 'front';
}

function PlayerAvatar({ direction, state }: { direction: AvatarDirection; state: AvatarState }) {
  return (
    <View style={{ transform: [{ scaleX: direction === 'left' ? -1 : 1 }] }}>
      <CharacterSprite
        kind="avatar"
        size={78}
        mood={state === 'walking' ? 'ready' : 'normal'}
        accessibilityLabel={`Avatar do Explorador, ${state === 'walking' ? 'caminhando' : 'parado'}`}
      />
    </View>
  );
}

const PARTICLES: readonly WorldPosition[] = [
  { x: 575, y: 330 }, { x: 615, y: 390 }, { x: 544, y: 405 },
  { x: 360, y: 470 }, { x: 415, y: 520 }, { x: 270, y: 565 },
];

/**
 * O loop abaixo mantém posições, câmera e seguimento fora do estado React.
 * React só recebe mudanças semânticas (início/fim da caminhada, direção e alvo).
 */
export function ObservatoryScene({
  creatureKey,
  evolved,
  initialPlayerPosition,
  movementSpeed,
  particlesEnabled,
  reduceMotion,
  adariState,
  active,
  onRuntimeStateChange,
  onTargetChange,
  onPlayerSettled,
  onDirectInteract,
}: ObservatorySceneProps): React.ReactElement {
  const theme = useTheme();
  const osReducedMotion = useReducedMotion();
  const shouldReduceMotion = reduceMotion || osReducedMotion;
  const profile = useMemo(() => getAdariBehaviorProfile(creatureKey), [creatureKey]);
  const [viewport, setViewport] = useState({ width: 360, height: 620 });
  const [direction, setDirection] = useState<AvatarDirection>('front');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [adariVisual, setAdariVisual] = useState({ shouldReappear: false, moving: false });
  const [depthOrder, setDepthOrder] = useState({ player: Math.round(initialPlayerPosition.y / 24), adari: Math.round(OBSERVATORY_WORLD.adariStartPosition.y / 24) });
  const [invalidTap, setInvalidTap] = useState<WorldPosition | null>(null);

  const initialPlayer = nearestWalkable(initialPlayerPosition);
  const initialAdari: FollowState = {
    position: { ...OBSERVATORY_WORLD.adariStartPosition },
    stuckForMs: 0,
    shouldReappear: false,
    moving: false,
  };
  const playerRef = useRef(initialPlayer);
  const adariRef = useRef(initialAdari);
  const pathRef = useRef<WorldPosition[]>([]);
  const movementCommandIdRef = useRef(0);
  const targetRef = useRef<InteractiveObject | null>(null);
  const cameraRef = useRef<CameraState>(
    cameraFor(initialPlayer, viewport.width, viewport.height, undefined, shouldReduceMotion),
  );
  const playerScreen = useRef(new Animated.ValueXY()).current;
  const adariScreen = useRef(new Animated.ValueXY()).current;
  const cameraOffset = useRef(new Animated.ValueXY()).current;
  const onTargetChangeRef = useRef(onTargetChange);
  const onPlayerSettledRef = useRef(onPlayerSettled);
  const onRuntimeStateChangeRef = useRef(onRuntimeStateChange);
  const onDirectInteractRef = useRef(onDirectInteract);
  const directionRef = useRef(direction);
  const depthOrderRef = useRef(depthOrder);

  useEffect(() => { onTargetChangeRef.current = onTargetChange; }, [onTargetChange]);
  useEffect(() => { onPlayerSettledRef.current = onPlayerSettled; }, [onPlayerSettled]);
  useEffect(() => { onRuntimeStateChangeRef.current = onRuntimeStateChange; }, [onRuntimeStateChange]);
  useEffect(() => { onDirectInteractRef.current = onDirectInteract; }, [onDirectInteract]);

  const updateVisualPositions = useCallback((player: WorldPosition, adari: WorldPosition, camera: CameraState) => {
    const scale = camera.scale;
    cameraOffset.setValue({ x: -camera.x * scale, y: -camera.y * scale });
    playerScreen.setValue({ x: (player.x - camera.x) * scale, y: (player.y - camera.y) * scale });
    adariScreen.setValue({ x: (adari.x - camera.x) * scale, y: (adari.y - camera.y) * scale });
  }, [adariScreen, cameraOffset, playerScreen]);

  useEffect(() => {
    const nextCamera = cameraFor(
      playerRef.current,
      viewport.width,
      viewport.height,
      undefined,
      shouldReduceMotion,
    );
    cameraRef.current = nextCamera;
    updateVisualPositions(playerRef.current, adariRef.current.position, nextCamera);
  }, [shouldReduceMotion, updateVisualPositions, viewport.height, viewport.width]);

  useEffect(() => {
    if (!active) return undefined;
    let frame = 0;
    let previous = Date.now();
    let settled = pathRef.current.length === 0;
    const tick = () => {
      const now = Date.now();
      const elapsedMs = Math.min(80, now - previous);
      previous = now;
      let nextPlayer = playerRef.current;
      const waypoint = pathRef.current[0];
      if (waypoint) {
        settled = false;
        nextPlayer = moveTowards(nextPlayer, waypoint, 132 * movementSpeed * (elapsedMs / 1000));
        if (distance(nextPlayer, waypoint) < 2) {
          nextPlayer = waypoint;
          pathRef.current.shift();
          const nextWaypoint = pathRef.current[0];
          if (nextWaypoint) {
            const nextDirection = directionBetween(nextPlayer, nextWaypoint);
            if (nextDirection !== directionRef.current) {
              directionRef.current = nextDirection;
              setDirection(nextDirection);
            }
          }
        }
        playerRef.current = nextPlayer;
        if (pathRef.current.length === 0 && !settled) {
          settled = true;
          setAvatarState('idle');
          onRuntimeStateChangeRef.current({ type: 'ready' });
          onPlayerSettledRef.current(nearestWalkable(nextPlayer));
        }
      }

      const nextAdari = updateAdariFollow(adariRef.current, nextPlayer, profile, elapsedMs);
      const previousAdariVisual = adariRef.current;
      adariRef.current = nextAdari;
      if (
        nextAdari.shouldReappear !== previousAdariVisual.shouldReappear ||
        nextAdari.moving !== previousAdariVisual.moving
      ) {
        setAdariVisual({ shouldReappear: nextAdari.shouldReappear, moving: nextAdari.moving });
      }
      const nextCamera = cameraFor(
        nextPlayer,
        viewport.width,
        viewport.height,
        cameraRef.current,
        shouldReduceMotion,
      );
      cameraRef.current = nextCamera;
      updateVisualPositions(nextPlayer, nextAdari.position, nextCamera);
      const nextDepth = { player: Math.round(nextPlayer.y / 24), adari: Math.round(nextAdari.position.y / 24) };
      if (depthOrderRef.current.player !== nextDepth.player || depthOrderRef.current.adari !== nextDepth.adari) {
        depthOrderRef.current = nextDepth;
        setDepthOrder(nextDepth);
      }

      const dynamicAdariTarget: InteractiveObject = {
        id: 'active-adari', type: 'adari', position: nextAdari.position,
        interactionRadius: 82, label: 'Fazer carinho', description: 'Interagir com seu Adari.', enabled: true,
      };
      const target = nearestInteractionTarget(nextPlayer, [...INTERACTIVE_OBJECTS, dynamicAdariTarget]);
      if (target?.id !== targetRef.current?.id) {
        targetRef.current = target;
        onTargetChangeRef.current(target);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, movementSpeed, profile, shouldReduceMotion, updateVisualPositions, viewport.height, viewport.width]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  }, []);

  const moveToScreenPoint = useCallback((screenPoint: WorldPosition) => {
    const worldPoint = screenToWorld(screenPoint, cameraRef.current);
    const adariTarget: InteractiveObject = {
      id: 'active-adari', type: 'adari', position: adariRef.current.position,
      interactionRadius: 82, label: 'Fazer carinho', description: 'Interagir com seu Adari.', enabled: true,
    };
    const targets = [...INTERACTIVE_OBJECTS, adariTarget];
    const directTarget = targets.find((target) => distance(target.position, worldPoint) <= 44);
    if (directTarget && distance(playerRef.current, directTarget.position) <= directTarget.interactionRadius) {
      pathRef.current = [];
      setAvatarState('idle');
      onDirectInteractRef.current(directTarget);
      return;
    }
    const destination = directTarget ? nearestWalkable(directTarget.position) : worldPoint;
    const command = replaceMovementCommand(movementCommandIdRef.current, playerRef.current, destination);
    movementCommandIdRef.current = command.commandId;
    pathRef.current = command.path;
    if (command.path.length === 0) {
      setInvalidTap(screenPoint);
      setTimeout(() => setInvalidTap(null), 420);
      return;
    }
    const nextDirection = directionBetween(playerRef.current, command.path[0]!);
    directionRef.current = nextDirection;
    setDirection(nextDirection);
    setAvatarState('walking');
    onRuntimeStateChangeRef.current({ type: 'walking', destination: command.destination });
  }, []);

  const scale = cameraRef.current.scale;
  const adariMood = adariState === 'sleeping' || adariState === 'resting' ? 'resting' : 'normal';
  const animatedWorldLeft = (x: number) => Animated.add(cameraOffset.x, x * scale);
  const animatedWorldTop = (y: number) => Animated.add(cameraOffset.y, y * scale);

  return (
    <Pressable
      style={[styles.viewport, { backgroundColor: theme.colors.backgroundSecondary }]}
      onLayout={onLayout}
      onPress={(event) => moveToScreenPoint({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY })}
      accessibilityRole="image"
      accessibilityLabel="Observatório explorável. Toque no chão para caminhar."
      accessibilityHint="Use também a lista de locais no menu para acessar todas as ações."
    >
      <Animated.Image
        source={ROOM_SOURCE}
        resizeMode="stretch"
        accessible={false}
        style={{
          position: 'absolute', left: cameraOffset.x, top: cameraOffset.y,
          width: OBSERVATORY_WORLD.width * scale, height: OBSERVATORY_WORLD.height * scale,
        }}
      />
      <View pointerEvents="none" style={styles.depthShade} />
      {INTERACTIVE_OBJECTS.map((object) => (
        <Animated.View
          pointerEvents="none"
          key={object.id}
          style={[
            styles.interactionGlow,
            { left: animatedWorldLeft(object.position.x - 12 / scale), top: animatedWorldTop(object.position.y - 6 / scale) },
            {
              opacity: targetRef.current?.id === object.id ? 0.75 : 0.16,
              borderColor: object.type === 'journey_portal' ? '#E8C070' : '#8ED0C4',
            },
          ]}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[styles.entity, { left: Animated.subtract(playerScreen.x, 47), top: Animated.subtract(playerScreen.y, 92), zIndex: depthOrder.player, transform: [{ scale }] }]}
      >
        <PlayerAvatar direction={direction} state={avatarState} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.entity,
          {
            left: Animated.subtract(adariScreen.x, 47), top: Animated.subtract(adariScreen.y, 92),
            opacity: adariVisual.shouldReappear ? 0.58 : 1, zIndex: depthOrder.adari, transform: [{ scale }],
          },
        ]}
      >
        {adariVisual.shouldReappear ? <View style={styles.reappearAura} /> : null}
        <AdariPortrait creatureKey={creatureKey} size={92} evolved={evolved} mood={adariMood} />
      </Animated.View>
      {particlesEnabled ? PARTICLES.map((particle, index) => (
        <Animated.View
          pointerEvents="none"
          key={`${particle.x}-${particle.y}`}
          style={[
            styles.particle,
            { left: animatedWorldLeft(particle.x), top: animatedWorldTop(particle.y), opacity: 0.35 + (index % 3) * 0.18 },
          ]}
        />
      )) : null}
      {invalidTap ? <View pointerEvents="none" style={[styles.invalidTap, { left: invalidTap.x - 10, top: invalidTap.y - 10 }]} /> : null}
      {avatarState === 'walking' ? (
        <View pointerEvents="none" style={styles.movementHint}><Text variant="caption" style={{ color: '#FFFDF8' }}>Caminhando…</Text></View>
      ) : null}
      {__DEV__ ? (
        <View pointerEvents="none" style={styles.debugPanel}>
          <Text variant="caption" style={{ color: '#FFFDF8' }}>
            {Math.round(playerRef.current.x)},{Math.round(playerRef.current.y)} · caminho {pathRef.current.length} · adari {adariVisual.moving ? 'seguindo' : 'idle'}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  depthShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 8, 20, 0.05)' },
  entity: { position: 'absolute', width: 94, height: 98 },
  interactionGlow: { position: 'absolute', width: 24, height: 12, borderWidth: 2, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  particle: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFE9A9' },
  reappearAura: { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: '#DCCBFF', opacity: 0.45 },
  invalidTap: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E8C070', backgroundColor: 'rgba(232,192,112,0.2)' },
  movementHint: { position: 'absolute', left: 12, bottom: 12, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(7,18,38,0.72)' },
  debugPanel: { position: 'absolute', right: 8, top: 8, maxWidth: 230, borderRadius: 8, padding: 6, backgroundColor: 'rgba(2,8,20,0.72)' },
});
