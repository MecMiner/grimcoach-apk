import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  PanResponder,
  Animated,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Line, Circle } from 'react-native-svg';
import { ExpressionService } from '../../services/expressionService';
import { EmotionType, LevelType } from '../../constants/expressionAssets';

let AudioModule: any = null;
try {
  AudioModule = require('expo-av').Audio;
} catch {
  // Fallback silencioso
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_ROUNDS = 4;

// Tamanho dos cards (1:1)
export const CUSTOM_CARD_SIZE = Math.min((SCREEN_WIDTH - 64) * 0.38, 135);

const LEVEL_MULTIPLIERS: Record<LevelType, number> = {
  nivel1: 1, // 3 pts
  nivel2: 2, // 6 pts
  nivel3: 3, // 9 pts
  nivel4: 4, // 12 pts
};

export interface RoundLogPhase3 {
  round: number;
  emotionsInRound: EmotionType[];
  pairsMade: {
    leftEmotion: EmotionType;
    rightEmotion: EmotionType;
    isCorrect: boolean;
  }[];
  hitsInRound: number;
  errorsInRound: number;
  timeTakenSeconds: number;
}

export interface Phase3SessionData {
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
  rounds: RoundLogPhase3[];
}

interface ConnectExpressionsProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: Phase3SessionData) => void;
  cardSize?: number;
}

interface ImageCardNode {
  id: string;
  emotion: EmotionType;
  image: any;
  slotIndex: number;
}

interface UserConnection {
  leftId: string;
  rightId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status: 'pending' | 'correct' | 'wrong';
}

