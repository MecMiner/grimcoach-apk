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

const GRID_GAP = 12;
const CARD_SIZE = Math.min((SCREEN_WIDTH - 32 - GRID_GAP) / 2, 155);
const TOTAL_ROUNDS = 5;

const LEVEL_POINTS: Record<LevelType, number> = {
  nivel1: 1,
  nivel2: 2,
  nivel3: 3,
  nivel4: 4,
};

const EMOTION_EMOJIS: Record<string, string> = {
  alegria: '😄',
  tristeza: '😢',
  raiva: '😠',
  medo: '😨',
  surpresa: '😲',
  supresa: '😲',
  nojo: '🤢',
  neutro: '😐',
};

export interface RoundLogPhase2 {
  round: number;
  targetEmotion: EmotionType;
  selectedEmotion: EmotionType;
  optionsDisplayed: EmotionType[];
  isCorrect: boolean;
  reactionTimeSeconds: number;
}

export interface Phase2SessionData {
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
  rounds: RoundLogPhase2[];
}

interface SelectExpressionProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: Phase2SessionData) => void;
}

interface CardOption {
  id: string;
  emotion: EmotionType;
  image: any;
}

export const SelectExpressionScreen: React.FC<SelectExpressionProps> = ({
  level = 'nivel1',
  onBack,
  onSaveSession,
}) => {
  const pointsPerHit = LEVEL_POINTS[level] || 1;

  // Estados do Jogo
  const [currentRound, setCurrentRound] = useState(1);
  const [targetEmotion, setTargetEmotion] = useState<EmotionType>('alegria');
  const [targetModelImage, setTargetModelImage] = useState<any>(null);
  const [cardOptions, setCardOptions] = useState<CardOption[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Tempo e Métricas
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const roundStartTimeRef = useRef<number>(Date.now());
 const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<RoundLogPhase2[]>([]);

  // Modais
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  // Animações
  const enterAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(1)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Cronômetro
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
    setSelectedCardId(null);
    setIsProcessing(false);

    const allEmotions = ExpressionService.getAllEmotions();
    if (allEmotions.length === 0) return;

    // Sorteia a emoção alvo
    const target = allEmotions[Math.floor(Math.random() * allEmotions.length)];
    setTargetEmotion(target);

    // Sorteia 2 imagens diferentes da mesma emoção:
    // Uma para ser o "Rosto Modelo" de referência e outra para ser a opção correta na grade
    const targetPair = ExpressionService.getRandomSample(target, level, 2);
    const modelImg = targetPair[0] || ExpressionService.getRandomImage(target, level);
    const targetOptionImg = targetPair[1] || modelImg;

    setTargetModelImage(modelImg);

    // Seleciona 3 distratores com emoções diferentes
    const otherEmotions = allEmotions.filter((e) => e !== target);
    const shuffledOthers = [...otherEmotions].sort(() => Math.random() - 0.5);
    const distractorEmotions = shuffledOthers.slice(0, 3);

    // Monta as 4 opções da grade 2x2
    const optionsData: { emotion: EmotionType; image: any }[] = [
      { emotion: target, image: targetOptionImg },
      ...distractorEmotions.map((em) => ({
        emotion: em,
        image: ExpressionService.getRandomImage(em, level),
      })),
    ].sort(() => Math.random() - 0.5);

    const cards: CardOption[] = optionsData.map((opt, index) => ({
      id: `${opt.emotion}-${index}-${Date.now()}`,
      emotion: opt.emotion,
      image: opt.image,
    }));

    setCardOptions(cards);
    roundStartTimeRef.current = Date.now();
    startEntranceAnimation();
  };

  useEffect(() => {
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  }, [level]);

  // Finalização e consolidação das métricas
  const finalizeGameSession = () => {
    const finishedAt = new Date().toISOString();
    const rounds = roundsLogRef.current;
    const totalRoundsPlayed = rounds.length;

    const finalHits = rounds.filter((r) => r.isCorrect).length;
    const finalErrors = rounds.filter((r) => !r.isCorrect).length;

    const totalReactionTime = rounds.reduce((acc, r) => acc + r.reactionTimeSeconds, 0);
    const avgReactionTime =
      totalRoundsPlayed > 0 ? Number((totalReactionTime / totalRoundsPlayed).toFixed(2)) : 0;

    const accuracy =
      totalRoundsPlayed > 0 ? Math.round((finalHits / totalRoundsPlayed) * 100) : 0;

    setTotalHits(finalHits);
    setTotalErrors(finalErrors);

    const sessionPayload: Phase2SessionData = {
      phaseId: 2,
      phaseKey: 'SelectExpression',
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

    console.log('📊 [GrimCoach] Dados Consolidados da Fase 2:', JSON.stringify(sessionPayload, null, 2));

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

  const handleCardPress = (card: CardOption) => {
    if (isProcessing || isPaused) return;

    setIsProcessing(true);
    setSelectedCardId(card.id);

    const reactionTime = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));
    const isCorrect = card.emotion === targetEmotion;

    roundsLogRef.current.push({
      round: currentRound,
      targetEmotion,
      selectedEmotion: card.emotion,
      optionsDisplayed: cardOptions.map((c) => c.emotion),
      isCorrect,
      reactionTimeSeconds: reactionTime,
    });

    setFeedbackType(isCorrect ? 'correct' : 'wrong');
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
      }, 950);
    });
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

  const getVictoryFeedback = () => {
    const hits = roundsLogRef.current.filter((r) => r.isCorrect).length;

    if (hits === TOTAL_ROUNDS) {
      return {
        title: 'Desempenho Perfeito!',
        subtitle: 'Você encontrou todas as expressões pedidas com máxima precisão!',
        stars: ['⭐', '⭐', '⭐'],
      };
    }
    if (hits >= 3) {
      return {
        title: 'Muito Bem!',
        subtitle: 'Ótimo trabalho! Você reconheceu a maioria dos rostinhos!',
        stars: ['⭐', '⭐', '☆'],
      };
    }
    if (hits >= 1) {
      return {
        title: 'Bom Treino!',
        subtitle: 'Você acertou expressões importantes! Vamos praticar para achar todas!',
        stars: ['⭐', '☆', '☆'],
      };
    }
    return {
      title: 'Valeu a Tentativa!',
      subtitle: 'Com mais treino você vai reconhecer cada uma das expressões!',
      stars: ['☆', '☆', '☆'],
    };
  };

  const victoryFeedback = getVictoryFeedback();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ============================================================ */}
        {/* 1. TOPO: PAINEL DE CONTROLE EM 3 LINHAS                      */}
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
        {/* 2. ROSTO MODELO DE REFERÊNCIA + EMOÇÃO                       */}
        {/* ============================================================ */}
        <View style={styles.targetCardContainer}>
          {/* Foto Modelo do Rostinho 1:1 */}
          <View style={styles.modelImageWrapper}>
            {targetModelImage ? (
              <Image source={targetModelImage} style={styles.modelImage} resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={38} color="#C4B7AA" />
            )}
            <View style={styles.modelPinBadge}>
              <Text style={styles.modelPinText}>GUIA</Text>
            </View>
          </View>

          {/* Texto e Emoção Alvo */}
          <View style={styles.modelInfoCol}>
            <Text style={styles.targetPromptText}>Encontre quem está fazer a mesma  expressão:</Text>
            <View style={styles.targetEmotionRow}>
              <Text style={styles.targetEmojiText}>{EMOTION_EMOJIS[targetEmotion] || '🙂'}</Text>
              <Text style={styles.targetEmotionName}>{targetEmotion.toUpperCase()}</Text>
            </View>
            <View style={styles.levelTag}>
              <Text style={styles.levelTagText}>
                Nível {level.replace('nivel', '')} • Vale +{pointsPerHit} {pointsPerHit > 1 ? 'pontos' : 'ponto'}
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. GRADE 2x2 DE OPÇÕES (OUTRAS IMAGENS DA EMOÇÃO)           */}
        {/* ============================================================ */}
        <Animated.View
          style={[
            styles.gridContainer,
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
          <View style={styles.cardsGrid}>
            {cardOptions.map((card) => {
              const isSelected = selectedCardId === card.id;
              const isOtherSelected = selectedCardId !== null && !isSelected;

              return (
                <TouchableOpacity
                  key={card.id}
                  disabled={isProcessing}
                  onPress={() => handleCardPress(card)}
                  activeOpacity={0.88}
                  style={[
                    styles.cardSquare,
                    isSelected && feedbackType === 'correct' && styles.cardSuccess,
                    isSelected && feedbackType === 'wrong' && styles.cardWrong,
                    isOtherSelected && styles.cardDimmed,
                  ]}
                >
                  {card.image ? (
                    <Image source={card.image} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={48} color="#C4B7AA" />
                  )}

                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <Ionicons
                        name={feedbackType === 'correct' ? 'checkmark-circle' : 'close-circle'}
                        size={42}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Onda de impacto */}
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

          {/* Selo Pop-Up de Resultado Central */}
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
              size={48}
              color="#FFFFFF"
            />
            <Text style={styles.resultPopText}>
              {feedbackType === 'correct' ? 'MUITO BEM!' : 'OPS, NÃO FOI!'}
            </Text>
            <Text style={styles.resultSubText}>
              {feedbackType === 'correct'
                ? `+${pointsPerHit} ${pointsPerHit > 1 ? 'PONTOS' : 'PONTO'} ⭐`
                : 'VAMOS PARA A PRÓXIMA! 🚀'}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ============================================================ */}
        {/* 4. INSTRUÇÃO INFERIOR                                        */}
        {/* ============================================================ */}
        <View style={styles.footerInstructionBox}>
          <Text style={styles.footerInstructionText}>
            Olhe o <Text style={styles.boldTarget}>rosto guia</Text> e toque na foto que tem a mesma expressão!
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 5. MODAL DE PAUSE COMPLETO                                   */}
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

                <Text style={styles.videoHelpTitle}>Selecione a Expressão</Text>

                <View style={styles.videoPlaceholderCard}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={styles.videoPlaceholderHeading}>Vídeo Explicativo</Text>
                  <Text style={styles.videoPlaceholderSub}>Veja como comparar com o rosto guia!</Text>
                </View>

                <View style={styles.videoTextInstruction}>
                  <Text style={styles.videoTextContent}>
                    Olhe para a foto no card superior (rosto guia) e procure nas 4 opções de baixo outra pessoa que esteja sentindo exatamente a mesma emoção!
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
                <Text style={styles.pauseSubtitle}>O tempo foi pausado! O que deseja fazer?</Text>

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
        {/* 6. MODAL DE VITÓRIA (COM JOGAR DE NOVO E CONTINUAR)         */}
        {/* ============================================================ */}
        <Modal visible={isVictoryModalVisible} transparent animationType="fade">
          <View style={styles.modalDarkBackdrop}>
            <View style={styles.victoryCard}>
              <Text style={styles.victoryTrophy}>
                {totalHits >= 3 ? '🏆' : totalHits >= 1 ? '🌟' : '💪'}
              </Text>
              <Text style={styles.victoryTitle}>{victoryFeedback.title}</Text>
              <Text style={styles.victorySubtitle}>{victoryFeedback.subtitle}</Text>

              <View style={styles.starsRow}>
                {victoryFeedback.stars.map((st, i) => (
                  <Text key={i} style={styles.starBig}>{st}</Text>
                ))}
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
    height: 54,
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
    height: 54,
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
    width: 30,
    height: 30,
    borderRadius: 15,
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
    height: 44,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F39C12',
  },
  scoreTextValue: {
    fontSize: 17,
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

  // 2. Rosto Modelo Guia
  targetCardContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#4A3B32',
    borderRadius: 22,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelImageWrapper: {
    width: 84,
    height: 84,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    overflow: 'hidden',
    backgroundColor: '#1E1712',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelImage: {
    width: '100%',
    height: '100%',
  },
  modelPinBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: '#E07A5F',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  modelPinText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  modelInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  targetPromptText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B5A4E',
  },
  targetEmotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  targetEmojiText: {
    fontSize: 22,
  },
  targetEmotionName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E07A5F',
    letterSpacing: 0.8,
  },
  levelTag: {
    marginTop: 4,
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2D5C5',
  },
  levelTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4A3B32',
  },

  // 3. Grade 2x2
  gridContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: CARD_SIZE * 2 + GRID_GAP,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: GRID_GAP,
    width: '100%',
  },
  cardSquare: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 22,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    overflow: 'hidden',
    backgroundColor: '#1E1712',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    borderBottomWidth: 6,
    borderBottomColor: '#2B2018',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardSuccess: {
    borderColor: '#27AE60',
    borderBottomColor: '#1E8449',
  },
  cardWrong: {
    borderColor: '#E74C3C',
    borderBottomColor: '#C0392B',
  },
  cardDimmed: {
    opacity: 0.35,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Efeitos de onda e resultado
  shockwave: {
    position: 'absolute',
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
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
    paddingVertical: 14,
    borderRadius: 28,
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
    minWidth: 180,
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
    marginTop: 3,
    textAlign: 'center',
  },
  resultSubText: {
    color: '#F9E79F',
    fontWeight: '900',
    fontSize: 12,
    marginTop: 2,
  },

  // 4. Instrução Inferior
  footerInstructionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  footerInstructionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A3B32',
    textAlign: 'center',
  },
  boldTarget: {
    color: '#E07A5F',
    fontWeight: '900',
    textTransform: 'uppercase',
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

export default SelectExpressionScreen;