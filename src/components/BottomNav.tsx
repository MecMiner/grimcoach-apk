import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export type TabType = 'custom' | 'play' | 'awards';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const handlePress = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTab(tab);
  };

  return (
    <View style={styles.navWrapper}>
      <View style={styles.navBar}>
        {/* Aba Esquerda: Mascote */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handlePress('custom')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>👾</Text>
          <Text style={[styles.tabLabel, currentTab === 'custom' && styles.activeTabLabel]}>
            Mascote
          </Text>
        </TouchableOpacity>

        {/* Botão Central: Jogar */}
        <View style={styles.centerButtonOuter}>
          <TouchableOpacity
            style={[styles.centerButton, currentTab === 'play' && styles.centerButtonActive]}
            onPress={() => handlePress('play')}
            activeOpacity={0.85}
          >
            <Text style={styles.playIcon}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Aba Direita: Conquistas */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handlePress('awards')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>🏆</Text>
          <Text style={[styles.tabLabel, currentTab === 'awards' && styles.activeTabLabel]}>
            Prémios
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    width: '100%',
    height: 70,
    backgroundColor: '#FAF5EE',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderWidth: 3,
    borderColor: '#4A3525',
    shadowColor: '#2D1E12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A7463',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#E07A5F',
  },
  centerButtonOuter: {
    position: 'relative',
    top: -20,
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E07A5F',
    borderWidth: 3.5,
    borderColor: '#4A3525',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D1E12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 8,
  },
  centerButtonActive: {
    backgroundColor: '#C85A32',
  },
  playIcon: {
    fontSize: 26,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: 'bold',
  },
});