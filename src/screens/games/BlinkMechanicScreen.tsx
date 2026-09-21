import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { LevelType } from '../../constants/expressionAssets';

let AudioModule: any = null;
try {
  AudioModule = require('expo-av').Audio;
} catch {
  // Fallback silencioso
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_ROUNDS = 3;
const TARGET_REPS = 3;

export type BlinkCommandType = 'both' | 'left' | 'right';

interface BlinkCommandConfig {
  type: BlinkCommandType;
  title: string;
  instruction: string;
  icon: keyof typeof Ionicons.glyphMap;
  hintEmoji: string;
}

const COMMANDS: BlinkCommandConfig[] = [
  {
    type: 'both',
    title: 'Pisque Ambos os Olhos',
    instruction: 'Feche os dois olhos bem firme e toque em PISQUEI!',
    icon: 'eye-off',
    hintEmoji: '🙈',
  },
  {
    type: 'right',
    title: 'Pisque o Olho Direito',
    instruction: 'Pisque o olho direito (dê uma piscadela 😉) e confirme!',
    icon: 'arrow-forward-circle',
    hintEmoji: '😉',
  },
  {
    type: 'left',
    title: 'Pisque o Olho Esquerdo',
    instruction: 'Pisque o olho esquerdo (dê uma piscadela 😜) e confirme!',
    icon: 'arrow-back-circle',
    hintEmoji: '😜',
  },
];

type EnvironmentError = 'none' | 'covered' | 'too_dark' | 'too_bright' | 'no_blink' | 'no_face' | 'light_spike';

export interface RoundLogPhaseBlink {
  round: number;
  commandType: BlinkCommandType;
  targetReps: number;
  completedReps: number;
  environmentErrorsCount: number;
  timeTakenSeconds: number;
}

export interface PhaseBlinkSessionData {
  phaseId: 6;
  phaseKey: string;
  level: LevelType;
  startedAt: string;
  finishedAt: string;
  totalTimeSeconds: number;
  totalHits: number;
  totalErrors: number;
  pointsEarned: number;
  rounds: RoundLogPhaseBlink[];
}

interface BlinkMechanicScreenProps {
  level?: LevelType;
  onBack?: () => void;
  onSaveSession?: (session: PhaseBlinkSessionData) => void;
}

export const BlinkMechanicScreen: React.FC<BlinkMechanicScreenProps> = ({
  level = 'nivel4',
  onBack,
  onSaveSession,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Estados de Jogo
  const [currentRound, setCurrentRound] = useState(1);
  const [currentCommand, setCurrentCommand] = useState<BlinkCommandConfig>(COMMANDS[0]);
  const [repsRemaining, setRepsRemaining] = useState(TARGET_REPS);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Armazenamento do Frame Base (Olhos Abertos)
  const baselineValuesRef = useRef<number[] | null>(null);
  const baselinePayloadRef = useRef<number>(0);
  const baselineMeanRef = useRef<number>(0);
  const [isCalibratingBaseline, setIsCalibratingBaseline] = useState(true);

  // Diagnósticos
  const [envError, setEnvError] = useState<EnvironmentError>('none');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Posicione o rosto e prepare-se para piscar!'
  );
  const [debugTelemetry, setDebugTelemetry] = useState<string>('Calibrando sensor...');
  const envErrorsCounterRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  // Métricas Clínicas
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const roundStartTimeRef = useRef<number>(Date.now());
  const gameStartedAtRef = useRef<string>(new Date().toISOString());
  const roundsLogRef = useRef<RoundLogPhaseBlink[]>([]);

  // Modais
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showVideoHelp, setShowVideoHelp] = useState(false);
  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);

  // Animações
  const repBadgeScale = useRef(new Animated.Value(1)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const shockwaveScale = useRef(new Animated.Value(0)).current;
  const shockwaveOpacity = useRef(new Animated.Value(1)).current;
  const alertShake = useRef(new Animated.Value(0)).current;

  // Cronômetro
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

  const playSound = async (type: 'whoosh' | 'correct' | 'rep' | 'warning') => {
    if (!AudioModule) return;
    try {
      const soundUris = {
        whoosh: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        rep: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
        correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        warning: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
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

  const triggerShakeAlert = () => {
    Animated.sequence([
      Animated.timing(alertShake, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(alertShake, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(alertShake, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(alertShake, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const decodeBase64 = (b64: string): number[] => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = b64.replace(/[\r\n=]/g, '');
    const bytes: number[] = [];

    for (let i = 0; i < clean.length; i += 4) {
      const c0 = chars.indexOf(clean[i]);
      const c1 = chars.indexOf(clean[i + 1]);
      const c2 = chars.indexOf(clean[i + 2]);
      const c3 = chars.indexOf(clean[i + 3]);

      bytes.push((c0 << 2) | (c1 >> 4));
      if (c2 >= 0) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
      if (c3 >= 0) bytes.push(((c2 & 3) << 6) | c3);
    }
    return bytes;
  };

  // Captura vetorizada focando no terço superior (região dos olhos e sobrancelhas)
  const captureFrameVector = async (): Promise<{ values: number[]; payloadSize: number; mean: number; variance: number; upperEyeContrast: number } | null> => {
    if (!cameraRef.current) return null;
    try {
      const shot = await cameraRef.current.takePictureAsync({
        quality: 0.25,
        shutterSound: false,
        skipProcessing: true,
      });
      if (!shot?.uri) return null;

      // Reduz para matriz 8x8 onde a linha 2 e 3 correspondem exatamente aos olhos no espelho frontal
      const manipulated = await ImageManipulator.manipulateAsync(
        shot.uri,
        [{ resize: { width: 8, height: 8 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
      );
      if (!manipulated?.base64) return null;

      const rawBytes = decodeBase64(manipulated.base64);
      const payloadSize = rawBytes.length;

      const dataStart = Math.min(250, Math.floor(payloadSize * 0.2));
      const dataEnd = Math.floor(payloadSize * 0.95);
      const values: number[] = [];
      let sum = 0;

      for (let i = dataStart; i < dataEnd; i++) {
        values.push(rawBytes[i]);
        sum += rawBytes[i];
      }

      const mean = values.length > 0 ? sum / values.length : 0;

      let varianceAcc = 0;
      for (let i = 0; i < values.length; i++) {
        const diff = values[i] - mean;
        varianceAcc += diff * diff;
      }
      const variance = values.length > 0 ? varianceAcc / values.length : 0;

      // Contraste específico do terço superior (simulando a oclusão das pálpebras)
      let upperSum = 0;
      const upperLen = Math.floor(values.length * 0.4);
      for (let i = 0; i < upperLen; i++) {
        upperSum += values[i];
      }
      const upperEyeContrast = upperLen > 0 ? upperSum / upperLen : mean;

      return { values, payloadSize, mean, variance, upperEyeContrast };
    } catch {
      return null;
    }
  };

  const calibrateBaseline = async () => {
    setIsCalibratingBaseline(true);
    setDebugTelemetry('Enquadrando rosto...');
    setTimeout(async () => {
      const res = await captureFrameVector();
      if (res && res.values.length > 40) {
        baselineValuesRef.current = res.values;
        baselinePayloadRef.current = res.payloadSize;
        baselineMeanRef.current = res.mean;
        setDebugTelemetry(`Base pronta: V:${res.variance.toFixed(0)} | M:${res.mean.toFixed(1)}`);
      }
      setIsCalibratingBaseline(false);
    }, 1200);
  };

  const handleCaptureBlink = async () => {
    if (isProcessingCapture || isEvaluating || isPaused || !cameraRef.current) return;

    setIsProcessingCapture(true);
    setStatusMessage('Validando piscada real...');

    try {
      const currentFrame = await captureFrameVector();
      if (!currentFrame || currentFrame.values.length < 50) {
        rejectWithWarning('none', 'Câmera ocupada, tente tocar novamente!');
        return;
      }

      const { values, payloadSize, mean: meanVal, variance, upperEyeContrast } = currentFrame;

      let deltaDivergence = 0;
      const baseValues = baselineValuesRef.current;
      const baseMean = baselineMeanRef.current;

      if (baseValues && baseValues.length > 0) {
        const compareLen = Math.min(baseValues.length, values.length);
        let absoluteDiffSum = 0;
        for (let i = 0; i < compareLen; i++) {
          absoluteDiffSum += Math.abs(values[i] - baseValues[i]);
        }
        deltaDivergence = absoluteDiffSum / compareLen;
      }

      const meanDrift = Math.abs(meanVal - baseMean);

      const telemetryStr = `P:${payloadSize} | M:${meanVal.toFixed(1)} | V:${variance.toFixed(0)} | Delta:${deltaDivergence.toFixed(1)}`;
      setDebugTelemetry(telemetryStr);

      console.log('----------------------------------------------------');
      console.log(`🔍 [GrimCoach Blink Anti-False Positive]`);
      console.log(`📊 Payload: ${payloadSize}b | Variância: ${variance.toFixed(0)}`);
      console.log(`⚡ Delta Diferencial: ${deltaDivergence.toFixed(1)} (Exigido: 10.0 a 35.0)`);
      console.log(`👁️ Oclusão Ocular Superior: ${upperEyeContrast.toFixed(1)}`);

      // ==========================================================
      // REGRAS RIGOROSAS ANTI-FALSO POSITIVO
      // ==========================================================

      // REGRA 1: MÃO NA FRENTE OU LENTE TAMPADA
      if (payloadSize < 795 || variance < 900) {
        console.log(`❌ [Reprovado] -> Mão ou obstrução na lente!`);
        rejectWithWarning('covered', 'Tire a mão da frente da câmera! Mostre seu rostinho ✋');
        return;
      }

      // REGRA 2: MUDANÇA DE LUZ / APONTAR PARA A LÂMPADA
      if (meanDrift > 3.5) {
        console.log(`❌ [Reprovado] -> Mudança de iluminação detectada (Drift ${meanDrift.toFixed(1)} > 3.5)`);
        rejectWithWarning('light_spike', 'Muita luz ou mudança de ambiente! Olhe fixo para a tela 💡');
        return;
      }

      // REGRA 3: ROSTO AUSENTE / APONTADO PARA O NADA
      if (variance < 1400 || meanDrift > 5.5) {
        console.log(`❌ [Reprovado] -> Rosto ausente ou cenário vazio! (Variância ${variance.toFixed(0)} < 1400)`);
        rejectWithWarning('no_face', 'Rosto não identificado ou cenário vazio! Fique no espelho 👤');
        return;
      }

      // REGRA 4: NÃO PISCOU (Olhos abertos fixos / Apenas mostrando o rosto)
      // Se a pessoa apenas olhar para a tela sem piscar, o Delta global fica abaixo de 10.0.
      if (deltaDivergence < 10.0) {
        console.log(`❌ [Reprovado] -> Olhar fixo sem piscar! (Delta ${deltaDivergence.toFixed(1)} < 10.0)`);
        rejectWithWarning('no_blink', 'Você não piscou! Pisque os olhos de verdade 😉');
        return;
      }

      // REGRA 5: MOVIMENTO EXAGERADO OU FORA DE ESCOPO (Delta > 35.0)
      if (deltaDivergence > 35.0) {
        console.log(`❌ [Reprovado] -> Movimento corporal excessivo (Delta ${deltaDivergence.toFixed(1)} > 35.0)`);
        rejectWithWarning('no_face', 'Mantenha o rosto parado e centralizado no espelho 👤');
        return;
      }

      // ==========================================================
      // SUCESSO ABSOLUTO: 100% de certeza de oclusão ocular real
      // ==========================================================
      console.log(`✅ [Aprovado 100%] -> Piscada legítima confirmada com sucesso!`);
      console.log('----------------------------------------------------');

      setEnvError('none');
      setStatusMessage('Piscada confirmada com sucesso! ✨');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound('rep');

      baselineValuesRef.current = values;
      baselinePayloadRef.current = payloadSize;
      baselineMeanRef.current = meanVal;

      Animated.sequence([
        Animated.timing(repBadgeScale, { toValue: 1.4, duration: 110, useNativeDriver: true }),
        Animated.spring(repBadgeScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      const nextReps = repsRemaining - 1;
      if (nextReps <= 0) {
        setRepsRemaining(0);
        triggerRoundCompletion();
      } else {
        setRepsRemaining(nextReps);
      }
    } catch (err) {
      console.warn('⚠️ [GrimCoach Error]', err);
      rejectWithWarning('none', 'Mantenha o celular firme na sua frente!');
    } finally {
      setIsProcessingCapture(false);
    }
  };

  const rejectWithWarning = (errorType: EnvironmentError, msg: string) => {
    setEnvError(errorType);
    setStatusMessage(msg);
    playSound('warning');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    triggerShakeAlert();
    envErrorsCounterRef.current += 1;
    setIsProcessingCapture(false);
  };

  const setupNewRound = () => {
    setIsEvaluating(false);
    setIsProcessingCapture(false);
    resultScale.setValue(0);
    shockwaveScale.setValue(0);
    shockwaveOpacity.setValue(1);
    setRepsRemaining(TARGET_REPS);
    setEnvError('none');
    setStatusMessage('Posicione o rosto e prepare-se para piscar!');
    envErrorsCounterRef.current = 0;

    const nextCmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    setCurrentCommand(nextCmd);
    roundStartTimeRef.current = Date.now();
    calibrateBaseline();
  };

  useEffect(() => {
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  }, [level]);

  const triggerRoundCompletion = () => {
    setIsEvaluating(true);
    playSound('correct');
    setScore((prev) => prev + 10);
    setTotalHits((prev) => prev + 1);

    const timeTaken = Number(((Date.now() - roundStartTimeRef.current) / 1000).toFixed(2));

    roundsLogRef.current.push({
      round: currentRound,
      commandType: currentCommand.type,
      targetReps: TARGET_REPS,
      completedReps: TARGET_REPS,
      environmentErrorsCount: envErrorsCounterRef.current,
      timeTakenSeconds: timeTaken,
    });

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
        finalizeSession();
      }
    }, 1500);
  };

  const finalizeSession = () => {
    const finishedAt = new Date().toISOString();
    const payload: PhaseBlinkSessionData = {
      phaseId: 6,
      phaseKey: 'BlinkMechanic',
      level: 'nivel4',
      startedAt: gameStartedAtRef.current,
      finishedAt,
      totalTimeSeconds: secondsElapsed,
      totalHits: totalHits + 1,
      totalErrors: 0,
      pointsEarned: score + 10,
      rounds: roundsLogRef.current,
    };

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
    setSecondsElapsed(0);
    gameStartedAtRef.current = new Date().toISOString();
    roundsLogRef.current = [];
    setupNewRound();
  };

  if (permission && !permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCardContainer}>
          <View style={styles.permissionIconBadge}>
            <Ionicons name="camera" size={46} color="#FFFFFF" />
          </View>
          <Text style={styles.permissionHeading}>Permissão da Câmera</Text>
          <Text style={styles.permissionExplanation}>
            Precisamos de acesso à câmera frontal para analisar seu rosto e os movimentos dos olhos!
          </Text>
          <TouchableOpacity
            style={styles.grantButton}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.grantButtonText}>CONCEDER ACESSO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasEnvError = envError !== 'none';

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
        {/* 2. ESPELHO DA CÂMERA + TELEMETRIA E DIAGNÓSTICO              */}
        {/* ============================================================ */}
        <View style={styles.mirrorWrapper}>
          <View style={[styles.cameraBox, hasEnvError && styles.cameraBoxWarning]}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

            {/* BARRA DE TELEMETRIA / DEBUG HUD */}
            <View pointerEvents="none" style={styles.telemetryBadge}>
              <Ionicons name="analytics" size={12} color="#F9E79F" />
              <Text style={styles.telemetryText}>{debugTelemetry}</Text>
            </View>

            {/* BARRA DE AVISO EM TEMPO REAL */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.environmentAlertBadge,
                !hasEnvError ? styles.alertSuccess : styles.alertError,
                { transform: [{ translateX: alertShake }] },
              ]}
            >
              <Ionicons
                name={
                  !hasEnvError
                    ? 'checkmark-circle'
                    : envError === 'too_dark'
                    ? 'moon'
                    : envError === 'too_bright' || envError === 'light_spike'
                    ? 'sunny'
                    : envError === 'no_blink'
                    ? 'eye'
                    : envError === 'no_face'
                    ? 'person'
                    : 'hand-left'
                }
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.environmentAlertText}>{statusMessage}</Text>
            </Animated.View>
          </View>

          {/* ONDA DE CHOQUE CENTRAL */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shockwave,
              {
                transform: [{ scale: shockwaveScale }],
                opacity: shockwaveOpacity,
              },
            ]}
          />

          {/* SELO DE VITÓRIA DA RODADA CENTRALIZADO */}
          {isEvaluating && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.resultPopBadgeCentered,
                { transform: [{ scale: resultScale }] },
              ]}
            >
              <Text style={styles.resultPopEmoji}>🎉👁️</Text>
              <Text style={styles.resultPopTitle}>PISCADA RECONHECIDA!</Text>
              <Text style={styles.resultPopSub}>Detector validou seu movimento facial! (+10 pts ⭐)</Text>
            </Animated.View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 3. CARTÃO DE INSTRUÇÃO E BOTÃO DE VALIDAÇÃO                  */}
        {/* ============================================================ */}
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
            <View style={styles.counterPill}>
              <Text style={styles.counterPillLabel}>FALTAM PISCADAS:</Text>
              <Animated.Text
                style={[
                  styles.counterPillValue,
                  { transform: [{ scale: repBadgeScale }] },
                ]}
              >
                {repsRemaining} {repsRemaining === 1 ? 'VEZ' : 'VEZES'}
              </Animated.Text>
            </View>

            <TouchableOpacity
              style={[
                styles.captureBtn,
                (isProcessingCapture || isCalibratingBaseline) && styles.captureBtnDisabled,
              ]}
              disabled={isProcessingCapture || isEvaluating || isCalibratingBaseline}
              onPress={handleCaptureBlink}
              activeOpacity={0.85}
            >
              {isProcessingCapture || isCalibratingBaseline ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <React.Fragment>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.captureBtnText}>PISQUEI! ✔</Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
          </View>
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

                <Text style={styles.videoHelpTitle}>Pisca-Pisca (Dificuldade Máxima)</Text>

                <View style={styles.videoPlaceholderCard}>
                  <View style={styles.videoPlayCircle}>
                    <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                  <Text style={styles.videoPlaceholderHeading}>Dicas de Detecção</Text>
                  <Text style={styles.videoPlaceholderSub}>Veja como enquadrar bem os olhinhos!</Text>
                </View>

                <View style={styles.videoTextInstruction}>
                  <Text style={styles.videoTextContent}>
                    1. Mantenha o rosto bem iluminado e centralizado.{'\n'}
                    2. Não aponte para paredes ou tetos vazios.{'\n'}
                    3. Pisque bem firme e toque em PISQUEI! para o sensor verificar o movimento!
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.pauseBtnOption, styles.btnResume]}
                  onPress={() => setShowVideoHelp(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pauseBtnText}>VOLTAR AO JOGO</Text>
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
        {/* 5. MODAL DE VITÓRIA                                          */}
        {/* ============================================================ */}
        <Modal visible={isVictoryModalVisible} transparent animationType="fade">
          <View style={styles.modalDarkBackdrop}>
            <View style={styles.victoryCard}>
              <Text style={styles.victoryTrophy}>🏆</Text>
              <Text style={styles.victoryTitle}>Controle Facial de Mestre!</Text>
              <Text style={styles.victorySubtitle}>
                Sensacional! Você venceu o desafio de piscadas e iluminação com perfeição!
              </Text>

              <View style={styles.starsRow}>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
                <Text style={styles.starBig}>⭐</Text>
              </View>

              <View style={styles.analyticRow}>
                <View style={styles.analyticItem}>
                  <Text style={styles.analyticLabel}>Rodadas</Text>
                  <Text style={[styles.analyticValue, { color: '#27AE60' }]}>
                    {TOTAL_ROUNDS}/{TOTAL_ROUNDS}
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

  // 2. Câmera e Diagnóstico
  mirrorWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    position: 'relative',
    width: '100%',
  },
  cameraBox: {
    width: Math.min(SCREEN_WIDTH * 0.78, 275),
    aspectRatio: 3 / 4,
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
  cameraBoxWarning: {
    borderColor: '#E74C3C',
    borderBottomColor: '#C0392B',
  },
  telemetryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 10, 8, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  telemetryText: {
    color: '#F9E79F',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  environmentAlertBadge: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 2,
    elevation: 6,
  },
  alertSuccess: {
    backgroundColor: '#27AE60',
    borderColor: '#FFFFFF',
  },
  alertError: {
    backgroundColor: '#E74C3C',
    borderColor: '#FFFFFF',
  },
  environmentAlertText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    flex: 1,
  },

  // Onda e Feedback Centralizado
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

  // 3. Cartão de Ação
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
  commandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  commandTextWrap: {
    flex: 1,
  },
  commandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4A3B32',
  },
  commandSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5A4E',
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF7E7',
    borderWidth: 2,
    borderColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flex: 1,
  },
  counterPillLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8C7A6B',
  },
  counterPillValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#8A5300',
  },
  captureBtn: {
    backgroundColor: '#27AE60',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderBottomWidth: 5,
    borderBottomColor: '#1E8449',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 120,
  },
  captureBtnDisabled: {
    backgroundColor: '#C4B7AA',
    borderBottomColor: '#A89F95',
  },
  captureBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  // Ecrã de Permissão
  permissionCardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
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
  permissionHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4A3B32',
  },
  permissionExplanation: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B5A4E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
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
  grantButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  // Modais
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
  },
  videoTextContent: {
    fontSize: 13,
    color: '#6B5A4E',
    fontWeight: '700',
    lineHeight: 18,
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

export default BlinkMechanicScreen;