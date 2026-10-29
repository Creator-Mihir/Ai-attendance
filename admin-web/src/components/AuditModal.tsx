import React from 'react';
import { AttendanceRecord, VerificationCheck } from '../types';
import { X, CheckCircle2, AlertTriangle, XCircle, Shield, MapPin, Smartphone, UserCheck } from 'lucide-react';

interface AuditModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  let checks: VerificationCheck[] = [];
  try {
    if (record.verification_meta) {
      const parsed = typeof record.verification_meta === 'string' 
        ? JSON.parse(record.verification_meta) 
        : record.verification_meta;
      checks = parsed?.checks || parsed?.auditMeta?.checks || [];
    }
  } catch {}

  const faceScore = Math.round(Number(record.face_match_score || 0) * 100);
  const liveScore = Math.round(Number(record.liveness_score || 0) * 100);
  const isLate = String(record.status).toUpperCase() === 'LATE';

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const getCheckIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PASS':
        return <CheckCircle2 size={16} color="#059669" />;
      case 'BYPASSED':
        return <AlertTriangle size={16} color="#d97706" />;
      default:
        return <XCircle size={16} color="#e11d48" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {record.teacher_name || record.employee_code}
              </h2>
              <span className={`pill ${isLate ? 'pill-amber' : 'pill-emerald'}`}>
                {record.status}
              </span>
              <span className="pill pill-slate">
                {record.punch_type?.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Faculty ID: <strong style={{ color: 'var(--text-main)' }}>{record.employee_code}</strong> · {record.teacher_department || 'Faculty'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 6,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Verification Summary KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          margin: '20px 0',
        }}>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>FACE MATCH</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: faceScore >= 75 ? '#059669' : '#e11d48' }}>
              {faceScore}%
            </div>
            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Threshold &ge; 75%</small>
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIVENESS SCORE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: liveScore >= 70 ? '#059669' : '#e11d48' }}>
              {liveScore}%
            </div>
            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Anti-spoofing</small>
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>CAMPUS DISTANCE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {Math.round(record.distance_meters || 0)}m
            </div>
            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GPS: &plusmn;{Math.round(record.gps_accuracy || 0)}m</small>
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>GEOFENCE FIX</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: record.is_inside_geofence ? '#059669' : '#e11d48' }}>
              {record.is_inside_geofence ? 'IN PERIMETER' : 'OUTSIDE'}
            </div>
            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verified Campus</small>
          </div>
        </div>

        {/* Location & Device Meta */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-light)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          fontSize: '0.825rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>School Campus:</span>{' '}
              <strong style={{ color: 'var(--text-main)' }}>{record.school_name || 'Main Campus'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>{' '}
              <strong style={{ color: 'var(--text-main)' }}>{formatTimestamp(record.timestamp)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>GPS Coordinates:</span>{' '}
              <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                {record.latitude?.toFixed(5)}, {record.longitude?.toFixed(5)}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Device Integrity:</span>{' '}
              <strong style={{ color: record.device_integrity_passed ? '#059669' : '#d97706' }}>
                {record.device_integrity_passed ? 'PASSED (Genuine)' : 'BYPASSED'}
              </strong>
            </div>
          </div>
        </div>

        {/* Verification Check Breakdown */}
        <div>
          <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
            Multi-Factor Biometric Verification Checks
          </h3>

          {checks.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No granular check breakdown was recorded for this punch receipt.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checks.map((chk, idx) => (
                <div
                  key={chk.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-light)',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {getCheckIcon(chk.status)}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {chk.label || chk.id?.replace('_', ' ').toUpperCase()}
                      </div>
                      {chk.detail && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {chk.detail}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`pill ${chk.status === 'PASS' ? 'pill-emerald' : chk.status === 'BYPASSED' ? 'pill-amber' : 'pill-rose'}`}>
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 20px' }}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
