import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader, Badge } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';

export default function VerificationResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const score = (params.score as string) || '97';
  const liveness = (params.liveness as string) || 'PASS';

  return (
    <View style={styles.screen}>
      <AppHeader title="Challenge Result" onBack={() => router.replace('/(tabs)')} />

      <View style={styles.container}>
        <View style={styles.resultCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🎯</Text>
          </View>
          <Text style={styles.scoreText}>{score}%</Text>
          <Text style={styles.scoreLabel}>Anti-Spoof Confidence Match</Text>
          <Badge label={liveness === 'PASS' ? 'LIVENESS VERIFIED' : 'FAILED'} variant="success" style={{ marginTop: 12 }} />

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Micro-Texture Frequency</Text>
            <Text style={styles.metaVal}>Natural Skin Pores (0.98)</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Reflection Artifacts</Text>
            <Text style={styles.metaVal}>Zero Screen Moiré (PASS)</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Temporal Motion</Text>
            <Text style={styles.metaVal}>3D Parallax Consistent</Text>
          </View>
        </View>

        <PrimaryButton
          title="Return to Dashboard"
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: 24 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 20,
    flex: 1,
    justifyContent: 'space-between',
  },
  resultCard: {
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 30,
  },
  scoreText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#10B981',
  },
  scoreLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 18,
  },
  metaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaKey: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  }
});
