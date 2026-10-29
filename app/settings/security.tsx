import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Badge } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';

export default function SecuritySettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Security & Biometrics"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Face Verification</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Enrollment Status:</Text>
            <Badge
              label="NATIVE BUILD REQUIRED"
              variant="warning"
            />
          </View>
          <Text style={styles.cardDesc}>
            MobileFaceNet now runs locally from the bundled model in a native development build. Expo Go and web builds cannot run the native inference module.
          </Text>

          <Text style={styles.cardDesc}>Enrollment averages four genuine camera embeddings and stores the resulting 192-value template in local SQLite. The model does not measure head pose or calibrated image quality.</Text>

          <PrimaryButton
            title="Start Face Enrollment"
            onPress={() => router.push('/(onboarding)/face-registration')}
            style={{ marginTop: 10 }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Security Status</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Device integrity attestation</Text>
            <Text style={styles.val}>Unavailable</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Attendance decision</Text>
            <Text style={styles.val}>Integrity remains unverified in development</Text>
          </View>
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
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginRight: 8,
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  key: {
    fontSize: 13,
    color: '#94A3B8',
  },
  val: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  vectorBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vectorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  vectorText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#38BDF8',
  },
  vectorMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  msgBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  msgSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  msgError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  msgText: {
    fontSize: 12,
    color: '#F8FAFC',
    lineHeight: 18,
  },
  enrollingLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginTop: 14,
  },
  enrollingText: {
    fontSize: 13,
    color: '#A5B4FC',
    marginLeft: 8,
  },
});
