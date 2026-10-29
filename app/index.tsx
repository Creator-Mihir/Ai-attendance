import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, teacher } = useAuthStore();

  useEffect(() => {
    // Route decision based on authentication & onboarding status
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)/welcome');
      } else if (!teacher?.faceRegistered) {
        router.replace('/(onboarding)/face-registration');
      } else {
        router.replace('/(tabs)');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, teacher, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
