import { adariMotionFor } from '../my-adari/animationCatalog';
import { approachDurationMs, BATTLE_TIMING, phaseDurations } from './battleTiming';

describe('battleTiming', () => {
  // A regressão que este arquivo existe para impedir: as fases duravam 110ms
  // enquanto a animação de ataque do Adari leva ~640ms, então ela era cortada no
  // meio e o jogador não percebia que tinha atacado.
  it.each([
    ['attack', 'attacking'],
    ['guard', 'defending'],
  ] as const)('dá ao %s tempo suficiente para a animação do Adari terminar', (intent, state) => {
    const motion = adariMotionFor(state);
    const needed = motion.anticipationMs + motion.actionMs + motion.returnMs;
    expect(approachDurationMs('player', intent)).toBeGreaterThanOrEqual(needed);
  });

  it('cobre a sequência de ataque do inimigo (4 frames a 150ms)', () => {
    expect(approachDurationMs('enemy')).toBeGreaterThanOrEqual(600);
  });

  it('deixa a reação ao golpe durar mais que a animação de dano', () => {
    const motion = adariMotionFor('takingDamage');
    const damageAnimation = motion.anticipationMs + motion.actionMs + motion.returnMs;
    expect(phaseDurations('enemy').targetReaction).toBeGreaterThanOrEqual(damageAnimation);
  });

  it('dá tempo de ler o anúncio da habilidade', () => {
    // Abaixo disto o texto pisca e o jogador não consegue ler o que aconteceu.
    expect(BATTLE_TIMING.announcementHoldMs).toBeGreaterThanOrEqual(800);
  });

  it('mantém a rodada em um ritmo perceptível sem virar espera', () => {
    const player = phaseDurations('player');
    const enemy = phaseDurations('enemy');
    const round = Object.values(player).reduce((a, b) => a + b, 0)
      + Object.values(enemy).reduce((a, b) => a + b, 0);
    expect(round).toBeGreaterThan(2000);
    expect(round).toBeLessThan(4000);
  });
});
