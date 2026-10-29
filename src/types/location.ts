export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  isMocked?: boolean;
}

export interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface LocationVerificationResult {
  isInside: boolean;
  distanceMeters: number;
  coordinates: Coordinates;
  isMockedLocation: boolean;
  accuracyAcceptable: boolean;
  nearestGeofence: GeofenceZone;
}
