import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { runMigrations } from '../src/database/migrations';
import { useAuthStore } from '../src/store/auth.store';
import { SyncStatusBar } from '../src/components/attendance';
import { useSync } from '../src/hooks/useSync';
import { useNetwork } from '../src/hooks/useNetwork';
import { apiClient } from '../src/api/client';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { loadStoredSession } = useAuthStore();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();
  const { toggleNetwork } = useNetwork();

  useEffect(() => {
    async function setup() {
      try {
        await runMigrations();
        await apiClient.restoreBaseUrl();
        await loadStoredSession();
      } catch (err) {
        console.error('App bootstrap error:', err);
      } finally {
        setReady(true);
      }
    }
    setup();
  }, [loadStoredSession]);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
        
        {/* Top universal sync status bar & offline switch */}
        <SyncStatusBar
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSyncPress={() => triggerSync(true)}
          onToggleNetwork={toggleNetwork}
        />

        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0B0F19' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="attendance" />
          <Stack.Screen name="verification" />
          <Stack.Screen name="settings" />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
