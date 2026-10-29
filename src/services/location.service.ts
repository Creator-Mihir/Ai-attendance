import { Coordinates, LocationVerificationResult, GeofenceZone } from '../types/location';
import { AppConfig } from '../constants/config';
import { checkSystemPermissions, requestLocationPermission } from '../utils/permissions';
import { HARDWARE_CONFIG, HARDWARE_ERRORS } from '../constants/hardware';

export class LocationService {
  /**
   * Calculates geodesic distance between two points in meters using Haversine formula.
   */
  public static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Retrieves high-accuracy GPS coordinates from hardware.
   */
  public static async getCurrentPosition(): Promise<Coordinates> {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        throw new Error(HARDWARE_ERRORS.GPS_PERMISSION_DENIED);
      }
    }

    // Native location must come from the real Expo provider. Do not substitute
    // campus coordinates when the module/provider fails.
    try {
      const Location = require('expo-location');
      if (Location && typeof Location.getCurrentPositionAsync === 'function') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy?.High ?? 4,
        });
        const { latitude, longitude, accuracy } = pos.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) {
          throw new Error('GPS_INVALID_RESULT: location provider returned incomplete coordinates.');
        }
        return {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          altitude: pos.coords.altitude ?? undefined,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          isMocked: pos.mocked === true,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('GPS_INVALID_RESULT')) throw error;
    }

    // Web browser provider fallback is real too; provider errors reject.
    return new Promise((resolve, reject) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!Number.isFinite(pos.coords.latitude) || !Number.isFinite(pos.coords.longitude) || !Number.isFinite(pos.coords.accuracy)) {
              reject(new Error('GPS_INVALID_RESULT: location provider returned incomplete coordinates.'));
              return;
            }
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 10),
              altitude: pos.coords.altitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              isMocked: undefined,
            });
          },
          (error) => reject(new Error(`GPS_UNAVAILABLE: ${error.message || 'Unable to obtain current location.'}`)),
          {
            timeout: HARDWARE_CONFIG.GPS_TIMEOUT_MS,
            enableHighAccuracy: HARDWARE_CONFIG.GPS_HIGH_ACCURACY,
          }
        );
      } else {
        reject(new Error('GPS_UNAVAILABLE: no real location provider is available on this platform.'));
      }
    });
  }

  public static async checkPermission(): Promise<boolean> {
    const perms = await checkSystemPermissions();
    return perms.location;
  }

  /**
   * Primary Phase 4 API: Gathers GPS and performs campus geofence calculation.
   */
  public static async getCurrentLocation(overrideCoords?: Coordinates): Promise<LocationVerificationResult> {
    return this.verifyCampusGeofence(overrideCoords);
  }

  private static dynamicCampus: GeofenceZone | null = null;

  /**
   * Dynamically sets the active school campus geofence (e.g. from logged-in teacher profile).
   */
  public static setActiveCampus(campus: Partial<GeofenceZone> | null): void {
    if (!campus || campus.latitude === undefined || campus.longitude === undefined) {
      this.dynamicCampus = null;
      return;
    }
    this.dynamicCampus = {
      id: campus.id || 'campus-assigned',
      name: campus.name || AppConfig.schoolCampus.name,
      latitude: Number(campus.latitude),
      longitude: Number(campus.longitude),
      radiusMeters: Number(campus.radiusMeters || AppConfig.schoolCampus.radiusMeters),
    };
  }

  /**
   * Retrieves active campus geofence: registered teacher campus if available, otherwise fallback.
   */
  public static getActiveCampus(): {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    allowedToleranceMeters: number;
  } {
    if (this.dynamicCampus) {
      return {
        id: this.dynamicCampus.id,
        name: this.dynamicCampus.name,
        latitude: this.dynamicCampus.latitude,
        longitude: this.dynamicCampus.longitude,
        radiusMeters: this.dynamicCampus.radiusMeters,
        allowedToleranceMeters: AppConfig.schoolCampus.allowedToleranceMeters,
      };
    }
    return AppConfig.schoolCampus;
  }

  /**
   * Evaluates if given or current coordinates fall inside the school campus boundaries.
   * Dynamically checks against the logged-in teacher's registered school coordinates.
   */
  public static async verifyCampusGeofence(
    overrideCoords?: Coordinates,
    customCampus?: {
      id?: string;
      name?: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
      allowedToleranceMeters?: number;
    }
  ): Promise<LocationVerificationResult> {
    const coords = overrideCoords || (await this.getCurrentPosition());
    const campus = customCampus || this.getActiveCampus();

    const distance = this.calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      campus.latitude,
      campus.longitude
    );

    const isMockedLocation = Boolean(coords.isMocked);
    const allowedRadius = campus.radiusMeters + (campus.allowedToleranceMeters ?? AppConfig.schoolCampus.allowedToleranceMeters);
    // Disallow punch if GPS is outside perimeter or injected by a mock location app
    const accuracyAcceptable = Number.isFinite(coords.accuracy) && coords.accuracy <= AppConfig.verification.maxAllowedGpsAccuracyMeters;
    const isInside = !isMockedLocation && accuracyAcceptable && distance <= allowedRadius;

    const zone: GeofenceZone = {
      id: campus.id || 'campus-main',
      name: campus.name,
      latitude: campus.latitude,
      longitude: campus.longitude,
      radiusMeters: campus.radiusMeters,
    };

    return {
      isInside,
      distanceMeters: distance,
      coordinates: coords,
      isMockedLocation,
      accuracyAcceptable,
      nearestGeofence: zone,
    };
  }
}

export default LocationService;
