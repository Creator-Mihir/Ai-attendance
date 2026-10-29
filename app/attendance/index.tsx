import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, AppState, AppStateStatus } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { checkSystemPermissions, requestCameraPermission, requestLocationPermission } from '../../src/utils/permissions';
import { DeviceService } from '../../src/services/device.service';

export default function AttendanceFlowOrchestrator() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const punchType = (params.punchType as 'CHECK_IN' | 'CHECK_OUT') || 'CHECK_IN';

  const [checking, setChecking] = useState(true);
  const [permissionsPassed, setPermissionsPassed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const appState = useRef(AppState.currentState);
  const devOptionsAlertShown = useRef(false);

  const runPreflight = async () => {
    setChecking(true);
    setErrorMsg('');
    devOptionsAlertShown.current = false;

    try {
      const cameraOk = await requestCameraPermission();
      const locationOk = await requestLocationPermission();
      const deviceCheck = await DeviceService.verifyDeviceIntegrity();

      if (!cameraOk) {
        setErrorMsg('Camera permission is required for facial verification.');
        setChecking(false);
        return;
      }

      if (!locationOk) {
        setErrorMsg('Location permission is required for campus geofence check.');
        setChecking(false);
        return;
      }

      if (!deviceCheck.allowedToProceed) {
        setChecking(false);
        if (deviceCheck.isDeveloperOptionsEnabled) {
          devOptionsAlertShown.current = true;
          Alert.alert(
            '🔒 Developer Options Enabled',
            'Attendance marking is blocked because Developer Options (or USB Debugging) is enabled on your device.\n\nThis is a security requirement to prevent GPS spoofing and attendance manipulation.\n\nPlease disable Developer Options in your phone settings to continue.',
            [
              {
                text: 'Open Settings',
                onPress: async () => {
                  await DeviceService.openDeveloperSettings();
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => router.replace('/(tabs)'),
              },
            ],
            { cancelable: false }
          );
        } else {
          setErrorMsg(deviceCheck.message);
        }
        return;
      }

      if (!deviceCheck.verified) {
        console.warn(`[Attendance] ${deviceCheck.message}`);
      }

      setPermissionsPassed(true);
      setChecking(false);

      // Advance directly to location verification step
      setTimeout(() => {
        router.push({
          pathname: '/attendance/location',
          params: { punchType }
        });
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing preflight permissions');
      setChecking(false);
    }
  };

  useEffect(() => {
    runPreflight();

    // Re-run preflight when user returns to app from Settings
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        devOptionsAlertShown.current
      ) {
        // User came back from Settings — recheck
        runPreflight();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.screen}>
      <AppHeader title="Biometric Check-In" onBack={() => router.replace('/(tabs)')} />

      <View style={styles.content}>
        <View style={styles.spinnerCard}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.statusTitle}>
            {checking ? 'Checking Permissions & Hardware...' : permissionsPassed ? 'Permissions Verified' : 'Check Failed'}
          </Text>
          <Text style={styles.statusSub}>
            {checking
              ? 'Verifying camera, campus GPS coordinates, and hardware security token.'
              : errorMsg || 'Proceeding to campus geofence radar...'}
          </Text>

          {errorMsg ? (
            <PrimaryButton
              title="Retry Permissions Check"
              onPress={runPreflight}
              style={{ marginTop: 20 }}
            />
          ) : null}
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerCard: {
    width: '100%',
    backgroundColor: '#131B2E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 18,
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  }
});
