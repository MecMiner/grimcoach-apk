import React from 'react';
import { View, Image } from 'react-native';
import { SPRITES, ATLAS_WIDTH, ATLAS_HEIGHT } from '../constants/atlasData';

interface SubTextureProps {
  name: keyof typeof SPRITES;
  scale?: number;
}

export const SubTexture: React.FC<SubTextureProps> = ({ name, scale = 1 }) => {
  const frame = SPRITES[name];
  if (!frame) return null;

  return (
    <View
      style={{
        width: frame.width * scale,
        height: frame.height * scale,
        overflow: 'hidden',
      }}
    >
      <Image
        source={require('../../assets/sprites/Default/spritesheet_default.png')}
        style={{
          width: ATLAS_WIDTH * scale,
          height: ATLAS_HEIGHT * scale,
          transform: [
            { translateX: -frame.x * scale },
            { translateY: -frame.y * scale },
          ],
        }}
        resizeMode="stretch"
      />
    </View>
  );
};