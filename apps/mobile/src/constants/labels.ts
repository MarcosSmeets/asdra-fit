import type { ActivityType, Goal, Intensity, Mood } from '@ad-sidera/shared';

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  musculacao: 'Musculação',
  corrida: 'Corrida',
  caminhada: 'Caminhada',
  ciclismo: 'Ciclismo',
  natacao: 'Natação',
  esporte_coletivo: 'Esporte coletivo',
  funcional: 'Treino funcional',
  mobilidade: 'Mobilidade',
  outro: 'Outro',
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  intensa: 'Intensa',
};

export const MOOD_LABELS: Record<Mood, string> = {
  pessimo: 'Péssimo',
  ruim: 'Ruim',
  neutro: 'Neutro',
  bom: 'Bom',
  otimo: 'Ótimo',
};

export const GOAL_LABELS: Record<Goal, string> = {
  constancia: 'Criar constância',
  forca: 'Ganhar força',
  resistencia: 'Melhorar resistência',
  energia: 'Ter mais energia',
  retomar: 'Voltar a me exercitar',
  esporte: 'Praticar um esporte',
  outro: 'Outro',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  7: 'Dom',
};

export const ATTRIBUTE_LABELS: Record<string, string> = {
  strength: 'Força',
  endurance: 'Resistência',
  agility: 'Agilidade',
  discipline: 'Disciplina',
  recovery: 'Recuperação',
  spirit: 'Espírito',
  health: 'Vida',
  energy: 'Energia',
};
