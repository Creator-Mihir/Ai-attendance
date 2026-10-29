import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const AlertBanner: React.FC<{
  title: string;
  message?: string;
  type?: 'warning' | 'error' | 'success' | 'info';
}> = ({ title, message, type = 'info' }) => {
  const getStyles = () => {
    switch (type) {
      case 'error': return { bg: '#451A1A', border: '#EF4444', text: '#FCA5A5' };
      case 'warning': return { bg: '#452A1A', border: '#F59E0B', text: '#FCD34D' };
      case 'success': return { bg: '#133E2B', border: '#10B981', text: '#A7F3D0' };
      case 'info':
      default: return { bg: '#1E2238', border: '#6366F1', text: '#C7D2FE' };
    }
  };
  const s = getStyles();

  return (
    <View style={[styles.banner, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.title, { color: s.text }]}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

export const LivenessInstructionBanner: React.FC<{
  challengeName: string;
  instruction: string;
  progressPercent: number;
}> = ({ challengeName, instruction, progressPercent }) => {
  return (
    <View style={styles.livenessBanner}>
      <View style={styles.livenessHeader}>
        <Text style={styles.livenessBadge}>AI LIVENESS CHALLENGE</Text>
        <Text style={styles.livenessPercent}>{Math.round(progressPercent)}%</Text>
      </View>
      <Text style={styles.livenessInstruction}>{instruction}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10,
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 4,
  },
  livenessBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  livenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  livenessBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
  },
  livenessPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  livenessInstruction: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  }
});
