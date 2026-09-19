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
import { STATIC_TASKS } from '../constants/gameData';

interface TasksModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TasksModal: React.FC<TasksModalProps> = ({ visible, onClose }) => {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <Text style={styles.taskTitleIcon}>📋</Text>
              <Text style={styles.title}>Missões Diárias</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Missões */}
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {STATIC_TASKS.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View style={styles.taskTopRow}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.taskIcon}>{task.icon}</Text>
                  </View>

                  <View style={styles.taskTexts}>
                    <Text style={styles.taskName}>{task.title}</Text>
                    <Text style={styles.taskDesc}>{task.description}</Text>
                  </View>

                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardText}>+{task.rewardStars} ⭐</Text>
                  </View>
                </View>

                {/* Barra de Progresso Suave */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${task.progress * 100}%` },
                      task.completed && styles.progressFillCompleted,
                    ]}
                  />
                </View>

                {task.completed && (
                  <Text style={styles.completedTag}>Pronto para coletar! 🎉</Text>
                )}
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
  taskTitleIcon: {
    fontSize: 24,
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
    gap: 12,
  },
  taskItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D9C8B4',
    padding: 14,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F2EA',
    borderWidth: 1.5,
    borderColor: '#D9C8B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskIcon: {
    fontSize: 22,
  },
  taskTexts: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A3525',
  },
  taskDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C6758',
    marginTop: 2,
  },
  rewardPill: {
    backgroundColor: '#FDECCB',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5C483',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B4708',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#EFE5D8',
    borderRadius: 5,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E07A5F',
    borderRadius: 5,
  },
  progressFillCompleted: {
    backgroundColor: '#81B29A',
  },
  completedTag: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#497460',
    alignSelf: 'flex-end',
  },
}); 