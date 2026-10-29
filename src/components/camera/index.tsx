import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export { LiveCameraView } from './live-camera-view';

export const FaceScannerOverlay: React.FC<{
  statusText?: string;
  isFaceAligned?: boolean | null;
  isScanning?: boolean;
}> = ({ statusText = 'Align your face within the frame', isFaceAligned = true, isScanning = true }) => {
  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <View style={styles.darkShadeTop} pointerEvents="none" />

      <View style={styles.middleRow} pointerEvents="box-none">
        <View style={styles.darkShadeSide} pointerEvents="none" />

        <View style={[styles.faceOval, isFaceAligned === null ? styles.ovalUnknown : isFaceAligned ? styles.ovalAligned : styles.ovalNotAligned]} pointerEvents="none">
          {isScanning && <View style={styles.scanLine} />}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.darkShadeSide} pointerEvents="none" />
      </View>

      <View style={styles.darkShadeBottom} pointerEvents="none">
        <View style={styles.pillBox}>
          <Text style={styles.pillText}>{statusText}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'space-between',
    pointerEvents: 'box-none' as any,
  },
  darkShadeTop: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.65)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 310,
  },
  darkShadeSide: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.65)',
  },
  faceOval: {
    width: 240,
    height: 310,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalAligned: {
    borderColor: '#10B981',
  },
  ovalUnknown: {
    borderColor: '#6366F1',
  },
  ovalNotAligned: {
    borderColor: '#EF4444',
  },
  scanLine: {
    position: 'absolute',
    top: '40%',
    width: '100%',
    height: 2,
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#10B981',
  },
  cornerTL: { top: 20, left: 20, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 20, right: 20, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 20, left: 20, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 20, right: 20, borderBottomWidth: 3, borderRightWidth: 3 },
  darkShadeBottom: {
    flex: 1.2,
    backgroundColor: 'rgba(11, 15, 25, 0.65)',
    alignItems: 'center',
    paddingTop: 24,
  },
  pillBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  }
});
