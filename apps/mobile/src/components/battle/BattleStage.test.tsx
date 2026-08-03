import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BattleStage } from './BattleStage';
import { battleVisualFeedbackSequence } from '../../features/battle/battleFeedback';

const base = {
  creatureKey: 'solivar',
  playerName: 'Myrin',
  enemyName: 'Espírito Errante',
  enemyRegionKey: 'r1',
  enemyIsBoss: false,
  playerStage: 0,
};

const beat = (over: Parameters<typeof battleVisualFeedbackSequence>[0][number]) =>
  battleVisualFeedbackSequence([over], 0)[0]!;

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('BattleStage — anúncio do turno', () => {
  it('diz qual habilidade o inimigo usou', () => {
    render(<BattleStage {...base} actionPhase="impact"
      feedback={beat({ round: 1, side: 'enemy', kind: 'ability',
        abilityName: 'Sopro Ácido', damage: 9, text: '9 de dano.' })} />);
    // O nome da habilidade do inimigo não existia em lugar nenhum da arena —
    // só no painel de histórico, apagado e no fim do scroll.
    expect(screen.getByText('Espírito Errante usou Sopro Ácido')).toBeTruthy();
  });

  it('anuncia também o turno do jogador', () => {
    render(<BattleStage {...base} actionPhase="attacking"
      feedback={beat({ round: 1, side: 'player', kind: 'ability',
        abilityName: 'Investida Estelar', damage: 12, text: '12 de dano.' })} />);
    expect(screen.getByText('Myrin usou Investida Estelar')).toBeTruthy();
  });

  it('descreve turnos sem dano, que antes não apareciam de forma alguma', () => {
    render(<BattleStage {...base} actionPhase="preparing"
      feedback={beat({ round: 2, side: 'enemy', kind: 'telegraph', text: 'Concentra energia.' })} />);
    expect(screen.getByText('Espírito Errante concentra energia')).toBeTruthy();
  });

  it('usa o rótulo em pt-BR na acessibilidade, não a chave interna', () => {
    render(<BattleStage {...base} actionPhase="targetReaction" />);
    // O label se propaga para o wrapper e para o sprite aninhado; o que importa é
    // que a chave interna em inglês não vaze para o leitor de tela.
    expect(screen.getAllByLabelText('Myrin, Reação ao golpe').length).toBeGreaterThan(0);
    expect(screen.queryAllByLabelText('Myrin, targetReaction')).toHaveLength(0);
  });
});
