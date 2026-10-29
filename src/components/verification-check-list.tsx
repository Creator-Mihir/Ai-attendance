import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { VerificationCheck, VerificationCheckStatus } from '../types/verification';

const STATUS_STYLE: Record<VerificationCheckStatus, { label: string; color: string; icon: string }> = {
  PASS: { label: 'PASS', color: '#34D399', icon: '✓' },
  FAIL: { label: 'FAIL', color: '#F87171', icon: '✕' },
  BYPASSED: { label: 'BYPASSED (DEV)', color: '#FBBF24', icon: '!' },
  NOT_RUN: { label: 'NOT RUN', color: '#94A3B8', icon: '—' },
  NOT_CONFIGURED: { label: 'NOT CONFIGURED', color: '#FBBF24', icon: '!' },
};

export function parseVerificationChecks(value?: string | string[]): VerificationCheck[] {
  if (!value) return [];
  try {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string') return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is VerificationCheck => Boolean(
      item && typeof item === 'object' &&
      typeof (item as VerificationCheck).id === 'string' &&
      typeof (item as VerificationCheck).label === 'string' &&
      typeof (item as VerificationCheck).detail === 'string' &&
      Object.prototype.hasOwnProperty.call(STATUS_STYLE, (item as VerificationCheck).status)
    ));
  } catch {
    return [];
  }
}

export function VerificationCheckList({ checks }: { checks: VerificationCheck[] }) {
  if (!checks.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Verification checks</Text>
      {checks.map((check) => {
        const status = STATUS_STYLE[check.status];
        return (
          <View key={check.id} style={styles.row}>
            <View style={styles.rowHeading}>
              <Text style={[styles.icon, { color: status.color }]}>{status.icon}</Text>
              <Text style={styles.label}>{check.label}</Text>
              <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={styles.detail}>{check.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 14,
  },
  title: {
    color: '#A5B4FC',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  rowHeading: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 22, fontSize: 15, fontWeight: '900' },
  label: { flex: 1, color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  status: { fontSize: 10, fontWeight: '900', marginLeft: 6 },
  detail: { color: '#94A3B8', fontSize: 11, lineHeight: 16, marginLeft: 22, marginTop: 3 },
});
