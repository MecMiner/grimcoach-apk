import React from 'react';
import { StyleSheet, Pressable, Image, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MONSTER_PARTS } from '../constants/monsterParts';

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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * scaleFactor }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withSpring(0.9, { damping: 5, stiffness: 200 }),
      withSpring(1.1, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 6 })
    );
    onPress?.();
  };

  const eyeAsset =
    mood === 'happy'
      ? MONSTER_PARTS.eyes.closedHappy
      : mood === 'tired'
      ? MONSTER_PARTS.eyes.dead
      : mood === 'angry'
      ? MONSTER_PARTS.eyes.angryRed
      : MONSTER_PARTS.eyes[config.eyeKey];

  const mouthAsset =
    mood === 'happy'
      ? MONSTER_PARTS.mouths.mouthB
      : mood === 'tired'
      ? MONSTER_PARTS.mouths.closedSad
      : MONSTER_PARTS.mouths[config.mouthKey];

  const isCyclops =
    config.eyeKey === 'blue' ||
    config.eyeKey === 'red' ||
    config.eyeKey === 'yellow';

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={[styles.mascotWrapper, animatedStyle]}>
        {/* Pernas */}
        <View style={styles.legsContainer}>
          <Image
            source={MONSTER_PARTS.legs[config.legKey]}
            style={styles.leg}
            resizeMode="contain"
          />
          <Image
            source={MONSTER_PARTS.legs[config.legKey]}
            style={[styles.leg, styles.flippedLeg]}
            resizeMode="contain"
          />
        </View>

        {/* Braços ancorados com alinhamento corrigido */}
        <Image
          source={MONSTER_PARTS.arms[config.armKey]}
          style={styles.armLeft}
          resizeMode="contain"
        />
        <Image
          source={MONSTER_PARTS.arms[config.armKey]}
          style={styles.armRight}
          resizeMode="contain"
        />

        {/* Acessório */}
        <Image
          source={MONSTER_PARTS.details[config.detailKey]}
          style={styles.accessory}
          resizeMode="contain"
        />

        {/* Corpo */}
        <Image
          source={MONSTER_PARTS.bodies[config.bodyKey]}
          style={styles.body}
          resizeMode="contain"
        />

        {/* Olhos */}
        {isCyclops ? (
          <Image
            source={eyeAsset}
            style={styles.cyclopsEye}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.eyesPairContainer}>
            <Image
              source={eyeAsset}
              style={styles.singleEye}
              resizeMode="contain"
            />
            <Image
              source={eyeAsset}
              style={[styles.singleEye, styles.flippedEye]}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Boca */}
        <Image
          source={mouthAsset}
          style={styles.mouth}
          resizeMode="contain"
        />
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
    width: 290,
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: 200,
    height: 200,
    zIndex: 3,
  },
  armLeft: {
    position: 'absolute',
    left: 14, // Puxado para dentro do wrapper para grudar na borda do corpo (200px)
    top: 92,
    width: 65,
    height: 95,
    transform: [{ scaleX: -1 }, { rotate: '-18deg' }],
    zIndex: 2, // Fica atrás do body (zIndex: 3) para esconder a junta
  },
  armRight: {
    position: 'absolute',
    right: 14, // Simétrico ao braço esquerdo
    top: 92,
    width: 65,
    height: 95,
    transform: [{ rotate: '18deg' }],
    zIndex: 2,
  },
  legsContainer: {
    position: 'absolute',
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 110,
    zIndex: 1,
  },
  leg: {
    width: 46,
    height: 54,
  },
  flippedLeg: {
    transform: [{ scaleX: -1 }],
  },
  accessory: {
    position: 'absolute',
    top: 10,
    width: 65,
    height: 85,
    zIndex: 2,
  },
  eyesPairContainer: {
    position: 'absolute',
    top: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 90,
    zIndex: 4,
  },
  singleEye: {
    width: 36,
    height: 40,
  },
  flippedEye: {
    transform: [{ scaleX: -1 }],
  },
  cyclopsEye: {
    position: 'absolute',
    top: 78,
    width: 65,
    height: 65,
    zIndex: 4,
  },
  mouth: {
    position: 'absolute',
    bottom: 60,
    width: 70,
    height: 40,
    zIndex: 4,
  },
});