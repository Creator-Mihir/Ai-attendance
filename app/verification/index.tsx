import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';

export default function VerificationHubScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <AppHeader title="Facial Verification Sandbox" onBack={() => router.back()} />

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Biometric Liveness Lab</Text>
          <Text style={styles.desc}>
            Test standalone facial anti-spoofing and micro-motion liveness challenges independently.
          </Text>

          <PrimaryButton
            title="Start Challenge Sequence"
            onPress={() => router.push('/verification/challenge')}
            style={{ marginTop: 16 }}
          />
        </View>
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
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  }
});
