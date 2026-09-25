import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VictoryModalProps {
  visible: boolean;
  score: number;
  title?: string;
  subtitle?: string;
  onContinue: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  score,
  title = 'Controle Facial de Mestre!',
  subtitle = 'Sensacional! Concluiu os desafios da fase com precisão biométrica!',
  onContinue,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View style={styles.modalDarkBackdrop}>
        <View style={styles.victoryCard}>
          <Text style={styles.victoryTrophy}>🏆</Text>
          <Text style={styles.victoryTitle}>{title}</Text>
          <Text style={styles.victorySubtitle}>{subtitle}</Text>

          <View style={styles.pointsPill}>
            <Text style={styles.pointsPillText}>Total Ganho: +{score} Pontos!</Text>
          </View>

          <TouchableOpacity
            style={[styles.victoryModalBtn, styles.btnContinue]}
            onPress={onContinue}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            <Text style={styles.btnContinueText}>CONTINUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalDarkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 8, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  victoryTrophy: { fontSize: 54, marginBottom: 4 },
  victoryTitle: { fontSize: 22, fontWeight: '900', color: '#4A3B32', textAlign: 'center' },
  victorySubtitle: { fontSize: 13, fontWeight: '700', color: '#6B5A4E', textAlign: 'center', marginTop: 4 },
  pointsPill: {
    backgroundColor: '#F9E79F',
    borderWidth: 2.5,
    borderColor: '#F39C12',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 6,
    marginVertical: 14,
  },
  pointsPillText: { color: '#8A5300', fontWeight: '900', fontSize: 15 },
  victoryModalBtn: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 5,
    backgroundColor: '#E07A5F',
    borderBottomColor: '#B85D44',
  },
  btnContinue: { backgroundColor: '#E07A5F', borderBottomColor: '#B85D44' },
  btnContinueText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
});