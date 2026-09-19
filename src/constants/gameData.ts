export interface RankingUser {
  position: number;
  name: string;
  stars: number;
  badge: string;
  avatarMood: 'happy' | 'neutral' | 'tired';
  isUser?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  rewardStars: number;
  progress: number; // de 0 a 1
  completed: boolean;
  icon: string;
}

export const STATIC_RANKING: RankingUser[] = [
  { position: 1, name: 'Léo Aventureiro', stars: 140, badge: '🥇', avatarMood: 'happy' },
  { position: 2, name: 'Sofia Sorrisos', stars: 115, badge: '🥈', avatarMood: 'happy' },
  { position: 3, name: 'Tu (Jogador)', stars: 95, badge: '🥉', avatarMood: 'happy', isUser: true },
  { position: 4, name: 'Pedro Relâmpago', stars: 70, badge: '4º', avatarMood: 'neutral' },
  { position: 5, name: 'Bia Expressiva', stars: 50, badge: '5º', avatarMood: 'tired' },
];

export const STATIC_TASKS: TaskItem[] = [
  {
    id: '1',
    title: 'Sorriso Campeão',
    description: 'Conclui 3 treinos com expressão feliz',
    rewardStars: 20,
    progress: 1,
    completed: true,
    icon: '😄',
  },
  {
    id: '2',
    title: 'Treino Diário',
    description: 'Pratica durante 2 dias consecutivos',
    rewardStars: 15,
    progress: 0.5,
    completed: false,
    icon: '🔥',
  },
  {
    id: '3',
    title: 'Mestre da Expressão',
    description: 'Alcança 100 estrelas no total',
    rewardStars: 50,
    progress: 0.95,
    completed: false,
    icon: '⭐',
  },
  {
    id: '4',
    title: 'Explorador Curioso',
    description: 'Experimenta personalizar o teu monstro',
    rewardStars: 10,
    progress: 0,
    completed: false,
    icon: '👾',
  },
];