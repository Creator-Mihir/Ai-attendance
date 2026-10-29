import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { CameraService } from '../../services/camera.service';
import { CameraCaptureResult, CameraFacing } from '../../types/hardware';
import { FaceScannerOverlay } from '../camera';

export interface CameraViewProps {
  onCapture?: (photo: CameraCaptureResult) => void;
  promptText?: string;
  isFaceAligned?: boolean;
  showPreview?: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onCapture,
  promptText = 'Center face inside the oval',
  isFaceAligned = true,
  showPreview = true,
}) => {
  const [facing, setFacing] = useState<CameraFacing>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CameraCaptureResult | null>(null);

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const result = await CameraService.takePhoto({ facing });
      setCapturedPhoto(result);
      if (onCapture) {
        onCapture(result);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFlip = () => {
    const nextFacing = CameraService.switchCamera();
    setFacing(nextFacing);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  return (
    <View style={styles.container}>
      {/* Viewport / Video Area */}
      <View style={styles.viewport}>
        {capturedPhoto && showPreview ? (
          <View style={styles.previewContainer}>
            <View style={styles.capturedPlaceholder}>
              <Text style={styles.capturedBadge}>✓ PHOTO CAPTURED</Text>
              <Text style={styles.capturedTimestamp}>{new Date(capturedPhoto.timestamp).toLocaleTimeString()}</Text>
              <Text style={styles.capturedDetails}>
                {capturedPhoto.width}x{capturedPhoto.height} • {capturedPhoto.facing.toUpperCase()} CAMERA
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.liveCameraPlaceholder}>
            <View style={styles.sensorGrid} />
            {/* Face Scanner Overlay with Guidance Oval */}
            <FaceScannerOverlay statusText={promptText} isFaceAligned={isFaceAligned} isScanning={!capturedPhoto} />
          </View>
        )}

        {/* Top Control Overlay */}
        <View style={styles.topBar}>
          <View style={styles.facingPill}>
            <Text style={styles.facingText}>{facing === 'front' ? 'FRONT CAMERA' : 'REAR CAMERA'}</Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={handleFlip} activeOpacity={0.7}>
            <Text style={styles.iconText}>⇄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsRow}>
        {capturedPhoto ? (
          <View style={styles.capturedActions}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.8}>
              <Text style={styles.retakeText}>Retake Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => onCapture && onCapture(capturedPhoto)}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Use Photo ✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.shutterRow}>
            <TouchableOpacity
              style={[styles.shutterOuter, isCapturing && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
              activeOpacity={0.85}
            >
              <View style={styles.shutterInner}>
                {isCapturing && <ActivityIndicator color="#FFFFFF" size="small" />}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B0F19',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  viewport: {
    width: '100%',
    height: 380,
    backgroundColor: '#0F172A',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveCameraPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sensorGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  previewContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedPlaceholder: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  capturedBadge: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  capturedTimestamp: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  capturedDetails: {
    color: '#94A3B8',
    fontSize: 12,
  },
  topBar: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  facingPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  facingText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controlsRow: {
    backgroundColor: '#131B2E',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'center',
  },
  shutterRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#4F46E5',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  retakeText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default CameraView;