interface CardBox {
  id: string;
  emotion: EmotionType;
  pinX: number;
  pinY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const ConnectExpressionsScreen: React.FC<ConnectExpressionsProps> = ({
  level = 'nivel1',
  onBack,
  onSaveSession,
  cardSize = CUSTOM_CARD_SIZE,
}) => {
  const pointsPerHit = 3 * (LEVEL_MULTIPLIERS[level] || 1);

  // Estados de Jogo
  const [currentRound, setCurrentRound] = useState(1);
  const [leftCards, setLeftCards] = useState<ImageCardNode[]>([]);
  const [rightCards, setRightCards] = useState<ImageCardNode[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [score, setScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  // Estados de Tempo e Métricas
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const roundStartTimeRef = useRef<number>(Date.now());
  const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<RoundLogPhase3[]>([]);

  // Modais
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  // Animações de Entrada, Saída e Resultado
  const cardScaleAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(1)).current;
  const [roundFeedback, setRoundFeedback] = useState<{ hits: number; points: number } | null>(null);

  // Linha em tempo real
  const [activeDragLine, setActiveDragLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const activeLeftCardRef = useRef<CardBox | null>(null);

  // Dimensões do Canvas e Caixas de Toque Calculadas
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [canvasReady, setCanvasReady] = useState(false);
  const leftBoxesRef = useRef<{ [key: string]: CardBox }>({});
  const rightBoxesRef = useRef<{ [key: string]: CardBox }>({});

  // Cronômetro (pausa se o jogo estiver pausado ou avaliando a confirmação)
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

  const playSound = async (type: 'whoosh' | 'correct' | 'wrong' | 'pop') => {
    if (!AudioModule) return;
    try {
      const soundUris = {
        whoosh: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
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

  // Cálculo das 3 posições verticais (slots de 0 a 2)
  const calculateBoxes = (w: number, h: number, leftList: ImageCardNode[], rightList: ImageCardNode[]) => {
    if (w <= 0 || h <= 0) return;

    const lateralMargin = 20;
    const leftX = lateralMargin;
    const rightX = w - lateralMargin - cardSize;

    // Distribui 3 slots verticais com distâncias proporcionais
    const slotStep = h / 3;

    const lBoxes: { [key: string]: CardBox } = {};
    leftList.forEach((c) => {
      const topY = c.slotIndex * slotStep + (slotStep - cardSize) / 2;
      lBoxes[c.id] = {
        id: c.id,
        emotion: c.emotion,
        pinX: leftX + cardSize, // Ponto de ancoragem na bolinha direita
        pinY: topY + cardSize / 2,
        left: leftX,
        right: leftX + cardSize,
        top: topY,
        bottom: topY + cardSize,
      };
    });

    const rBoxes: { [key: string]: CardBox } = {};
    rightList.forEach((c) => {
      const topY = c.slotIndex * slotStep + (slotStep - cardSize) / 2;
      rBoxes[c.id] = {
        id: c.id,
        emotion: c.emotion,
        pinX: rightX, // Ponto de ancoragem na bolinha esquerda
        pinY: topY + cardSize / 2,
        left: rightX,
        right: rightX + cardSize,
        top: topY,
        bottom: topY + cardSize,
      };
    });

    leftBoxesRef.current = lBoxes;
    rightBoxesRef.current = rBoxes;
  };

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    canvasSizeRef.current = { width, height };
    setCanvasReady(true);
    calculateBoxes(width, height, leftCards, rightCards);
  };

  const startEntranceAnimation = () => {
    cardScaleAnim.setValue(0);
    resultScale.setValue(0);
    shockwaveScale.setValue(0);
    shockwaveOpacity.setValue(1);

    Animated.spring(cardScaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const setupNewRound = () => {
    setConnections([]);
    setActiveDragLine(null);
    activeLeftCardRef.current = null;
    setIsEvaluating(false);
    setRoundFeedback(null);

    const allEmotions = ExpressionService.getAllEmotions();
    if (allEmotions.length === 0) return;

    const shuffledEmotions = [...allEmotions].sort(() => Math.random() - 0.5).slice(0, 3);

    const leftList: ImageCardNode[] = [];
    const rightList: ImageCardNode[] = [];

    shuffledEmotions.forEach((emotion, idx) => {
      const pair = ExpressionService.getRandomSample(emotion, level, 2);
      const img1 = pair[0] || ExpressionService.getRandomImage(emotion, level);
      const img2 = pair[1] || img1;

      leftList.push({
        id: `left-${emotion}-${idx}-${Date.now()}`,
        emotion,
        image: img1,
        slotIndex: idx,
      });

      rightList.push({
        id: `right-${emotion}-${idx}-${Date.now()}`,
        emotion,
        image: img2,
        slotIndex: idx,
      });
    });

    // Embaralha as posições verticais da direita
    const shuffledSlots = [0, 1, 2].sort(() => Math.random() - 0.5);
    const randomizedRight = rightList.map((c, i) => ({
      ...c,
      slotIndex: shuffledSlots[i],
    }));

    setLeftCards(leftList);
    setRightCards(randomizedRight);
    roundStartTimeRef.current = Date.now();

    if (canvasSizeRef.current.width > 0) {
      calculateBoxes(canvasSizeRef.current.width, canvasSizeRef.current.height, leftList, randomizedRight);
    }

    startEntranceAnimation();
  };

  useEffect(() => {
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  }, [level]);

  // PanResponder aplicado sobre a camada da arena inteira
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEvaluating,
      onMoveShouldSetPanResponder: () => !isEvaluating,

      onPanResponderGrant: (evt) => {
        if (isEvaluating) return;
        const { locationX, locationY } = evt.nativeEvent;

        // Verifica toque próximo a qualquer card da esquerda
        for (const [, box] of Object.entries(leftBoxesRef.current)) {
          if (
            locationX >= box.left - 20 &&
            locationX <= box.right + 40 &&
            locationY >= box.top - 20 &&
            locationY <= box.bottom + 20
          ) {
            activeLeftCardRef.current = box;
            setActiveDragLine({
              x1: box.pinX,
              y1: box.pinY,
              x2: locationX,
              y2: locationY,
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            playSound('whoosh');
            break;
          }
        }
      },

      onPanResponderMove: (evt) => {
        if (!activeLeftCardRef.current || isEvaluating) return;
        const { locationX, locationY } = evt.nativeEvent;

        setActiveDragLine({
          x1: activeLeftCardRef.current.pinX,
          y1: activeLeftCardRef.current.pinY,
          x2: locationX,
          y2: locationY,
        });
      },

      onPanResponderRelease: (evt) => {
        if (!activeLeftCardRef.current || isEvaluating) {
          setActiveDragLine(null);
          return;
        }

        const { locationX, locationY } = evt.nativeEvent;
        const leftBox = activeLeftCardRef.current;
        let matchedRight: CardBox | null = null;

        // Verifica se soltou próximo a algum card da direita
        for (const [, box] of Object.entries(rightBoxesRef.current)) {
          if (
            locationX >= box.left - 40 &&
            locationX <= box.right + 20 &&
            locationY >= box.top - 20 &&
            locationY <= box.bottom + 20
          ) {
            matchedRight = box;
            break;
          }
        }

        if (matchedRight) {
          playSound('pop');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          setConnections((prev) => {
            const filtered = prev.filter(
              (c) => c.leftId !== leftBox.id && c.rightId !== matchedRight!.id
            );
            return [
              ...filtered,
              {
                leftId: leftBox.id,
                rightId: matchedRight!.id,
                x1: leftBox.pinX,
                y1: leftBox.pinY,
                x2: matchedRight!.pinX,
                y2: matchedRight!.pinY,
                status: 'pending',
              },
            ];
          });
        }

        setActiveDragLine(null);
        activeLeftCardRef.current = null;
      },
    })
  ).current;

  // Botão Confirmar: Avalia, encolhe ao centro e exibe o resultado central
  const handleConfirmConnections = () => {
    if (connections.length < 3 || isEvaluating) return;

    setIsEvaluating(true);

    let roundHits = 0;
    let roundErrors = 0;

    const evaluatedPairs: UserConnection[] = connections.map((conn) => {
      const leftNode = leftCards.find((c) => c.id === conn.leftId);
      const rightNode = rightCards.find((c) => c.id === conn.rightId);
      const isCorrect = leftNode && rightNode && leftNode.emotion === rightNode.emotion;

      if (isCorrect) roundHits += 1;
      else roundErrors += 1;

      return {
        ...conn,
        status: isCorrect ? 'correct' : 'wrong',
      };
    });

    setConnections(evaluatedPairs);

    const pointsGained = roundHits * pointsPerHit;
    setScore((prev) => prev + pointsGained);
    setTotalHits((prev) => prev + roundHits);
    setTotalErrors((prev) => prev + roundErrors);

    const timeTaken = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));
    roundsLogRef.current.push({
      round: currentRound,
      emotionsInRound: leftCards.map((c) => c.emotion),
      pairsMade: evaluatedPairs.map((p) => {
        const l = leftCards.find((c) => c.id === p.leftId)!;
        const r = rightCards.find((c) => c.id === p.rightId)!;
        return {
          leftEmotion: l.emotion,
          rightEmotion: r.emotion,
          isCorrect: p.status === 'correct',
        };
      }),
      hitsInRound: roundHits,
      errorsInRound: roundErrors,
      timeTakenSeconds: timeTaken,
    });

    setRoundFeedback({ hits: roundHits, points: pointsGained });

    // Encolhe os cards para o centro
    Animated.timing(cardScaleAnim, {
      toValue: 0,
      duration: 450,
      easing: Easing.back(1.5),
      useNativeDriver: true,
    }).start(() => {
      if (roundHits > 0) {
        playSound('correct');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        playSound('wrong');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      ]).start();

      setTimeout(() => {
        if (currentRound < TOTAL_ROUNDS) {
          setCurrentRound((prev) => prev + 1);
          setupNewRound();
        } else {
          finalizeSession(roundHits, roundErrors, pointsGained);
        }
      }, 1500);
    });
  };

  const finalizeSession = (lastRoundHits: number, lastRoundErrors: number, lastRoundPoints: number) => {
    const finishedAt = new Date().toISOString();
    const rounds = roundsLogRef.current;
    const finalHits = totalHits + lastRoundHits;
    const finalErrors = totalErrors + lastRoundErrors;
    const totalTries = finalHits + finalErrors;
    const accuracy = totalTries > 0 ? Math.round((finalHits / totalTries) * 100) : 0;

    const payload: Phase3SessionData = {
      phaseId: 3,
      phaseKey: 'ConnectExpressions',
      level,
      startedAt: gameStartedAtRef.current,
      finishedAt,
      totalTimeSeconds: secondsElapsed,
      totalHits: finalHits,
      totalErrors: finalErrors,
      accuracyPercentage: accuracy,
      pointsEarned: score + lastRoundPoints,
      rounds,
    };

    console.log('📊 [GrimCoach] Dados Consolidados da Fase 3:', JSON.stringify(payload, null, 2));

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

  const canConfirm = connections.length === 3 && !isEvaluating;

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
        {/* 2. INSTRUÇÃO                                                 */}
        {/* ============================================================ */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Ligue as <Text style={styles.boldInstruction}>3 carinhas</Text> e depois toque em <Text style={styles.boldInstruction}>CONFIRMAR</Text>! ✏️
          </Text>
          <View style={styles.levelTag}>
            <Text style={styles.levelTagText}>
              Fase 3 • Nível {level.replace('nivel', '')} (Vale +{pointsPerHit} pts por acerto!)
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. ARENA DE LIGAÇÃO                                          */}
        {/* ============================================================ */}
        <View style={styles.canvasContainer} onLayout={handleCanvasLayout}>
          
          {/* CAMADA SVG DAS LINHAS (Some imediatamente ao confirmar) */}
          <Animated.View 
            style={[StyleSheet.absoluteFill, { opacity: cardScaleAnim }]} 
            pointerEvents="none"
          >
            <Svg style={StyleSheet.absoluteFill}>
              {connections.map((conn) => {
                const strokeColor =
                  conn.status === 'pending'
                    ? '#E07A5F'
                    : conn.status === 'correct'
                    ? '#27AE60'
                    : '#E74C3C';

                return (
                  <React.Fragment key={`${conn.leftId}-${conn.rightId}`}>
                    <Line
                      x1={conn.x1}
                      y1={conn.y1}
                      x2={conn.x2}
                      y2={conn.y2}
                      stroke={strokeColor}
                      strokeWidth={6}
                      strokeLinecap="round"
                    />
                    <Circle cx={conn.x1} cy={conn.y1} r={6} fill={strokeColor} />
                    <Circle cx={conn.x2} cy={conn.y2} r={6} fill={strokeColor} />
                  </React.Fragment>
                );
              })}

              {activeDragLine && (
                <React.Fragment>
                  <Line
                    x1={activeDragLine.x1}
                    y1={activeDragLine.y1}
                    x2={activeDragLine.x2}
                    y2={activeDragLine.y2}
                    stroke="#4A3B32"
                    strokeWidth={7}
                    strokeDasharray={[8, 5]}
                    strokeLinecap="round"
                  />
                  <Circle cx={activeDragLine.x1} cy={activeDragLine.y1} r={7} fill="#4A3B32" />
                  <Circle cx={activeDragLine.x2} cy={activeDragLine.y2} r={7} fill="#4A3B32" />
                </React.Fragment>
              )}
            </Svg>
          </Animated.View>

          {/* COLUNA ESQUERDA ... */}

          {/* COLUNA ESQUERDA (3 SLOTS) */}
          <View style={styles.columnSlotLeft} pointerEvents="none">
            {leftCards.map((item) => {
              const conn = connections.find((c) => c.leftId === item.id);
              const isLinked = !!conn;

              return (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.cardSlotItem,
                    {
                      width: cardSize,
                      height: cardSize,
                      transform: [{ scale: cardScaleAnim }],
                      opacity: cardScaleAnim,
                    },
                    isLinked && conn.status === 'pending' && styles.cardPending,
                    isLinked && conn.status === 'correct' && styles.cardCorrect,
                    isLinked && conn.status === 'wrong' && styles.cardWrong,
                  ]}
                >
                  <Image source={item.image} style={styles.photo1to1} resizeMode="cover" />
                  <View
                    style={[
                      styles.connectorDot,
                      styles.dotRight,
                      isLinked && conn.status === 'pending' && { backgroundColor: '#E07A5F' },
                      isLinked && conn.status === 'correct' && { backgroundColor: '#27AE60' },
                      isLinked && conn.status === 'wrong' && { backgroundColor: '#E74C3C' },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>

          {/* COLUNA DIREITA (3 SLOTS) */}
          <View style={styles.columnSlotRight} pointerEvents="none">
            {rightCards.map((item) => {
              const conn = connections.find((c) => c.rightId === item.id);
              const isLinked = !!conn;

              return (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.cardSlotItem,
                    {
                      width: cardSize,
                      height: cardSize,
                      transform: [{ scale: cardScaleAnim }],
                      opacity: cardScaleAnim,
                    },
                    isLinked && conn.status === 'pending' && styles.cardPending,
                    isLinked && conn.status === 'correct' && styles.cardCorrect,
                    isLinked && conn.status === 'wrong' && styles.cardWrong,
                  ]}
                >
                  <Image source={item.image} style={styles.photo1to1} resizeMode="cover" />
                  <View
                    style={[
                      styles.connectorDot,
                      styles.dotLeft,
                      isLinked && conn.status === 'pending' && { backgroundColor: '#E07A5F' },
                      isLinked && conn.status === 'correct' && { backgroundColor: '#27AE60' },
                      isLinked && conn.status === 'wrong' && { backgroundColor: '#E74C3C' },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>

          {/* CAMADA TRANSPARENTE SUPERIOR: CAPTURA DO TOQUE COM COORDENADAS REAIS */}
          {!isEvaluating && canvasReady && (
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
          )}

          {/* ONDA DE IMPACTO (CENTRO ABSOLUTO DA ARENA) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwave,
              roundFeedback?.hits === 3 ? styles.shockwaveSuccess : styles.shockwaveOrange,
              {
                transform: [{ scale: shockwaveScale }],
                opacity: shockwaveOpacity,
              },
            ]}
          />

          {/* SELO DE RESULTADO DA RODADA (CENTRO ABSOLUTO DA ARENA) */}
          {roundFeedback && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.resultPopBadgeCentered,
                roundFeedback.hits === 3 ? styles.resultFullSuccess : styles.resultPartial,
                { transform: [{ scale: resultScale }] },
              ]}
            >
              <Text style={styles.resultPopEmoji}>
                {roundFeedback.hits === 3 ? '🎉' : roundFeedback.hits > 0 ? '👏' : '🧐'}
              </Text>
              <Text style={styles.resultPopTitle}>
                {roundFeedback.hits === 3
                  ? '3 DE 3! PERFEITO!'
                  : `${roundFeedback.hits} DE 3 ACERTOS!`}
              </Text>
              <Text style={styles.resultPopSub}>+{roundFeedback.points} PONTOS GANHOS ⭐</Text>
            </Animated.View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 4. BOTÃO CONFIRMAR                                           */}
        {/* ============================================================ */}
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          disabled={!canConfirm}
          onPress={handleConfirmConnections}
          activeOpacity={0.88}
        >
          <Ionicons
            name="checkmark-circle"
            size={28}
            color={canConfirm ? '#FFFFFF' : '#A89F95'}
          />
          <Text style={[styles.confirmBtnText, !canConfirm && styles.confirmBtnTextDisabled]}>
            {connections.length < 3
              ? `LIGUE AS 3 IMAGENS (${connections.length}/3)`
              : 'CONFIRMAR LIGAÇÕES ✔'}
          </Text>
        </TouchableOpacity>

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

                <Text style={styles.videoHelpTitle}>Ligue as Expressões</Text>

                <View style={styles.videoPlaceholderCard}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={styles.videoPlaceholderHeading}>Vídeo Demonstrativo</Text>
                  <Text style={styles.videoPlaceholderSub}>Veja como ligar e confirmar!</Text>
                </View>

                <View style={styles.videoTextInstruction}>
                  <Text style={styles.videoTextContent}>
                    Arraste o dedinho de cada foto da esquerda até o rostinho correspondente na direita. Quando fizer as 3 ligações, aperte em CONFIRMAR para pontuar!
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
                <Text style={styles.pauseSubtitle}>O tempo foi congelado! Escolha uma opção:</Text>

                <View style={styles.pauseStatsRow}>
                  <View style={styles.pauseStatItem}>
                    <Text style={styles.pauseStatLabel}>Tempo Jogado</Text>
                    <Text style={styles.pauseStatValue}>{formatTime(secondsElapsed)}</Text>
                  </View>
                  <View style={styles.pauseStatItem}>
                    <Text style={styles.pauseStatLabel}>Pontos</Text>
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
        {/* 6. MODAL DE CONCLUSÃO                                        */}
        {/* ============================================================ */}
        <Modal visible={isVictoryModalVisible} transparent animationType="fade">
          <View style={styles.modalDarkBackdrop}>
            <View style={styles.victoryCard}>
              <Text style={styles.victoryTrophy}>🏆</Text>
              <Text style={styles.victoryTitle}>Fase 3 Concluída!</Text>
              <Text style={styles.victorySubtitle}>
                Sensacional! Você conectou e confirmou todos os pares de expressões!
              </Text>

              <View style={styles.starsRow}>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
              </View>

              <View style={styles.analyticRow}>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Acertos</Text>
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

  canvasContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
    width: '100%',
  },
  columnSlotLeft: {
    width: '42%',
    justifyContent: 'space-around',
    height: '100%',
    paddingLeft: 20,
  },
  columnSlotRight: {
    width: '42%',
    justifyContent: 'space-around',
    height: '100%',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  cardSlotItem: {
    aspectRatio: 1,
    borderRadius: 22,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    backgroundColor: '#1E1712',
    overflow: 'visible',
    position: 'relative',
    elevation: 4,
  },
  photo1to1: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },

  cardPending: {
    borderColor: '#E07A5F',
    borderWidth: 4,
  },
  cardCorrect: {
    borderColor: '#27AE60',
    borderWidth: 4,
  },
  cardWrong: {
    borderColor: '#E74C3C',
    borderWidth: 4,
  },

  connectorDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FAF5EE',
    borderWidth: 3,
    borderColor: '#4A3B32',
    top: '50%',
    marginTop: -9,
    zIndex: 20,
  },
  dotRight: {
    right: -9,
  },
  dotLeft: {
    left: -9,
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
    zIndex: 35,
  },
  shockwaveSuccess: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  shockwaveOrange: {
    borderColor: '#E67E22',
    backgroundColor: 'rgba(230, 126, 34, 0.2)',
  },

  // Selo Pop-Up de Resultado da Rodada 100% Centralizado
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  resultFullSuccess: {
    backgroundColor: '#27AE60',
  },
  resultPartial: {
    backgroundColor: '#E67E22',
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

  confirmBtn: {
    width: '100%',
    height: 60,
    backgroundColor: '#27AE60',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4A3B32',
    borderBottomWidth: 6,
    borderBottomColor: '#1E8449',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 5,
  },
  confirmBtnDisabled: {
    backgroundColor: '#EDE3D5',
    borderBottomColor: '#D4C6B8',
    borderColor: '#B8ABA0',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  confirmBtnTextDisabled: {
    color: '#A89F95',
  },

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

export default ConnectExpressionsScreen;