// src/utils/facsEmotionMapper.ts

export interface BlendshapesMap {
  [key: string]: number;
}

export type BasicEmotion =
  | 'joy'
  | 'sadness'
  | 'surprise'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'neutral';

export function calculateEmotionsFromFACS(shapes: BlendshapesMap): Record<BasicEmotion, number> {
  const get = (key: string) => shapes[key] ?? 0;

  // AU12 (Lip Corner Puller) + AU6 (Cheek Raiser)
  const joy = (get('mouthSmileLeft') + get('mouthSmileRight')) / 2 * 0.7 +
              (get('cheekSquintLeft') + get('cheekSquintRight')) / 2 * 0.3;

  // AU1 (Inner Brow Raiser) + AU15 (Lip Corner Depressor) + AU4 (Brow Lowerer)
  const sadness = get('browInnerUp') * 0.4 +
                  (get('mouthFrownLeft') + get('mouthFrownRight')) / 2 * 0.4 +
                  (get('browDownLeft') + get('browDownRight')) / 2 * 0.2;

  // AU1 + AU2 (Outer Brow Raiser) + AU5 (Upper Lid Raiser) + AU26 (Jaw Drop)
  const surprise = (get('browInnerUp') + get('browOuterUpLeft') + get('browOuterUpRight')) / 3 * 0.3 +
                   (get('eyeWideLeft') + get('eyeWideRight')) / 2 * 0.3 +
                   get('jawOpen') * 0.4;

  // AU4 (Brow Lowerer) + AU23/24 (Lip Tightener/Pressor)
  const anger = (get('browDownLeft') + get('browDownRight')) / 2 * 0.5 +
                (get('mouthPressLeft') + get('mouthPressRight')) / 2 * 0.3 +
                (get('noseSneerLeft') + get('noseSneerRight')) / 2 * 0.2;

  // AU1 + AU2 + AU4 + AU5 + AU20 (Lip Stretcher)
  const fear = get('browInnerUp') * 0.3 +
               (get('eyeWideLeft') + get('eyeWideRight')) / 2 * 0.3 +
               (get('mouthStretchLeft') + get('mouthStretchRight')) / 2 * 0.4;

  // AU9 (Nose Wrinkler) + AU10 (Upper Lip Raiser)
  const disgust = (get('noseSneerLeft') + get('noseSneerRight')) / 2 * 0.6 +
                  (get('mouthUpperUpLeft') + get('mouthUpperUpRight')) / 2 * 0.4;

  // Ativação geral dos músculos
  const maxActive = Math.max(joy, sadness, surprise, anger, fear, disgust);
  const neutral = Math.max(0, 1 - maxActive * 1.5);

  return { joy, sadness, surprise, anger, fear, disgust, neutral };
}