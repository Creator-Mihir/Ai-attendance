import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader, Badge, Card } from '../../src/components/ui';
import { StatusIndicator } from '../../src/components/ui/StatusIndicator';
import { SyncQueueModal } from '../../src/components/attendance/SyncQueueModal';
import { useSync } from '../../src/hooks/useSync';
import { useNetwork } from '../../src/hooks/useNetwork';
import { formatTime, formatDate } from '../../src/utils/date';
import { SyncQueueItem } from '../../src/types/sync';
import { apiClient } from '../../src/api/client';

export default function SyncSettingsScreen() {
  const router = useRouter();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncTimestamp,
    triggerSync,
    retryFailed,
    clearSynced,
    getQueueItems,
  } = useSync();
  const { toggleNetwork, connectionType } = useNetwork();
  const [modalVisible, setModalVisible] = useState(false);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [serverUrl, setServerUrl] = useState(apiClient.getBaseUrl());
  const [testingServer, setTestingServer] = useState(false);

  const saveAndTestBackend = async () => {
    const value = serverUrl.trim();
    if (!value) {
      Alert.alert('Backend address required', 'Enter the backend URL, including port 3001.');
      return;
    }
    try {
      apiClient.setBaseUrl(value);
      setServerUrl(apiClient.getBaseUrl());
      setTestingServer(true);
      const health = await apiClient.checkBackendHealth();
      Alert.alert('Backend connected', `The app reached ${apiClient.getBaseUrl()}\nStatus: ${health.status}`);
    } catch (error) {
      Alert.alert('Backend connection failed', error instanceof Error ? error.message : 'Could not reach the backend.');
    } finally {
      setTestingServer(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      const result = await triggerSync(true);
      await loadItems();
      if (result.failed > 0) {
        const firstErrors = result.errors.slice(0, 3).map((item) => item.message).join('\n');
        Alert.alert(
          'Sync incomplete',
          `${result.succeeded} item(s) synced; ${result.failed} failed.\n\n${firstErrors || 'Open Queue Inspector for details.'}`
        );
      } else if (result.succeeded > 0) {
        Alert.alert('Sync complete', `${result.succeeded} item(s) were acknowledged by the backend and marked synced.`);
      } else {
        Alert.alert('Nothing synced', pendingCount > 0
          ? 'There are queued items, but none are ready to retry yet. Use Retry Failed, then try again.'
          : 'There are no pending records in the local sync queue.');
      }
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'The sync operation could not complete.');
      await loadItems();
    }
  };

  const loadItems = async () => {
    setLoadingItems(true);
    try {
      const items = await getQueueItems();
      setQueueItems(items);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [pendingCount, isSyncing]);

  return (
    <View style={styles.screen}>
      <AppHeader title="Sync & Offline Pipeline" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Network State Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Network Connection</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Connection Status</Text>
            <StatusIndicator
              status={isSyncing ? 'syncing' : isOnline ? 'online' : 'offline'}
              label={isOnline ? 'Online (Active)' : 'Offline Mode'}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Adapter / Channel</Text>
            <Text style={styles.val}>{isOnline ? connectionType.toUpperCase() : 'Disconnected'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Offline Simulation</Text>
            <TouchableOpacity onPress={toggleNetwork} style={styles.toggleBtn}>
              <Text style={styles.toggleBtnText}>
                {isOnline ? 'Switch to Offline' : 'Switch to Online'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Backend Connection</Text>
          <Text style={styles.serverHelp}>
            On a physical phone, enter your computer's Wi-Fi/LAN IP. Do not use localhost: that points to the phone.
          </Text>
          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://ai-attendance-backend-peh3.onrender.com/api"
            placeholderTextColor="#64748B"
            style={styles.serverInput}
          />
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary, testingServer && styles.btnDisabled]}
            onPress={saveAndTestBackend}
            disabled={testingServer}
          >
            {testingServer ? <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} /> : null}
            <Text style={styles.actionBtnPrimaryText}>{testingServer ? 'Checking backend...' : 'Save URL & Test Backend'}</Text>
          </TouchableOpacity>
          <Text style={styles.serverCurrent}>Current API: {apiClient.getBaseUrl()}</Text>
        </Card>

        {/* Sync Engine Stats */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Local Sync Pipeline</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Pending Records</Text>
            <Badge
              label={`${pendingCount} QUEUED`}
              variant={pendingCount > 0 ? 'warning' : 'success'}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Failed Submissions</Text>
            <Badge
              label={`${failedCount} FAILED`}
              variant={failedCount > 0 ? 'error' : 'neutral'}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Last Cloud Dispatch</Text>
            <Text style={styles.val}>
              {lastSyncTimestamp ? formatTime(lastSyncTimestamp) : 'Never'}
            </Text>
          </View>
        </Card>

        {/* Quick Operations */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Queue Controls</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, (!isOnline || isSyncing) && styles.btnDisabled]}
              onPress={async () => {
                await handleTriggerSync();
              }}
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
              ) : null}
              <Text style={styles.actionBtnPrimaryText}>
                {isSyncing ? 'Syncing...' : 'Trigger Sync'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={async () => {
                await retryFailed();
                await loadItems();
              }}
            >
              <Text style={styles.actionBtnSecondaryText}>Retry Failed</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.btnRow, { marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={async () => {
                await clearSynced();
                await loadItems();
              }}
            >
              <Text style={styles.actionBtnSecondaryText}>Clear Synced Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.actionBtnSecondaryText}>Open Queue Inspector</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Queue Records */}
        <View style={styles.queueHeader}>
          <Text style={styles.queueHeaderTitle}>Active SQLite Queue ({queueItems.length})</Text>
          <TouchableOpacity onPress={loadItems}>
            <Text style={styles.refreshLink}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loadingItems ? (
          <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
        ) : queueItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No records in SQLite sync queue.</Text>
          </View>
        ) : (
          queueItems.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.queueItem}>
              <View style={styles.queueItemRow}>
                <Text style={styles.queueItemType}>{item.entityType}</Text>
                <Badge
                  label={item.status}
                  variant={
                    item.status === 'SYNCED'
                      ? 'success'
                      : item.status === 'FAILED'
                      ? 'error'
                      : 'warning'
                  }
                />
              </View>
              <Text style={styles.queueItemId}>Entity: {item.entityId}</Text>
              <Text style={styles.queueItemTime}>
                Created: {formatDate(item.createdAt)} {formatTime(item.createdAt)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <SyncQueueModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          loadItems();
        }}
        onSyncTriggered={loadItems}
      />
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  key: {
    color: '#94A3B8',
    fontSize: 13,
  },
  val: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  serverHelp: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  serverInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    backgroundColor: '#0B1220',
    marginBottom: 10,
  },
  serverCurrent: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 8,
  },
  toggleBtn: {
    backgroundColor: '#312E81',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleBtnText: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#4F46E5',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnSecondary: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnSecondaryText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 12,
  },
  btnDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.5,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  queueHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  refreshLink: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '600',
  },
  queueItem: {
    backgroundColor: '#131B2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  queueItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  queueItemType: {
    fontSize: 13,
    fontWeight: '800',
    color: '#818CF8',
  },
  queueItemId: {
    fontSize: 12,
    color: '#94A3B8',
  },
  queueItemTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyCard: {
    padding: 20,
    backgroundColor: '#131B2E',
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
});
