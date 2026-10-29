import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SyncQueueItem } from '../../types/sync';
import { SyncService } from '../../services/sync.service';
import { Badge } from '../ui';
import { formatTime, formatDate } from '../../utils/date';

export interface SyncQueueModalProps {
  visible: boolean;
  onClose: () => void;
  onSyncTriggered?: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  visible,
  onClose,
  onSyncTriggered,
}) => {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const list = await SyncService.getQueueItems();
      setItems(list);
    } catch (err) {
      console.error('Failed to fetch sync items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchItems();
    }
  }, [visible]);

  const handleSyncNow = async () => {
    setActionLoading(true);
    try {
      await SyncService.triggerSyncNow();
      await fetchItems();
      onSyncTriggered?.();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setActionLoading(true);
    try {
      await SyncService.retryFailed();
      await fetchItems();
      onSyncTriggered?.();
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearSynced = async () => {
    setActionLoading(true);
    try {
      await SyncService.clearSynced();
      await fetchItems();
      onSyncTriggered?.();
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SYNCED':
        return 'success';
      case 'SYNCING':
        return 'info';
      case 'FAILED':
        return 'error';
      case 'QUEUED':
      default:
        return 'warning';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>SQLite Sync Pipeline</Text>
              <Text style={styles.headerSubtitle}>
                {items.length} {items.length === 1 ? 'record' : 'records'} in local queue
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolBtn, styles.toolBtnPrimary]}
              onPress={handleSyncNow}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
              ) : null}
              <Text style={styles.toolBtnPrimaryText}>Sync Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleRetryFailed}
              disabled={actionLoading}
            >
              <Text style={styles.toolBtnText}>Retry Failed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleClearSynced}
              disabled={actionLoading}
            >
              <Text style={styles.toolBtnText}>Clear Synced</Text>
            </TouchableOpacity>
          </View>

          {/* Queue List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Reading SQLite sync queue...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>Sync Queue is Empty</Text>
              <Text style={styles.emptySubtitle}>
                All local attendance records have been synchronized with the cloud backend.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
              {items.map((item) => (
                <View key={item.id} style={styles.queueItem}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTypeRow}>
                      <Text style={styles.itemEntityType}>{item.entityType}</Text>
                      <Text style={styles.itemId}>• {item.entityId}</Text>
                    </View>
                    <Badge label={item.status} variant={getStatusBadgeVariant(item.status)} />
                  </View>

                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemMetaText}>
                      Enqueued: {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                    </Text>
                    {item.retryCount > 0 ? (
                      <Text style={styles.itemRetryText}>Retries: {item.retryCount}</Text>
                    ) : null}
                  </View>

                  {item.errorMessage ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>Error: {item.errorMessage}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '85%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnPrimary: {
    backgroundColor: '#4F46E5',
  },
  toolBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  toolBtnText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 12,
  },
  listContainer: {
    marginTop: 6,
  },
  queueItem: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemEntityType: {
    fontSize: 13,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 0.5,
  },
  itemId: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  itemRetryText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#3B1717',
  },
  errorText: {
    fontSize: 11,
    color: '#FCA5A5',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    color: '#10B981',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  doneBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default SyncQueueModal;
