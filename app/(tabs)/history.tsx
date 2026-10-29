import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AppHeader } from '../../src/components/ui';
import { AttendanceHistoryList } from '../../src/components/attendance';
import { useAttendanceStore } from '../../src/store/attendance.store';
import { useAuthStore } from '../../src/store/auth.store';

export default function HistoryTabScreen() {
  const { teacher } = useAuthStore();
  const { history, isLoading, loadHistory } = useAttendanceStore();
  const [filter, setFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'PENDING'>('ALL');

  useEffect(() => {
    if (teacher?.id) {
      loadHistory(teacher.id);
    }
  }, [teacher?.id]);

  const filteredHistory = history.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'PRESENT') return item.status === 'PRESENT';
    if (filter === 'LATE') return item.status === 'LATE';
    if (filter === 'PENDING') {
      return item.checkIn?.syncStatus === 'PENDING' || item.checkOut?.syncStatus === 'PENDING';
    }
    return true;
  });

  return (
    <View style={styles.screen}>
      <AppHeader title="Attendance History & Audit" />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['ALL', 'PRESENT', 'LATE', 'PENDING'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f === 'PENDING' ? 'Unsynced' : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => teacher?.id && loadHistory(teacher.id)}
            tintColor="#6366F1"
          />
        }
      >
        <AttendanceHistoryList items={filteredHistory} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  container: {
    padding: 16,
  }
});
