import type { BattleEvent } from '@ad-sidera/shared';
import { battleAnnouncement, battleVisualFeedbackSequence } from './battleFeedback';

const ability = (over: Partial<BattleEvent>): BattleEvent => ({
  round: 1, side: 'player', kind: 'ability', text: 'texto', ...over,
});

describe('battleVisualFeedbackSequence', () => {
  it('mantém ação do jogador e resposta inimiga como dois beats legíveis', () => {
    const sequence = battleVisualFeedbackSequence([
      ability({ side: 'player', damage: 10, text: 'Jogador atacou.' }),
      ability({ side: 'enemy', damage: 6, rawDamage: 20, blockedDamage: 14, text: 'Guarda bloqueou.' }),
    ], 20);
    expect(sequence.map((item) => item.attacker)).toEqual(['player', 'enemy']);
    expect(sequence[1]).toMatchObject({ damage: 6, rawDamage: 20, blockedDamage: 14 });
  });

  it('usa os mesmos valores de dano bruto, bloqueado e final calculados pelo motor', () => {
    const [beat] = battleVisualFeedbackSequence([
      ability({ side: 'enemy', abilityName: 'Golpe Ressonante', rawDamage: 20, blockedDamage: 14, damage: 6 }),
    ], 3);
    expect(beat).toMatchObject({ seq: 4, attacker: 'enemy', damage: 6, rawDamage: 20, blockedDamage: 14 });
  });

  it('não inventa bloqueio quando a defesa não teve efeito', () => {
    const [beat] = battleVisualFeedbackSequence([ability({ damage: 12 })], 0);
    expect(beat).toMatchObject({ damage: 12, rawDamage: 12, blockedDamage: 0 });
  });

  // Antes, o filtro `damage > 0` fazia o turno inimigo sem dano não acontecer
  // visualmente: a tela simplesmente não mudava e parecia que nada ocorreu.
  it.each([
    ['buff', 'buff'],
    ['shield', 'shield'],
    ['heal', 'heal'],
    ['telegraph', 'telegraph'],
    ['stunned', 'stunned'],
    ['control', 'control'],
    ['debuff', 'debuff'],
  ] as const)('gera beat para turno de %s, que não causa dano', (_label, kind) => {
    const sequence = battleVisualFeedbackSequence([ability({ side: 'enemy', kind })], 0);
    expect(sequence).toHaveLength(1);
    expect(sequence[0]).toMatchObject({ attacker: 'enemy', kind, damage: 0 });
  });

  it('propaga o nome da habilidade e o texto do motor', () => {
    const [beat] = battleVisualFeedbackSequence([
      ability({ abilityName: 'Investida Estelar', text: 'Myrin usou Investida Estelar.' }),
    ], 0);
    expect(beat).toMatchObject({ abilityName: 'Investida Estelar', text: 'Myrin usou Investida Estelar.' });
  });

  it('agrupa eventos derivados no beat que os produziu, sem dobrar a duração do turno', () => {
    const sequence = battleVisualFeedbackSequence([
      ability({ side: 'enemy', abilityName: 'Sopro Ácido', damage: 8 }),
      ability({ side: 'enemy', kind: 'dot', damage: 3 }),
      ability({ side: 'player', kind: 'counter', damage: 5 }),
    ], 0);
    expect(sequence).toHaveLength(1);
    expect(sequence[0]).toMatchObject({ abilityName: 'Sopro Ácido', damage: 16 });
  });

  it('não devolve beat quando não há evento', () => {
    expect(battleVisualFeedbackSequence([], 0)).toEqual([]);
  });
});

describe('battleAnnouncement', () => {
  it('anuncia a habilidade quando o motor a nomeou', () => {
    const [beat] = battleVisualFeedbackSequence([ability({ abilityName: 'Guarda de Âmbar' })], 0);
    expect(battleAnnouncement(beat!, 'Brontu')).toBe('Brontu usou Guarda de Âmbar');
  });

  it('descreve a ação pelo tipo quando não há nome de habilidade', () => {
    const [beat] = battleVisualFeedbackSequence([ability({ kind: 'telegraph' })], 0);
    expect(battleAnnouncement(beat!, 'Espírito Errante')).toBe('Espírito Errante concentra energia');
  });

  it('cai no texto do motor, que já vem em pt-BR, quando não sabe descrever', () => {
    const [beat] = battleVisualFeedbackSequence([ability({ kind: 'ability', text: 'Nada aconteceu.' })], 0);
    expect(battleAnnouncement(beat!, 'Myrin')).toBe('Nada aconteceu.');
  });
});
