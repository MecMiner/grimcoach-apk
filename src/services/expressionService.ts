import { EXPRESSION_ASSETS, EmotionType, LevelType } from '../constants/expressionAssets';

export const ExpressionService = {
  // Retorna todas as imagens da emoção e nível
  getImages(emotion: EmotionType, level: LevelType): any[] {
    return EXPRESSION_ASSETS[emotion]?.[level] || [];
  },

  // Retorna 1 imagem aleatória
  getRandomImage(emotion: EmotionType, level: LevelType): any | null {
    const list = this.getImages(emotion, level);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  },

  // Retorna N imagens aleatórias sem repetir (útil para quizzes e jogos de memória)
  getRandomSample(emotion: EmotionType, level: LevelType, count: number): any[] {
    const list = [...this.getImages(emotion, level)];
    if (!list.length) return [];
    
    // Embaralha
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.slice(0, count);
  },

  // Lista todas as emoções disponíveis
  getAllEmotions(): EmotionType[] {
    return Object.keys(EXPRESSION_ASSETS) as EmotionType[];
  }
};