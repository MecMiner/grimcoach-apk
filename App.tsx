import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ProfileProvider } from './src/contexts/ProfileContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfilesScreen } from './src/screens/ProfilesScreen';
import { CustomizationScreen } from './src/screens/CustomizationScreen';
import { GameScreen } from './src/screens/GameScreen';
import { RewardsScreen } from './src/screens/RewardsScreen';
import { BottomNavBar, MainTabType } from './src/components/BottomNavBar';

// Import das Fases de Jogo
import CompareExpressionsScreen from './src/screens/games/CompareExpressionsScreen';
import SelectExpressionScreen from './src/screens/games/SelectExpressionScreen';
import { LevelType } from './src/constants/expressionAssets';
import ConnectExpressionsScreen from './src/screens/games/ConnectExpressionsScreen';
import FindImpostorScreen from './src/screens/games/FindImpostorScreen';
import MemoryGameScreen from './src/screens/games/MemoryGameScreen';
import BlinkMechanicScreen from './src/screens/games/BlinkMechanicScreen';
import SmileMechanicScreen from './src/screens/games/SmileMechanicScreen';
import SimonSaysMechanicScreen from './src/screens/games/SimonSaysMechanicScreen';
import ImitateExpressionScreen from './src/screens/games/ImitateExpressionScreen';

type AppFlowState = 'auth' | 'profiles' | 'game';

export interface ActivePhaseState {
  phaseId: number;
  phaseKey: string;
  level: LevelType;
}

const AUTH_TOKEN_KEY = '@grimcoach:auth_token';

export default function App() {
  const [currentFlow, setCurrentFlow] = useState<AppFlowState>('auth');
  const [activeTab, setActiveTab] = useState<MainTabType>('mascot');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activePhase, setActivePhase] = useState<ActivePhaseState | null>(null);

  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          setCurrentFlow('profiles');
        } else {
          setCurrentFlow('auth');
        }
      } catch {
        setCurrentFlow('auth');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkSavedSession();
  }, []);

  const handleLoginSuccess = async (token: string) => {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (e) {
      console.error(e);
    }
    setCurrentFlow('profiles');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.error(e);
    }
    setCurrentFlow('auth');
  };

  const handleProfileSelected = () => {
    setActiveTab('mascot');
    setActivePhase(null);
    setCurrentFlow('game');
  };

  const handleStartPhase = (phaseId: number, levelNumber: number) => {
    const levelKey = `nivel${levelNumber}` as LevelType;
    if (phaseId === 1) {
      setActivePhase({ phaseId: 1, phaseKey: 'CompareExpressions', level: levelKey });
    } else if (phaseId === 2) {
      setActivePhase({ phaseId: 2, phaseKey: 'SelectExpression', level: levelKey });
    } else if (phaseId === 3) {
      setActivePhase({ phaseId: 3, phaseKey: 'ConnectExpressions', level: levelKey });
    } else if (phaseId === 4) {
      setActivePhase({ phaseId: 4, phaseKey: 'FindImpostor', level: levelKey });
    } else if (phaseId === 5) {
      setActivePhase({ phaseId: 5, phaseKey: 'MemoryGame', level: levelKey });
    } else if (phaseId === 6) {
      setActivePhase({ phaseId: 6, phaseKey: 'BlinkMechanic', level: levelKey });
    } else if (phaseId === 7) {
      setActivePhase({ phaseId: 7, phaseKey: 'SmileMechanic', level: levelKey });
    } else if (phaseId === 8) {
      setActivePhase({ phaseId: 8, phaseKey: 'SimonSaysMechanic', level: levelKey });
    } else if (phaseId === 9) {
      setActivePhase({ phaseId: 9, phaseKey: 'ImitateExpression', level: levelKey });
    }
  };

  // Renderizador limpo e seguro contra caracteres/nós de texto soltos
  const renderActivePhase = () => {
    if (!activePhase) return null;

    const handleBack = () => setActivePhase(null);

    switch (activePhase.phaseKey) {
      case 'CompareExpressions':
        return <CompareExpressionsScreen level={activePhase.level} onBack={handleBack} />;
      case 'SelectExpression':
        return <SelectExpressionScreen level={activePhase.level} onBack={handleBack} />;
      case 'ConnectExpressions':
        return <ConnectExpressionsScreen level={activePhase.level} onBack={handleBack} />;
      case 'FindImpostor':
        return <FindImpostorScreen level={activePhase.level} onBack={handleBack} />;
      case 'MemoryGame':
        return <MemoryGameScreen level={activePhase.level} onBack={handleBack} />;
      case 'BlinkMechanic':
        return <BlinkMechanicScreen level={activePhase.level} onBack={handleBack} />;
      case 'SmileMechanic':
        return <SmileMechanicScreen level={activePhase.level} onBack={handleBack} />;
      case 'SimonSaysMechanic':
        return <SimonSaysMechanicScreen level={activePhase.level} onBack={handleBack} />;
      case 'ImitateExpression':
        return <ImitateExpressionScreen level={activePhase.level} onBack={handleBack} />;
      default:
        return null;
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E07A5F" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ProfileProvider>
        {currentFlow === 'auth' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {currentFlow === 'profiles' && (
          <ProfilesScreen
            onProfileSelected={handleProfileSelected}
            onLogout={handleLogout}
          />
        )}

        {currentFlow === 'game' && (
          <View style={styles.gameContainer}>
            {activePhase !== null ? (
              <View style={styles.phaseFullscreen}>
                {renderActivePhase()}
              </View>
            ) : (
              <>
                {activeTab === 'mascot' && (
                  <CustomizationScreen
                    onBackToProfiles={() => setCurrentFlow('profiles')}
                  />
                )}
                {activeTab === 'play' && (
                  <GameScreen onSelectPhaseLevel={handleStartPhase} />
                )}
                {activeTab === 'rewards' && <RewardsScreen />}

                <BottomNavBar
                  currentTab={activeTab}
                  onSelectTab={(tab) => setActiveTab(tab)}
                />
              </>
            )}
          </View>
        )}
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F2EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#F7F2EB',
  },
  phaseFullscreen: {
    flex: 1,
    backgroundColor: '#F7F2EB',
  },
});