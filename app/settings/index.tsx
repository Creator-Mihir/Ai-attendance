import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/ui';

export default function SettingsIndexScreen() {
  const router = useRouter();

  const options = [
    { title: 'Sync & Offline Pipeline', sub: 'Network state, SQLite queue, and cloud dispatch', route: '/settings/sync', icon: '⚡' },
    { title: 'Security & Biometrics', sub: 'Facial model and biometric tokens', route: '/settings/security', icon: '🔒' },
    { title: 'Device Diagnostics', sub: 'Hardware integrity and mock GPS checks', route: '/settings/device', icon: '📱' },
    { title: 'About Application', sub: 'Version, architecture, and offline specs', route: '/settings/about', icon: 'ℹ️' },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader title="Settings & Security" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            onPress={() => router.push(opt.route as any)}
          >
            <View style={styles.left}>
              <Text style={styles.icon}>{opt.icon}</Text>
              <View>
                <Text style={styles.title}>{opt.title}</Text>
                <Text style={styles.sub}>{opt.sub}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  chevron: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '600',
  }
});
