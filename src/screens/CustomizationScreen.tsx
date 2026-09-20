import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Mascot, MascotConfig } from '../components/Mascot';
import { MONSTER_PARTS } from '../constants/monsterParts';
import { SHOP_ITEMS, ShopItem } from '../constants/shopItems';
import { useProfile, DEFAULT_PROFILE } from '../contexts/ProfileContext';

type MainTab = 'vestuario' | 'loja';
type ShopCategory = 'bodies' | 'eyes' | 'mouths' | 'arms' | 'legs' | 'details';

const CATEGORY_TO_CONFIG_KEY: Record<ShopCategory, keyof MascotConfig> = {
  bodies: 'bodyKey',
  eyes: 'eyeKey',
  mouths: 'mouthKey',
  arms: 'armKey',
  legs: 'legKey',
  details: 'detailKey',
};

export const CustomizationScreen: React.FC = () => {
  const profileContext = useProfile();
  
  // Garante um fallback seguro caso o context ainda esteja montando
  const profile = profileContext?.activeProfile || DEFAULT_PROFILE;
  const updateMascotConfig = profileContext?.updateMascotConfig || (() => {});
  const buyShopItem = profileContext?.buyShopItem || (async () => ({ success: false }));

  const [currentTab, setCurrentTab] = useState<MainTab>('vestuario');
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('bodies');
  
  // Estado local para o provador virtual
  const [previewConfig, setPreviewConfig] = useState<MascotConfig>(profile.currentConfig);

  // Sincroniza o preview caso os dados do storage terminem de carregar depois
  useEffect(() => {
    if (profile?.currentConfig) {
      setPreviewConfig(profile.currentConfig);
    }
  }, [profile?.currentConfig]);

  const categories: { key: ShopCategory; label: string; icon: string }[] = [
    { key: 'bodies', label: 'Corpos', icon: '🟣' },
    { key: 'eyes', label: 'Olhos', icon: '👀' },
    { key: 'mouths', label: 'Bocas', icon: '👄' },
    { key: 'arms', label: 'Braços', icon: '💪' },
    { key: 'legs', label: 'Pernas', icon: '🦵' },
    { key: 'details', label: 'Acessórios', icon: '⚡' },
  ];

  const categoryItems = SHOP_ITEMS.filter((item) => item.category === selectedCategory);

  const displayedItems =
    currentTab === 'vestuario'
      ? categoryItems.filter((item) => (profile.unlockedItemIds || []).includes(item.id) || item.price === 0)
      : categoryItems;

  // Equipar no Vestuário (offline e imediato)
  const handleEquip = (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const configKey = CATEGORY_TO_CONFIG_KEY[item.category];
    const newConfig = {
      ...profile.currentConfig,
      [configKey]: item.partKey,
    };
    updateMascotConfig(newConfig);
    setPreviewConfig(newConfig);
  };

  // Provar ou Comprar na Loja
  const handlePreviewOrBuy = async (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const configKey = CATEGORY_TO_CONFIG_KEY[item.category];
    const isOwned = (profile.unlockedItemIds || []).includes(item.id) || item.price === 0;
    const isPreviewing = previewConfig[configKey] === item.partKey;
    const isLevelLocked = (profile.playerLevel || 1) < item.levelRequired;

    // Se já possui, equipa imediatamente
    if (isOwned) {
      handleEquip(item);
      return;
    }

    if (isLevelLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Primeiro toque na loja: experimenta no provador
    if (!isPreviewing) {
      setPreviewConfig((prev) => ({
        ...prev,
        [configKey]: item.partKey,
      }));
      return;
    }

    // Segundo toque (já no espelho): confirma compra
    const res = await buyShopItem(item);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleEquip(item);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (res.message) {
        alert(res.message);
      }
    }
  };

  const getItemImageSource = (item: ShopItem) => {
    const categoryDict = MONSTER_PARTS[item.category as keyof typeof MONSTER_PARTS] as any;
    return categoryDict?.[item.partKey]?.source;
  };

  const activeMascotConfig = currentTab === 'loja' ? previewConfig : profile.currentConfig;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{profile.name || 'Meu Amigo'}</Text>
          <View style={styles.walletBadge}>
            <Text style={styles.walletText}>⭐ {profile.stars ?? 0}</Text>
          </View>
        </View>

        {/* 1. PALCO COMPACTO DO MASCOTE */}
        <View style={styles.stageCard}>
          {currentTab === 'loja' && (
            <View style={styles.previewTag}>
              <Text style={styles.previewTagText}>Espelho do Provador ✨</Text>
            </View>
          )}
          <View style={styles.mascotDisplay}>
            <Mascot config={activeMascotConfig} scaleFactor={0.30} />
          </View>
        </View>

        {/* 2. ABAS: VESTUÁRIO | LOJA */}
        <View style={styles.tabBarContainer}>
          <TouchableOpacity
            style={[styles.tabButton, currentTab === 'vestuario' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrentTab('vestuario');
              setPreviewConfig(profile.currentConfig);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabButtonText, currentTab === 'vestuario' && styles.tabButtonTextActive]}>
              👕 VESTUÁRIO
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, currentTab === 'loja' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrentTab('loja');
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabButtonText, currentTab === 'loja' && styles.tabButtonTextActive]}>
              🛍️ LOJA
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUB-CATEGORIAS */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.key);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. GRID DE ITENS VISUAIS */}
        <ScrollView
          style={styles.itemsArea}
          contentContainerStyle={styles.itemsGrid}
          showsVerticalScrollIndicator={false}
        >
          {displayedItems.map((item) => {
            const configKey = CATEGORY_TO_CONFIG_KEY[item.category];
            const isEquippedReal = profile.currentConfig[configKey] === item.partKey;
            const isPreviewing = previewConfig[configKey] === item.partKey;
            const isOwned = (profile.unlockedItemIds || []).includes(item.id) || item.price === 0;
            const isLevelLocked = (profile.playerLevel || 1) < item.levelRequired;
            const canAfford = (profile.stars ?? 0) >= item.price;
            const imageSource = getItemImageSource(item);

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  currentTab === 'vestuario' && isEquippedReal && styles.itemCardEquipped,
                  currentTab === 'loja' && isPreviewing && styles.itemCardPreviewing,
                ]}
                onPress={() => (currentTab === 'vestuario' ? handleEquip(item) : handlePreviewOrBuy(item))}
                activeOpacity={0.85}
              >
                {/* Imagem do Item em destaque */}
                <View style={styles.itemImageContainer}>
                  {imageSource ? (
                    <Image
                      source={imageSource}
                      style={styles.itemImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.fallbackName}>{item.name}</Text>
                  )}
                </View>

                {/* Modo Vestuário */}
                {currentTab === 'vestuario' && (
                  <View style={[styles.statusPill, isEquippedReal && styles.statusPillEquipped]}>
                    <Text style={[styles.statusPillText, isEquippedReal && styles.statusPillTextEquipped]}>
                      {isEquippedReal ? 'Em uso ✨' : 'Vestir'}
                    </Text>
                  </View>
                )}

                {/* Modo Loja - Já adquirido */}
                {currentTab === 'loja' && isOwned && (
                  <View style={[styles.statusPill, isEquippedReal ? styles.statusPillEquipped : styles.ownedPill]}>
                    <Text style={[styles.statusPillText, isEquippedReal ? styles.statusPillTextEquipped : styles.ownedText]}>
                      {isEquippedReal ? 'Em uso ✨' : 'No baú'}
                    </Text>
                  </View>
                )}

                {/* Modo Loja - Overlay cobrindo todo o item com preço ou bloqueio */}
                {currentTab === 'loja' && !isOwned && (
                  <View
                    style={[
                      styles.priceOverlay,
                      isLevelLocked && styles.priceOverlayLocked,
                      isPreviewing && styles.priceOverlayPreviewing,
                    ]}
                  >
                    {isLevelLocked ? (
                      <>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.lockText}>Nv. {item.levelRequired}</Text>
                      </>
                    ) : isPreviewing ? (
                      <>
                        <Text style={styles.buyNowPrompt}>Tocar p/ Comprar</Text>
                        <Text style={styles.priceOverlayText}>{item.price} ⭐</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.priceOverlayText}>{item.price} ⭐</Text>
                        {!canAfford && <Text style={styles.needMoreStarsText}>Faltam estrelas</Text>}
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4A3525',
  },
  walletBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4A3525',
  },
  walletText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4A3525',
  },

  // 1. Palco Compacto
  stageCard: {
    marginHorizontal: 16,
    height: 180,
    backgroundColor: '#EDE3D5',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#DFD1BF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewTag: {
    position: 'absolute',
    top: 6,
    left: 8,
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFD1BF',
    zIndex: 10,
  },
  previewTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E07A5F',
  },
  mascotDisplay: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Abas
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECE3D7',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 3,
    marginTop: 8,
    marginBottom: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  tabButtonActive: {
    backgroundColor: '#E07A5F',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#826F60',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  // Categorias
  categoriesContainer: {
    marginBottom: 6,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2D5C5',
    gap: 4,
  },
  categoryPillActive: {
    backgroundColor: '#4A3525',
    borderColor: '#4A3525',
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C6758',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },

  // 3. Grid de Itens
  itemsArea: {
    flex: 1,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
  },
  itemCard: {
    width: '31.3%',
    height: 108,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2D5C5',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  itemCardEquipped: {
    borderColor: '#E07A5F',
    borderWidth: 3,
    backgroundColor: '#FFF9F5',
  },
  itemCardPreviewing: {
    borderColor: '#3D5A80',
    borderWidth: 3,
    backgroundColor: '#F0F4F8',
  },
  itemImageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: '82%',
    height: '82%',
  },
  fallbackName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4A3525',
    textAlign: 'center',
  },

  // Preço e Bloqueio
  priceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(50, 36, 26, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  priceOverlayLocked: {
    backgroundColor: 'rgba(80, 70, 60, 0.78)',
  },
  priceOverlayPreviewing: {
    backgroundColor: 'rgba(224, 122, 95, 0.85)',
  },
  priceOverlayText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buyNowPrompt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FAF5EE',
    marginBottom: 2,
  },
  needMoreStarsText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFD166',
    marginTop: 2,
  },
  lockIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Status nos itens de Vestuário
  statusPill: {
    position: 'absolute',
    bottom: 5,
    left: 6,
    right: 6,
    backgroundColor: '#ECE3D7',
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusPillEquipped: {
    backgroundColor: '#E07A5F',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A3525',
  },
  statusPillTextEquipped: {
    color: '#FFFFFF',
  },
  ownedPill: {
    backgroundColor: '#E3EDE6',
  },
  ownedText: {
    color: '#4C8262',
  },
});

export default CustomizationScreen;