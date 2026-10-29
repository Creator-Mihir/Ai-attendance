import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../../src/components/ui';
import { PrimaryButton } from '../../src/components/buttons';
import { FaceScannerOverlay } from '../../src/components/camera';

export default function VerificationCameraScreen() {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);

  const handleCapture = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      router.push({
        pathname: '/verification/result',
        params: {
          score: '97',
          liveness: 'PASS',
        }
      });
    }, 1000);
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Challenge Camera" onBack={() => router.back()} />

      <View style={styles.container}>
        <View style={styles.cameraBox}>
          <View style={styles.simFeed}>
            <Text style={styles.faceIcon}>👤</Text>
          </View>
          <FaceScannerOverlay
            statusText={analyzing ? 'Evaluating anti-spoof neural vectors...' : 'Align face & perform motion'}
            isFaceAligned={true}
            isScanning={analyzing}
          />
        </View>

        <PrimaryButton
          title={analyzing ? 'Processing Challenge...' : 'Capture & Score Frame'}
          onPress={handleCapture}
          loading={analyzing}
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 20,
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraBox: {
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  simFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceIcon: {
    fontSize: 100,
    opacity: 0.15,
  }
});
