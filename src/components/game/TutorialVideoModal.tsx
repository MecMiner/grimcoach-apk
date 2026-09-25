import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

interface TutorialVideoModalProps {
  visible: boolean;
  videoUrl: string;
  instructionText: string;
  onClose: () => void;
}

export const TutorialVideoModal: React.FC<TutorialVideoModalProps> = memo(
  ({ visible, videoUrl, instructionText, onClose }) => {
    const player = useVideoPlayer(videoUrl, (p) => {
      p.loop = true;
    });

    useEffect(() => {
      if (visible) {
        player.play();
      } else {
        player.pause();
      }
    }, [visible, player]);

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalDarkBackdrop}>
          <View style={styles.howToPlayCard}>
            <View style={styles.howToPlayHeader}>
              <View style={styles.howToPlayIconSmall}>
                <Ionicons name="play-circle" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.howToPlayTitle}>Como Jogar</Text>
            </View>

            <View style={styles.videoWrapper}>
                <VideoView
                    style={styles.tutorialVideo}
                    player={player}
                    nativeControls={true}
                    contentFit="cover"
                />
            </View>

            <Text style={styles.videoInstructionText}>{instructionText}</Text>

            <TouchableOpacity
              style={styles.closeHowToPlayBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.closeHowToPlayText}>VOLTAR AO MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  modalDarkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 8, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  howToPlayCard: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: '#4A3B32',
    padding: 20,
    alignItems: 'center',
    elevation: 12,
  },
  howToPlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  howToPlayIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3D5A80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToPlayTitle: { fontSize: 20, fontWeight: '900', color: '#4A3B32' },
  videoWrapper: {
    width: '100%',
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    backgroundColor: '#000000',
    marginBottom: 12,
  },
  tutorialVideo: { width: '100%', height: '100%' },
  videoInstructionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5A4E',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  closeHowToPlayBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    backgroundColor: '#27AE60',
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderBottomWidth: 5,
    borderBottomColor: '#1E8449',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeHowToPlayText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});