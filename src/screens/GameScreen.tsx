import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  Animated,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Mascot } from '../components/Mascot';
import { useProfile, DEFAULT_PROFILE } from '../contexts/ProfileContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.49);
const CARD_WIDTH = Math.min(Math.round(CARD_HEIGHT * (9 / 16)), Math.round(SCREEN_WIDTH * 0.88));

interface PhaseItem {
  id: number;
  title: string;
  image: any;
  instruction: string;
  unlocked: boolean;
}

const PHASES_DATA: PhaseItem[] = [
  {
    id: 1,
    title: 'Compare as Expressões',
    image: require('../../assets/phases/compare_as_expressoes.jpg'),
    instruction: 'Olhe bem os rostinhos e descubra se as expressões são iguais ou diferentes!',
    unlocked: true,
  },
  {
    id: 2,
    title: 'Selecione a Expressão',
    image: require('../../assets/phases/selecione_a_expressao.jpg'),
    instruction: 'Toque na carinha que está sentindo a mesma emoção pedida!',
    unlocked: true,
  },
  {
    id: 3,
    title: 'Ligue as Expressões',
    image: require('../../assets/phases/ligue_as_expressoes.jpg'),
    instruction: 'Conecte com o dedinho cada rostinho ao seu par correto!',
    unlocked: true,
  },
  {
    id: 4,
    title: 'Encontre o Impostor',
    image: require('../../assets/phases/econtre_o_impostor.jpg'),
    instruction: 'Atenção! Ache a carinha diferente no meio de todas as outras!',
    unlocked: true,
  },
  {
    id: 5,
    title: 'Jogo da Memória',
    image: require('../../assets/phases/jogo_da_memoria.jpg'),
    instruction: 'Vire as cartinhas e encontre os pares de expressões escondidos!',
    unlocked: true,
  },
  {
    id: 6,
    title: 'Pisca-Pisca',
    image: require('../../assets/phases/pisca_pisca.jpg'),
    instruction: 'Preste atenção nos olhinhos e pisque bem rápido quando aparecer o sinal!',
    unlocked: true,
  },
  {
    id: 7,
    title: 'Sorria, está sendo filmado!',
    image: require('../../assets/phases/sorria_esta_sendo_filmado.jpg'),
    instruction: 'Abra um sorriso bem brilhante em frente à câmera!',
    unlocked: true,
  },
  {
    id: 8,
    title: 'O Chefinho Mandou',
    image: require('../../assets/phases/chefin_mandou.jpg'),
    instruction: 'Faça exatamente o gesto e a expressão que o chefinho pedir!',
    unlocked: true,
  },
  {
    id: 9,
    title: 'Imite a Expressão',
    image: require('../../assets/phases/imite_a_expressao.jpg'),
    instruction: 'Olhe a expressão na tela e tente fazer uma carinha idêntica!',
    unlocked: true,
  },
  {
    id: 10,
    title: 'Desafio do Mestre',
    image: require('../../assets/phases/imite_a_expressao.jpg'),
    instruction: 'Chegou o grande desafio final! Mostre tudo o que aprendeu!',
    unlocked: true,
  },
];

