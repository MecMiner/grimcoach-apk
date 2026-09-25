// src/utils/emotionClassifier.ts

export type TargetEmotionType =
  | 'joy'
  | 'sadness'
  | 'surprise'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'neutral';

export interface EmotionPredictionResult {
  dominantEmotion: TargetEmotionType;
  confidence: number;
  scores: Record<TargetEmotionType, number>;
}

// Ordem padrão dos datasets FER2013 / AffectNet
const EMOTION_LABELS: TargetEmotionType[] = [
  'anger',
  'disgust',
  'fear',
  'joy',
  'sadness',
  'surprise',
  'neutral',
];

// Limiares de ativação customizados por emoção
export const EMOTION_THRESHOLDS: Record<TargetEmotionType, number> = {
  joy: 0.65,       // Sorriso evidente
  surprise: 0.50,  // Boca/olhos abertos
  sadness: 0.38,   // Expressão sutil: limiar mais tolerante
  anger: 0.40,     // Sobrancelhas franzidas
  fear: 0.40,      // Olhos esbugalhados
  disgust: 0.40,   // Nariz franzido
  neutral: 0.55,   // Rosto relaxado
};

export function parseEmotionOutput(outputTensor: Float32Array): EmotionPredictionResult {
  const scores: Record<TargetEmotionType, number> = {
    anger: outputTensor[0] ?? 0,
    disgust: outputTensor[1] ?? 0,
    fear: outputTensor[2] ?? 0,
    joy: outputTensor[3] ?? 0,
    sadness: outputTensor[4] ?? 0,
    surprise: outputTensor[5] ?? 0,
    neutral: outputTensor[6] ?? 0,
  };

  let maxScore = -1;
  let dominant: TargetEmotionType = 'neutral';

  EMOTION_LABELS.forEach((label) => {
    if (scores[label] > maxScore) {
      maxScore = scores[label];
      dominant = label;
    }
  });

  return {
    dominantEmotion: dominant,
    confidence: Number(maxScore.toFixed(2)),
    scores,
  };
}