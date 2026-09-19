import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Mascot, MascotMood, MascotConfig } from './src/components/Mascot';
import { BottomNav, TabType } from './src/components/BottomNav';
import { RankingModal } from './src/components/RankingModal';
import { TasksModal } from './src/components/TasksModal';
import { ShopModal } from './src/components/ShopModal';
import { CustomizationScreen } from './src/screens/CustomizationScreen';

export default function App() {
  const [mood, setMood] = useState<MascotMood>('neutral');
  const [currentTab, setCurrentTab] = useState<TabType>('play');

  const [rankingVisible, setRankingVisible] = useState(false);
  const [tasksVisible, setTasksVisible] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);

  const [playerLevel] = useState<number>(3);
  const [stars, setStars] = useState<number>(95);

  const [unlockedItemIds, setUnlockedItemIds] = useState<string[]>([
    'b_blueA',
    'e_cuteLight',
    'm_closedHappy',
    'a_blueA',
    'l_blueA',
    'd_blueAntennaLarge',
  ]);

  const [mascotConfig, setMascotConfig] = useState<MascotConfig>({
    bodyKey: 'blueA',
    eyeKey: 'cuteLight',
    mouthKey: 'closedHappy',
    armKey: 'blueA',
    legKey: 'blueA',
    detailKey: 'blueAntennaLarge',
  });

  const cycleMood = () => {
    const moods: MascotMood[] = ['neutral', 'happy', 'tired', 'angry'];
    const nextIndex = (moods.indexOf(mood) + 1) % moods.length;
    setMood(moods[nextIndex]);
  };

  const unlockItem = (id: string) => {
    setUnlockedItemIds((prev) => [...prev, id]);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
        <StatusBar hidden={true} />

        <View style={styles.ambientCircleLeft} />
        <View style={styles.ambientCircleRight} />

        {currentTab === 'play' && (
          <>
            <View style={styles.topBar}>
              <View style={styles.playerLevelBadge}>
                <Text style={styles.levelIcon}>⭐</Text>
                <Text style={styles.levelText}>NÍVEL {playerLevel}</Text>
              </View>

              <View style={styles.streakCard}>
                <Text style={styles.streakFlame}>🔥</Text>
                <Text style={styles.streakText}>3 DIAS</Text>
              </View>
            </View>

            <View style={styles.sideActionsColumn}>
              <TouchableOpacity
                style={styles.circleActionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRankingVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.circleButtonIcon}>👑</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleActionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTasksVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.circleButtonIcon}>📋</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.centerArea}>
              <View style={styles.mascotContainer}>
                <View style={styles.nameplate}>
                  <Text style={styles.nameplateText}>Grimi</Text>
                </View>

                <Mascot mood={mood} config={mascotConfig} onPress={cycleMood} />

                <View style={styles.tapTipCard}>
                  <Text style={styles.tapTipText}>Toca no Grimi para brincar! ✨</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {currentTab === 'custom' && (
          <CustomizationScreen
            currentConfig={mascotConfig}
            onUpdateConfig={setMascotConfig}
            unlockedItemIds={unlockedItemIds}
            onOpenShop={() => setShopVisible(true)}
          />
        )}

        {currentTab === 'awards' && (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderTitle}>Sala de Troféus</Text>
          </View>
        )}

        <RankingModal
          visible={rankingVisible}
          onClose={() => setRankingVisible(false)}
        />
        <TasksModal
          visible={tasksVisible}
          onClose={() => setTasksVisible(false)}
        />
        <ShopModal
          visible={shopVisible}
          onClose={() => setShopVisible(false)}
          playerLevel={playerLevel}
          stars={stars}
          onUpdateStars={setStars}
          unlockedItemIds={unlockedItemIds}
          onUnlockItem={unlockItem}
          currentConfig={mascotConfig}
          onUpdateConfig={setMascotConfig}
        />

        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  ambientCircleLeft: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EFE5D8',
    opacity: 0.8,
  },
  ambientCircleRight: {
    position: 'absolute',
    top: 180,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#EAD9C6',
    opacity: 0.6,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  playerLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#4A3525',
    gap: 6,
  },
  levelIcon: {
    fontSize: 16,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4A3525',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#4A3525',
    gap: 6,
  },
  streakFlame: {
    fontSize: 18,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D46B08',
  },
  sideActionsColumn: {
    position: 'absolute',
    right: 18,
    top: '18%',
    flexDirection: 'column',
    gap: 14,
    zIndex: 10,
  },
  circleActionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4A3525',
    elevation: 6,
  },
  circleButtonIcon: {
    fontSize: 22,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 85,
  },
  mascotContainer: {
    alignItems: 'center',
  },
  nameplate: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#4A3525',
    marginBottom: 10,
  },
  nameplateText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4A3525',
  },
  tapTipCard: {
    marginTop: 16,
    backgroundColor: '#EFE5D8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D9C8B4',
  },
  tapTipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B5344',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4A3525',
  },
});