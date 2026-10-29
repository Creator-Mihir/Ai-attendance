import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '../../src/components/buttons';
import { useAuthStore } from '../../src/store/auth.store';

export default function SetupCompleteScreen() {
  const router = useRouter();
  const { teacher } = useAuthStore();

  const handleFinish = () => {
    router.replace('/(tabs)');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentBox}>
        <View style={styles.successIconCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        <Text style={styles.heading}>Onboarding Completed!</Text>
        <Text style={styles.subheading}>
          Welcome, {teacher?.fullName || 'Faculty Member'}. Your secure biometric profile is fully enrolled.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryDot}>•</Text>
            <View style={styles.summaryItemDetails}>
              <Text style={styles.summaryItemTitle}>Facial Vector Encrypted</Text>
              <Text style={styles.summaryItemSub}>128-d neural embeddings generated and signed.</Text>
            </View>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryDot}>•</Text>
            <View style={styles.summaryItemDetails}>
              <Text style={styles.summaryItemTitle}>Campus Geofence Configured</Text>
              <Text style={styles.summaryItemSub}>Bound to {teacher?.schoolBranchName || 'Main Campus'}.</Text>
            </View>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryDot}>•</Text>
            <View style={styles.summaryItemDetails}>
              <Text style={styles.summaryItemTitle}>Offline SQLite Vault Activated</Text>
              <Text style={styles.summaryItemSub}>Attendance logs persist locally when disconnected.</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionArea}>
        <PrimaryButton
          title="Enter Faculty Portal"
          onPress={handleFinish}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
  },
  contentBox: {
    alignItems: 'center',
    marginTop: 40,
  },
  successIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkIcon: {
    color: '#10B981',
    fontSize: 44,
    fontWeight: '800',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryDot: {
    color: '#6366F1',
    fontSize: 24,
    lineHeight: 20,
    marginRight: 10,
  },
  summaryItemDetails: {
    flex: 1,
  },
  summaryItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  summaryItemSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionArea: {
    marginBottom: 16,
  }
});
