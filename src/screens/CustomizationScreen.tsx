import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mascot, MascotConfig } from '../components/Mascot';
import { SHOP_ITEMS, ShopItem } from '../constants/shopItems';

interface CustomizationProps {
  currentConfig: MascotConfig;
  onUpdateConfig: (newConfig: MascotConfig) => void;
  unlockedItemIds: string[];
  onOpenShop: () => void;
}

type CategoryTab = 'bodyKey' | 'eyeKey' | 'mouthKey' | 'armKey' | 'legKey' | 'detailKey';

export const CustomizationScreen: React.FC<CustomizationProps> = ({
  currentConfig,
  onUpdateConfig,
  unlockedItemIds,
  onOpenShop,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('bodyKey');

  const categories: { key: CategoryTab; label: string; icon: string }[] = [
    { key: 'bodyKey', label: 'Corpos', icon: '🟣' },
    { key: 'eyeKey', label: 'Olhos', icon: '👀' },
    { key: 'mouthKey', label: 'Bocas', icon: '👄' },
    { key: 'armKey', label: 'Braços', icon: '💪' },
    { key: 'legKey', label: 'Pernas', icon: '🦵' },
    { key: 'detailKey', label: 'Acessórios', icon: '⚡' },
  ];

  const myItems = SHOP_ITEMS.filter(
    (item) =>
      item.category === selectedCategory &&
      (unlockedItemIds.includes(item.id) || item.price === 0)
  );

  const handleEquip = (item: ShopItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateConfig({
      ...currentConfig,
      [item.category]: item.itemKey,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Meu Mascote</Text>
        <TouchableOpacity
          style={styles.openShopButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenShop();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.openShopText}>🛍️ Ir para a Loja</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mascotDisplay}>
        <Mascot config={currentConfig} scaleFactor={1.05} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryTab,
              selectedCategory === cat.key && styles.categoryTabActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedCategory(cat.key);
            }}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inventoryArea}>
        <Text style={styles.inventoryHeading}>Peças no teu armário:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsScroll}
        >
          {myItems.map((item) => {
            const isEquipped = currentConfig[item.category] === item.itemKey;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  isEquipped && styles.itemCardEquipped,
                ]}
                onPress={() => handleEquip(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <View
                  style={[
                    styles.statusPill,
                    isEquipped && styles.statusPillEquipped,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isEquipped && styles.statusPillTextEquipped,
                    ]}
                  >
                    {isEquipped ? 'Em uso' : 'Vestir'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4A3525',
  },
  openShopButton: {
    backgroundColor: '#E07A5F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A3525',
    elevation: 3,
  },
  openShopText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  mascotDisplay: {
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesRow: {
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
    height: 46,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D9C8B4',
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#E07A5F',
    borderColor: '#4A3525',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C6758',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  inventoryArea: {
    paddingHorizontal: 20,
  },
  inventoryHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C6758',
    marginBottom: 8,
  },
  itemsScroll: {
    gap: 12,
    paddingBottom: 95,
  },
  itemCard: {
    width: 110,
    height: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#D9C8B4',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCardEquipped: {
    borderColor: '#E07A5F',
    borderWidth: 3,
    backgroundColor: '#FFF8F0',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A3525',
    textAlign: 'center',
  },
  statusPill: {
    backgroundColor: '#EFE5D8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillEquipped: {
    backgroundColor: '#E07A5F',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A3525',
  },
  statusPillTextEquipped: {
    color: '#FFFFFF',
  },
});