import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const RewardsScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Baú de Recompensas 🏆</Text>
      <Text style={styles.subtitle}>Recolhe as tuas moedas e estrelas de jogo!</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 90,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4A3525',
  },
  subtitle: {
    fontSize: 14,
    color: '#7C6758',
    marginTop: 8,
    fontWeight: '600',
  },
});