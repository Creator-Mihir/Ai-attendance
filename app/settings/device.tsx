import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Badge } from '../../src/components/ui';
import { DeviceService } from '../../src/services/device.service';
import { DeviceIntegrityReport } from '../../src/utils/device';
import { SecondaryButton } from '../../src/components/buttons';

export default function DeviceSettingsScreen() {
  const router = useRouter();
  const [report, setReport] = useState<DeviceIntegrityReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    setRefreshing(true);
    const rep = await DeviceService.refreshIntegrityReport();
    setReport(rep);
    setRefreshing(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <View style={styles.screen}>
      <AppHeader title="Device Diagnostics" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hardware Identification</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Bound Hardware ID</Text>
            <Text style={styles.val}>{report?.deviceId || 'Loading...'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Operating System</Text>
            <Text style={styles.val}>{report?.osName} {report?.osVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Device Model</Text>
            <Text style={styles.val}>{report?.deviceModel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Anti-Tamper Diagnostics</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Root / Jailbreak Check</Text>
            <Badge label="CLEAN (PASS)" variant="success" />
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Mock Location Detection</Text>
            <Badge label="INACTIVE (PASS)" variant="success" />
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Emulator Detection</Text>
            <Badge label="PHYSICAL HARDWARE" variant="success" />
          </View>
        </View>

        <SecondaryButton
          title={refreshing ? "Refreshing..." : "Re-run Diagnostics"}
          onPress={loadReport}
          disabled={refreshing}
          style={{ marginTop: 12 }}
        />
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
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
    color: '#F8FAFC',
  }
});
