import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TOP_PLAYERS = [
  { position: 1, name: 'Léo', stars: 120, badge: '🥇' },
  { position: 2, name: 'Tu (Jogador)', stars: 95, badge: '🥈', isUser: true },
  { position: 3, name: 'Sofia', stars: 80, badge: '🥉' },
];

export const RankingMini: React.FC = () => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Liga dos Campeões</Text>
        <View style={styles.badgeLeague}>
          <Text style={styles.badgeText}>Semana 1</Text>
        </View>
      </View>

      <View style={styles.list}>
        {TOP_PLAYERS.map((item) => (
          <View
            key={item.position}
            style={[styles.row, item.isUser && styles.userRow]}
          >
            <Text style={styles.badge}>{item.badge}</Text>
            <Text style={[styles.name, item.isUser && styles.userName]}>
              {item.name}
            </Text>
            <View style={styles.starsContainer}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.starsCount}>{item.stars}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  badgeLeague: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  userRow: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
  },
  badge: {
    fontSize: 16,
    marginRight: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  userName: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  starsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
});