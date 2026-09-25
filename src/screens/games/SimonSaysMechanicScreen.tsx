import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
} from 'react-native-vision-camera';
import { Camera, Face } from 'react-native-vision-camera-face-detector';
import * as Haptics from 'expo-haptics';
import { LevelType } from '../../constants/expressionAssets';

// COMPONENTES MODULARES COMPARTILHADOS
import {
  GameHeader,
  PauseModal,
  ExitWarningModal,
  TutorialVideoModal,
  VictoryModal,
} from '../../components/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_ROUNDS = 5;
const POINTS_PER_ROUND = 2;
const REQUIRED_HOLD_MS = 400;

const TUTORIAL_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export type SimonCommandType =
  | 'smile'
  | 'blink_left'
  | 'blink_right'
  | 'smile_and_blink_left'
  | 'smile_and_blink_right';

interface SimonCommandConfig {
  type: SimonCommandType;
  title: string;
  instruction: string;
  icon: keyof typeof Ionicons.glyphMap;
  hintEmoji: string;
}

const COMMANDS: SimonCommandConfig[] = [
  {
    type: 'smile',
    title: 'O Chefinho Mandou:',
    instruction: 'Dê um belo sorriso para a câmera!',
    icon: 'happy',
    hintEmoji: '😁',
  },
  {
    type: 'blink_left',
    title: 'O Chefinho Mandou:',
    instruction: 'Pisque apenas o olho esquerdo!',
    icon: 'arrow-back-circle',
    hintEmoji: '😜',
  },
  {
    type: 'blink_right',
    title: 'O Chefinho Mandou:',
    instruction: 'Pisque apenas o olho direito!',
    icon: 'arrow-forward-circle',
    hintEmoji: '😉',
  },
  {
    type: 'smile_and_blink_left',
    title: 'O Chefinho Mandou:',
    instruction: 'Sorria E pisque o olho esquerdo ao mesmo tempo!',
    icon: 'sparkles',
    hintEmoji: '😜😁',
  },
  {
    type: 'smile_and_blink_right',
    title: 'O Chefinho Mandou:',
    instruction: 'Sorria E pisque o olho direito ao mesmo tempo!',
    icon: 'sparkles',
    hintEmoji: '😉😁',
  },
];

export interface TelemetryRoundLogSimon {
  roundNumber: number;
  commandType: SimonCommandType;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  success: boolean;
}

export interface PhaseSimonSessionData {
  sessionMeta: {
    sessionId: string;
    phaseId: 8;
    phaseKey: 'SimonSaysMechanic';
    level: LevelType;
    devicePlatform: string;
    startedAt: string;
    finishedAt: string;
    totalSessionDurationSeconds: number;
  };
  metrics: {
    totalRounds: number;
    completedRounds: number;
    pointsEarned: number;
    accuracyPercentage: number;
    averageResponseTimePerRoundSeconds: number;
  };
  roundsDetail: TelemetryRoundLogSimon[];
}

interface SimonSaysMechanicScreenProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: PhaseSimonSessionData) => void;
}

// -------------------------------------------------------------
// COMPONENTE NATIVO DA CÂMARA COM VISOR AMPLIADO E ISOLADO
// -------------------------------------------------------------
const CameraStream = memo(
  ({
    device,
    onFacesDetected,
    faceDetectedAnim,
    holdingFeedbackAnim,
    feedbackText,
  }: {
    device: any;
    onFacesDetected: (faces: Face[]) => void;
    faceDetectedAnim: Animated.Value;
    holdingFeedbackAnim: Animated.Value;
    feedbackText: string;
  }) => (
    <View style={styles.cameraBox}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        runClassifications={true as any}
        runLandmarks={false as any}
        runContours={false as any}
        performanceMode={'fast' as any}
        minFaceSize={0.22 as any}
        onFacesDetected={onFacesDetected as any}
        onError={(error) => console.log('Camera error:', error)}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.holdingFeedbackOverlay, { opacity: holdingFeedbackAnim }]}
      >
        <Ionicons name="sparkles" size={20} color="#2ECC71" />
        <Text style={styles.holdingFeedbackText}>{feedbackText}</Text>
      </Animated.View>

      <View pointerEvents="none" style={styles.faceGuideFrame}>
        <Animated.View
          style={[
            styles.guideBadge,
            {
              backgroundColor: faceDetectedAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(15, 10, 8, 0.76)', 'rgba(39, 174, 96, 0.88)'],
              }),
              borderColor: faceDetectedAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#FFFFFF', '#2ECC71'],
              }),
            },
          ]}
        >
          <Ionicons name="scan" size={14} color="#FFFFFF" />
          <Text style={styles.guideBadgeText}>Centralize o Rosto</Text>
        </Animated.View>
      </View>
    </View>
  ),
  (prev, next) => prev.device?.id === next.device?.id && prev.feedbackText === next.feedbackText
);

