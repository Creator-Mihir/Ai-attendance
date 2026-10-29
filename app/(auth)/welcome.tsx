import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { useAuthStore } from '../../src/store/auth.store';

export default function WelcomeScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const handleQuickDemo = async () => {
    const success = await login('TCH-1042');
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandHero}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🛡️</Text>
        </View>
        <Text style={styles.brandTitle}>AI Teacher Attendance</Text>
        <Text style={styles.brandTagline}>
          Next-generation biometric check-in with on-device AI liveness & campus geofence security.
        </Text>
      </View>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <View style={styles.featureIconBox}>
            <Text style={styles.featureIcon}>👁️</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Anti-Spoof Liveness</Text>
            <Text style={styles.featureDesc}>
              Active AI facial micro-challenges guarantee physical presence and reject screen replays.
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconBox}>
            <Text style={styles.featureIcon}>📍</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Campus Geofence Radar</Text>
            <Text style={styles.featureDesc}>
              High-precision perimeter detection prevents proxy punches outside school boundaries.
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureIconBox}>
            <Text style={styles.featureIcon}>⚡</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Offline SQLite Queue</Text>
            <Text style={styles.featureDesc}>
              Mark attendance even in school basements with zero signal. Automatically syncs once online.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <PrimaryButton
          title="Sign In with Faculty ID"
          onPress={() => router.push('/(auth)/login')}
          style={{ marginBottom: 10 }}
        />

        <SecondaryButton
          title="Register New Faculty"
          onPress={() => router.push('/(auth)/register')}
          style={{ marginBottom: 10, borderColor: '#6366F1' }}
        />

        <SecondaryButton
          title="Instant Demo Login (Dr. Sarah)"
          onPress={handleQuickDemo}
          disabled={isLoading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: '#0B0F19',
  },
  brandHero: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1E1B4B',
    borderWidth: 2,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  featuresList: {
    marginVertical: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  actionContainer: {
    marginTop: 20,
    marginBottom: 10,
  }
});
