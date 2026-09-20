import React, { useEffect } from 'react';
import { StyleSheet, Pressable, Image, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MONSTER_PARTS, ANCHORS } from '../constants/monsterParts';

export type MascotMood = 'happy' | 'neutral' | 'tired' | 'angry';

export interface MascotConfig {
  bodyKey: keyof typeof MONSTER_PARTS.bodies;
  eyeKey: keyof typeof MONSTER_PARTS.eyes;
  mouthKey: keyof typeof MONSTER_PARTS.mouths;
  armKey: keyof typeof MONSTER_PARTS.arms;
  legKey: keyof typeof MONSTER_PARTS.legs;
  detailKey: keyof typeof MONSTER_PARTS.details;
}

interface MascotProps {
  mood?: MascotMood;
  config?: MascotConfig;
  onPress?: () => void;
  scaleFactor?: number;
}

const RENDER_SCALE = 0.55;

export const Mascot: React.FC<MascotProps> = ({
  mood = 'neutral',
  config = {
    bodyKey: 'blueA',
    eyeKey: 'cuteLight',
    mouthKey: 'closedHappy',
    armKey: 'blueA',
    legKey: 'blueA',
    detailKey: 'blueAntennaLarge',
  },
  onPress,
  scaleFactor = 1,
}) => {
  // Toque / Feedback
  const touchScale = useSharedValue(1);

  // Animações sutis
  const bodyBobY = useSharedValue(0);
  const bodyScaleY = useSharedValue(1);
  const armIdleY = useSharedValue(0);
  const detailBobY = useSharedValue(0);
  const eyeBlinkScaleY = useSharedValue(1);

  useEffect(() => {
    // 1. Respiração / Flutuação sutil do corpo inteiro
    bodyBobY.value = withRepeat(
      withTiming(-2.5, {
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    bodyScaleY.value = withRepeat(
      withTiming(1.02, {
        duration: 1500,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    // 2. Oscilação sutil dos braços (descompassada)
    armIdleY.value = withRepeat(
      withTiming(3.5, {
        duration: 1300,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    // 3. Flutuação leve dos detalhes (antenas/orelhas com leve atraso)
    detailBobY.value = withRepeat(
      withDelay(
        200,
        withTiming(-3, {
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
        })
      ),
      -1,
      true
    );

    // 4. Ciclo de piscada automática suave
    const blinkInterval = setInterval(() => {
      eyeBlinkScaleY.value = withSequence(
        withTiming(0.1, { duration: 70 }),
        withTiming(1, { duration: 110 })
      );
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, []);

  // Estilos animados
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: touchScale.value * scaleFactor },
      { translateY: bodyBobY.value },
      { scaleY: bodyScaleY.value },
    ],
  }));

  const animatedLeftArmStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: -1 },
      { translateY: armIdleY.value },
    ],
  }));

  const animatedRightArmStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -armIdleY.value },
    ],
  }));

  const animatedDetailLeftStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: -1 },
      { translateY: detailBobY.value },
    ],
  }));

  const animatedDetailRightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: detailBobY.value },
    ],
  }));

  const animatedEyesStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: eyeBlinkScaleY.value },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    touchScale.value = withSequence(
      withSpring(0.9, { damping: 5, stiffness: 200 }),
      withSpring(1.1, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 6 })
    );
    onPress?.();
  };

  // 1. Corpo
  const bodyDef = MONSTER_PARTS.bodies[config.bodyKey] || MONSTER_PARTS.bodies.blueA;
  const bodyData = (ANCHORS.corpos as any)[bodyDef.filename] || (ANCHORS.corpos as any)['body_blueA.png'];
  const bodyAnchors = bodyData.ancoras;

  const renderBodyW = bodyDef.largura * RENDER_SCALE;
  const renderBodyH = bodyDef.altura * RENDER_SCALE;

  // 2. Braços
  const armDef = MONSTER_PARTS.arms[config.armKey] || MONSTER_PARTS.arms.blueA;
  const armData = (ANCHORS.bracos as any)[armDef.filename] || (ANCHORS.bracos as any)['arm_blueA.png'];
  const armPivot = armData.ancoras.A;
  const armW = armDef.largura * RENDER_SCALE;
  const armH = armDef.altura * RENDER_SCALE;

  const armLeftX = (bodyAnchors.bracoE.x - armDef.largura + armPivot.x) * RENDER_SCALE;
  const armLeftY = (bodyAnchors.bracoE.y - armPivot.y) * RENDER_SCALE;

  const armRightX = (bodyAnchors.bracoD.x - armPivot.x) * RENDER_SCALE;
  const armRightY = (bodyAnchors.bracoD.y - armPivot.y) * RENDER_SCALE;

  // 3. Pernas
  const legDef = MONSTER_PARTS.legs[config.legKey] || MONSTER_PARTS.legs.blueA;
  const legData = (ANCHORS.pernas as any)[legDef.filename] || (ANCHORS.pernas as any)['leg_blueA.png'];
  const legPivot = legData.ancoras.perna;
  const legW = legDef.largura * RENDER_SCALE;
  const legH = legDef.altura * RENDER_SCALE;

  const legLeftX = (bodyAnchors.pernaE.x - legDef.largura + legPivot.x) * RENDER_SCALE;
  const legLeftY = (bodyAnchors.pernaE.y - legPivot.y) * RENDER_SCALE;

  const legRightX = (bodyAnchors.pernaD.x - legPivot.x) * RENDER_SCALE;
  const legRightY = (bodyAnchors.pernaD.y - legPivot.y) * RENDER_SCALE;

  // 4. Detalhes
  const detailDef = MONSTER_PARTS.details[config.detailKey] || MONSTER_PARTS.details.blueAntennaLarge;
  const isEar = (ANCHORS.orelhas as any)[detailDef.filename] !== undefined;
  const isHorn = (ANCHORS.detalhes?.chifres as any)?.[detailDef.filename] !== undefined;
  const isAntenna = (ANCHORS.detalhes?.antenas as any)?.[detailDef.filename] !== undefined;

  let detailPivot = { x: detailDef.largura / 2, y: detailDef.altura };
  let anchorKeyE = 'detalheE';
  let anchorKeyD = 'detalheD';

  if (isEar) {
    detailPivot = (ANCHORS.orelhas as any)[detailDef.filename].ancoras.orelha;
    anchorKeyE = 'orelhaE';
    anchorKeyD = 'orelhaD';
  } else if (isHorn) {
    detailPivot = (ANCHORS.detalhes.chifres as any)[detailDef.filename].ancoras.base;
  } else if (isAntenna) {
    detailPivot = (ANCHORS.detalhes.antenas as any)[detailDef.filename].ancoras.antena;
  }

  const detailW = detailDef.largura * RENDER_SCALE;
  const detailH = detailDef.altura * RENDER_SCALE;

  const detailLeftAnchor = bodyAnchors[anchorKeyE] || bodyAnchors.detalheE;
  const detailRightAnchor = bodyAnchors[anchorKeyD] || bodyAnchors.detalheD;

  const detailLeftX = (detailLeftAnchor.x - detailDef.largura + detailPivot.x) * RENDER_SCALE;
  const detailLeftY = (detailLeftAnchor.y - detailPivot.y) * RENDER_SCALE;

  const detailRightX = (detailRightAnchor.x - detailPivot.x) * RENDER_SCALE;
  const detailRightY = (detailRightAnchor.y - detailPivot.y) * RENDER_SCALE;

  // 5. Olhos
  const eyeDef =
    mood === 'happy'
      ? MONSTER_PARTS.eyes.closedHappy
      : mood === 'tired'
      ? MONSTER_PARTS.eyes.dead
      : mood === 'angry'
      ? MONSTER_PARTS.eyes.angryRed
      : MONSTER_PARTS.eyes[config.eyeKey] || MONSTER_PARTS.eyes.cuteLight;

  const eyeData = (ANCHORS.olhos as any)[eyeDef.filename] || (ANCHORS.olhos as any)['eye_cute_light.png'];
  const eyePivot = eyeData.ancoras.meio;
  const eyeW = eyeDef.largura * RENDER_SCALE;
  const eyeH = eyeDef.altura * RENDER_SCALE;

  const eyeLeftX = (bodyAnchors.olhoE.x - eyeDef.largura + eyePivot.x) * RENDER_SCALE;
  const eyeLeftY = (bodyAnchors.olhoE.y - eyePivot.y) * RENDER_SCALE;

  const eyeRightX = (bodyAnchors.olhoD.x - eyePivot.x) * RENDER_SCALE;
  const eyeRightY = (bodyAnchors.olhoD.y - eyePivot.y) * RENDER_SCALE;

  // 6. Boca
  const mouthDef =
    mood === 'happy'
      ? MONSTER_PARTS.mouths.mouthB
      : mood === 'tired'
      ? MONSTER_PARTS.mouths.closedSad
      : MONSTER_PARTS.mouths[config.mouthKey] || MONSTER_PARTS.mouths.closedHappy;

  const mouthData = (ANCHORS.bocas as any)[mouthDef.filename] || (ANCHORS.bocas as any)['mouth_closed_happy.png'];
  const mouthPivot = mouthData.ancoras.A;
  const mouthW = mouthDef.largura * RENDER_SCALE;
  const mouthH = mouthDef.altura * RENDER_SCALE;

  const mouthX = (bodyAnchors.boca.x - mouthPivot.x) * RENDER_SCALE;
  const mouthY = (bodyAnchors.boca.y - mouthPivot.y) * RENDER_SCALE;

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={[styles.mascotWrapper, animatedContainerStyle]}>
        
        {/* PALCO CENTRALIZADO NAS DIMENSÕES DO CORPO */}
        <View style={{ width: renderBodyW, height: renderBodyH, position: 'relative' }}>

          {/* PERNA ESQUERDA (zIndex: 2 - Atrás do corpo) */}
          <View style={[styles.slot, { left: legLeftX, top: legLeftY, width: legW, height: legH, zIndex: 2 }]}>
            <Image
              source={legDef.source}
              style={[styles.full, styles.flipped]}
              resizeMode="contain"
            />
          </View>

          {/* PERNA DIREITA (zIndex: 2 - Atrás do corpo) */}
          <View style={[styles.slot, { left: legRightX, top: legRightY, width: legW, height: legH, zIndex: 2 }]}>
            <Image
              source={legDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </View>

          {/* BRAÇO ESQUERDO (zIndex: 4 - Atrás do corpo) */}
          <Animated.View
            style={[
              styles.slot,
              { left: armLeftX, top: armLeftY, width: armW, height: armH, zIndex: 4 },
              animatedLeftArmStyle,
            ]}
          >
            <Image
              source={armDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </Animated.View>

          {/* BRAÇO DIREITO (zIndex: 4 - Atrás do corpo) */}
          <Animated.View
            style={[
              styles.slot,
              { left: armRightX, top: armRightY, width: armW, height: armH, zIndex: 4 },
              animatedRightArmStyle,
            ]}
          >
            <Image
              source={armDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </Animated.View>

          {/* CORPO (zIndex: 10) */}
          <Image
            source={bodyDef.source}
            style={{ width: renderBodyW, height: renderBodyH, zIndex: 10 }}
            resizeMode="contain"
          />

          {/* DETALHE ESQUERDO (zIndex: 12 - À frente do corpo) */}
          <Animated.View
            style={[
              styles.slot,
              { left: detailLeftX, top: detailLeftY, width: detailW, height: detailH, zIndex: 12 },
              animatedDetailLeftStyle,
            ]}
          >
            <Image
              source={detailDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </Animated.View>

          {/* DETALHE DIREITO (zIndex: 12 - À frente do corpo) */}
          <Animated.View
            style={[
              styles.slot,
              { left: detailRightX, top: detailRightY, width: detailW, height: detailH, zIndex: 12 },
              animatedDetailRightStyle,
            ]}
          >
            <Image
              source={detailDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </Animated.View>

          {/* OLHO ESQUERDO (zIndex: 15 - Topo facial com piscada) */}
          <Animated.View
            style={[
              styles.slot,
              { left: eyeLeftX, top: eyeLeftY, width: eyeW, height: eyeH, zIndex: 15 },
              animatedEyesStyle,
            ]}
          >
            <Image
              source={eyeDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </Animated.View>

          {/* OLHO DIREITO (zIndex: 15 - Topo facial com piscada) */}
          <Animated.View
            style={[
              styles.slot,
              { left: eyeRightX, top: eyeRightY, width: eyeW, height: eyeH, zIndex: 15 },
              animatedEyesStyle,
            ]}
          >
            <Image
              source={eyeDef.source}
              style={[styles.full, styles.flipped]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* BOCA (zIndex: 15 - Topo facial) */}
          <View style={[styles.slot, { left: mouthX, top: mouthY, width: mouthW, height: mouthH, zIndex: 15 }]}>
            <Image
              source={mouthDef.source}
              style={styles.full}
              resizeMode="contain"
            />
          </View>

        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrapper: {
    minWidth: 260,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    position: 'absolute',
  },
  full: {
    width: '100%',
    height: '100%',
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});