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
  // Fallback silencioso
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_ROUNDS = 5;

// Pontuação máxima inicial por rodada (decai a cada erro até 0)
const LEVEL_MAX_ROUND_POINTS: Record<LevelType, number> = {
  nivel1: 4,
  nivel2: 6,
  nivel3: 8,
  nivel4: 10,
};

// Penalidade de pontos por cada clique incorreto
const PENALTY_PER_ERROR = 1;

const LEVEL_CARD_COUNTS: Record<LevelType, number> = {
  nivel1: 6,  // 2 colunas x 3 linhas
  nivel2: 8,  // 2 colunas x 4 linhas
  nivel3: 9,  // 3 colunas x 3 linhas
  nivel4: 12, // 3 colunas x 4 linhas
};

export interface RoundLogPhase4 {
  round: number;
  dominantEmotion: EmotionType;
  impostorEmotion: EmotionType;
  totalCards: number;
  triesCount: number;
  pointsEarnedInRound: number;
  isCompletedSuccessfully: boolean;
  reactionTimeSeconds: number;
}

export interface Phase4SessionData {
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
  rounds: RoundLogPhase4[];
}

interface FindImpostorProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: Phase4SessionData) => void;
}

interface ImpostorCard {
  id: string;
  emotion: EmotionType;
  image: any;
  isImpostor: boolean;
}

