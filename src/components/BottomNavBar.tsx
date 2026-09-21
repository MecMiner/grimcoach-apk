import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type MainTabType = 'mascot' | 'play' | 'rewards';

interface BottomNavBarProps {
  currentTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const handleTabPress = (tab: MainTabType, isPlay = false) => {
    if (isPlay) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectTab(tab);
  };

  return (
    <View style={styles.footerContainer}>
      <View style={styles.navBar}>
        {/* 1. Separador Mascote */}
        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.8}
          onPress={() => handleTabPress('mascot')}
        >
          <MaterialCommunityIcons
            name="space-invaders"
            size={24}
            color={currentTab === 'mascot' ? '#D97757' : '#7A6E65'}
          />
          <Text
            style={[
              styles.navText,
              currentTab === 'mascot' && styles.navTextActive,
            ]}
          >
            Mascote
          </Text>
        </TouchableOpacity>

        {/* 2. Botão Central: Jogar (Play) */}
        <View style={styles.centerPlayWrapper}>
          <TouchableOpacity
            style={[
              styles.centerPlayButton,
              currentTab === 'play' && styles.centerPlayButtonActive,
            ]}
            activeOpacity={0.85}
            onPress={() => handleTabPress('play', true)}
          >
            <Ionicons
              name="play"
              size={28}
              color="#FFFFFF"
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>
        </View>

        {/* 3. Separador Recompensas */}
        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.8}
          onPress={() => handleTabPress('rewards')}
        >
          <Ionicons
            name={currentTab === 'rewards' ? 'trophy' : 'trophy-outline'}
            size={24}
            color={currentTab === 'rewards' ? '#D97757' : '#7A6E65'}
          />
          <Text
            style={[
              styles.navText,
              currentTab === 'rewards' && styles.navTextActive,
            ]}
          >
            Recompensas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FDFBF7',
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 75,
  },
  navText: {
    fontSize: 10,
    color: '#7A6E65',
    fontWeight: '700',
    marginTop: 2,
  },
  navTextActive: {
    color: '#D97757',
    fontWeight: '900',
  },
  centerPlayWrapper: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
  },
  centerPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D97757',
    borderWidth: 3,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  centerPlayButtonActive: {
    backgroundColor: '#C56242',
    transform: [{ scale: 1.05 }],
  },
});