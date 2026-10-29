import { useState, useEffect } from 'react';
import { LocationVerificationResult, Coordinates } from '../types/location';
import { LocationService } from '../services/location.service';

export function useLocation(autoCheck = true) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocationVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkLocation = async (override?: Coordinates) => {
    setLoading(true);
    setError(null);
    try {
      const res = await LocationService.verifyCampusGeofence(override);
      setResult(res);
      setLoading(false);
      return res;
    } catch (err: any) {
      setResult(null);
      setLoading(false);
      setError(err.message || 'Failed to determine location');
      return null;
    }
  };

  useEffect(() => {
    if (autoCheck) {
      checkLocation();
    }
  }, [autoCheck]);

  return {
    loading,
    result,
    error,
    checkLocation,
  };
}

export default useLocation;
