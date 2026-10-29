import React, { useState } from 'react';
import { School, Teacher } from '../types';
import { ApiService } from '../api';
import { 
  X, 
  ArrowRightLeft, 
  School as SchoolIcon, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  User, 
  Building2 
} from 'lucide-react';

interface TeacherTransferModalProps {
  teacher: Teacher | null;
  schools: School[];
  onClose: () => void;
  onTransferred: (updatedTeacher: Teacher) => void;
}

export const TeacherTransferModal: React.FC<TeacherTransferModalProps> = ({
  teacher,
  schools,
  onClose,
  onTransferred,
}) => {
  if (!teacher) return null;

  const currentSchoolId = teacher.school_id;
  const eligibleSchools = schools.filter((s) => s.id !== currentSchoolId);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    eligibleSchools[0]?.id || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const targetSchool = schools.find((s) => s.id === selectedSchoolId);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) {
      setError('Please select a destination school for the teacher.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await ApiService.transferTeacherSchool(
        teacher.id,
        selectedSchoolId,
        targetSchool?.name
      );
      setSuccessMsg(`Teacher "${teacher.full_name}" reassigned successfully to "${targetSchool?.name}".`);
      setTimeout(() => {
        onTransferred(updated);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to reassign teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, padding: '26px 30px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              backgroundColor: 'var(--accent-amber-subtle)',
              color: 'var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Transfer Faculty to New School
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                State Admin Exclusive Capability · Institution Reassignment
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

        <form onSubmit={handleTransfer} style={{ marginTop: 20 }}>
          {/* Teacher Profile Card */}
          <div style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 10,
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {teacher.full_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Emp Code: <strong>{teacher.employee_code}</strong> · {teacher.department || 'General Faculty'}
              </div>
            </div>
          </div>

          {/* Current vs Target School Comparison */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
            {/* Current School */}
            <div style={{
              padding: 14,
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              backgroundColor: '#ffffff',
            }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Current School
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                {teacher.school_name || 'Main Campus'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                District: {teacher.district_name || 'Bhopal'}
              </div>
            </div>

            {/* Transfer Arrow */}
            <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
              <ArrowRightLeft size={20} color="#059669" />
            </div>

            {/* Destination School Preview */}
            <div style={{
              padding: 14,
              border: '1px solid var(--accent-emerald-border)',
              borderRadius: 10,
              backgroundColor: 'var(--accent-emerald-subtle)',
            }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>
                Destination School
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                {targetSchool?.name || 'Select School'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                District: {targetSchool?.district_name || '—'}
              </div>
            </div>
          </div>

          {/* Select School Dropdown */}
          <div style={{ marginTop: 22 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Select Destination School Campus *
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="input-field"
              style={{ padding: '10px 14px', fontSize: '0.9rem', fontWeight: 500 }}
              required
            >
              <option value="" disabled>-- Select School to Reassign --</option>
              {eligibleSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.district_name} · {s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Target School Geofence Summary */}
          {targetSchool && (
            <div style={{
              marginTop: 14,
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <MapPin size={14} color="#059669" style={{ display: 'inline', marginRight: 6 }} />
                Campus Geofence: <span style={{ fontFamily: 'monospace' }}>{targetSchool.latitude}, {targetSchool.longitude}</span>
              </div>
              <span className="pill pill-slate">
                Tolerance: &plusmn;{targetSchool.radius_meters}m
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSchoolId}
              className="btn-emerald"
            >
              <ArrowRightLeft size={16} />
              <span>{submitting ? 'Transferring Teacher…' : 'Confirm Teacher School Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
