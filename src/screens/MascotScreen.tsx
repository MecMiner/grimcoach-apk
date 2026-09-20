import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Mascot, MascotConfig } from '../components/Mascot';
import { SHOP_ITEMS, ShopItem } from '../constants/shopItems';

type MainTab = 'vestuario' | 'loja';
type PartCategory = 'bodies' | 'eyes' | 'mouths' | 'arms' | 'legs' | 'details';

const CATEGORY_TO_CONFIG_KEY: Record<PartCategory, keyof MascotConfig> = {
  bodies: 'bodyKey',
  eyes: 'eyeKey',
  mouths: 'mouthKey',
  arms: 'armKey',
  legs: 'legKey',
  details: 'detailKey',
};

export const MascotScreen: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<MainTab>('vestuario');
  const [activeCategory, setActiveCategory] = useState<PartCategory>('bodies');

  // Configuração atual do Mascote
  const [config, setConfig] = useState<MascotConfig>({
    bodyKey: 'blueA',
    eyeKey: 'cuteLight',
    mouthKey: 'closedHappy',
    armKey: 'blueA',
    legKey: 'blueA',
    detailKey: 'blueAntennaLarge',
  });

  // Economia e inventário
  const [stars, setStars] = useState<number>(120);
  const [playerLevel] = useState<number>(3);
  const [unlockedItemIds, setUnlockedItemIds] = useState<string[]>([
    'body_blueA',
    'arm_blueA',
    'leg_blueA',
    'eye_cuteLight',
    'mouth_closedHappy',
    'detail_blueAntennaLarge',
  ]);

  const categories: { key: PartCategory; label: string; icon: string }[] = [
    { key: 'bodies', label: 'Corpos', icon: 'circle' },
    { key: 'eyes', label: 'Olhos', icon: 'eye' },
    { key: 'mouths', label: 'Bocas', icon: 'emoticon-happy' },
    { key: 'arms', label: 'Braços', icon: 'arm-flex' },
    { key: 'legs', label: 'Pernas', icon: 'human-male-height' },
    { key: 'details', label: 'Acessórios', icon: 'flash' },
  ];

  const filteredItems = SHOP_ITEMS.filter((item) => item.category === activeCategory);

  // Equipar peça no Mascote
  const handleEquipPart = (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const configKey = CATEGORY_TO_CONFIG_KEY[item.category];
    setConfig((prev) => ({
      ...prev,
      [configKey]: item.partKey,
    }));
  };

  // Comprar peça na Loja
  const handleBuyPart = (item: ShopItem) => {
    const isLevelLocked = playerLevel < item.levelRequired;
    const isOwned = unlockedItemIds.includes(item.id) || item.price === 0;

    if (isOwned) {
      handleEquipPart(item);
      return;
    }

    if (isLevelLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (stars >= item.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStars((prev) => prev - item.price);
      setUnlockedItemIds((prev) => [...prev, item.id]);
      handleEquipPart(item);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. SEÇÃO DO MASCOTE (TOPO) */}
      <View style={styles.mascotSection}>
        <View style={styles.topInfoBar}>
          <Text style={styles.screenTitle}>Meu Mascote</Text>
          <View style={styles.starBadge}>
            <Text style={styles.starText}>⭐ {stars}</Text>
          </View>
        </View>

        <View style={styles.mascotStage}>
          <Mascot config={config} scaleFactor={1.15} />
        </View>
      </View>

      {/* 2. DIVISOR DE ABAS: VESTUÁRIO | LOJA (MEIO) */}
      <View style={styles.tabBarSection}>
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'vestuario' && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentTab('vestuario');
          }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="tshirt-crew"
            size={18}
            color={currentTab === 'vestuario' ? '#D97757' : '#8A7968'}
          />
          <Text style={[styles.tabButtonText, currentTab === 'vestuario' && styles.tabButtonTextActive]}>
            VESTUÁRIO
          </Text>
          {currentTab === 'vestuario' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <View style={styles.tabDivider} />

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'loja' && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentTab('loja');
          }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="shopping"
            size={18}
            color={currentTab === 'loja' ? '#D97757' : '#8A7968'}
          />
          <Text style={[styles.tabButtonText, currentTab === 'loja' && styles.tabButtonTextActive]}>
            LOJA
          </Text>
          {currentTab === 'loja' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>

      {/* SUB-CATEGORIAS (Corpos, Olhos, Bocas...) */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.subCategoryBtn, isActive && styles.subCategoryBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(cat.key);
                }}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={15}
                  color={isActive ? '#FFFFFF' : '#6E6053'}
                />
                <Text style={[styles.subCategoryText, isActive && styles.subCategoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. SEÇÃO DE ITENS (BASE) */}
      <ScrollView
        style={styles.itemsSection}
        contentContainerStyle={styles.itemsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemsGrid}>
          {filteredItems.map((item) => {
            const configKey = CATEGORY_TO_CONFIG_KEY[item.category];
            const isOwned = unlockedItemIds.includes(item.id) || item.price === 0;
            const isEquipped = config[configKey] === item.partKey;
            const isLevelLocked = playerLevel < item.levelRequired;
            const canAfford = stars >= item.price;

            // Na aba Vestuário, oculta peças que o usuário ainda não possui
            if (currentTab === 'vestuario' && !isOwned) {
              return null;
            }

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  isEquipped && styles.itemCardEquipped,
                  currentTab === 'loja' && isLevelLocked && styles.itemCardLocked,
                ]}
                onPress={() => (currentTab === 'vestuario' ? handleEquipPart(item) : handleBuyPart(item))}
                activeOpacity={0.8}
              >
                <Text style={styles.itemName}>{item.name}</Text>

                {currentTab === 'vestuario' ? (
                  /* Badges de Vestuário */
                  <View style={[styles.actionBadge, isEquipped ? styles.inUseBadge : styles.equipBadge]}>
                    <Text style={[styles.actionBadgeText, isEquipped ? styles.inUseText : styles.equipText]}>
                      {isEquipped ? 'Em uso' : 'Equipar'}
                    </Text>
                  </View>
                ) : (
                  /* Ações da Loja */
                  <View style={styles.shopActionContainer}>
                    {isOwned ? (
                      <View style={[styles.actionBadge, isEquipped ? styles.inUseBadge : styles.ownedBadge]}>
                        <Text style={[styles.actionBadgeText, isEquipped ? styles.inUseText : styles.ownedText]}>
                          {isEquipped ? 'Vestindo ✨' : 'Comprado'}
                        </Text>
                      </View>
                    ) : isLevelLocked ? (
                      <View style={styles.lockedBadge}>
                        <Text style={styles.lockedText}>🔒 Nível {item.levelRequired}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                        onPress={() => handleBuyPart(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buyBtnText}>{item.price} ⭐ Comprar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* BARRA INFERIOR DE NAVEGAÇÃO DO APP */}
      <View style={styles.footerContainer}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navTab}>
            <MaterialCommunityIcons name="space-invaders" size={24} color="#C46E56" />
            <Text style={[styles.navText, styles.navTextActive]}>Mascote</Text>
          </TouchableOpacity>

          <View style={styles.centerPlayWrapper}>
            <TouchableOpacity style={styles.centerPlayButton} activeOpacity={0.85}>
              <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.navTab}>
            <Ionicons name="trophy-outline" size={24} color="#7A6E65" />
            <Text style={styles.navText}>Prémios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EB',
  },
  // 1. Mascote no topo
  mascotSection: {
    height: 310,
    backgroundColor: '#F7F2EB',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E6DDD1',
  },
  topInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3C3028',
  },
  starBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4A3B32',
  },
  starText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4A3B32',
  },
  mascotStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Abas: VESTUÁRIO | LOJA
  tabBarSection: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E2D8CC',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 8,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#FFFDFB',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A7968',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#D97757',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: '#D97757',
    borderRadius: 2,
  },
  tabDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: '#E2D8CC',
  },

  // Categorias horizontais
  categoriesWrapper: {
    backgroundColor: '#FAF5EE',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DFD3',
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DFD5C8',
  },
  subCategoryBtnActive: {
    backgroundColor: '#D97757',
    borderColor: '#4A3B32',
  },
  subCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6053',
  },
  subCategoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 3. Grid de Itens
  itemsSection: {
    flex: 1,
  },
  itemsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemCard: {
    width: '48.5%',
    minHeight: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E4D8CB',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCardEquipped: {
    borderColor: '#D97757',
    backgroundColor: '#FFF8F4',
    borderWidth: 2.5,
  },
  itemCardLocked: {
    backgroundColor: '#F3EDE5',
    opacity: 0.8,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3C3028',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  inUseBadge: {
    backgroundColor: '#D97757',
  },
  inUseText: {
    color: '#FFFFFF',
  },
  equipBadge: {
    backgroundColor: '#ECE3D7',
  },
  equipText: {
    color: '#6E6053',
  },
  shopActionContainer: {
    width: '100%',
  },
  ownedBadge: {
    backgroundColor: '#E4F0E8',
  },
  ownedText: {
    color: '#4B8863',
  },
  lockedBadge: {
    backgroundColor: '#E4D8CB',
    paddingVertical: 5,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6E6053',
  },
  buyBtn: {
    backgroundColor: '#D97757',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4A3B32',
    width: '100%',
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: '#C5B5A7',
  },
  buyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Barra de Navegação Inferior
  footerContainer: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FDFBF7',
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  navText: {
    fontSize: 11,
    color: '#7A6E65',
    fontWeight: '600',
    marginTop: 2,
  },
  navTextActive: {
    color: '#C46E56',
    fontWeight: 'bold',
  },
  centerPlayWrapper: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
  },
  centerPlayButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#D97757',
    borderWidth: 3,
    borderColor: '#4A3B32',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MascotScreen;