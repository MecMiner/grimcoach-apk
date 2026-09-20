import TAMANHOS from './tamanhos_imagens.json';
import ANCORAS from './ancoras_imagens.json';

export interface PartInfo {
  source: any;
  filename: string;
  largura: number;
  altura: number;
}

const getDim = (filename: string) => {
  return (TAMANHOS as any)[filename] || { largura: 100, altura: 100 };
};

export const MONSTER_PARTS = {
  bodies: {
    blueA: { source: require('../../assets/Double/body_blueA.png'), filename: 'body_blueA.png', ...getDim('body_blueA.png') },
    blueB: { source: require('../../assets/Double/body_blueB.png'), filename: 'body_blueB.png', ...getDim('body_blueB.png') },
    blueC: { source: require('../../assets/Double/body_blueC.png'), filename: 'body_blueC.png', ...getDim('body_blueC.png') },
    blueD: { source: require('../../assets/Double/body_blueD.png'), filename: 'body_blueD.png', ...getDim('body_blueD.png') },
    blueE: { source: require('../../assets/Double/body_blueE.png'), filename: 'body_blueE.png', ...getDim('body_blueE.png') },
    blueF: { source: require('../../assets/Double/body_blueF.png'), filename: 'body_blueF.png', ...getDim('body_blueF.png') },

    darkA: { source: require('../../assets/Double/body_darkA.png'), filename: 'body_darkA.png', ...getDim('body_darkA.png') },
    darkB: { source: require('../../assets/Double/body_darkB.png'), filename: 'body_darkB.png', ...getDim('body_darkB.png') },
    darkC: { source: require('../../assets/Double/body_darkC.png'), filename: 'body_darkC.png', ...getDim('body_darkC.png') },
    darkD: { source: require('../../assets/Double/body_darkD.png'), filename: 'body_darkD.png', ...getDim('body_darkD.png') },
    darkE: { source: require('../../assets/Double/body_darkE.png'), filename: 'body_darkE.png', ...getDim('body_darkE.png') },
    darkF: { source: require('../../assets/Double/body_darkF.png'), filename: 'body_darkF.png', ...getDim('body_darkF.png') },

    greenA: { source: require('../../assets/Double/body_greenA.png'), filename: 'body_greenA.png', ...getDim('body_greenA.png') },
    greenB: { source: require('../../assets/Double/body_greenB.png'), filename: 'body_greenB.png', ...getDim('body_greenB.png') },
    greenC: { source: require('../../assets/Double/body_greenC.png'), filename: 'body_greenC.png', ...getDim('body_greenC.png') },
    greenD: { source: require('../../assets/Double/body_greenD.png'), filename: 'body_greenD.png', ...getDim('body_greenD.png') },
    greenE: { source: require('../../assets/Double/body_greenE.png'), filename: 'body_greenE.png', ...getDim('body_greenE.png') },
    greenF: { source: require('../../assets/Double/body_greenF.png'), filename: 'body_greenF.png', ...getDim('body_greenF.png') },

    redA: { source: require('../../assets/Double/body_redA.png'), filename: 'body_redA.png', ...getDim('body_redA.png') },
    redB: { source: require('../../assets/Double/body_redB.png'), filename: 'body_redB.png', ...getDim('body_redB.png') },
    redC: { source: require('../../assets/Double/body_redC.png'), filename: 'body_redC.png', ...getDim('body_redC.png') },
    redD: { source: require('../../assets/Double/body_redD.png'), filename: 'body_redD.png', ...getDim('body_redD.png') },
    redE: { source: require('../../assets/Double/body_redE.png'), filename: 'body_redE.png', ...getDim('body_redE.png') },
    redF: { source: require('../../assets/Double/body_redF.png'), filename: 'body_redF.png', ...getDim('body_redF.png') },

    whiteA: { source: require('../../assets/Double/body_whiteA.png'), filename: 'body_whiteA.png', ...getDim('body_whiteA.png') },
    whiteB: { source: require('../../assets/Double/body_whiteB.png'), filename: 'body_whiteB.png', ...getDim('body_whiteB.png') },
    whiteC: { source: require('../../assets/Double/body_whiteC.png'), filename: 'body_whiteC.png', ...getDim('body_whiteC.png') },
    whiteD: { source: require('../../assets/Double/body_whiteD.png'), filename: 'body_whiteD.png', ...getDim('body_whiteD.png') },
    whiteE: { source: require('../../assets/Double/body_whiteE.png'), filename: 'body_whiteE.png', ...getDim('body_whiteE.png') },
    whiteF: { source: require('../../assets/Double/body_whiteF.png'), filename: 'body_whiteF.png', ...getDim('body_whiteF.png') },

    yellowA: { source: require('../../assets/Double/body_yellowA.png'), filename: 'body_yellowA.png', ...getDim('body_yellowA.png') },
    yellowB: { source: require('../../assets/Double/body_yellowB.png'), filename: 'body_yellowB.png', ...getDim('body_yellowB.png') },
    yellowC: { source: require('../../assets/Double/body_yellowC.png'), filename: 'body_yellowC.png', ...getDim('body_yellowC.png') },
    yellowD: { source: require('../../assets/Double/body_yellowD.png'), filename: 'body_yellowD.png', ...getDim('body_yellowD.png') },
    yellowE: { source: require('../../assets/Double/body_yellowE.png'), filename: 'body_yellowE.png', ...getDim('body_yellowE.png') },
    yellowF: { source: require('../../assets/Double/body_yellowF.png'), filename: 'body_yellowF.png', ...getDim('body_yellowF.png') },
  },

  arms: {
    blueA: { source: require('../../assets/Double/arm_blueA.png'), filename: 'arm_blueA.png', ...getDim('arm_blueA.png') },
    blueB: { source: require('../../assets/Double/arm_blueB.png'), filename: 'arm_blueB.png', ...getDim('arm_blueB.png') },
    blueC: { source: require('../../assets/Double/arm_blueC.png'), filename: 'arm_blueC.png', ...getDim('arm_blueC.png') },
    blueD: { source: require('../../assets/Double/arm_blueD.png'), filename: 'arm_blueD.png', ...getDim('arm_blueD.png') },
    blueE: { source: require('../../assets/Double/arm_blueE.png'), filename: 'arm_blueE.png', ...getDim('arm_blueE.png') },

    darkA: { source: require('../../assets/Double/arm_darkA.png'), filename: 'arm_darkA.png', ...getDim('arm_darkA.png') },
    darkB: { source: require('../../assets/Double/arm_darkB.png'), filename: 'arm_darkB.png', ...getDim('arm_darkB.png') },
    darkC: { source: require('../../assets/Double/arm_darkC.png'), filename: 'arm_darkC.png', ...getDim('arm_darkC.png') },
    darkD: { source: require('../../assets/Double/arm_darkD.png'), filename: 'arm_darkD.png', ...getDim('arm_darkD.png') },
    darkE: { source: require('../../assets/Double/arm_darkE.png'), filename: 'arm_darkE.png', ...getDim('arm_darkE.png') },

    greenA: { source: require('../../assets/Double/arm_greenA.png'), filename: 'arm_greenA.png', ...getDim('arm_greenA.png') },
    greenB: { source: require('../../assets/Double/arm_greenB.png'), filename: 'arm_greenB.png', ...getDim('arm_greenB.png') },
    greenC: { source: require('../../assets/Double/arm_greenC.png'), filename: 'arm_greenC.png', ...getDim('arm_greenC.png') },
    greenD: { source: require('../../assets/Double/arm_greenD.png'), filename: 'arm_greenD.png', ...getDim('arm_greenD.png') },
    greenE: { source: require('../../assets/Double/arm_greenE.png'), filename: 'arm_greenE.png', ...getDim('arm_greenE.png') },

    redA: { source: require('../../assets/Double/arm_redA.png'), filename: 'arm_redA.png', ...getDim('arm_redA.png') },
    redB: { source: require('../../assets/Double/arm_redB.png'), filename: 'arm_redB.png', ...getDim('arm_redB.png') },
    redC: { source: require('../../assets/Double/arm_redC.png'), filename: 'arm_redC.png', ...getDim('arm_redC.png') },
    redD: { source: require('../../assets/Double/arm_redD.png'), filename: 'arm_redD.png', ...getDim('arm_redD.png') },
    redE: { source: require('../../assets/Double/arm_redE.png'), filename: 'arm_redE.png', ...getDim('arm_redE.png') },

    whiteA: { source: require('../../assets/Double/arm_whiteA.png'), filename: 'arm_whiteA.png', ...getDim('arm_whiteA.png') },
    whiteB: { source: require('../../assets/Double/arm_whiteB.png'), filename: 'arm_whiteB.png', ...getDim('arm_whiteB.png') },
    whiteC: { source: require('../../assets/Double/arm_whiteC.png'), filename: 'arm_whiteC.png', ...getDim('arm_whiteC.png') },
    whiteD: { source: require('../../assets/Double/arm_whiteD.png'), filename: 'arm_whiteD.png', ...getDim('arm_whiteD.png') },
    whiteE: { source: require('../../assets/Double/arm_whiteE.png'), filename: 'arm_whiteE.png', ...getDim('arm_whiteE.png') },

    yellowA: { source: require('../../assets/Double/arm_yellowA.png'), filename: 'arm_yellowA.png', ...getDim('arm_yellowA.png') },
    yellowB: { source: require('../../assets/Double/arm_yellowB.png'), filename: 'arm_yellowB.png', ...getDim('arm_yellowB.png') },
    yellowC: { source: require('../../assets/Double/arm_yellowC.png'), filename: 'arm_yellowC.png', ...getDim('arm_yellowC.png') },
    yellowD: { source: require('../../assets/Double/arm_yellowD.png'), filename: 'arm_yellowD.png', ...getDim('arm_yellowD.png') },
    yellowE: { source: require('../../assets/Double/arm_yellowE.png'), filename: 'arm_yellowE.png', ...getDim('arm_yellowE.png') },
  },

  legs: {
    blueA: { source: require('../../assets/Double/leg_blueA.png'), filename: 'leg_blueA.png', ...getDim('leg_blueA.png') },
    blueB: { source: require('../../assets/Double/leg_blueB.png'), filename: 'leg_blueB.png', ...getDim('leg_blueB.png') },
    blueC: { source: require('../../assets/Double/leg_blueC.png'), filename: 'leg_blueC.png', ...getDim('leg_blueC.png') },
    blueD: { source: require('../../assets/Double/leg_blueD.png'), filename: 'leg_blueD.png', ...getDim('leg_blueD.png') },
    blueE: { source: require('../../assets/Double/leg_blueE.png'), filename: 'leg_blueE.png', ...getDim('leg_blueE.png') },

    darkA: { source: require('../../assets/Double/leg_darkA.png'), filename: 'leg_darkA.png', ...getDim('leg_darkA.png') },
    darkB: { source: require('../../assets/Double/leg_darkB.png'), filename: 'leg_darkB.png', ...getDim('leg_darkB.png') },
    darkC: { source: require('../../assets/Double/leg_darkC.png'), filename: 'leg_darkC.png', ...getDim('leg_darkC.png') },
    darkD: { source: require('../../assets/Double/leg_darkD.png'), filename: 'leg_darkD.png', ...getDim('leg_darkD.png') },
    darkE: { source: require('../../assets/Double/leg_darkE.png'), filename: 'leg_darkE.png', ...getDim('leg_darkE.png') },

    greenA: { source: require('../../assets/Double/leg_greenA.png'), filename: 'leg_greenA.png', ...getDim('leg_greenA.png') },
    greenB: { source: require('../../assets/Double/leg_greenB.png'), filename: 'leg_greenB.png', ...getDim('leg_greenB.png') },
    greenC: { source: require('../../assets/Double/leg_greenC.png'), filename: 'leg_greenC.png', ...getDim('leg_greenC.png') },
    greenD: { source: require('../../assets/Double/leg_greenD.png'), filename: 'leg_greenD.png', ...getDim('leg_greenD.png') },
    greenE: { source: require('../../assets/Double/leg_greenE.png'), filename: 'leg_greenE.png', ...getDim('leg_greenE.png') },

    redA: { source: require('../../assets/Double/leg_redA.png'), filename: 'leg_redA.png', ...getDim('leg_redA.png') },
    redB: { source: require('../../assets/Double/leg_redB.png'), filename: 'leg_redB.png', ...getDim('leg_redB.png') },
    redC: { source: require('../../assets/Double/leg_redC.png'), filename: 'leg_redC.png', ...getDim('leg_redC.png') },
    redD: { source: require('../../assets/Double/leg_redD.png'), filename: 'leg_redD.png', ...getDim('leg_redD.png') },
    redE: { source: require('../../assets/Double/leg_redE.png'), filename: 'leg_redE.png', ...getDim('leg_redE.png') },

    whiteA: { source: require('../../assets/Double/leg_whiteA.png'), filename: 'leg_whiteA.png', ...getDim('leg_whiteA.png') },
    whiteB: { source: require('../../assets/Double/leg_whiteB.png'), filename: 'leg_whiteB.png', ...getDim('leg_whiteB.png') },
    whiteC: { source: require('../../assets/Double/leg_whiteC.png'), filename: 'leg_whiteC.png', ...getDim('leg_whiteC.png') },
    whiteD: { source: require('../../assets/Double/leg_whiteD.png'), filename: 'leg_whiteD.png', ...getDim('leg_whiteD.png') },
    whiteE: { source: require('../../assets/Double/leg_whiteE.png'), filename: 'leg_whiteE.png', ...getDim('leg_whiteE.png') },

    yellowA: { source: require('../../assets/Double/leg_yellowA.png'), filename: 'leg_yellowA.png', ...getDim('leg_yellowA.png') },
    yellowB: { source: require('../../assets/Double/leg_yellowB.png'), filename: 'leg_yellowB.png', ...getDim('leg_yellowB.png') },
    yellowC: { source: require('../../assets/Double/leg_yellowC.png'), filename: 'leg_yellowC.png', ...getDim('leg_yellowC.png') },
    yellowD: { source: require('../../assets/Double/leg_yellowD.png'), filename: 'leg_yellowD.png', ...getDim('leg_yellowD.png') },
    yellowE: { source: require('../../assets/Double/leg_yellowE.png'), filename: 'leg_yellowE.png', ...getDim('leg_yellowE.png') },
  },

  details: {
    // Antenas
    blueAntennaLarge: { source: require('../../assets/Double/detail_blue_antenna_large.png'), filename: 'detail_blue_antenna_large.png', ...getDim('detail_blue_antenna_large.png') },
    blueAntennaSmall: { source: require('../../assets/Double/detail_blue_antenna_small.png'), filename: 'detail_blue_antenna_small.png', ...getDim('detail_blue_antenna_small.png') },
    darkAntennaLarge: { source: require('../../assets/Double/detail_dark_antenna_large.png'), filename: 'detail_dark_antenna_large.png', ...getDim('detail_dark_antenna_large.png') },
    darkAntennaSmall: { source: require('../../assets/Double/detail_dark_antenna_small.png'), filename: 'detail_dark_antenna_small.png', ...getDim('detail_dark_antenna_small.png') },
    greenAntennaLarge: { source: require('../../assets/Double/detail_green_antenna_large.png'), filename: 'detail_green_antenna_large.png', ...getDim('detail_green_antenna_large.png') },
    greenAntennaSmall: { source: require('../../assets/Double/detail_green_antenna_small.png'), filename: 'detail_green_antenna_small.png', ...getDim('detail_green_antenna_small.png') },
    redAntennaLarge: { source: require('../../assets/Double/detail_red_antenna_large.png'), filename: 'detail_red_antenna_large.png', ...getDim('detail_red_antenna_large.png') },
    redAntennaSmall: { source: require('../../assets/Double/detail_red_antenna_small.png'), filename: 'detail_red_antenna_small.png', ...getDim('detail_red_antenna_small.png') },
    whiteAntennaLarge: { source: require('../../assets/Double/detail_white_antenna_large.png'), filename: 'detail_white_antenna_large.png', ...getDim('detail_white_antenna_large.png') },
    whiteAntennaSmall: { source: require('../../assets/Double/detail_white_antenna_small.png'), filename: 'detail_white_antenna_small.png', ...getDim('detail_white_antenna_small.png') },
    yellowAntennaLarge: { source: require('../../assets/Double/detail_yellow_antenna_large.png'), filename: 'detail_yellow_antenna_large.png', ...getDim('detail_yellow_antenna_large.png') },
    yellowAntennaSmall: { source: require('../../assets/Double/detail_yellow_antenna_small.png'), filename: 'detail_yellow_antenna_small.png', ...getDim('detail_yellow_antenna_small.png') },

    // Orelhas
    blueEar: { source: require('../../assets/Double/detail_blue_ear.png'), filename: 'detail_blue_ear.png', ...getDim('detail_blue_ear.png') },
    blueEarRound: { source: require('../../assets/Double/detail_blue_ear_round.png'), filename: 'detail_blue_ear_round.png', ...getDim('detail_blue_ear_round.png') },
    darkEar: { source: require('../../assets/Double/detail_dark_ear.png'), filename: 'detail_dark_ear.png', ...getDim('detail_dark_ear.png') },
    darkEarRound: { source: require('../../assets/Double/detail_dark_ear_round.png'), filename: 'detail_dark_ear_round.png', ...getDim('detail_dark_ear_round.png') },
    greenEar: { source: require('../../assets/Double/detail_green_ear.png'), filename: 'detail_green_ear.png', ...getDim('detail_green_ear.png') },
    greenEarRound: { source: require('../../assets/Double/detail_green_ear_round.png'), filename: 'detail_green_ear_round.png', ...getDim('detail_green_ear_round.png') },
    redEar: { source: require('../../assets/Double/detail_red_ear.png'), filename: 'detail_red_ear.png', ...getDim('detail_red_ear.png') },
    redEarRound: { source: require('../../assets/Double/detail_red_ear_round.png'), filename: 'detail_red_ear_round.png', ...getDim('detail_red_ear_round.png') },
    whiteEar: { source: require('../../assets/Double/detail_white_ear.png'), filename: 'detail_white_ear.png', ...getDim('detail_white_ear.png') },
    whiteEarRound: { source: require('../../assets/Double/detail_white_ear_round.png'), filename: 'detail_white_ear_round.png', ...getDim('detail_white_ear_round.png') },
    yellowEar: { source: require('../../assets/Double/detail_yellow_ear.png'), filename: 'detail_yellow_ear.png', ...getDim('detail_yellow_ear.png') },
    yellowEarRound: { source: require('../../assets/Double/detail_yellow_ear_round.png'), filename: 'detail_yellow_ear_round.png', ...getDim('detail_yellow_ear_round.png') },

    // Chifres
    blueHornLarge: { source: require('../../assets/Double/detail_blue_horn_large.png'), filename: 'detail_blue_horn_large.png', ...getDim('detail_blue_horn_large.png') },
    blueHornSmall: { source: require('../../assets/Double/detail_blue_horn_small.png'), filename: 'detail_blue_horn_small.png', ...getDim('detail_blue_horn_small.png') },
    darkHornLarge: { source: require('../../assets/Double/detail_dark_horn_large.png'), filename: 'detail_dark_horn_large.png', ...getDim('detail_dark_horn_large.png') },
    darkHornSmall: { source: require('../../assets/Double/detail_dark_horn_small.png'), filename: 'detail_dark_horn_small.png', ...getDim('detail_dark_horn_small.png') },
    greenHornLarge: { source: require('../../assets/Double/detail_green_horn_large.png'), filename: 'detail_green_horn_large.png', ...getDim('detail_green_horn_large.png') },
    greenHornSmall: { source: require('../../assets/Double/detail_green_horn_small.png'), filename: 'detail_green_horn_small.png', ...getDim('detail_green_horn_small.png') },
    redHornLarge: { source: require('../../assets/Double/detail_red_horn_large.png'), filename: 'detail_red_horn_large.png', ...getDim('detail_red_horn_large.png') },
    redHornSmall: { source: require('../../assets/Double/detail_red_horn_small.png'), filename: 'detail_red_horn_small.png', ...getDim('detail_red_horn_small.png') },
    whiteHornLarge: { source: require('../../assets/Double/detail_white_horn_large.png'), filename: 'detail_white_horn_large.png', ...getDim('detail_white_horn_large.png') },
    whiteHornSmall: { source: require('../../assets/Double/detail_white_horn_small.png'), filename: 'detail_white_horn_small.png', ...getDim('detail_white_horn_small.png') },
    yellowHornLarge: { source: require('../../assets/Double/detail_yellow_horn_large.png'), filename: 'detail_yellow_horn_large.png', ...getDim('detail_yellow_horn_large.png') },
    yellowHornSmall: { source: require('../../assets/Double/detail_yellow_horn_small.png'), filename: 'detail_yellow_horn_small.png', ...getDim('detail_yellow_horn_small.png') },
  },

  eyes: {
    angryBlue: { source: require('../../assets/Double/eye_angry_blue.png'), filename: 'eye_angry_blue.png', ...getDim('eye_angry_blue.png') },
    angryGreen: { source: require('../../assets/Double/eye_angry_green.png'), filename: 'eye_angry_green.png', ...getDim('eye_angry_green.png') },
    angryRed: { source: require('../../assets/Double/eye_angry_red.png'), filename: 'eye_angry_red.png', ...getDim('eye_angry_red.png') },
    blue: { source: require('../../assets/Double/eye_blue.png'), filename: 'eye_blue.png', ...getDim('eye_blue.png') },
    closedFeminine: { source: require('../../assets/Double/eye_closed_feminine.png'), filename: 'eye_closed_feminine.png', ...getDim('eye_closed_feminine.png') },
    closedHappy: { source: require('../../assets/Double/eye_closed_happy.png'), filename: 'eye_closed_happy.png', ...getDim('eye_closed_happy.png') },
    cuteDark: { source: require('../../assets/Double/eye_cute_dark.png'), filename: 'eye_cute_dark.png', ...getDim('eye_cute_dark.png') },
    cuteLight: { source: require('../../assets/Double/eye_cute_light.png'), filename: 'eye_cute_light.png', ...getDim('eye_cute_light.png') },
    dead: { source: require('../../assets/Double/eye_dead.png'), filename: 'eye_dead.png', ...getDim('eye_dead.png') },
    human: { source: require('../../assets/Double/eye_human.png'), filename: 'eye_human.png', ...getDim('eye_human.png') },
    humanBlue: { source: require('../../assets/Double/eye_human_blue.png'), filename: 'eye_human_blue.png', ...getDim('eye_human_blue.png') },
    humanGreen: { source: require('../../assets/Double/eye_human_green.png'), filename: 'eye_human_green.png', ...getDim('eye_human_green.png') },
    humanRed: { source: require('../../assets/Double/eye_human_red.png'), filename: 'eye_human_red.png', ...getDim('eye_human_red.png') },
    psychoDark: { source: require('../../assets/Double/eye_psycho_dark.png'), filename: 'eye_psycho_dark.png', ...getDim('eye_psycho_dark.png') },
    psychoLight: { source: require('../../assets/Double/eye_psycho_light.png'), filename: 'eye_psycho_light.png', ...getDim('eye_psycho_light.png') },
    red: { source: require('../../assets/Double/eye_red.png'), filename: 'eye_red.png', ...getDim('eye_red.png') },
    yellow: { source: require('../../assets/Double/eye_yellow.png'), filename: 'eye_yellow.png', ...getDim('eye_yellow.png') },
  },

  mouths: {
    mouthA: { source: require('../../assets/Double/mouthA.png'), filename: 'mouthA.png', ...getDim('mouthA.png') },
    mouthB: { source: require('../../assets/Double/mouthB.png'), filename: 'mouthB.png', ...getDim('mouthB.png') },
    mouthC: { source: require('../../assets/Double/mouthC.png'), filename: 'mouthC.png', ...getDim('mouthC.png') },
    mouthD: { source: require('../../assets/Double/mouthD.png'), filename: 'mouthD.png', ...getDim('mouthD.png') },
    mouthE: { source: require('../../assets/Double/mouthE.png'), filename: 'mouthE.png', ...getDim('mouthE.png') },
    mouthF: { source: require('../../assets/Double/mouthF.png'), filename: 'mouthF.png', ...getDim('mouthF.png') },
    mouthG: { source: require('../../assets/Double/mouthG.png'), filename: 'mouthG.png', ...getDim('mouthG.png') },
    mouthH: { source: require('../../assets/Double/mouthH.png'), filename: 'mouthH.png', ...getDim('mouthH.png') },
    mouthI: { source: require('../../assets/Double/mouthI.png'), filename: 'mouthI.png', ...getDim('mouthI.png') },
    mouthJ: { source: require('../../assets/Double/mouthJ.png'), filename: 'mouthJ.png', ...getDim('mouthJ.png') },
    closedFangs: { source: require('../../assets/Double/mouth_closed_fangs.png'), filename: 'mouth_closed_fangs.png', ...getDim('mouth_closed_fangs.png') },
    closedHappy: { source: require('../../assets/Double/mouth_closed_happy.png'), filename: 'mouth_closed_happy.png', ...getDim('mouth_closed_happy.png') },
    closedSad: { source: require('../../assets/Double/mouth_closed_sad.png'), filename: 'mouth_closed_sad.png', ...getDim('mouth_closed_sad.png') },
    closedTeeth: { source: require('../../assets/Double/mouth_closed_teeth.png'), filename: 'mouth_closed_teeth.png', ...getDim('mouth_closed_teeth.png') },
  },
};

export const ANCHORS = ANCORAS;