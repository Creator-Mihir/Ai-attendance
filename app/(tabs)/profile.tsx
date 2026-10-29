import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Avatar, Badge } from '../../src/components/ui';
import { SecondaryButton } from '../../src/components/buttons';
import { useAuthStore } from '../../src/store/auth.store';

export default function ProfileTabScreen() {
  const router = useRouter();
  const { teacher, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Faculty Profile & Settings" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <Avatar name={teacher?.fullName || 'Faculty Member'} size={68} />
          <Text style={styles.userName}>{teacher?.fullName}</Text>
          <Text style={styles.userRole}>{teacher?.designation}</Text>
          <Text style={styles.userDept}>{teacher?.department}</Text>

          <View style={styles.badgeRow}>
            <Badge label={`ID: ${teacher?.employeeCode}`} variant="neutral" style={{ marginRight: 8 }} />
            <Badge label="FACE CHECK UNAVAILABLE" variant="warning" />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>SETTINGS & DIAGNOSTICS</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/settings/security')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🔒</Text>
              <View>
                <Text style={styles.menuTitle}>Security & Biometrics</Text>
                <Text style={styles.menuSubtitle}>Re-enroll facial model & hardware tokens</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/settings/device')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>📱</Text>
              <View>
                <Text style={styles.menuTitle}>Device & Hardware Diagnostics</Text>
                <Text style={styles.menuSubtitle}>Integrity attestation is not configured</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/settings/about')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>ℹ️</Text>
              <View>
                <Text style={styles.menuTitle}>About App & Architecture</Text>
                <Text style={styles.menuSubtitle}>v1.0.0 • SQLite Offline Sync Spec</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutArea}>
          <SecondaryButton
            title="Sign Out of Faculty Account"
            onPress={handleLogout}
          />
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
  profileCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 12,
  },
  userRole: {
    fontSize: 13,
    color: '#818CF8',
    fontWeight: '600',
    marginTop: 2,
  },
  userDept: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  chevron: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '600',
  },
  logoutArea: {
    marginTop: 10,
    marginBottom: 20,
  }
});
