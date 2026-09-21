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

type AppFlowState = 'auth' | 'profiles' | 'game';

export interface ActivePhaseState {
  phaseId: number;
  phaseKey: string; // Ex: 'CompareExpressions'
  level: LevelType;
}

const AUTH_TOKEN_KEY = '@grimcoach:auth_token';

export default function App() {
  const [currentFlow, setCurrentFlow] = useState<AppFlowState>('auth');
  const [activeTab, setActiveTab] = useState<MainTabType>('mascot');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Controla se há um minijogo em execução no momento
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

  // Disparado quando o usuário clica em um nível dentro de GameScreen
  const handleStartPhase = (phaseId: number, levelNumber: number) => {
    if (phaseId === 1) {
      setActivePhase({ phaseId: 1, phaseKey: 'CompareExpressions', level: `nivel${levelNumber}` as LevelType });
    } else if (phaseId === 2) {
      setActivePhase({ phaseId: 2, phaseKey: 'SelectExpression', level: `nivel${levelNumber}` as LevelType });
    } else if (phaseId === 3) {
      setActivePhase({ phaseId: 3, phaseKey: 'ConnectExpressions', level: `nivel${levelNumber}` as LevelType });
    } else if (phaseId === 4) {
      setActivePhase({ phaseId: 4, phaseKey: 'FindImpostor', level: `nivel${levelNumber}` as LevelType });
    }else if (phaseId === 5) {
      setActivePhase({ phaseId: 5, phaseKey: 'MemoryGame', level: `nivel${levelNumber}` as LevelType });
    }else if (phaseId === 6) {
      setActivePhase({ phaseId: 5, phaseKey: 'BlinkMechanic', level: `nivel${levelNumber}` as LevelType });
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
        {/* 1. Login do Responsável */}
        {currentFlow === 'auth' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {/* 2. Seleção de Jogador */}
        {currentFlow === 'profiles' && (
          <ProfilesScreen
            onProfileSelected={handleProfileSelected}
            onLogout={handleLogout}
          />
        )}

        {/* 3. Aplicação Principal */}
        {currentFlow === 'game' && (
          <View style={styles.gameContainer}>
            {/* SE UMA FASE ESTIVER ATIVA: Renderiza o minijogo em tela cheia */}
            {activePhase !== null ? (
              <View style={styles.phaseFullscreen}>
                {activePhase.phaseKey === 'CompareExpressions' && (
                  <CompareExpressionsScreen
                    level={activePhase.level}
                    onBack={() => setActivePhase(null)}
                  />
                )}
                {activePhase.phaseKey === 'SelectExpression' && (
                  <SelectExpressionScreen
                    level={activePhase.level}
                    onBack={() => setActivePhase(null)}
                  />
                )}
                {activePhase.phaseKey === 'ConnectExpressions' && (
                  <ConnectExpressionsScreen
                    level={activePhase.level}
                    onBack={() => setActivePhase(null)}
                  />
                )}
                {activePhase.phaseKey === 'FindImpostor' && (
                  <FindImpostorScreen
                    level={activePhase.level}
                    onBack={() => setActivePhase(null)}
                  />
                )}
                {activePhase.phaseKey === 'MemoryGame' && (
                  <MemoryGameScreen
                    level={activePhase.level}
                    onBack={() => setActivePhase(null)}
                  />
                )}
                {activePhase.phaseKey === 'BlinkMechanic' && (
                  <BlinkMechanicScreen
                    level={activePhase.level}
                    onBack={() => setActivePhase(null)}
                  />
                )}
              </View>
            ) : (
              /* SE NENHUMA FASE ESTIVER ABERTA: Renderiza as 3 abas normais + Barra Inferior */
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

                {/* Menu persistente visível em qualquer uma das 3 abas */}
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