export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ATLAS_WIDTH = 1476;
export const ATLAS_HEIGHT = 1477;

export const SPRITES: Record<string, SpriteFrame> = {
  // Corpos
  body_blueA: { x: 366, y: 472, width: 165, height: 165 },
  body_greenA: { x: 518, y: 1129, width: 165, height: 165 },
  body_redA: { x: 518, y: 964, width: 165, height: 165 },
  body_yellowA: { x: 532, y: 637, width: 165, height: 165 },

  // Olhos
  eye_cute_light: { x: 1026, y: 1410, width: 64, height: 69 },
  eye_closed_happy: { x: 306, y: 1334, width: 42, height: 18 },
  eye_angry_red: { x: 757, y: 747, width: 60, height: 55 },
  eye_dead: { x: 310, y: 1115, width: 32, height: 32 },

  // Bocas
  mouth_closed_happy: { x: 0, y: 1443, width: 80, height: 24 },
  mouthB: { x: 150, y: 1443, width: 70, height: 34 },
  mouth_closed_sad: { x: 432, y: 1459, width: 52, height: 20 },
  mouth_closed_fangs: { x: 258, y: 1115, width: 52, height: 20 },

  // Acessórios
  detail_blue_antenna_large: { x: 1352, y: 1298, width: 38, height: 58 },
  detail_yellow_horn_small: { x: 484, y: 1436, width: 31, height: 27 },
};