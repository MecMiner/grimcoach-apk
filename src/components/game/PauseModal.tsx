import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface PauseModalProps {
  visible: boolean;
  onResume: () => void;
  onOpenTutorial: () => void;
  onRestart: () => void;
  onRequestExit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  visible,
  onResume,
  onOpenTutorial,
  onRestart,
  onRequestExit,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestExit}
    >
      <View style={styles.modalDarkBackdrop}>
        <View style={styles.pauseCard}>
          <View style={styles.pauseIconHeader}>
            <Ionicons name="pause" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.pauseTitle}>Jogo Pausado</Text>
          <Text style={styles.pauseSubtitle}>O que deseja fazer?</Text>

          <TouchableOpacity
            style={[styles.pauseBtnOption, styles.btnResume]}
            onPress={onResume}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.pauseBtnText}>CONTINUAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pauseBtnOption, styles.btnHowToPlay]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenTutorial();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
            <Text style={styles.pauseBtnText}>COMO JOGAR (VÍDEO)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pauseBtnOption, styles.btnRestart]}
            onPress={onRestart}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={20} color="#4A3B32" />
            <Text style={[styles.pauseBtnText, { color: '#4A3B32' }]}>REINICIAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pauseBtnOption, styles.btnExit]}
            onPress={onRequestExit}
            activeOpacity={0.85}
          >
            <Ionicons name="exit-outline" size={20} color="#E74C3C" />
            <Text style={[styles.pauseBtnText, { color: '#E74C3C' }]}>SAIR</Text>
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
  pauseTitle: { fontSize: 22, fontWeight: '900', color: '#4A3B32' },
  pauseSubtitle: { fontSize: 13, fontWeight: '700', color: '#6B5A4E', textAlign: 'center', marginBottom: 16 },
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
  btnResume: { backgroundColor: '#27AE60', borderBottomColor: '#1E8449' },
  btnHowToPlay: { backgroundColor: '#3D5A80', borderBottomColor: '#293D56' },
  btnRestart: { backgroundColor: '#F9E79F', borderBottomColor: '#D4AC0D' },
  btnExit: { backgroundColor: '#FFFFFF', borderBottomColor: '#DDD3C7' },
  pauseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});