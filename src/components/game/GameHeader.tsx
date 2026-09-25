import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface GameHeaderProps {
  currentRound: number;
  totalRounds: number;
  score: number;
  secondsElapsed: number;
  isEvaluating?: boolean;
  onPause: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  currentRound,
  totalRounds,
  score,
  secondsElapsed,
  isEvaluating = false,
  onPause,
}) => {
  const min = Math.floor(secondsElapsed / 60);
  const sec = secondsElapsed % 60;
  const formattedTime = `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;

  return (
    <View style={styles.headerSection}>
      <View style={styles.rowPauseAndTimerHalf}>
        <TouchableOpacity
          style={styles.pauseBtnHalf}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPause();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="pause" size={24} color="#FFFFFF" />
          <Text style={styles.pauseBtnTextHalf}>PAUSAR</Text>
        </TouchableOpacity>

        <View style={styles.timerBannerHalf}>
          <View style={styles.timerIconPill}>
            <Ionicons name="time" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.timerContent}>
            <Text style={styles.timerSubLabel}>
              {isEvaluating ? 'TEMPO PAUSADO' : 'TEMPO'}
            </Text>
            <Text style={[styles.timerTextValue, isEvaluating && { color: '#E07A5F' }]}>
              {formattedTime}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.scoreRowBanner}>
        <View style={styles.scoreIconPill}>
          <FontAwesome5 name="star" size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.scoreTitleLabel}>PONTUAÇÃO</Text>
        <View style={styles.scoreNumberBadge}>
          <Text style={styles.scoreTextValue}>{score}</Text>
        </View>
      </View>

      <View style={styles.roundProgressRow}>
        <View style={styles.roundPillHeader}>
          <Ionicons name="flag" size={13} color="#FFFFFF" />
          <Text style={styles.roundPillText}>
            {`RODADA ${currentRound} DE ${totalRounds}`}
          </Text>
        </View>
        <View style={styles.roundSegmentsBar}>
          {Array.from({ length: totalRounds }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.roundSegmentItem,
                idx + 1 === currentRound && styles.roundSegmentActive,
                idx + 1 < currentRound && styles.roundSegmentCompleted,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: { width: '100%', gap: 8 },
  rowPauseAndTimerHalf: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  pauseBtnHalf: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#E07A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderBottomWidth: 5,
    borderBottomColor: '#B85D44',
  },
  pauseBtnTextHalf: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  timerBannerHalf: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#4A3B32',
    borderBottomWidth: 5,
    borderBottomColor: '#C4B7AA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  timerIconPill: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E07A5F', alignItems: 'center', justifyContent: 'center' },
  timerContent: { flex: 1 },
  timerSubLabel: { fontSize: 9, fontWeight: '900', color: '#8C7A6B' },
  timerTextValue: { fontSize: 17, fontWeight: '900', color: '#4A3B32' },
  scoreRowBanner: {
    width: '100%',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#F39C12',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  scoreIconPill: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F39C12', alignItems: 'center', justifyContent: 'center' },
  scoreTitleLabel: { fontSize: 12, fontWeight: '900', color: '#6B5A4E', flex: 1 },
  scoreNumberBadge: { backgroundColor: '#FDF7E7', paddingHorizontal: 14, paddingVertical: 2, borderRadius: 10, borderWidth: 1.5, borderColor: '#F39C12' },
  scoreTextValue: { fontSize: 16, fontWeight: '900', color: '#8A5300' },
  roundProgressRow: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A3B32',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4A3B32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roundPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  roundSegmentsBar: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center' },
  roundSegmentItem: { flex: 1, height: 9, borderRadius: 4.5, backgroundColor: '#E6DDD2' },
  roundSegmentActive: { backgroundColor: '#E07A5F', height: 11 },
  roundSegmentCompleted: { backgroundColor: '#27AE60' },
});