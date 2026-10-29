import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { DepthLivenessEvidence, VerificationCheck } from '../types/verification';

function parseEvidence(value?: string | string[]): DepthLivenessEvidence | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    const item = JSON.parse(raw) as Partial<DepthLivenessEvidence>;
    if (!item || !['SUPPORTED', 'UNSUPPORTED', 'UNAVAILABLE'].includes(String(item.capability)) ||
      typeof item.status !== 'string' || typeof item.checkedAt !== 'string') return null;
    return item as DepthLivenessEvidence;
  } catch {
    return null;
  }
}

export function DepthLivenessCard({
  evidence: evidenceParam,
  check,
}: {
  evidence?: string | string[];
  check?: VerificationCheck;
}) {
  const evidence = parseEvidence(evidenceParam);
  const apiLabel = !evidence
    ? 'No result received'
    : evidence.provider === 'NONE'
      ? 'Not configured on this platform'
      : evidence.capability === 'SUPPORTED'
        ? 'Available for the front camera'
        : evidence.capability === 'UNSUPPORTED'
          ? 'Not supported on this camera/device'
          : 'Unavailable or could not be checked';

  const depthPassed = evidence?.status === 'PASSED' && (evidence.frameCount ?? 0) > 0;
  const livenessLabel = depthPassed
    ? 'PASS — real depth frames analyzed'
    : evidence?.status === 'FAILED'
      ? 'FAIL — depth liveness rejected'
      : evidence?.capability === 'UNSUPPORTED'
        ? 'NOT SUPPORTED — configured fallback used'
        : evidence?.status === 'ERROR' || evidence?.status === 'UNAVAILABLE'
          ? 'UNAVAILABLE — depth liveness not verified'
          : 'NOT VERIFIED — no depth frames analyzed';
  const livenessColor = depthPassed ? '#34D399' : evidence?.capability === 'UNSUPPORTED' ? '#FBBF24' : '#F87171';
  const checkColor = check?.status === 'PASS' ? '#34D399'
    : check?.status === 'BYPASSED' || check?.status === 'NOT_CONFIGURED' ? '#FBBF24'
    : check?.status === 'NOT_RUN' ? '#94A3B8' : '#F87171';
  const checkedAt = evidence?.checkedAt ? new Date(evidence.checkedAt) : null;
  const checkedAtLabel = checkedAt && Number.isFinite(checkedAt.getTime())
    ? checkedAt.toLocaleString()
    : 'Not recorded';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Depth liveness (ARCore)</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Depth API</Text>
        <Text style={styles.value}>{apiLabel}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Liveness result</Text>
        <Text style={[styles.value, { color: livenessColor }]}>{livenessLabel}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Attendance check</Text>
        <Text style={[styles.value, { color: checkColor }]}>
          {check?.status || 'NOT RUN'}{check?.status === 'BYPASSED' ? ' — fallback allowed' : ''}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Provider / camera</Text>
        <Text style={styles.value}>{evidence ? `${evidence.provider} / ${evidence.cameraFacing}` : 'Unknown'}</Text>
      </View>
      {evidence?.frameCount !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Frames analyzed</Text>
          <Text style={styles.value}>{evidence.frameCount}</Text>
        </View>
      )}
      {evidence?.score != null && (
        <View style={styles.row}>
          <Text style={styles.label}>Depth score</Text>
          <Text style={styles.value}>{(evidence.score * 100).toFixed(1)}%</Text>
        </View>
      )}
      <Text style={styles.reason}>
        {evidence?.reason || check?.detail || 'The depth provider returned no additional details.'}
      </Text>
      <Text style={styles.timestamp}>Checked: {checkedAtLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', backgroundColor: '#131B2E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1E293B', marginTop: 14 },
  title: { color: '#A5B4FC', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  row: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  label: { color: '#94A3B8', fontSize: 11, marginBottom: 2 },
  value: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  reason: { color: '#CBD5E1', fontSize: 11, lineHeight: 16, marginTop: 10 },
  timestamp: { color: '#64748B', fontSize: 10, marginTop: 8 },
});