export const SimonSaysMechanicScreen: React.FC<SimonSaysMechanicScreenProps> = ({
  level = 'nivel4',
  onBack,
  onSaveSession,
}) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isPermissionGranted, setIsPermissionGranted] = useState(hasPermission);

  const frontDevice = useCameraDevice('front');
  const allDevices = useCameraDevices();
  const activeDevice = frontDevice ?? allDevices.find((d) => d.position === 'front') ?? allDevices[0];

  useEffect(() => {
    if (hasPermission) setIsPermissionGranted(true);
  }, [hasPermission]);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      setIsPermissionGranted(granted);
    } catch {
      setIsPermissionGranted(false);
    }
  };

  // Estados principais
  const [currentRound, setCurrentRound] = useState(1);
  const currentRoundRef = useRef(1);
  currentRoundRef.current = currentRound;

  const [currentCommand, setCurrentCommand] = useState<SimonCommandConfig>(COMMANDS[0]);
  const currentCommandRef = useRef<SimonCommandType>(COMMANDS[0].type);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [score, setScore] = useState(0);

  // Animações nativas
  const faceDetectedAnim = useRef(new Animated.Value(0)).current;
  const holdingFeedbackAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(1)).current;

  // Logs e Métricas de Exportação
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const sessionIdRef = useRef<string>(`session_simon_${Date.now()}`);
  const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<TelemetryRoundLogSimon[]>([]);

  // Refs de controle de ciclo
  const isExecutingRef = useRef<boolean>(false);
  const lastProcessedTimeRef = useRef<number>(0);
  const holdStartTimestampRef = useRef<number | null>(null);
  const isCommandCompletedForCycleRef = useRef<boolean>(false);

  // Modais de Controle
  const [isPaused, setIsPaused] = useState(false);
  const [isHowToPlayVisible, setIsHowToPlayVisible] = useState(false);
  const [isExitWarningVisible, setIsExitWarningVisible] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  const isPausedOrEvaluatingRef = useRef<boolean>(false);
  isPausedOrEvaluatingRef.current =
    isPaused || isEvaluating || isHowToPlayVisible || isExitWarningVisible;

  // Interceptor do Botão Voltar do Dispositivo
  const handleConfirmExit = useCallback(() => {
    setIsExitWarningVisible(false);
    setIsPaused(false);
    setIsHowToPlayVisible(false);
    onBack?.();
  }, [onBack]);

  useEffect(() => {
    const onBackPress = () => {
      if (isExitWarningVisible) {
        setIsExitWarningVisible(false);
        return true;
      }
      if (isHowToPlayVisible) {
        setIsHowToPlayVisible(false);
        return true;
      }
      if (isVictoryModalVisible) {
        setIsVictoryModalVisible(false);
        onBack?.();
        return true;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsPaused(false);
      setIsExitWarningVisible(true);
      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [isExitWarningVisible, isHowToPlayVisible, isVictoryModalVisible, onBack]);

  // Cronômetro
  useEffect(() => {
    if (isPaused || isVictoryModalVisible || isEvaluating || isHowToPlayVisible || isExitWarningVisible) {
      return;
    }
    const timer = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isPaused, isVictoryModalVisible, isEvaluating, isHowToPlayVisible, isExitWarningVisible]);

  // Sorteia comando sem repetir o imediatamente anterior
  const setupNewRound = () => {
    setIsEvaluating(false);
    resultScale.setValue(0);
    shockwaveScale.setValue(0);
    shockwaveOpacity.setValue(1);
    holdingFeedbackAnim.setValue(0);
    holdStartTimestampRef.current = null;
    isCommandCompletedForCycleRef.current = false;

    const availableCommands = COMMANDS.filter(
      (cmd) => cmd.type !== currentCommandRef.current
    );
    const nextCmd =
      availableCommands.length > 0
        ? availableCommands[Math.floor(Math.random() * availableCommands.length)]
        : COMMANDS[Math.floor(Math.random() * COMMANDS.length)];

    // ATUALIZA TANTO O ESTADO QUANTO A REF CORRESPONDENTE
    currentCommandRef.current = nextCmd.type;
    setCurrentCommand(nextCmd);
    roundStartedAtRef.current = new Date().toISOString();
  };

  useEffect(() => {
    sessionIdRef.current = `session_simon_${Date.now()}`;
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    currentRoundRef.current = 1;
    setupNewRound();
  }, [level]);

  // Conclusão da Rodada
  const triggerRoundCompletion = () => {
    setIsEvaluating(true);
    holdingFeedbackAnim.setValue(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScore((prev) => prev + POINTS_PER_ROUND);

    const roundCompletedAt = new Date().toISOString();
    const duration = Number(
      ((Date.parse(roundCompletedAt) - Date.parse(roundStartedAtRef.current)) / 1000).toFixed(2)
    );

    // Registra no histórico com o tipo exato e atual da rodada
    roundsLogRef.current.push({
      roundNumber: currentRoundRef.current,
      commandType: currentCommandRef.current,
      startedAt: roundStartedAtRef.current,
      completedAt: roundCompletedAt,
      durationSeconds: duration,
      success: true,
    });

    Animated.parallel([
      Animated.timing(shockwaveScale, { toValue: 2.2, duration: 380, useNativeDriver: true }),
      Animated.timing(shockwaveOpacity, { toValue: 0, duration: 380, useNativeDriver: true }),
      Animated.spring(resultScale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      if (currentRoundRef.current >= TOTAL_ROUNDS) {
        finalizeSession();
      } else {
        const nextRound = currentRoundRef.current + 1;
        currentRoundRef.current = nextRound;
        setCurrentRound(nextRound);
        setupNewRound();
      }
    }, 1500);
  };

  // Detecção Biométrica
  const handleFacesDetected = useCallback(
    (faces: Face[]) => {
      if (isPausedOrEvaluatingRef.current) return;

      const now = Date.now();
      if (now - lastProcessedTimeRef.current < 200 || isExecutingRef.current) return;
      isExecutingRef.current = true;
      lastProcessedTimeRef.current = now;

      try {
        if (!faces || faces.length === 0) {
          faceDetectedAnim.setValue(0);
          holdingFeedbackAnim.setValue(0);
          holdStartTimestampRef.current = null;
          return;
        }

        faceDetectedAnim.setValue(1);
        const face: any = faces[0];

        const leftProb = typeof face.leftEyeOpenProbability === 'number' ? face.leftEyeOpenProbability : 1;
        const rightProb = typeof face.rightEyeOpenProbability === 'number' ? face.rightEyeOpenProbability : 1;
        const smileProb = typeof face.smilingProbability === 'number' ? face.smilingProbability : 0;

        const eyeScreenLeft = rightProb;
        const eyeScreenRight = leftProb;

        const closedThreshold = 0.40;
        const openThreshold = 0.60;
        const smileThreshold = 0.65;

        const isSmiling = smileProb >= smileThreshold;
        const isBlinkingLeft = eyeScreenLeft < closedThreshold && eyeScreenRight > openThreshold;
        const isBlinkingRight = eyeScreenRight < closedThreshold && eyeScreenLeft > openThreshold;

        let isValidPose = false;
        const cmd = currentCommandRef.current;

        if (cmd === 'smile') {
          isValidPose = isSmiling && eyeScreenLeft > openThreshold && eyeScreenRight > openThreshold;
        } else if (cmd === 'blink_left') {
          isValidPose = isBlinkingLeft;
        } else if (cmd === 'blink_right') {
          isValidPose = isBlinkingRight;
        } else if (cmd === 'smile_and_blink_left') {
          isValidPose = isSmiling && isBlinkingLeft;
        } else if (cmd === 'smile_and_blink_right') {
          isValidPose = isSmiling && isBlinkingRight;
        }

        if (isValidPose) {
          holdingFeedbackAnim.setValue(1);
          if (!holdStartTimestampRef.current) {
            holdStartTimestampRef.current = now;
          } else if (
            now - holdStartTimestampRef.current >= REQUIRED_HOLD_MS &&
            !isCommandCompletedForCycleRef.current
          ) {
            isCommandCompletedForCycleRef.current = true;
            triggerRoundCompletion();
          }
        } else {
          holdingFeedbackAnim.setValue(0);
          holdStartTimestampRef.current = null;
          isCommandCompletedForCycleRef.current = false;
        }
      } finally {
        isExecutingRef.current = false;
      }
    },
    [faceDetectedAnim, holdingFeedbackAnim]
  );

  // Finalização e Log
  const finalizeSession = () => {
    const finishedAt = new Date().toISOString();
    const finalScore = score + POINTS_PER_ROUND;
    const totalRoundsDuration = roundsLogRef.current.reduce((acc, r) => acc + r.durationSeconds, 0);
    const avgResponseTime =
      roundsLogRef.current.length > 0
        ? Number((totalRoundsDuration / roundsLogRef.current.length).toFixed(2))
        : 0;

    const exportPayload: PhaseSimonSessionData = {
      sessionMeta: {
        sessionId: sessionIdRef.current,
        phaseId: 8,
        phaseKey: 'SimonSaysMechanic',
        level,
        devicePlatform: Platform.OS,
        startedAt: gameStartedAtRef.current,
        finishedAt,
        totalSessionDurationSeconds: secondsElapsed,
      },
      metrics: {
        totalRounds: TOTAL_ROUNDS,
        completedRounds: roundsLogRef.current.length,
        pointsEarned: finalScore,
        accuracyPercentage: 100,
        averageResponseTimePerRoundSeconds: avgResponseTime,
      },
      roundsDetail: roundsLogRef.current,
    };

    console.log('\n======================================================');
    console.log('👑 [FASE O CHEFINHO MANDOU FINALIZADA]');
    console.log('======================================================');
    console.log(`🆔 ID da Sessão:      ${exportPayload.sessionMeta.sessionId}`);
    console.log(`⏱️ Tempo Total:       ${exportPayload.sessionMeta.totalSessionDurationSeconds}s`);
    console.log(`⭐ Pontos Totais:     ${exportPayload.metrics.pointsEarned} pts (2 pts/ronda)`);
    console.log(`⚡ Média por Ronda:   ${exportPayload.metrics.averageResponseTimePerRoundSeconds}s`);
    console.log('------------------------------------------------------');
    console.log('📋 HISTÓRICO DE ORDENS DO CHEFINHO:');
    exportPayload.roundsDetail.forEach((round) => {
      console.log(
        `   • Ronda ${round.roundNumber}: Ordem [${round.commandType.toUpperCase()}] cumprida em ${round.durationSeconds}s`
      );
    });
    console.log('------------------------------------------------------');
    console.log('📦 JSON COMPLETO DA PARTIDA:');
    console.log(JSON.stringify(exportPayload, null, 2));
    console.log('======================================================\n');

    if (onSaveSession) onSaveSession(exportPayload);
    setIsVictoryModalVisible(true);
  };

  const handleResetGame = () => {
    setIsPaused(false);
    setIsHowToPlayVisible(false);
    setIsExitWarningVisible(false);
    currentRoundRef.current = 1;
    setCurrentRound(1);
    setScore(0);
    setSecondsElapsed(0);
    sessionIdRef.current = `session_simon_${Date.now()}`;
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  };

  if (!isPermissionGranted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCardContainer}>
          <View style={styles.permissionIconBadge}>
            <Ionicons name="camera" size={46} color="#FFFFFF" />
          </View>
          <Text style={styles.permissionHeading}>Permissão da Câmara</Text>
          <Text style={styles.permissionExplanation}>
            O Chefinho precisa da câmara para conferir se você cumpre as ordens direitinho!
          </Text>
          <TouchableOpacity
            style={styles.grantButton}
            onPress={handleRequestPermission}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.grantButtonText}>CONCEDER ACESSO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeDevice) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingCenter]}>
        <ActivityIndicator size="large" color="#E07A5F" />
        <Text style={styles.loadingText}>A inicializar sensor da câmara...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <GameHeader
          currentRound={currentRound}
          totalRounds={TOTAL_ROUNDS}
          score={score}
          secondsElapsed={secondsElapsed}
          isEvaluating={isEvaluating}
          onPause={() => setIsPaused(true)}
        />

        <View style={styles.mirrorWrapper}>
          <CameraStream
            device={activeDevice}
            onFacesDetected={handleFacesDetected}
            faceDetectedAnim={faceDetectedAnim}
            holdingFeedbackAnim={holdingFeedbackAnim}
            feedbackText="Perfeito! Segure a pose..."
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwave,
              { transform: [{ scale: shockwaveScale }], opacity: shockwaveOpacity },
            ]}
          />

          {isEvaluating && (
            <Animated.View
              pointerEvents="none"
              style={[styles.resultPopBadgeCentered, { transform: [{ scale: resultScale }] }]}
            >
              <Text style={styles.resultPopEmoji}>👑✨</Text>
              <Text style={styles.resultPopTitle}>ORDEM CUMPRIDA!</Text>
              <Text style={styles.resultPopSub}>O Chefinho aprovou! (+2 pts ⭐)</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.actionCard}>
          <View style={styles.commandHeaderRow}>
            <View style={styles.commandIconBox}>
              <Ionicons name={currentCommand.icon} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.commandTextWrap}>
              <Text style={styles.commandTitle}>{currentCommand.title}</Text>
              <Text style={styles.commandSubtitle}>{currentCommand.instruction}</Text>
            </View>
          </View>

          <View style={styles.counterRow}>
            <View style={styles.targetPill}>
              <Text style={styles.targetEmoji}>{currentCommand.hintEmoji}</Text>
              <Text style={styles.targetPillText}>IMITE A POSE</Text>
            </View>

            <View style={styles.autoDetectionTag}>
              <Ionicons name="time-outline" size={15} color="#4A3B32" />
              <Text style={styles.autoDetectionTagText}>SEGURE ~0.5s</Text>
            </View>
          </View>
        </View>

        <PauseModal
          visible={isPaused}
          onResume={() => setIsPaused(false)}
          onOpenTutorial={() => setIsHowToPlayVisible(true)}
          onRestart={handleResetGame}
          onRequestExit={() => {
            setIsPaused(false);
            setIsExitWarningVisible(true);
          }}
        />

        <TutorialVideoModal
          visible={isHowToPlayVisible}
          videoUrl={TUTORIAL_VIDEO_URL}
          instructionText="Fique atento ao que o Chefinho mandar! Mostre um sorriso, pisque um dos olhos ou faça as duas coisas juntas e segure a pose até a validação!"
          onClose={() => setIsHowToPlayVisible(false)}
        />

        <ExitWarningModal
          visible={isExitWarningVisible}
          score={score}
          onStay={() => setIsExitWarningVisible(false)}
          onConfirmExit={handleConfirmExit}
        />

        <VictoryModal
          visible={isVictoryModalVisible}
          score={score}
          title="Obediência Nota 10!"
          subtitle="Excelente! Seguiu todas as ordens do Chefinho com reflexo e expressividade!"
          onContinue={() => {
            setIsVictoryModalVisible(false);
            onBack?.();
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F2EB' },
  loadingCenter: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 14, fontSize: 15, fontWeight: '800', color: '#4A3B32' },
  container: { flex: 1, paddingHorizontal: 16, justifyContent: 'space-between', paddingBottom: 16, paddingTop: 6 },
  mirrorWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
    width: '100%',
  },
  cameraBox: {
    width: Math.min(SCREEN_WIDTH * 0.94, 340),
    flex: 1,
    maxHeight: 460,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#4A3B32',
    borderBottomWidth: 8,
    borderBottomColor: '#2B2018',
    backgroundColor: '#1E1712',
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
  },
  holdingFeedbackOverlay: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 10, 8, 0.82)',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#2ECC71',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 12,
  },
  holdingFeedbackText: { color: '#2ECC71', fontSize: 13, fontWeight: '900' },
  faceGuideFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  guideBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  shockwave: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 140,
    height: 140,
    marginLeft: -70,
    marginTop: -70,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    zIndex: 35,
  },
  resultPopBadgeCentered: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
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
  },
  resultPopEmoji: { fontSize: 34 },
  resultPopTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 17, marginTop: 4, textAlign: 'center' },
  resultPopSub: { color: '#FDF7E7', fontWeight: '900', fontSize: 13, marginTop: 3, textAlign: 'center' },

  actionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#4A3B32',
    borderBottomWidth: 6,
    borderBottomColor: '#2B2018',
    borderRadius: 24,
    padding: 14,
    width: '100%',
    gap: 12,
  },
  commandHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  commandIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A3B32',
  },
  commandTextWrap: { flex: 1 },
  commandTitle: { fontSize: 16, fontWeight: '900', color: '#4A3B32' },
  commandSubtitle: { fontSize: 12, fontWeight: '700', color: '#6B5A4E', marginTop: 2 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF7E7',
    borderWidth: 2,
    borderColor: '#F39C12',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    flex: 1,
  },
  targetEmoji: { fontSize: 18 },
  targetPillText: { fontSize: 13, fontWeight: '900', color: '#8A5300' },
  autoDetectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5EE',
    borderWidth: 2,
    borderColor: '#4A3B32',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  autoDetectionTagText: { fontSize: 11, fontWeight: '900', color: '#4A3B32' },

  permissionCardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  permissionIconBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E07A5F',
    borderWidth: 4,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionHeading: { fontSize: 22, fontWeight: '900', color: '#4A3B32' },
  permissionExplanation: { fontSize: 14, fontWeight: '700', color: '#6B5A4E', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  grantButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#27AE60',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4A3B32',
    borderBottomWidth: 6,
    borderBottomColor: '#1E8449',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  grantButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});

export default SimonSaysMechanicScreen;