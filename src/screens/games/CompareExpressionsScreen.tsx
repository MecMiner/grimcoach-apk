import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Modal,
  Easing,
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
  // Fallback defensivo
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_GAP = 16;
const CARD_SIZE = Math.min((SCREEN_WIDTH - 32 - CARD_GAP) / 2, 178);
const ORBIT_RADIUS = (CARD_SIZE + CARD_GAP) / 2;
const TOTAL_ROUNDS = 5;

const LEVEL_POINTS: Record<LevelType, number> = {
  nivel1: 1,
  nivel2: 2,
  nivel3: 3,
  nivel4: 4,
};

// ESTRUTURAS DE DADOS PARA ANÁLISE COMPORTAMENTAL / CLÍNICA
export interface RoundLog {
  round: number;
  emotion1: EmotionType;
  emotion2: EmotionType;
  wasEqual: boolean;
  userChoice: boolean;
  isCorrect: boolean;
  reactionTimeSeconds: number;
}

export interface PhaseSessionData {
  phaseId: number;
  phaseKey: string;
  level: LevelType;
  startedAt: string;
  finishedAt: string;
  totalTimeSeconds: number;
  totalHits: number;
  totalErrors: number;
  accuracyPercentage: number;
  averageReactionTimeSeconds: number;
  pointsEarned: number;
  rounds: RoundLog[];
}

interface CompareExpressionsProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: PhaseSessionData) => void;
}

