export interface GettingStartedStep {
  key: 'train' | 'progress' | 'care' | 'evolve';
  eyebrow: string;
  title: string;
  description: string;
  details: readonly string[];
}

export const GETTING_STARTED_STEPS: readonly GettingStartedStep[] = [
  {
    key: 'train',
    eyebrow: 'PASSO 1',
    title: 'Treine no mundo real',
    description: 'Registre no Diário as atividades que você realmente fez.',
    details: [
      'Cada atividade válida concede XP ao seu Adari.',
      'A primeira atividade válida do dia também avança sua meta semanal.',
    ],
  },
  {
    key: 'progress',
    eyebrow: 'PASSO 2',
    title: 'XP e treino viram progresso',
    description: 'XP aumenta o nível; cada tipo de atividade treina atributos diferentes.',
    details: [
      'Força, resistência, agilidade, disciplina, recuperação e espírito crescem com constância.',
      'O Diário mostra o histórico e o progresso de cada treino.',
    ],
  },
  {
    key: 'care',
    eyebrow: 'PASSO 3',
    title: 'Cuide e siga pela Jornada',
    description: 'No Meu Adari, carinho e alimento fortalecem o Vínculo.',
    details: [
      'Na Jornada, batalhas testam suas habilidades e liberam novos caminhos.',
      'Vitórias importantes podem fazer parte dos requisitos de uma evolução.',
    ],
  },
  {
    key: 'evolve',
    eyebrow: 'PASSO 4',
    title: 'Evolução exige constância',
    description: 'Treinar é indispensável: batalha sozinha não faz um Adari evoluir.',
    details: [
      'A Linha Evolutiva mostra os requisitos reais da próxima forma.',
      'Eles podem combinar nível, atividades, metas semanais, Vínculo, atributos e marcos da Jornada.',
    ],
  },
] as const;

export function isGettingStartedReplay(value: string | string[] | undefined): boolean {
  return value === '1' || value === 'true';
}
