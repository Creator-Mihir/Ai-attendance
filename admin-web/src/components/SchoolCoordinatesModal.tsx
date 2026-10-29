import React, { useState } from 'react';
import { School } from '../types';
import { ApiService } from '../api';
import { 
  X, 
  MapPin, 
  Compass, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  Navigation,
  Crosshair
} from 'lucide-react';

interface SchoolCoordinatesModalProps {
  school: School | null;
  isNew?: boolean;
  onClose: () => void;
  onSaved: (school: School) => void;
}

const PRESET_COORDINATES = [
  { name: 'Bhopal MP Nagar (Zone-II)', lat: 23.2135, lng: 77.3885, radius: 150 },
  { name: 'Bhopal TT Nagar (Model School)', lat: 23.2599, lng: 77.4126, radius: 200 },
  { name: 'Indore MG Road Campus', lat: 22.7196, lng: 75.8577, radius: 180 },
  { name: 'Jabalpur Civil Lines', lat: 23.1815, lng: 79.9864, radius: 175 },
  { name: 'Gwalior City Center', lat: 26.2183, lng: 78.1828, radius: 200 },
];

export const SchoolCoordinatesModal: React.FC<SchoolCoordinatesModalProps> = ({
  school,
  isNew = false,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(school?.name || '');
  const [code, setCode] = useState(school?.code || '');
  const [districtId, setDistrictId] = useState(school?.district_id || 'DIST-BPL-01');
  const [districtName, setDistrictName] = useState(school?.district_name || 'Bhopal');
  const [stateName, setStateName] = useState(school?.state || 'Madhya Pradesh');
  const [latitude, setLatitude] = useState<string>(String(school?.latitude ?? 23.2135));
  const [longitude, setLongitude] = useState<string>(String(school?.longitude ?? 77.3885));
  const [radiusMeters, setRadiusMeters] = useState<string>(String(school?.radius_meters ?? 150));
  const [address, setAddress] = useState(school?.address || '');
  const [principalName, setPrincipalName] = useState(school?.principal_name || '');
  const [contactEmail, setContactEmail] = useState(school?.contact_email || '');
  const [contactPhone, setContactPhone] = useState(school?.contact_phone || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const applyPreset = (preset: typeof PRESET_COORDINATES[0]) => {
    setLatitude(String(preset.lat));
    setLongitude(String(preset.lng));
    setRadiusMeters(String(preset.radius));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setError(null);
      },
      (err) => {
        setError(`Could not detect current location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const radNum = parseInt(radiusMeters, 10);

    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }

    if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    if (Number.isNaN(radNum) || radNum < 20 || radNum > 5000) {
      setError('Geofence radius must be between 20 meters and 5,000 meters.');
      return;
    }

    if (!name.trim()) {
      setError('School name is required.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const created = await ApiService.createSchool({
          name: name.trim(),
          code: (code.trim() || `SCH-${districtName.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
          district_id: districtId,
          district_name: districtName,
          districtId: districtId,
          districtName: districtName,
          state: stateName,
          latitude: latNum,
          longitude: lngNum,
          radius_meters: radNum,
          radiusMeters: radNum,
          address: address.trim() || undefined,
          principal_name: principalName.trim() || undefined,
          principalName: principalName.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        } as any);
        setSuccessMsg('New school campus and geofence created successfully!');
        setTimeout(() => onSaved(created), 600);
      } else if (school) {
        const updated = await ApiService.updateSchool(school.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          district_id: districtId,
          district_name: districtName,
          districtId: districtId,
          districtName: districtName,
          state: stateName,
          latitude: latNum,
          longitude: lngNum,
          radius_meters: radNum,
          radiusMeters: radNum,
          address: address.trim() || undefined,
          principal_name: principalName.trim() || undefined,
          principalName: principalName.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        } as any);
        setSuccessMsg('School details and geofence coordinates saved successfully!');
        setTimeout(() => onSaved(updated), 600);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save school coordinates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, padding: '26px 30px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: 'var(--accent-emerald-subtle)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MapPin size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isNew ? 'Register New School & Campus Coordinates' : `Edit Geofence Coordinates: ${school?.name}`}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                State Admin Portal · Campus Location & Radius Tolerance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ padding: 6, borderRadius: 6, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: 'var(--accent-rose-subtle)',
            border: '1px solid var(--accent-rose-border)',
            borderRadius: 8,
            marginTop: 18,
            color: 'var(--accent-rose)',
            fontSize: '0.85rem',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: 'var(--accent-emerald-subtle)',
            border: '1px solid var(--accent-emerald-border)',
            borderRadius: 8,
            marginTop: 18,
            color: 'var(--accent-emerald)',
            fontSize: '0.85rem',
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          {/* General Information */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                School Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metropolitan Science Academy"
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                School Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SCH-BPL-001"
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                District Name *
              </label>
              <input
                type="text"
                required
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                placeholder="e.g. Bhopal"
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                District ID *
              </label>
              <input
                type="text"
                required
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                placeholder="e.g. DIST-BPL-01"
                className="input-field"
              />
            </div>
          </div>

          {/* GEOFENCE COORDINATES SECTION (Highlight) */}
          <div style={{
            marginTop: 22,
            padding: '18px 20px',
            backgroundColor: '#ffffff',
            border: '2px solid var(--border-light)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Navigation size={18} color="#059669" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Geofence Boundary & Location Coordinates
                </h3>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                title="Detect GPS coordinates of your current device"
              >
                <Crosshair size={13} color="#059669" /> Use Current GPS
              </button>
            </div>

            {/* Quick Coordinate Presets */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Quick Geographic Presets:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {PRESET_COORDINATES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-main)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Latitude (&deg;N/S) *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 23.213500"
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Longitude (&deg;E/W) *
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 77.388500"
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Geofence Radius (Meters) *
                </label>
                <input
                  type="number"
                  required
                  min="20"
                  max="5000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  placeholder="e.g. 150"
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
              </div>
            </div>

            {/* Coordinates Live Preview Summary */}
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.785rem',
              color: 'var(--text-secondary)',
            }}>
              <div>
                Campus Center: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{latitude}, {longitude}</strong>
              </div>
              <span className="pill pill-emerald">
                &plusmn;{radiusMeters}m Geofence Perimeter
              </span>
            </div>
          </div>

          {/* Address & Contact Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Campus Physical Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Hoshangabad Road, Zone-II, MP Nagar, Bhopal"
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Principal / Head of Institution
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="e.g. Dr. Vikram Sarabhai"
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Official Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. principal.msa@mp.gov.in"
                className="input-field"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-emerald"
            >
              <Save size={16} />
              <span>{saving ? 'Saving Coordinates…' : 'Save Campus Coordinates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
