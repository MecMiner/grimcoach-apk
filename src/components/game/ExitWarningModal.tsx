import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExitWarningModalProps {
  visible: boolean;
  score: number;
  onStay: () => void;
  onConfirmExit: () => void;
}

export const ExitWarningModal: React.FC<ExitWarningModalProps> = ({
  visible,
  score,
  onStay,
  onConfirmExit,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStay}
    >
      <View style={styles.modalDarkBackdrop}>
        <View style={styles.warningCard}>
          <View style={styles.warningIconHeader}>
            <Ionicons name="warning" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.warningTitle}>Atenção!</Text>
          <Text style={styles.warningSubtitle}>
            Se sair agora, <Text style={styles.boldRedText}>irá perder todos os pontos</Text> e o progresso da rodada atual.
          </Text>

          <View style={styles.pointsLossPill}>
            <Ionicons name="flame" size={18} color="#C0392B" />
            <Text style={styles.pointsLossText}>Pontos em risco: {score} pts</Text>
          </View>

          <TouchableOpacity
            style={[styles.warningBtnOption, styles.btnStayInGame]}
            onPress={onStay}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.warningBtnText}>CONTINUAR A JOGAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.warningBtnOption, styles.btnConfirmExit]}
            onPress={onConfirmExit}
            activeOpacity={0.85}
          >
            <Ionicons name="exit-outline" size={18} color="#E74C3C" />
            <Text style={[styles.warningBtnText, { color: '#E74C3C' }]}>SAIR MESMO ASSIM</Text>
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
  warningCard: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: '#C0392B',
    padding: 22,
    alignItems: 'center',
    elevation: 14,
  },
  warningIconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4A3B32',
    marginBottom: 10,
  },
  warningTitle: { fontSize: 24, fontWeight: '900', color: '#C0392B', marginBottom: 6 },
  warningSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B5A4E',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  boldRedText: { color: '#C0392B', fontWeight: '900' },
  pointsLossPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FADBD8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    marginBottom: 18,
  },
  pointsLossText: { color: '#922B21', fontSize: 13, fontWeight: '900' },
  warningBtnOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    marginBottom: 10,
    borderBottomWidth: 5,
  },
  btnStayInGame: { backgroundColor: '#27AE60', borderBottomColor: '#1E8449' },
  btnConfirmExit: { backgroundColor: '#FFFFFF', borderBottomColor: '#D5D8DC' },
  warningBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});