import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mascot, MascotConfig } from './Mascot';
import { SHOP_ITEMS, ShopItem } from '../constants/shopItems';

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
  playerLevel: number;
  stars: number;
  onUpdateStars: (newStars: number) => void;
  unlockedItemIds: string[];
  onUnlockItem: (itemId: string) => void;
  currentConfig: MascotConfig;
  onUpdateConfig: (newConfig: MascotConfig) => void;
}

type ShopCategory = 'bodies' | 'eyes' | 'mouths' | 'arms' | 'legs' | 'details';

const CATEGORY_TO_CONFIG_KEY: Record<ShopCategory, keyof MascotConfig> = {
  bodies: 'bodyKey',
  eyes: 'eyeKey',
  mouths: 'mouthKey',
  arms: 'armKey',
  legs: 'legKey',
  details: 'detailKey',
};

export const ShopModal: React.FC<ShopModalProps> = ({
  visible,
  onClose,
  playerLevel,
  stars,
  onUpdateStars,
  unlockedItemIds,
  onUnlockItem,
  currentConfig,
  onUpdateConfig,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('bodies');
  const [previewConfig, setPreviewConfig] = useState<MascotConfig>(currentConfig);

  const categories: { key: ShopCategory; label: string; icon: string }[] = [
    { key: 'bodies', label: 'Corpos', icon: '🟣' },
    { key: 'eyes', label: 'Olhos', icon: '👀' },
    { key: 'mouths', label: 'Bocas', icon: '👄' },
    { key: 'arms', label: 'Braços', icon: '💪' },
    { key: 'legs', label: 'Pernas', icon: '🦵' },
    { key: 'details', label: 'Acessórios', icon: '⚡' },
  ];

  const filteredItems = SHOP_ITEMS.filter((item) => item.category === selectedCategory);

  const handleSelectToPreview = (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const configKey = CATEGORY_TO_CONFIG_KEY[item.category];

    setPreviewConfig((prev) => ({
      ...prev,
      [configKey]: item.partKey,
    }));
  };

  const handleBuy = (item: ShopItem) => {
    const isLevelLocked = playerLevel < item.levelRequired;
    const isAlreadyOwned = unlockedItemIds.includes(item.id) || item.price === 0;

    if (isAlreadyOwned) return;

    if (isLevelLocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (stars >= item.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const configKey = CATEGORY_TO_CONFIG_KEY[item.category];

      onUpdateStars(stars - item.price);
      onUnlockItem(item.id);
      onUpdateConfig({
        ...currentConfig,
        [configKey]: item.partKey,
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreviewConfig(currentConfig);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🛍️ Loja & Provador</Text>
              <Text style={styles.subtitle}>Toque no item para experimentar!</Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.wallet}>
                <Text style={styles.starText}>⭐ {stars}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Provador compacto para priorizar a visualização dos produtos */}
          <View style={styles.previewBox}>
            <View style={styles.previewTag}>
              <Text style={styles.previewTagText}>Provador Virtual</Text>
            </View>
            <Mascot config={previewConfig} scaleFactor={0.42} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tab, selectedCategory === cat.key && styles.tabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.key);
                }}
              >
                <Text style={styles.tabIcon}>{cat.icon}</Text>
                <Text style={[styles.tabText, selectedCategory === cat.key && styles.tabTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView 
            contentContainerStyle={styles.grid} 
            showsVerticalScrollIndicator={false}
          >
            {filteredItems.map((item) => {
              const configKey = CATEGORY_TO_CONFIG_KEY[item.category];
              const isOwned = unlockedItemIds.includes(item.id) || item.price === 0;
              const isLevelLocked = playerLevel < item.levelRequired;
              const canAfford = stars >= item.price;
              const isTestingInPreview = previewConfig[configKey] === item.partKey;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isTestingInPreview && styles.itemCardTesting,
                    isLevelLocked && styles.itemCardLocked,
                  ]}
                  onPress={() => handleSelectToPreview(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.itemName}>{item.name}</Text>

                  {isOwned ? (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>
                        {isTestingInPreview ? 'Vestindo ✨' : 'No Armário'}
                      </Text>
                    </View>
                  ) : isLevelLocked ? (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedText}>🔒 Nível {item.levelRequired}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                      onPress={() => handleBuy(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.buyBtnText}>{item.price} ⭐ Comprar</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 8, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FAF5EE',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 4,
    borderColor: '#4A3525',
    maxHeight: '94%',
    height: '92%',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4A3525',
  },
  subtitle: {
    fontSize: 11,
    color: '#7C6758',
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wallet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4A3525',
  },
  starText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4A3525',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5D6C5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A3525',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4A3525',
  },
  previewBox: {
    height: 135,
    backgroundColor: '#EFE5D8',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D9C8B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    overflow: 'hidden',
  },
  previewTag: {
    position: 'absolute',
    top: 6,
    left: 8,
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9C8B4',
    zIndex: 20,
  },
  previewTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C6758',
  },
  tabsRow: {
    gap: 6,
    marginVertical: 8,
    height: 38,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9C8B4',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#E07A5F',
    borderColor: '#4A3525',
  },
  tabIcon: {
    fontSize: 12,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C6758',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 32,
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D9C8B4',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 90,
  },
  itemCardTesting: {
    borderColor: '#E07A5F',
    borderWidth: 3,
    backgroundColor: '#FFF8F0',
  },
  itemCardLocked: {
    backgroundColor: '#F3EFE9',
    opacity: 0.85,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A3525',
    textAlign: 'center',
  },
  ownedBadge: {
    backgroundColor: '#EFE5D8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  ownedText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#81B29A',
  },
  lockedBadge: {
    backgroundColor: '#E5D6C5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C6758',
  },
  buyBtn: {
    backgroundColor: '#E07A5F',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4A3525',
    width: '100%',
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: '#C4A897',
  },
  buyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});