export const CompareExpressionsScreen: React.FC<CompareExpressionsProps> = ({
  level = 'nivel1',
  onBack,
  onSaveSession,
}) => {
  const pointsPerHit = LEVEL_POINTS[level] || 1;

  // Estados do Jogo
  const [currentRound, setCurrentRound] = useState(1);
  const [emotion1, setEmotion1] = useState<EmotionType>('alegria');
  const [emotion2, setEmotion2] = useState<EmotionType>('alegria');
  const [imgSource1, setImgSource1] = useState<any>(null);
  const [imgSource2, setImgSource2] = useState<any>(null);

  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Tempo e Métricas
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const roundStartTimeRef = useRef<number>(Date.now());
  const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<RoundLog[]>([]);

  // Estados de Modais
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  // Animações
  const enterAnim = useRef(new Animated.Value(0)).current;
  const orbitProgress = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(1)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Cronômetro global
  useEffect(() => {
    if (isPaused || isVictoryModalVisible) return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isVictoryModalVisible]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const playSound = async (type: 'whoosh' | 'correct' | 'wrong') => {
    if (!AudioModule) return;
    try {
      const soundUris = {
        whoosh: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        wrong: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
      };

      const { sound } = await AudioModule.Sound.createAsync(
        { uri: soundUris[type] },
        { shouldPlay: true, volume: 0.85 }
      );

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // Ignora silenciosamente
    }
  };

  const startEntranceAnimation = () => {
    enterAnim.setValue(0);
    orbitProgress.setValue(0);
    resultScale.setValue(0);
    shockwaveScale.setValue(0);
    shockwaveOpacity.setValue(1);
    exitAnim.setValue(1);
    shakeAnim.setValue(0);

    Animated.spring(enterAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const setupNewRound = () => {
    setFeedbackType(null);
    setIsProcessing(false);

    const allEmotions = ExpressionService.getAllEmotions();
    if (allEmotions.length === 0) return;

    const shouldBeEqual = Math.random() < 0.5;
    const firstEmotion = allEmotions[Math.floor(Math.random() * allEmotions.length)];
    let secondEmotion = firstEmotion;

    if (!shouldBeEqual) {
      const otherEmotions = allEmotions.filter((e) => e !== firstEmotion);
      secondEmotion = otherEmotions[Math.floor(Math.random() * otherEmotions.length)];
    }

    setEmotion1(firstEmotion);
    setEmotion2(secondEmotion);

    if (shouldBeEqual) {
      const pair = ExpressionService.getRandomSample(firstEmotion, level, 2);
      setImgSource1(pair[0] || ExpressionService.getRandomImage(firstEmotion, level));
      setImgSource2(pair[1] || pair[0]);
    } else {
      setImgSource1(ExpressionService.getRandomImage(firstEmotion, level));
      setImgSource2(ExpressionService.getRandomImage(secondEmotion, level));
    }

    // Inicia a marcação do tempo desta rodada
    roundStartTimeRef.current = Date.now();
    startEntranceAnimation();
  };

  useEffect(() => {
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  }, [level]);

  // GERAÇÃO DOS DADOS FINAIS DA PARTIDA (Cálculo síncrono e preciso)
  const finalizeGameSession = () => {
    const finishedAt = new Date().toISOString();
    const rounds = roundsLogRef.current;
    const totalRoundsPlayed = rounds.length;

    // Calcula diretamente dos registros gravados (evita o atraso do useState)
    const finalHits = rounds.filter((r) => r.isCorrect).length;
    const finalErrors = rounds.filter((r) => !r.isCorrect).length;

    const totalReactionTime = rounds.reduce(
      (acc, r) => acc + r.reactionTimeSeconds,
      0
    );
    const avgReactionTime =
      totalRoundsPlayed > 0 ? Number((totalReactionTime / totalRoundsPlayed).toFixed(2)) : 0;

    const accuracy =
      totalRoundsPlayed > 0 ? Math.round((finalHits / totalRoundsPlayed) * 100) : 0;

    // Atualiza os estados para exibição no modal de vitória
    setTotalHits(finalHits);
    setTotalErrors(finalErrors);

    const sessionPayload: PhaseSessionData = {
      phaseId: 1,
      phaseKey: 'CompareExpressions',
      level,
      startedAt: gameStartedAtRef.current,
      finishedAt,
      totalTimeSeconds: secondsElapsed,
      totalHits: finalHits,
      totalErrors: finalErrors,
      accuracyPercentage: accuracy,
      averageReactionTimeSeconds: avgReactionTime,
      pointsEarned: score,
      rounds,
    };

    console.log('📊 [GrimCoach] Dados Consolidados da Fase 1:', JSON.stringify(sessionPayload, null, 2));

    if (onSaveSession) {
      onSaveSession(sessionPayload);
    }
    setIsVictoryModalVisible(true);
  };

  const advanceToNextRoundOrEnd = () => {
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.in(Easing.back(1.4)),
      useNativeDriver: true,
    }).start(() => {
      if (currentRound < TOTAL_ROUNDS) {
        setCurrentRound((prev) => prev + 1);
        setupNewRound();
      } else {
        finalizeGameSession();
      }
    });
  };

  const executeOrbitAndReveal = (userChoice: boolean) => {
    setIsProcessing(true);

    // Registra métricas de tempo da rodada
    const reactionTime = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));
    const wasEqual = emotion1 === emotion2;
    const isCorrect = userChoice === wasEqual;

    roundsLogRef.current.push({
      round: currentRound,
      emotion1,
      emotion2,
      wasEqual,
      userChoice,
      isCorrect,
      reactionTimeSeconds: reactionTime,
    });

    setFeedbackType(isCorrect ? 'correct' : 'wrong');

    playSound('whoosh');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.timing(orbitProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.bezier(0.2, 0.05, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      playSound(isCorrect ? 'correct' : 'wrong');

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScore((prev) => prev + pointsPerHit);
        setTotalHits((prev) => prev + 1);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTotalErrors((prev) => prev + 1);
      }

      Animated.parallel([
        Animated.timing(shockwaveScale, {
          toValue: 2.3,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(shockwaveOpacity, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(resultScale, {
          toValue: 1,
          friction: 4,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isCorrect) {
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
          ]).start();
        }

        setTimeout(() => {
          advanceToNextRoundOrEnd();
        }, 900);
      });
    });
  };

  const handleAnswer = (userChoseEqual: boolean) => {
    if (isProcessing || isPaused) return;
    executeOrbitAndReveal(userChoseEqual);
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

  // Coordenadas da Órbita
  const card1X = orbitProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-ORBIT_RADIUS, -ORBIT_RADIUS * 0.7, 0, ORBIT_RADIUS * 0.4, 0],
  });
  const card1Y = orbitProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -ORBIT_RADIUS * 0.7, -ORBIT_RADIUS, -ORBIT_RADIUS * 0.4, 0],
  });
  const card1Rotate = orbitProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '270deg', '540deg'],
  });

  const card2X = orbitProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [ORBIT_RADIUS, ORBIT_RADIUS * 0.7, 0, -ORBIT_RADIUS * 0.4, 0],
  });
  const card2Y = orbitProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, ORBIT_RADIUS * 0.7, ORBIT_RADIUS, ORBIT_RADIUS * 0.4, 0],
  });
  const card2Rotate = orbitProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-270deg', '-540deg'],
  });

  const cardsScale = orbitProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.94, 0.75],
  });
  const cardsOpacity = orbitProgress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0.9, 0.15],
  });

  // MENSAGEM DINÂMICA DE CONCLUSÃO
 const getVictoryFeedback = () => {
    const hits = roundsLogRef.current.filter((r) => r.isCorrect).length;

    if (hits === TOTAL_ROUNDS) {
      return {
        title: 'Desempenho Perfeito!',
        subtitle: 'Incrível! Você acertou todas as 5 comparações de expressões com maestria!',
        stars: ['⭐', '⭐', '⭐'],
      };
    }
    if (hits >= 3) {
      return {
        title: 'Muito Bem!',
        subtitle: 'Você teve um ótimo resultado e identificou muito bem as emoções!',
        stars: ['⭐', '⭐', '☆'],
      };
    }
    if (hits >= 1) {
      return {
        title: 'Bom Treino!',
        subtitle: 'Você acertou expressões importantes! Continue praticando para acertar ainda mais!',
        stars: ['⭐', '☆', '☆'],
      };
    }
    return {
      title: 'Valeu a Tentativa!',
      subtitle: 'Não desanime! Na próxima tentativa você vai reconhecer as carinhas com mais calma!',
      stars: ['☆', '☆', '☆'],
    };
  };

  const victoryFeedback = getVictoryFeedback();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ============================================================ */}
        {/* 1. TOPO: PAINEL DISTRIBUÍDO EM LINHAS                        */}
        {/* ============================================================ */}
        <View style={styles.headerSection}>
          {/* LINHA 1: PAUSE (50%) + CRONÔMETRO (50%) */}
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

          {/* LINHA 2: BANNER DE PONTOS */}
          <View style={styles.scoreRowBanner}>
            <View style={styles.scoreIconPill}>
              <FontAwesome5 name="star" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.scoreTitleLabel}>PONTUAÇÃO</Text>
            <View style={styles.scoreNumberBadge}>
              <Text style={styles.scoreTextValue}>{score}</Text>
            </View>
          </View>

          {/* LINHA 3: BARRA DE PROGRESSO DA RODADA */}
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
        {/* 2. ARENA DE ÓRBITA CIRCULAR COM CARDS 1:1                   */}
        {/* ============================================================ */}
        <Animated.View
          style={[
            styles.arenaContainer,
            {
              transform: [
                { scale: exitAnim },
                { translateY: exitAnim.interpolate({ inputRange: [0, 1], outputRange: [-25, 0] }) },
                { translateX: shakeAnim },
              ],
              opacity: exitAnim,
            },
          ]}
        >
          <View style={styles.orbitStage}>
            {/* Card 1 */}
            <Animated.View
              style={[
                styles.imageCardSquare,
                feedbackType === 'correct' && styles.cardSuccessBorder,
                feedbackType === 'wrong' && styles.cardWrongBorder,
                {
                  opacity: cardsOpacity,
                  transform: [
                    { translateX: card1X },
                    { translateY: card1Y },
                    { rotate: card1Rotate },
                    { scale: cardsScale },
                  ],
                },
              ]}
            >
              {imgSource1 ? (
                <Image source={imgSource1} style={styles.faceImage} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={56} color="#C4B7AA" />
              )}
            </Animated.View>

            {/* Card 2 */}
            <Animated.View
              style={[
                styles.imageCardSquare,
                feedbackType === 'correct' && styles.cardSuccessBorder,
                feedbackType === 'wrong' && styles.cardWrongBorder,
                {
                  opacity: cardsOpacity,
                  transform: [
                    { translateX: card2X },
                    { translateY: card2Y },
                    { rotate: card2Rotate },
                    { scale: cardsScale },
                  ],
                },
              ]}
            >
              {imgSource2 ? (
                <Image source={imgSource2} style={styles.faceImage} resizeMode="cover" />
              ) : (
                <Ionicons name="image-outline" size={56} color="#C4B7AA" />
              )}
            </Animated.View>

            {/* Selo VS */}
            <Animated.View
              style={[
                styles.vsBadge,
                {
                  opacity: orbitProgress.interpolate({
                    inputRange: [0, 0.2],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Text style={styles.vsText}>VS</Text>
            </Animated.View>

            {/* Onda de Choque */}
            <Animated.View
              style={[
                styles.shockwave,
                feedbackType === 'correct' ? styles.shockwaveSuccess : styles.shockwaveWrong,
                {
                  transform: [{ scale: shockwaveScale }],
                  opacity: shockwaveOpacity,
                },
              ]}
            />

            {/* Selo Pop-Up de Resultado */}
            <Animated.View
              style={[
                styles.resultPopBadge,
                feedbackType === 'correct' ? styles.resultSuccessBadge : styles.resultWrongBadge,
                {
                  transform: [{ scale: resultScale }],
                },
              ]}
            >
              <Ionicons
                name={feedbackType === 'correct' ? 'checkmark-circle' : 'close-circle'}
                size={52}
                color="#FFFFFF"
              />
              <Text style={styles.resultPopText}>
                {feedbackType === 'correct' ? 'ACERTOU!' : 'OPS, NÃO FOI!'}
              </Text>
              <Text style={styles.resultSubText}>
                {feedbackType === 'correct'
                  ? `+${pointsPerHit} ${pointsPerHit > 1 ? 'PONTOS' : 'PONTO'} ⭐`
                  : 'VAMOS PARA A PRÓXIMA! 🚀'}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ============================================================ */}
        {/* 3. CAIXA DE TEXTO / PERGUNTA                                */}
        {/* ============================================================ */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            As expressões dos dois rostinhos são <Text style={styles.boldUnderline}>iguais</Text> ou <Text style={styles.boldUnderline}>diferentes</Text>?
          </Text>
          <View style={styles.levelTag}>
            <Text style={styles.levelTagText}>
              Nível {level.replace('nivel', '')} • Vale +{pointsPerHit} {pointsPerHit > 1 ? 'pontos' : 'ponto'} por acerto
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 4. BOTÕES DE RESPOSTA GIGANTES                               */}
        {/* ============================================================ */}
        <View style={styles.actionsRow}>
          {/* BOTÃO IGUAL */}
          <TouchableOpacity
            style={[styles.actionButton, styles.btnEqual, isProcessing && styles.btnDisabled]}
            onPress={() => handleAnswer(true)}
            disabled={isProcessing}
            activeOpacity={0.88}
          >
            <View style={styles.btnIconContainer}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.btnTitle}>SÃO IGUAIS</Text>
          </TouchableOpacity>

          {/* BOTÃO DIFERENTE */}
          <TouchableOpacity
            style={[styles.actionButton, styles.btnDifferent, isProcessing && styles.btnDisabled]}
            onPress={() => handleAnswer(false)}
            disabled={isProcessing}
            activeOpacity={0.88}
          >
            <View style={styles.btnIconContainer}>
              <Ionicons name="close" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.btnTitle}>DIFERENTES</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 5. MODAL DE PAUSE COM MENU E VÍDEO "COMO JOGAR"             */}
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

                <Text style={styles.videoHelpTitle}>Compare as Expressões</Text>

                <View style={styles.videoPlaceholderCard}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={styles.videoPlaceholderHeading}>Vídeo Demonstrativo</Text>
                  <Text style={styles.videoPlaceholderSub}>Assista e veja como comparar os rostinhos!</Text>
                </View>

                <View style={styles.videoTextInstruction}>
                  <Text style={styles.videoTextContent}>
                    Olhe as expressões com atenção! Se as duas carinhas estiverem sentindo a mesma emoção, clique em <Text style={{ color: '#27AE60', fontWeight: '900' }}>SÃO IGUAIS</Text>. Se forem emoções diferentes, clique em <Text style={{ color: '#E07A5F', fontWeight: '900' }}>DIFERENTES</Text>!
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
                <Text style={styles.pauseSubtitle}>O tempo foi pausado! Escolha uma opção:</Text>

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
        {/* 6. MODAL DE CONCLUSÃO COM FEEDBACK E OPÇÃO DE REPETIR       */}
        {/* ============================================================ */}
        <Modal visible={isVictoryModalVisible} transparent animationType="fade">
          <View style={styles.modalDarkBackdrop}>
            <View style={styles.victoryCard}>
              <Text style={styles.victoryTrophy}>
                {totalHits >= 3 ? '🏆' : totalHits >= 1 ? '🌟' : '💪'}
              </Text>
              <Text style={styles.victoryTitle}>{victoryFeedback.title}</Text>
              <Text style={styles.victorySubtitle}>{victoryFeedback.subtitle}</Text>

              {/* ESTRELAS CONQUISTADAS */}
              <View style={styles.starsRow}>
                {victoryFeedback.stars.map((st, i) => (
                  <Text key={i} style={styles.starBig}>{st}</Text>
                ))}
              </View>

              {/* RESUMO ANALÍTICO */}
              <View style={styles.analyticRow}>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Acertos</Text>
                  <Text style={[styles.analyticValue, { color: '#27AE60' }]}>
                    {totalHits}/{TOTAL_ROUNDS}
                  </Text>
                </View>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Erros</Text>
                  <Text style={[styles.analyticValue, { color: '#E74C3C' }]}>
                    {totalErrors}
                  </Text>
                </View>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Tempo</Text>
                  <Text style={styles.analyticValue}>{formatTime(secondsElapsed)}</Text>
                </View>
              </View>

              <View style={styles.pointsPill}>
                <Text style={styles.pointsPillText}>Total Ganho: +{score} Pontos!</Text>
              </View>

              {/* BOTÕES DE AÇÃO: JOGAR NOVAMENTE OU CONTINUAR */}
              <View style={styles.victoryActionsRow}>
                {/* 1. REPETIR A FASE */}
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

                {/* 2. CONTINUAR / SAIR PARA O MENU */}
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
    paddingBottom: 20,
    paddingTop: 6,
  },

  // 1. Cabeçalho Estruturado em 3 Linhas
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
    height: 56,
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
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
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
    height: 56,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContent: {
    flex: 1,
  },
  timerSubLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8C7A6B',
    letterSpacing: 0.5,
  },
  timerTextValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4A3B32',
    letterSpacing: 0.8,
    lineHeight: 20,
  },
  scoreRowBanner: {
    width: '100%',
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#F39C12',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    elevation: 2,
  },
  scoreIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F39C12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTitleLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B5A4E',
    letterSpacing: 0.5,
    flex: 1,
  },
  scoreNumberBadge: {
    backgroundColor: '#FDF7E7',
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F39C12',
  },
  scoreTextValue: {
    fontSize: 18,
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
    letterSpacing: 0.4,
  },
  roundSegmentsBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  roundSegmentItem: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E6DDD2',
  },
  roundSegmentActive: {
    backgroundColor: '#E07A5F',
    height: 12,
  },
  roundSegmentCompleted: {
    backgroundColor: '#27AE60',
  },

  // 2. Arena de Imagens 1:1
  arenaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: CARD_SIZE + 40,
    width: '100%',
  },
  orbitStage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageCardSquare: {
    position: 'absolute',
    width: CARD_SIZE,
    height: CARD_SIZE,
    aspectRatio: 1,
    backgroundColor: '#1E1712',
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#4A3B32',
    overflow: 'hidden',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSuccessBorder: {
    borderColor: '#27AE60',
  },
  cardWrongBorder: {
    borderColor: '#E74C3C',
  },
  faceImage: {
    width: '100%',
    height: '100%',
  },
  vsBadge: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FAF5EE',
    borderWidth: 3,
    borderColor: '#4A3B32',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 9,
  },
  vsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E07A5F',
  },
  shockwave: {
    position: 'absolute',
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    zIndex: 15,
  },
  shockwaveSuccess: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  shockwaveWrong: {
    borderColor: '#E74C3C',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  resultPopBadge: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    minWidth: 190,
  },
  resultSuccessBadge: {
    backgroundColor: '#27AE60',
  },
  resultWrongBadge: {
    backgroundColor: '#E74C3C',
  },
  resultPopText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  resultSubText: {
    color: '#F9E79F',
    fontWeight: '900',
    fontSize: 12,
    marginTop: 2,
  },

  // 3. Caixa de Instrução
  instructionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#4A3B32',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A3B32',
    textAlign: 'center',
    lineHeight: 22,
  },
  boldUnderline: {
    color: '#E07A5F',
    textDecorationLine: 'underline',
  },
  levelTag: {
    marginTop: 6,
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2D5C5',
  },
  levelTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E07A5F',
  },

  // 4. Botões de Resposta
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    height: 112,
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 6,
    borderBottomWidth: 8,
  },
  btnEqual: {
    backgroundColor: '#27AE60',
    borderBottomColor: '#1E8449',
  },
  btnDifferent: {
    backgroundColor: '#E07A5F',
    borderBottomColor: '#B85D44',
  },
  btnDisabled: {
    opacity: 0.75,
  },
  btnIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  btnTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // 5. Modais de Pause
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

  // Subtela Como Jogar
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

  // 6. Modal de Vitória
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
  victoryBtn: {
    backgroundColor: '#E07A5F',
    borderWidth: 3,
    borderColor: '#4A3B32',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 42,
    borderBottomWidth: 6,
    borderBottomColor: '#B85D44',
  },
  victoryBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  // Botões de Ação do Modal de Vitória
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

export default CompareExpressionsScreen;