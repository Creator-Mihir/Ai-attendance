import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { GeofenceRadar } from '../../src/components/location';
import { useLocation } from '../../src/hooks/useLocation';
import { AppConfig } from '../../src/constants/config';
import { useVerificationStore } from '../../src/store/verification.store';

export default function AttendanceLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const punchType = (params.punchType as 'CHECK_IN' | 'CHECK_OUT') || 'CHECK_IN';

  const { result: locResult, loading, error, checkLocation } = useLocation(true);
  const setLocationResult = useVerificationStore((state) => state.setLocationResult);
  const isInside = Boolean(locResult?.isInside && locResult.accuracyAcceptable && !locResult.isMockedLocation);

  const handleContinue = () => {
    if (isInside && locResult) {
      // Carry this verified fix through the remainder of this attendance flow.
      setLocationResult(locResult);
      router.push({
        pathname: '/attendance/camera',
        params: { punchType }
      });
    } else {
      router.push({
        pathname: '/attendance/failed',
        params: {
          punchType,
          reason: error ? 'GPS_UNAVAILABLE' : 'OUTSIDE_GEOFENCE',
          message: error || (locResult && !locResult.accuracyAcceptable
            ? 'GPS accuracy is too low. Refresh location from a clearer area.'
            : 'You are outside the authorized campus perimeter or current location is unavailable.'),
        }
      });
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Perimeter Verification"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerInfo}>
          <Text style={styles.stepBadge}>STEP 1 OF 3</Text>
          <Text style={styles.stepTitle}>Campus Geofence Lock</Text>
          <Text style={styles.stepSubtitle}>
            Confirming physical proximity to {locResult?.nearestGeofence?.name || AppConfig.schoolCampus.name}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Triangulating GPS coordinates...</Text>
          </View>
        ) : (
          <GeofenceRadar locationResult={locResult} />
        )}
        {error ? <Text style={styles.loadingText}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            title={isInside ? "Location Verified • Proceed to Camera" : "Outside Geofence • View Reject"}
            onPress={handleContinue}
            variant={isInside ? 'primary' : 'danger'}
            disabled={loading}
          />

          <SecondaryButton
            title="Refresh GPS Coordinates"
            onPress={() => checkLocation()}
            style={{ marginTop: 10 }}
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
    padding: 18,
    justifyContent: 'space-between',
  },
  headerInfo: {
    marginBottom: 16,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 13,
  },
  actions: {
    marginTop: 16,
    marginBottom: 20,
  }
});
