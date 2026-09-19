import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { STATIC_RANKING } from '../constants/gameData';

interface RankingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RankingModal: React.FC<RankingModalProps> = ({ visible, onClose }) => {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Cabeçalho estilo jogo */}
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <Text style={styles.crownTitleIcon}>👑</Text>
              <Text style={styles.title}>Mestres do Jogo</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Ranking */}
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {STATIC_RANKING.map((player) => (
              <View
                key={player.position}
                style={[styles.row, player.isUser && styles.userRow]}
              >
                <View style={styles.badgeWrapper}>
                  <Text style={styles.badgeText}>
                    {player.position === 1 ? '👑' : player.badge}
                  </Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={[styles.name, player.isUser && styles.userName]}>
                    {player.name}
                  </Text>
                  {player.isUser && <Text style={styles.userTag}>Tua Posição</Text>}
                </View>

                <View style={styles.starsPill}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.starsCount}>{player.stars}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(50, 36, 26, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FAF5EE',
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#4A3525',
    padding: 20,
    shadowColor: '#2D1E12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#D9C8B4',
    paddingBottom: 14,
    marginBottom: 16,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crownTitleIcon: {
    fontSize: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4A3525',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E5D6C5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A3525',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4A3525',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D9C8B4',
  },
  userRow: {
    backgroundColor: '#FFF2DF',
    borderColor: '#E07A5F',
    borderWidth: 3,
  },
  badgeWrapper: {
    width: 38,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4A3525',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A3525',
  },
  userName: {
    color: '#C85A32',
  },
  userTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E07A5F',
  },
  starsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECCB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5C483',
    gap: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  starsCount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6B4708',
  },
});