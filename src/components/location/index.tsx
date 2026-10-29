import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LocationVerificationResult } from '../../types/location';
import { AppConfig } from '../../constants/config';

export const GeofenceRadar: React.FC<{
  locationResult: LocationVerificationResult | null;
}> = ({ locationResult }) => {
  const isInside = locationResult?.isInside ?? true;
  const distance = locationResult?.distanceMeters ?? 18;
  const accuracy = locationResult?.coordinates.accuracy ?? 12;

  return (
    <View style={styles.radarCard}>
      <View style={styles.radarVisual}>
        <View style={styles.outerRing}>
          <View style={styles.midRing}>
            <View style={[styles.innerRing, isInside ? styles.ringInside : styles.ringOutside]}>
              <View style={[styles.centerDot, isInside ? styles.dotInside : styles.dotOutside]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.radarDetails}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, isInside ? styles.bgSuccess : styles.bgDanger]} />
          <Text style={styles.statusTitle}>
            {isInside ? 'Inside Authorized Campus Zone' : 'Outside Campus Geofence'}
          </Text>
        </View>

        <Text style={styles.campusName}>
          {locationResult?.nearestGeofence?.name || AppConfig.schoolCampus.name}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{distance}m</Text>
            <Text style={styles.metricLbl}>Distance to Center</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>±{accuracy}m</Text>
            <Text style={styles.metricLbl}>GPS Accuracy</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>
              {locationResult?.nearestGeofence?.radiusMeters || AppConfig.schoolCampus.radiusMeters}m
            </Text>
            <Text style={styles.metricLbl}>Allowed Radius</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  radarCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
    alignItems: 'center',
  },
  radarVisual: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  midRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInside: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  ringOutside: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotInside: {
    backgroundColor: '#10B981',
  },
  dotOutside: {
    backgroundColor: '#EF4444',
  },
  radarDetails: {
    width: '100%',
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  bgSuccess: {
    backgroundColor: '#10B981',
  },
  bgDanger: {
    backgroundColor: '#EF4444',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  campusName: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  metricLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#1E293B',
  }
});
