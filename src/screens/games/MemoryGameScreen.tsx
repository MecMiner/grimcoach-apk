import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ExpressionService } from '../../services/expressionService';
import { EmotionType, LevelType } from '../../constants/expressionAssets';

let AudioModule: any = null;
try {
  AudioModule = require('expo-av').Audio;
} catch {
  // Fallback silencioso
}

// Imagem do Verso do Baralho
let FundoBaralhoSource: any = null;
try {
  FundoBaralhoSource = require('../../../assets/fundo_baralho.png');
} catch {
  // Fallback caso a imagem ainda não tenha sido colocada na pasta assets
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_ROUNDS = 2;

// ============================================================================
// PROPRIEDADE DE CONFIGURAÇÃO DE TAMANHO DAS CARTAS (AMPLIADO)
// ============================================================================
export const CUSTOM_MEMORY_CARD_SIZE = Math.min((SCREEN_WIDTH - 44) * 0.44, 114);

// Quantidade pretendida de pares por nível
const LEVEL_PAIRS_COUNT: Record<LevelType, number> = {
  nivel1: 4, // 8 cartas (2 colunas x 4 linhas)
  nivel2: 6, // 12 cartas (3 colunas x 4 linhas)
  nivel3: 6, // 12 cartas
  nivel4: 8, // 16 cartas (4 colunas x 4 linhas)
};

const LEVEL_POINTS: Record<LevelType, number> = {
  nivel1: 2,
  nivel2: 3,
  nivel3: 4,
  nivel4: 5,
};

export interface RoundLogPhaseMemory {
  round: number;
  totalPairs: number;
  totalTries: number;
  matchedPairsCount: number;
  timeTakenSeconds: number;
}

export interface PhaseMemorySessionData {
  phaseId: number;
  phaseKey: string;
  level: LevelType;
  startedAt: string;
  finishedAt: string;
  totalTimeSeconds: number;
  totalHits: number;
  totalErrors: number;
  accuracyPercentage: number;
  pointsEarned: number;
  rounds: RoundLogPhaseMemory[];
}

interface MemoryGameProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: PhaseMemorySessionData) => void;
  cardSize?: number;
}

interface MemoryCardItem {
  id: string;
  pairKey: string;
  emotion: EmotionType;
  image: any;
}

