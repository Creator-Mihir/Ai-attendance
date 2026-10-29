import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { AppConfig } from '../../src/constants/config';

export default function AboutSettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <AppHeader title="About Application" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandHero}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={styles.title}>{AppConfig.appName}</Text>
          <Text style={styles.version}>Version {AppConfig.appVersion} (Build {AppConfig.buildNumber})</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Architecture & Tech Stack</Text>
          <Text style={styles.body}>
            Built on Expo Router with Universal React Native web/mobile runtime. Features on-device AI liveness detection, Haversine campus geofencing, encrypted SQLite offline storage, and an asynchronous sync reconciliation queue.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Offline-First Guarantee</Text>
          <Text style={styles.body}>
            When connectivity is interrupted, attendance records are cryptographically stored on the device database and automatically synced to the school cloud backend upon reconnection.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 16,
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  version: {
    fontSize: 12,
    color: '#818CF8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  }
});
