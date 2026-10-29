import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { VerificationService } from '../../src/services/verification.service';

export default function VerificationChallengeScreen() {
  const router = useRouter();
  const [challenges] = useState(() => VerificationService.generateChallenges(2));

  return (
    <View style={styles.screen}>
      <AppHeader title="Challenge Overview" onBack={() => router.back()} />

      <View style={styles.container}>
        <Text style={styles.heading}>Target Motion Sequence</Text>
        <Text style={styles.subheading}>
          The system will dynamically request 2 micro-actions to verify 3D physical presence.
        </Text>

        <View style={styles.challengeList}>
          {challenges.map((c, i) => (
            <View key={i} style={styles.challengeCard}>
              <Text style={styles.stepNum}>0{i + 1}</Text>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{c.challenge.replace('_', ' ')}</Text>
                <Text style={styles.stepPrompt}>{c.prompt}</Text>
              </View>
            </View>
          ))}
        </View>

        <PrimaryButton
          title="Open Biometric Camera"
          onPress={() => router.push('/verification/camera')}
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
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 18,
  },
  challengeList: {
    gap: 12,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepNum: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366F1',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stepPrompt: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  }
});