// Componente de Carta com Giro 3D nativo
const FlippableCard: React.FC<{
  card: MemoryCardItem;
  isFlipped: boolean;
  isMatched: boolean;
  disabled: boolean;
  onPress: () => void;
  cardWidth: number;
}> = ({ card, isFlipped, isMatched, disabled, onPress, cardWidth }) => {
  const animatedValue = useRef(new Animated.Value(isFlipped || isMatched ? 180 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFlipped || isMatched ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, isMatched]);

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled || isFlipped || isMatched}
      onPress={onPress}
      style={[styles.cardContainer, { width: cardWidth, height: cardWidth }]}
    >
      {/* Verso da Carta (fundo do baralho) */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardBack,
          backAnimatedStyle,
          { width: cardWidth, height: cardWidth },
        ]}
      >
        {FundoBaralhoSource ? (
          <Image source={FundoBaralhoSource} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.fallbackBackCard}>
            <Ionicons name="help" size={34} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>

      {/* Frente da Carta (Foto da Expressão) */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFront,
          frontAnimatedStyle,
          isMatched && styles.cardMatchedBorder,
          { width: cardWidth, height: cardWidth },
        ]}
      >
        <Image source={card.image} style={styles.cardImage} resizeMode="cover" />
        {isMatched && (
          <View style={styles.matchedBadgeOverlay}>
            <Ionicons name="checkmark-circle" size={30} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const MemoryGameScreen: React.FC<MemoryGameProps> = ({
  level = 'nivel1',
  onBack,
  onSaveSession,
  cardSize = CUSTOM_MEMORY_CARD_SIZE,
}) => {
  const pointsPerPair = LEVEL_POINTS[level] || 2;
  const numPairsConfig = LEVEL_PAIRS_COUNT[level] || 4;

  // Estados de Jogo
  const [currentRound, setCurrentRound] = useState(1);
  const [cards, setCards] = useState<MemoryCardItem[]>([]);
  const [actualPairsCount, setActualPairsCount] = useState<number>(numPairsConfig);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedKeys, setMatchedKeys] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialPeeking, setIsInitialPeeking] = useState(true);

  const [score, setScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  // Estados de Tempo e Métricas
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const roundStartTimeRef = useRef<number>(Date.now());
  const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<RoundLogPhaseMemory[]>([]);
  const currentTriesRef = useRef(0);

  // Modais
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  // Efeito de Acerto Pop-up
  const resultScale = useRef(new Animated.Value(0)).current;
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);

  // Cronômetro
  useEffect(() => {
    if (isPaused || isVictoryModalVisible || isInitialPeeking) return;
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isVictoryModalVisible, isInitialPeeking]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const playSound = async (type: 'flip' | 'correct' | 'wrong' | 'pop') => {
    if (!AudioModule) return;
    try {
      const soundUris = {
        flip: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        wrong: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
        pop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      };
      const { sound } = await AudioModule.Sound.createAsync(
        { uri: soundUris[type] },
        { shouldPlay: true, volume: 0.85 }
      );
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch {
      // Ignora silenciosamente
    }
  };

  // Inicialização das cartas da rodada com contagem exata
  const setupNewRound = () => {
    setFlippedIndices([]);
    setMatchedKeys([]);
    setIsLocked(true);
    setIsInitialPeeking(true);
    setRoundFeedback(null);
    resultScale.setValue(0);
    currentTriesRef.current = 0;

    const allEmotions = ExpressionService.getAllEmotions();
    if (allEmotions.length === 0) return;

    // Define a quantidade real de pares com base nas emoções disponíveis
    const targetPairs = Math.min(numPairsConfig, allEmotions.length);
    setActualPairsCount(targetPairs);

    const selectedEmotions = [...allEmotions].sort(() => Math.random() - 0.5).slice(0, targetPairs);

    const generatedCards: MemoryCardItem[] = [];

    selectedEmotions.forEach((emotion, pairIndex) => {
      const pairKey = `pair-${emotion}-${pairIndex}`;
      const images = ExpressionService.getRandomSample(emotion, level, 2);
      const img1 = images[0] || ExpressionService.getRandomImage(emotion, level);
      const img2 = images[1] || img1;

      generatedCards.push({
        id: `${pairKey}-A-${Date.now()}`,
        pairKey,
        emotion,
        image: img1,
      });

      generatedCards.push({
        id: `${pairKey}-B-${Date.now()}`,
        pairKey,
        emotion,
        image: img2,
      });
    });

    const shuffled = generatedCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);

    // Mostra as cartas no início para memorização rápida
    setTimeout(() => {
      setIsInitialPeeking(false);
      setIsLocked(false);
      roundStartTimeRef.current = Date.now();
    }, 2800);
  };

  useEffect(() => {
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  }, [level]);

  // Manipulação do Toque na Carta
  const handleCardPress = useCallback(
    (index: number) => {
      if (isLocked || isInitialPeeking || flippedIndices.includes(index)) return;

      playSound('flip');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const newFlipped = [...flippedIndices, index];
      setFlippedIndices(newFlipped);

      if (newFlipped.length === 2) {
        setIsLocked(true);
        currentTriesRef.current += 1;

        const firstCard = cards[newFlipped[0]];
        const secondCard = cards[newFlipped[1]];

        if (firstCard.emotion === secondCard.emotion) {
          // ACERTOU O PAR
          setTimeout(() => {
            playSound('correct');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setMatchedKeys((prev) => [...prev, firstCard.pairKey]);
            setScore((prev) => prev + pointsPerPair);
            setTotalHits((prev) => prev + 1);
            setFlippedIndices([]);
            setIsLocked(false);
          }, 450);
        } else {
          // PAR INCORRETO
          setTimeout(() => {
            playSound('wrong');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTotalErrors((prev) => prev + 1);
            setFlippedIndices([]);
            setIsLocked(false);
          }, 950);
        }
      }
    },
    [isLocked, isInitialPeeking, flippedIndices, cards, pointsPerPair]
  );

  // Verifica se todos os pares foram completados baseando-se em actualPairsCount
  useEffect(() => {
    if (cards.length > 0 && actualPairsCount > 0 && matchedKeys.length === actualPairsCount) {
      const timeTaken = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));
      roundsLogRef.current.push({
        round: currentRound,
        totalPairs: actualPairsCount,
        totalTries: currentTriesRef.current,
        matchedPairsCount: actualPairsCount,
        timeTakenSeconds: timeTaken,
      });

      setRoundFeedback('RODADA CONCLUÍDA!');
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        if (currentRound < TOTAL_ROUNDS) {
          setCurrentRound((prev) => prev + 1);
          setupNewRound();
        } else {
          finalizeSession();
        }
      }, 1400);
    }
  }, [matchedKeys, actualPairsCount]);

  const finalizeSession = () => {
    const finishedAt = new Date().toISOString();
    const rounds = roundsLogRef.current;
    const finalHits = totalHits;
    const finalErrors = totalErrors;
    const totalTries = finalHits + finalErrors;
    const accuracy = totalTries > 0 ? Math.round((finalHits / totalTries) * 100) : 0;

    const payload: PhaseMemorySessionData = {
      phaseId: 5,
      phaseKey: 'MemoryGame',
      level,
      startedAt: gameStartedAtRef.current,
      finishedAt,
      totalTimeSeconds: secondsElapsed,
      totalHits: finalHits,
      totalErrors: finalErrors,
      accuracyPercentage: accuracy,
      pointsEarned: score,
      rounds,
    };

    console.log('📊 [GrimCoach] Dados Consolidados do Jogo da Memória:', JSON.stringify(payload, null, 2));

    if (onSaveSession) onSaveSession(payload);
    setIsVictoryModalVisible(true);
  };

  const handleResetGame = () => {
    setIsPaused(false);
    setShowExitConfirm(false);
    setShowVideoHelp(false);
    setCurrentRound(1);
    setScore(0);
    setTotalHits(0);
    setTotalErrors(0);
    setSecondsElapsed(0);
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  };

  // Cálculo proporcional do número de colunas e tamanho das cartas
  const totalCardsCount = cards.length;
  const numColumns = totalCardsCount <= 8 ? 2 : totalCardsCount <= 12 ? 3 : 4;
  const gridPadding = 12;
  const cardGap = 10;
  const calculatedCardWidth =
    (SCREEN_WIDTH - gridPadding * 2 - cardGap * (numColumns - 1)) / numColumns;
  const finalCardSize = Math.min(calculatedCardWidth, cardSize);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ============================================================ */}
        {/* 1. HEADER EM 3 LINHAS DEDICADAS                              */}
        {/* ============================================================ */}
        <View style={styles.headerSection}>
          <View style={styles.rowPauseAndTimerHalf}>
            <TouchableOpacity
              style={styles.pauseBtnHalf}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsPaused(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={24} color="#FFFFFF" />
              <Text style={styles.pauseBtnTextHalf}>PAUSAR</Text>
            </TouchableOpacity>

            <View style={styles.timerBannerHalf}>
              <View style={styles.timerIconPill}>
                <Ionicons name="time" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.timerContent}>
                <Text style={styles.timerSubLabel}>TEMPO</Text>
                <Text style={styles.timerTextValue}>{formatTime(secondsElapsed)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreRowBanner}>
            <View style={styles.scoreIconPill}>
              <FontAwesome5 name="star" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.scoreTitleLabel}>PONTUAÇÃO</Text>
            <View style={styles.scoreNumberBadge}>
              <Text style={styles.scoreTextValue}>{score}</Text>
            </View>
          </View>

          <View style={styles.roundProgressRow}>
            <View style={styles.roundPillHeader}>
              <Ionicons name="flag" size={13} color="#FFFFFF" />
              <Text style={styles.roundPillText}>RODADA {currentRound} DE {TOTAL_ROUNDS}</Text>
            </View>
            <View style={styles.roundSegmentsBar}>
              {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.roundSegmentItem,
                    idx + 1 === currentRound && styles.roundSegmentActive,
                    idx + 1 < currentRound && styles.roundSegmentCompleted,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. INSTRUÇÃO INTERATIVA                                      */}
        {/* ============================================================ */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            {isInitialPeeking ? (
              <Text style={styles.boldInstruction}>Memorize as carinhas rápido! 👀</Text>
            ) : (
              <Text>
                Vire as cartas e encontre os <Text style={styles.boldInstruction}>pares de expressões</Text>! 🧠
              </Text>
            )}
          </Text>
          <View style={styles.levelTag}>
            <Text style={styles.levelTagText}>
              Pares Encontrados: {matchedKeys.length}/{actualPairsCount} • +{pointsPerPair} pts por par
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. TABULEIRO COM IMAGENS AMPLIADAS E GIRO 3D                */}
        {/* ============================================================ */}
        <View style={styles.boardContainer}>
          <View style={[styles.gridWrap, { gap: cardGap }]}>
            {cards.map((card, index) => {
              const isFlipped = isInitialPeeking || flippedIndices.includes(index);
              const isMatched = matchedKeys.includes(card.pairKey);

              return (
                <FlippableCard
                  key={card.id}
                  card={card}
                  isFlipped={isFlipped}
                  isMatched={isMatched}
                  disabled={isLocked || isInitialPeeking}
                  onPress={() => handleCardPress(index)}
                  cardWidth={finalCardSize}
                />
              );
            })}
          </View>

          {/* SELO DE RESULTADO DA RODADA CENTRALIZADO */}
          {roundFeedback && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.resultPopBadgeCentered,
                { transform: [{ scale: resultScale }] },
              ]}
            >
              <Text style={styles.resultPopEmoji}>🎉🧠</Text>
              <Text style={styles.resultPopTitle}>{roundFeedback}</Text>
              <Text style={styles.resultPopSub}>Todos os pares foram combinados!</Text>
            </Animated.View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 4. MODAL DE PAUSE                                            */}
        {/* ============================================================ */}
        <Modal
          visible={isPaused}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (showVideoHelp) setShowVideoHelp(false);
            else if (showExitConfirm) setShowExitConfirm(false);
            else setIsPaused(false);
          }}
        >
          <View style={styles.modalDarkBackdrop}>
            {showVideoHelp ? (
              <View style={styles.pauseCard}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.videoBadgeTag}>
                    <Text style={styles.videoBadgeTagText}>Como Jogar 🎬</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeSubModalBtn}
                    onPress={() => setShowVideoHelp(false)}
                  >
                    <Ionicons name="close" size={22} color="#4A3B32" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.videoHelpTitle}>Jogo da Memória</Text>

                <View style={styles.videoPlaceholderCard}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={styles.videoPlaceholderHeading}>Vídeo Explicativo</Text>
                  <Text style={styles.videoPlaceholderSub}>Veja como encontrar os pares!</Text>
                </View>

                <View style={styles.videoTextInstruction}>
                  <Text style={styles.videoTextContent}>
                    Toque em duas cartas para virá-las. Se as duas pessoas estiverem fazendo a mesma carinha, você acertou o par!
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnResume]}
                  onPress={() => setShowVideoHelp(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pauseBtnText}>VOLTAR AO MENU</Text>
                </TouchableOpacity>
              </View>
            ) : !showExitConfirm ? (
              <View style={styles.pauseCard}>
                <View style={styles.pauseIconHeader}>
                  <Ionicons name="pause" size={32} color="#FFFFFF" />
                </View>

                <Text style={styles.pauseTitle}>Jogo Pausado</Text>
                <Text style={styles.pauseSubtitle}>O tempo foi congelado! O que deseja fazer?</Text>

                <View style={styles.pauseStatsRow}>
                  <View style={styles.pauseStatItem}>
                    <Text style={styles.pauseStatLabel}>Tempo Jogado</Text>
                    <Text style={styles.pauseStatValue}>{formatTime(secondsElapsed)}</Text>
                  </View>
                  <View style={styles.pauseStatItem}>
                    <Text style={styles.pauseStatLabel}>Pontuação</Text>
                    <Text style={styles.pauseStatValue}>{score} pts</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnResume]}
                  onPress={() => setIsPaused(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={22} color="#FFFFFF" />
                  <Text style={styles.pauseBtnText}>CONTINUAR JOGANDO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnHowToPlay]}
                  onPress={() => setShowVideoHelp(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="videocam" size={22} color="#FFFFFF" />
                  <Text style={styles.pauseBtnText}>COMO JOGAR 🎬</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnRestart]}
                  onPress={handleResetGame}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={22} color="#4A3B32" />
                  <Text style={[styles.pauseBtnText, { color: '#4A3B32' }]}>REINICIAR FASE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnExit]}
                  onPress={() => setShowExitConfirm(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="exit-outline" size={22} color="#E74C3C" />
                  <Text style={[styles.pauseBtnText, { color: '#E74C3C' }]}>SAIR DO JOGO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pauseCard}>
                <View style={[styles.pauseIconHeader, { backgroundColor: '#E74C3C' }]}>
                  <Ionicons name="warning" size={32} color="#FFFFFF" />
                </View>

                <Text style={styles.pauseTitle}>Tem certeza?</Text>
                <Text style={styles.pauseSubtitle}>
                  Se você sair agora, vai perder os{' '}
                  <Text style={styles.highlightWarning}>{score} pontos acumulados</Text> desta partida!
                </Text>

                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={24} color="#E74C3C" />
                  <Text style={styles.warningBoxText}>O progresso desta fase não será registrado.</Text>
                </View>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnResume]}
                  onPress={() => setShowExitConfirm(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pauseBtnText}>NÃO, CONTINUAR JOGANDO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnConfirmExit]}
                  onPress={() => {
                    setIsPaused(false);
                    setShowExitConfirm(false);
                    onBack?.();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.pauseBtnText, { color: '#FFFFFF' }]}>SIM, QUERO SAIR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>

        {/* ============================================================ */}
        {/* 5. MODAL DE CONCLUSÃO                                        */}
        {/* ============================================================ */}
        <Modal visible={isVictoryModalVisible} transparent animationType="fade">
          <View style={styles.modalDarkBackdrop}>
            <View style={styles.victoryCard}>
              <Text style={styles.victoryTrophy}>🏆</Text>
              <Text style={styles.victoryTitle}>Memória de Campeão!</Text>
              <Text style={styles.victorySubtitle}>
                Sensacional! Você descobriu todos os pares de carinhas escondidas!
              </Text>

              <View style={styles.starsRow}>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
              </View>

              <View style={styles.analyticRow}>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Pares Feitos</Text>
                  <Text style={[styles.analyticValue, { color: '#27AE60' }]}>{totalHits}</Text>
                </View>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Erros</Text>
                  <Text style={[styles.analyticValue, { color: '#E74C3C' }]}>{totalErrors}</Text>
                </View>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Tempo</Text>
                  <Text style={styles.analyticValue}>{formatTime(secondsElapsed)}</Text>
                </View>
              </View>

              <View style={styles.pointsPill}>
                <Text style={styles.pointsPillText}>Total Ganho: +{score} Pontos!</Text>
              </View>

              <View style={styles.victoryActionsRow}>
                <TouchableOpacity
                  style={[styles.victoryModalBtn, styles.btnPlayAgain]}
                  onPress={() => {
                    setIsVictoryModalVisible(false);
                    handleResetGame();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={18} color="#4A3B32" />
                  <Text style={styles.btnPlayAgainText}>JOGAR DE NOVO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.victoryModalBtn, styles.btnContinue]}
                  onPress={() => {
                    setIsVictoryModalVisible(false);
                    onBack?.();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  <Text style={styles.btnContinueText}>CONTINUAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 6,
  },

  // 1. Cabeçalho
  headerSection: {
    width: '100%',
    gap: 8,
  },
  rowPauseAndTimerHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  pauseBtnHalf: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#E07A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderBottomWidth: 5,
    borderBottomColor: '#B85D44',
    elevation: 4,
  },
  pauseBtnTextHalf: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerBannerHalf: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderBottomWidth: 5,
    borderBottomColor: '#C4B7AA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
    elevation: 3,
  },
  timerIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContent: {
    flex: 1,
  },
  timerSubLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#8C7A6B',
  },
  timerTextValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4A3B32',
  },
  scoreRowBanner: {
    width: '100%',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#F39C12',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  scoreIconPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F39C12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTitleLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B5A4E',
    flex: 1,
  },
  scoreNumberBadge: {
    backgroundColor: '#FDF7E7',
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F39C12',
  },
  scoreTextValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#8A5300',
  },
  roundProgressRow: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A3B32',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4A3B32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roundPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  roundSegmentsBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  roundSegmentItem: {
    flex: 1,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#E6DDD2',
  },
  roundSegmentActive: {
    backgroundColor: '#E07A5F',
    height: 11,
  },
  roundSegmentCompleted: {
    backgroundColor: '#27AE60',
  },

  // 2. Instrução
  instructionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginVertical: 4,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A3B32',
    textAlign: 'center',
  },
  boldInstruction: {
    color: '#E07A5F',
    fontWeight: '900',
  },
  levelTag: {
    marginTop: 3,
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E07A5F',
  },

  // 3. Tabuleiro
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardContainer: {
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4A3B32',
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
    elevation: 4,
    borderBottomWidth: 5,
    borderBottomColor: '#2B2018',
  },
  cardBack: {
    backgroundColor: '#E07A5F',
  },
  cardFront: {
    backgroundColor: '#1E1712',
  },
  cardMatchedBorder: {
    borderColor: '#27AE60',
    borderBottomColor: '#1E8449',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBackCard: {
    flex: 1,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchedBadgeOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#27AE60',
    borderRadius: 15,
  },

  // Selo Pop-Up de Resultado da Rodada
  resultPopBadgeCentered: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    marginTop: -65,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  resultPopEmoji: {
    fontSize: 34,
  },
  resultPopTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  resultPopSub: {
    color: '#FDF7E7',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },

  // Modais de Pause e Vitória
  modalDarkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 8, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pauseCard: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    padding: 22,
    alignItems: 'center',
    elevation: 12,
  },
  pauseIconHeader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4A3B32',
    marginBottom: 8,
  },
  pauseTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4A3B32',
  },
  pauseSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5A4E',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  highlightWarning: {
    color: '#E74C3C',
    fontWeight: '900',
  },
  pauseStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  pauseStatItem: {
    flex: 1,
    backgroundColor: '#EDE3D5',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4C6B8',
  },
  pauseStatLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B5A4E',
  },
  pauseStatValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4A3B32',
    marginTop: 2,
  },
  pauseBtnOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    marginBottom: 10,
    borderBottomWidth: 5,
  },
  btnResume: {
    backgroundColor: '#27AE60',
    borderBottomColor: '#1E8449',
  },
  btnHowToPlay: {
    backgroundColor: '#3498DB',
    borderBottomColor: '#2980B9',
  },
  btnRestart: {
    backgroundColor: '#F9E79F',
    borderBottomColor: '#D4AC0D',
  },
  btnExit: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#DDD3C7',
  },
  btnConfirmExit: {
    backgroundColor: '#E74C3C',
    borderBottomColor: '#C0392B',
  },
  pauseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDEDEC',
    borderWidth: 1.5,
    borderColor: '#F5B7B1',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    width: '100%',
  },
  warningBoxText: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  videoBadgeTag: {
    backgroundColor: '#EDE3D5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C6B8',
  },
  videoBadgeTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4A3B32',
  },
  closeSubModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE3D5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A3B32',
  },
  videoHelpTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4A3B32',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  videoPlaceholderCard: {
    width: '100%',
    height: 160,
    backgroundColor: '#3E342F',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 10,
  },
  videoPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E07A5F',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  videoPlaceholderHeading: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  videoPlaceholderSub: {
    color: '#C8BDB2',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  videoTextInstruction: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2D5C5',
    marginBottom: 14,
    width: '100%',
  },
  videoTextContent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C4A3E',
    lineHeight: 16,
    textAlign: 'center',
  },

  victoryCard: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    padding: 24,
    alignItems: 'center',
    elevation: 12,
  },
  victoryTrophy: {
    fontSize: 54,
    marginBottom: 4,
  },
  victoryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4A3B32',
  },
  victorySubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5A4E',
    textAlign: 'center',
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  starBig: {
    fontSize: 32,
  },
  analyticRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginVertical: 10,
  },
  analyticItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4C6B8',
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  analyticLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C7A6B',
  },
  analyticValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4A3B32',
    marginTop: 2,
  },
  pointsPill: {
    backgroundColor: '#F9E79F',
    borderWidth: 2.5,
    borderColor: '#F39C12',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 6,
    marginBottom: 14,
  },
  pointsPillText: {
    color: '#8A5300',
    fontWeight: '900',
    fontSize: 15,
  },
  victoryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  victoryModalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 5,
  },
  btnPlayAgain: {
    backgroundColor: '#F9E79F',
    borderBottomColor: '#D4AC0D',
  },
  btnPlayAgainText: {
    color: '#4A3B32',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  btnContinue: {
    backgroundColor: '#E07A5F',
    borderBottomColor: '#B85D44',
  },
  btnContinueText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

export default MemoryGameScreen;