export const FindImpostorScreen: React.FC<FindImpostorProps> = ({
  level = 'nivel1',
  onBack,
  onSaveSession,
}) => {
  const maxRoundPoints = LEVEL_MAX_ROUND_POINTS[level] || 4;
  const totalCardsInLevel = LEVEL_CARD_COUNTS[level] || 6;
  const numColumns = totalCardsInLevel >= 9 ? 3 : 2;

  // Estados do Jogo
  const [currentRound, setCurrentRound] = useState(1);
  const [cards, setCards] = useState<ImpostorCard[]>([]);
  const [dominantEmotion, setDominantEmotion] = useState<EmotionType>('alegria');
  const [impostorEmotion, setImpostorEmotion] = useState<EmotionType>('tristeza');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [clickedWrongIds, setClickedWrongIds] = useState<string[]>([]);
  const [currentRoundPoints, setCurrentRoundPoints] = useState(maxRoundPoints);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [roundOutcome, setRoundOutcome] = useState<'success' | 'failed' | null>(null);

  const [score, setScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  // Estados de Tempo e Métricas
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const roundStartTimeRef = useRef<number>(Date.now());
  const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<RoundLogPhase4[]>([]);
  const currentTriesRef = useRef(0);

  // Modais
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  // Animações
  const gridAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Cronômetro (pausa durante avaliação ou pause)
  useEffect(() => {
    if (isPaused || isVictoryModalVisible || isEvaluating) return;
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, isVictoryModalVisible, isEvaluating]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const playSound = async (type: 'pop' | 'correct' | 'wrong') => {
    if (!AudioModule) return;
    try {
      const soundUris = {
        pop: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        wrong: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
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

  const startEntranceAnimation = () => {
    gridAnim.setValue(0);
    resultScale.setValue(0);
    shockwaveScale.setValue(0);
    shockwaveOpacity.setValue(1);
    shakeAnim.setValue(0);

    Animated.spring(gridAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  // Configuração da Rodada
  const setupNewRound = () => {
    setSelectedCardId(null);
    setClickedWrongIds([]);
    setIsEvaluating(false);
    setRoundOutcome(null);
    setCurrentRoundPoints(maxRoundPoints);
    currentTriesRef.current = 0;

    const allEmotions = ExpressionService.getAllEmotions();
    if (allEmotions.length < 2) return;

    const shuffled = [...allEmotions].sort(() => Math.random() - 0.5);
    const dominant = shuffled[0];
    const impostor = shuffled[1];

    setDominantEmotion(dominant);
    setImpostorEmotion(impostor);

    const groupCount = totalCardsInLevel - 1;
    const dominantImages = ExpressionService.getRandomSample(dominant, level, groupCount);
    const impostorImage = ExpressionService.getRandomImage(impostor, level);

    const roundList: ImpostorCard[] = [
      {
        id: `impostor-${impostor}-${Date.now()}`,
        emotion: impostor,
        image: impostorImage,
        isImpostor: true,
      },
      ...dominantImages.map((img, idx) => ({
        id: `group-${dominant}-${idx}-${Date.now()}`,
        emotion: dominant,
        image: img,
        isImpostor: false,
      })),
    ].sort(() => Math.random() - 0.5);

    setCards(roundList);
    roundStartTimeRef.current = Date.now();
    startEntranceAnimation();
  };

  useEffect(() => {
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  }, [level]);

  const handleCardPress = (card: ImpostorCard) => {
    if (isEvaluating || isPaused) return;

    // Se já clicou nessa carta errada antes, ignora
    if (clickedWrongIds.includes(card.id)) return;

    currentTriesRef.current += 1;
    setSelectedCardId(card.id);

    if (card.isImpostor) {
      // ==========================================
      // CASO 1: ACERTOU O IMPOSTOR
      // ==========================================
      setIsEvaluating(true);
      setRoundOutcome('success');
      const reactionTime = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));

      roundsLogRef.current.push({
        round: currentRound,
        dominantEmotion,
        impostorEmotion,
        totalCards: totalCardsInLevel,
        triesCount: currentTriesRef.current,
        pointsEarnedInRound: currentRoundPoints,
        isCompletedSuccessfully: true,
        reactionTimeSeconds: reactionTime,
      });

      setScore((prev) => prev + currentRoundPoints);
      setTotalHits((prev) => prev + 1);

      playSound('correct');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      triggerFeedbackAnimation();
    } else {
      // ==========================================
      // CASO 2: CLICOU EM UMA CARTA COMUM (ERRO)
      // ==========================================
      setTotalErrors((prev) => prev + 1);
      setClickedWrongIds((prev) => [...prev, card.id]);
      const nextPoints = Math.max(0, currentRoundPoints - PENALTY_PER_ERROR);
      setCurrentRoundPoints(nextPoints);

      playSound('wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();

      // SE CHEGOU EM ZERO: PERDE A RODADA E VAI PARA A PRÓXIMA
      if (nextPoints === 0) {
        setIsEvaluating(true);
        setRoundOutcome('failed');
        const reactionTime = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));

        roundsLogRef.current.push({
          round: currentRound,
          dominantEmotion,
          impostorEmotion,
          totalCards: totalCardsInLevel,
          triesCount: currentTriesRef.current,
          pointsEarnedInRound: 0,
          isCompletedSuccessfully: false,
          reactionTimeSeconds: reactionTime,
        });

        triggerFeedbackAnimation();
      }
    }
  };

  const triggerFeedbackAnimation = () => {
    Animated.parallel([
      Animated.timing(shockwaveScale, {
        toValue: 2.2,
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
      setTimeout(() => {
        advanceOrFinish();
      }, 1400);
    });
  };

  const advanceOrFinish = () => {
    Animated.timing(gridAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.back(1.4)),
      useNativeDriver: true,
    }).start(() => {
      if (currentRound < TOTAL_ROUNDS) {
        setCurrentRound((prev) => prev + 1);
        setupNewRound();
      } else {
        finalizeSession();
      }
    });
  };

  const finalizeSession = () => {
    const finishedAt = new Date().toISOString();
    const rounds = roundsLogRef.current;
    const finalHits = totalHits;
    const finalErrors = totalErrors;
    const totalTries = finalHits + finalErrors;
    const accuracy = totalTries > 0 ? Math.round((finalHits / totalTries) * 100) : 0;

    const totalReaction = rounds.reduce((acc, r) => acc + r.reactionTimeSeconds, 0);
    const avgReaction = rounds.length > 0 ? Number((totalReaction / rounds.length).toFixed(2)) : 0;

    const payload: Phase4SessionData = {
      phaseId: 4,
      phaseKey: 'FindImpostor',
      level,
      startedAt: gameStartedAtRef.current,
      finishedAt,
      totalTimeSeconds: secondsElapsed,
      totalHits: finalHits,
      totalErrors: finalErrors,
      accuracyPercentage: accuracy,
      averageReactionTimeSeconds: avgReaction,
      pointsEarned: score,
      rounds,
    };

    console.log('📊 [GrimCoach] Dados Consolidados da Fase 4:', JSON.stringify(payload, null, 2));

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

  const gridPadding = 16;
  const gap = 10;
  const calculatedCardSize = (SCREEN_WIDTH - gridPadding * 2 - gap * (numColumns - 1)) / numColumns;
  const cardDimension = Math.min(calculatedCardSize, 108);

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
                <Text style={styles.timerSubLabel}>
                  {isEvaluating ? 'TEMPO PAUSADO' : 'TEMPO'}
                </Text>
                <Text style={[styles.timerTextValue, isEvaluating && { color: '#E07A5F' }]}>
                  {formatTime(secondsElapsed)}
                </Text>
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
        {/* 2. INSTRUÇÃO INTERATIVA + MEDIDOR DE PONTOS DA RODADA        */}
        {/* ============================================================ */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Encontre o <Text style={styles.boldInstruction}>IMPOSTOR</Text>! A única carinha diferente das outras! 🕵️‍♂️
          </Text>
          <View style={styles.pointsRewardBadge}>
            <Ionicons name="sparkles" size={14} color="#8A5300" />
            <Text style={styles.pointsRewardText}>
              Vale nesta rodada: <Text style={styles.boldReward}>{currentRoundPoints} pts</Text> (Cuidado: diminui a cada erro!)
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. GRADE DINÂMICA DE CARTAS                                  */}
        {/* ============================================================ */}
        <Animated.View
          style={[
            styles.gridContainer,
            {
              transform: [{ scale: gridAnim }, { translateX: shakeAnim }],
              opacity: gridAnim,
            },
          ]}
        >
          <View style={styles.cardsGrid}>
            {cards.map((card) => {
              const isSelected = selectedCardId === card.id;
              const isWrongClicked = clickedWrongIds.includes(card.id);
              const isRevealedImpostor = isEvaluating && card.isImpostor;
              const isDimmed = isEvaluating && !card.isImpostor;

              return (
                <TouchableOpacity
                  key={card.id}
                  disabled={isEvaluating || isWrongClicked}
                  onPress={() => handleCardPress(card)}
                  activeOpacity={0.85}
                  style={[
                    styles.cardWrapper,
                    { width: cardDimension, height: cardDimension },
                    isRevealedImpostor && styles.cardSuccess,
                    isWrongClicked && styles.cardWrong,
                    isDimmed && styles.cardDimmed,
                  ]}
                >
                  <Image source={card.image} style={styles.cardImage} resizeMode="cover" />

                  {/* Revelação do Impostor (ao acertar ou ao zerar as chances) */}
                  {isRevealedImpostor && (
                    <View
                      style={[
                        styles.impostorBadge,
                        roundOutcome === 'failed' && { backgroundColor: 'rgba(230, 126, 34, 0.88)' },
                      ]}
                    >
                      <Ionicons
                        name={roundOutcome === 'success' ? 'checkmark-circle' : 'alert-circle'}
                        size={32}
                        color="#FFFFFF"
                      />
                      <Text style={styles.impostorBadgeText}>
                        {roundOutcome === 'success' ? 'ACHOU!' : 'ERA ESTE!'}
                      </Text>
                    </View>
                  )}

                  {/* Marcação permanente de carinha errada clicada */}
                  {isWrongClicked && (
                    <View style={styles.wrongOverlay}>
                      <Ionicons name="close-circle" size={32} color="#FFFFFF" />
                      <Text style={styles.wrongMinusText}>-1 pt</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ONDA DE CHOQUE CENTRAL */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwave,
              roundOutcome === 'failed' && styles.shockwaveFailed,
              {
                transform: [{ scale: shockwaveScale }],
                opacity: shockwaveOpacity,
              },
            ]}
          />

          {/* SELO DE RESULTADO CENTRALIZADO */}
          {roundOutcome && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.resultPopBadgeCentered,
                roundOutcome === 'failed' && styles.resultBadgeFailed,
                { transform: [{ scale: resultScale }] },
              ]}
            >
              <Text style={styles.resultPopEmoji}>
                {roundOutcome === 'success' ? '🕵️‍♂️' : '💨😢'}
              </Text>
              <Text style={styles.resultPopTitle}>
                {roundOutcome === 'success' ? 'IMPOSTOR CAPTURADO!' : 'ACABARAM AS CHANCES!'}
              </Text>
              <Text style={styles.resultPopSub}>
                {roundOutcome === 'success'
                  ? `Era ${impostorEmotion.toUpperCase()}! (+${currentRoundPoints} pts ⭐)`
                  : 'A pontuação zerou! Vamos para a próxima! 🚀'}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ============================================================ */}
        {/* 4. DICA INFERIOR                                             */}
        {/* ============================================================ */}
        <View style={styles.footerHintBox}>
          <Text style={styles.footerHintText}>
            A maioria dos rostinhos expressa {dominantEmotion.toUpperCase()}. Ache o rosto que não pertence ao grupo!
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 5. MODAL DE PAUSE                                            */}
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

                <Text style={styles.videoHelpTitle}>Encontre o Impostor</Text>

                <View style={styles.videoPlaceholderCard}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={styles.videoPlaceholderHeading}>Vídeo Explicativo</Text>
                  <Text style={styles.videoPlaceholderSub}>Veja como caçar a expressão intrusa!</Text>
                </View>

                <View style={styles.videoTextInstruction}>
                  <Text style={styles.videoTextContent}>
                    Observe todas as carinhas com atenção. Se errar, seus pontos daquela rodada diminuem. Ache o impostor antes que os pontos cheguem a zero!
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
        {/* 6. MODAL DE VITÓRIA                                          */}
        {/* ============================================================ */}
        <Modal visible={isVictoryModalVisible} transparent animationType="fade">
          <View style={styles.modalDarkBackdrop}>
            <View style={styles.victoryCard}>
              <Text style={styles.victoryTrophy}>🏆</Text>
              <Text style={styles.victoryTitle}>Missão Cumprida!</Text>
              <Text style={styles.victorySubtitle}>
                Sensacional, detetive! Você completou a caçada aos impostores!
              </Text>

              <View style={styles.starsRow}>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
              </View>

              <View style={styles.analyticRow}>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Acertos</Text>
                  <Text style={[styles.analyticValue, { color: '#27AE60' }]}>
                    {totalHits}/{TOTAL_ROUNDS}
                  </Text>
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

  // 1. Cabeçalho em 3 Linhas
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
  pointsRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    backgroundColor: '#FDF7E7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#F39C12',
  },
  pointsRewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A5300',
  },
  boldReward: {
    color: '#E07A5F',
    fontWeight: '900',
  },

  // 3. Grade
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
    width: '100%',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cardWrapper: {
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4A3B32',
    backgroundColor: '#1E1712',
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    borderBottomWidth: 5,
    borderBottomColor: '#2B2018',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardSuccess: {
    borderColor: '#27AE60',
    borderBottomColor: '#1E8449',
    transform: [{ scale: 1.06 }],
    zIndex: 20,
  },
  cardWrong: {
    borderColor: '#E74C3C',
    borderBottomColor: '#C0392B',
    opacity: 0.7,
  },
  cardDimmed: {
    opacity: 0.35,
  },
  impostorBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(39, 174, 96, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  impostorBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    marginTop: 2,
  },
  wrongOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(231, 76, 60, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongMinusText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    marginTop: 2,
  },

  // Efeitos centrais
  shockwave: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    zIndex: 35,
  },
  shockwaveFailed: {
    borderColor: '#E74C3C',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
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
  resultBadgeFailed: {
    backgroundColor: '#E74C3C',
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

  // 4. Dica
  footerHintBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A3B32',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  footerHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5A4E',
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

export default FindImpostorScreen;