interface GameScreenProps {
  onSelectPhaseLevel?: (phaseNumber: number, levelNumber: number) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onSelectPhaseLevel }) => {
  const profileContext = useProfile();
  const profile = profileContext?.activeProfile || DEFAULT_PROFILE;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedPhaseId, setExpandedPhaseId] = useState<number | null>(null);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 3,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  const scrollToPhase = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < PHASES_DATA.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
      setCurrentIndex(newIndex);
      setExpandedPhaseId(null);
    }
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / CARD_HEIGHT);
    if (index !== currentIndex && index >= 0 && index < PHASES_DATA.length) {
      setCurrentIndex(index);
      setExpandedPhaseId(null);
    }
  };

  const handleCardPress = (phase: PhaseItem) => {
    if (!phase.unlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setExpandedPhaseId(expandedPhaseId === phase.id ? null : phase.id);
  };

  const handleSelectSubLevel = (phaseNumber: number, levelNumber: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onSelectPhaseLevel) {
      onSelectPhaseLevel(phaseNumber, levelNumber);
    }
  };

  const currentPhase = PHASES_DATA[currentIndex];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* 1. SEÇÃO DE FASES */}
        <View style={styles.phasesContainer}>
          <Animated.View
            style={[
              styles.arrowWrapper,
              { transform: [{ translateY: Animated.multiply(bounceAnim, -1) }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.arrowWideBtn,
                currentIndex === 0 && styles.arrowDisabled,
              ]}
              disabled={currentIndex === 0}
              onPress={() => scrollToPhase(currentIndex - 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-up" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={PHASES_DATA}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              snapToInterval={CARD_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleScrollEnd}
              getItemLayout={(_, index) => ({
                length: CARD_HEIGHT,
                offset: CARD_HEIGHT * index,
                index,
              })}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isExpanded = expandedPhaseId === item.id;

                return (
                  <View style={[styles.cardWrapper, { height: CARD_HEIGHT }]}>
                    <TouchableOpacity
                      style={[
                        styles.phaseCard,
                        !item.unlocked && styles.phaseCardLocked,
                      ]}
                      onPress={() => handleCardPress(item)}
                      activeOpacity={0.92}
                    >
                      {!isExpanded ? (
                        <View style={styles.imageCardContainer}>
                          <Image
                            source={item.image}
                            style={styles.phaseImage}
                            resizeMode="contain"
                          />

                          <View style={styles.bottomOverlay}>
                            <View style={styles.overlayHeaderRow}>
                              <View style={styles.phaseBadge}>
                                <Text style={styles.phaseBadgeText}>Fase {item.id}</Text>
                              </View>

                              <TouchableOpacity
                                style={styles.helpQuestionBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setHelpModalVisible(true);
                                }}
                                activeOpacity={0.75}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="help" size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.phaseTitleText} numberOfLines={2}>
                              {item.title}
                            </Text>

                            <View style={styles.touchPrompt}>
                              <Text style={styles.touchPromptText}>Toque para Jogar 🎮</Text>
                            </View>
                          </View>

                          {!item.unlocked && (
                            <View style={styles.lockedMask}>
                              <Text style={styles.lockEmoji}>🔒</Text>
                              <Text style={styles.lockTitle}>Fase {item.id}</Text>
                              <Text style={styles.lockSubTitle}>Bloqueada</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.levelsGrid}>
                          {/* Nível 1 */}
                          <TouchableOpacity
                            style={[styles.levelQuadrant, styles.quadrantGold]}
                            onPress={() => handleSelectSubLevel(item.id, 1)}
                            activeOpacity={0.85}
                          >
                            <View style={styles.levelCardInner}>
                              <View style={[styles.levelNumberCircle, { backgroundColor: '#E67E22' }]}>
                                <Text style={styles.levelNumberText}>1</Text>
                              </View>
                              <Text style={styles.levelTitleText}>Nível 1</Text>
                              <Text style={styles.levelStarsText}>⭐⭐⭐</Text>
                              <View style={styles.playBigBtn}>
                                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Nível 2 */}
                          <TouchableOpacity
                            style={[styles.levelQuadrant, styles.quadrantEmerald]}
                            onPress={() => handleSelectSubLevel(item.id, 2)}
                            activeOpacity={0.85}
                          >
                            <View style={styles.levelCardInner}>
                              <View style={[styles.levelNumberCircle, { backgroundColor: '#219653' }]}>
                                <Text style={styles.levelNumberText}>2</Text>
                              </View>
                              <Text style={styles.levelTitleText}>Nível 2</Text>
                              <Text style={styles.levelStarsText}>⭐⭐⭐</Text>
                              <View style={styles.playBigBtn}>
                                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Nível 3 */}
                          <TouchableOpacity
                            style={[styles.levelQuadrant, styles.quadrantCoral]}
                            onPress={() => handleSelectSubLevel(item.id, 3)}
                            activeOpacity={0.85}
                          >
                            <View style={styles.levelCardInner}>
                              <View style={[styles.levelNumberCircle, { backgroundColor: '#D9534F' }]}>
                                <Text style={styles.levelNumberText}>3</Text>
                              </View>
                              <Text style={styles.levelTitleText}>Nível 3</Text>
                              <Text style={styles.levelStarsText}>⭐⭐⭐</Text>
                              <View style={styles.playBigBtn}>
                                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Nível 4 */}
                          <TouchableOpacity
                            style={[styles.levelQuadrant, styles.quadrantViolet]}
                            onPress={() => handleSelectSubLevel(item.id, 4)}
                            activeOpacity={0.85}
                          >
                            <View style={styles.levelCardInner}>
                              <View style={[styles.levelNumberCircle, { backgroundColor: '#8E44AD' }]}>
                                <Text style={styles.levelNumberText}>4</Text>
                              </View>
                              <Text style={styles.levelTitleText}>Nível 4</Text>
                              <Text style={styles.levelStarsText}>⭐⭐⭐</Text>
                              <View style={styles.playBigBtn}>
                                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                              </View>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.centerBadgeContainer}>
                            <View style={styles.centerPhaseTag}>
                              <FontAwesome5 name="medal" size={12} color="#E07A5F" />
                              <Text style={styles.centerPhaseTagText}>Fase {item.id}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>

          <Animated.View
            style={[
              styles.arrowWrapper,
              { transform: [{ translateY: bounceAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.arrowWideBtn,
                currentIndex === PHASES_DATA.length - 1 && styles.arrowDisabled,
              ]}
              disabled={currentIndex === PHASES_DATA.length - 1}
              onPress={() => scrollToPhase(currentIndex + 1)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 2. SEÇÃO DO MASCOTE */}
        <View style={styles.mascotInstructionRow}>
          <View style={styles.mascotBox}>
            <Mascot config={profile.currentConfig} scaleFactor={0.34} />
          </View>

          <View style={styles.instructionTextBox}>
            <View style={styles.instructionHeader}>
              <Text style={styles.phaseHintTitle} numberOfLines={1}>
                {currentPhase.title}
              </Text>
              <TouchableOpacity
                style={styles.inlineQuestionBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHelpModalVisible(true);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="help" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.instructionText} numberOfLines={3}>
              {currentPhase.instruction}
            </Text>
          </View>
        </View>

        {/* 3. MODAL DE AJUDA */}
        <Modal
          visible={helpModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBadge}>
                  <Text style={styles.modalTitleBadgeText}>Como Jogar 🎬</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setHelpModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color="#4A3B32" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalPhaseTitle}>{currentPhase.title}</Text>

              <View style={styles.videoPlayerPlaceholder}>
                <View style={styles.playCircle}>
                  <Ionicons name="play" size={38} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>
                <Text style={styles.videoPlaceholderText}>
                  Vídeo Explicativo da Fase {currentPhase.id}
                </Text>
                <Text style={styles.videoPlaceholderSubText}>
                  (Espaço reservado para carregar o vídeo explicativo)
                </Text>
              </View>

              <View style={styles.modalInstructionBox}>
                <Text style={styles.modalInstructionText}>
                  {currentPhase.instruction}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => setHelpModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalActionBtnText}>ENTENDI, VAMOS JOGAR! 🚀</Text>
              </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 90,
  },
  phasesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  arrowWrapper: {
    zIndex: 20,
    marginVertical: 2,
  },
  arrowWideBtn: {
    width: CARD_WIDTH,
    height: 32,
    backgroundColor: '#E07A5F',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  arrowDisabled: {
    opacity: 0.45,
    backgroundColor: '#D18C78',
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    marginVertical: 4,
  },
  listContent: {
    alignItems: 'center',
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    overflow: 'hidden',
    backgroundColor: '#1C1510',
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  phaseCardLocked: {
    borderColor: '#A8998C',
  },
  imageCardContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#120E0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseImage: {
    width: '100%',
    height: '100%',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(28, 18, 12, 0.90)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overlayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  phaseBadge: {
    backgroundColor: '#E07A5F',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  phaseBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  helpQuestionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E07A5F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseTitleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 2,
  },
  touchPrompt: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
  },
  touchPromptText: {
    color: '#FFD166',
    fontSize: 10,
    fontWeight: '900',
  },
  lockedMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 35, 30, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  lockEmoji: {
    fontSize: 42,
    marginBottom: 6,
  },
  lockTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  lockSubTitle: {
    color: '#D4C6B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  levelsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'relative',
    backgroundColor: '#261B14',
    padding: 6,
    gap: 8,
  },
  levelQuadrant: {
    width: '48%',
    height: '48.5%',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quadrantGold: {
    backgroundColor: '#F9E79F',
    borderColor: '#F39C12',
  },
  quadrantEmerald: {
    backgroundColor: '#A9DFBF',
    borderColor: '#27AE60',
  },
  quadrantCoral: {
    backgroundColor: '#F5B7B1',
    borderColor: '#E74C3C',
  },
  quadrantViolet: {
    backgroundColor: '#D7BDE2',
    borderColor: '#8E44AD',
  },
  levelCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: 6,
  },
  levelNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  levelNumberText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#34261D',
  },
  levelStarsText: {
    fontSize: 11,
  },
  playBigBtn: {
    backgroundColor: '#4A3525',
    width: 46,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  centerBadgeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  centerPhaseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5EE',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  centerPhaseTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4A3B32',
  },
  mascotInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  mascotBox: {
    width: 90,
    height: 105,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextBox: {
    flex: 1,
    backgroundColor: '#FAF5EE',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#4A3B32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  phaseHintTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E07A5F',
    flex: 1,
  },
  inlineQuestionBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  instructionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A3B32',
    lineHeight: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 18, 14, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FDFBF7',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#4A3B32',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleBadge: {
    backgroundColor: '#EDE3D5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C6B8',
  },
  modalTitleBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4A3B32',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE3D5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A3B32',
  },
  modalPhaseTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4A3B32',
    marginBottom: 12,
  },
  videoPlayerPlaceholder: {
    width: '100%',
    height: 175,
    backgroundColor: '#3E342F',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginBottom: 12,
  },
  playCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E07A5F',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  videoPlaceholderText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'center',
  },
  videoPlaceholderSubText: {
    color: '#C8BDB2',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  modalInstructionBox: {
    backgroundColor: '#FAF5EE',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2D5C5',
    marginBottom: 14,
  },
  modalInstructionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C4A3E',
    lineHeight: 16,
    textAlign: 'center',
  },
  modalActionBtn: {
    backgroundColor: '#E07A5F',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});

export default GameScreen;