import React, { useState, useEffect } from 'react';
import { School, Teacher, AttendanceRecord, AttendanceSummary, AdminUser } from '../types';
import { ApiService } from '../api';
import { StatCard } from './StatCard';
import { AuditModal } from './AuditModal';
import { 
  School as SchoolIcon, 
  Users, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Eye, 
  RefreshCw, 
  Search,
  Compass,
  AlertCircle
} from 'lucide-react';

interface SchoolAdminViewProps {
  user: AdminUser;
}

export const SchoolAdminView: React.FC<SchoolAdminViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'faculty' | 'history'>('live');
  
  const schoolId = user.jurisdictionSchoolId || 'branch-main-01';

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inspectingRecord, setInspectingRecord] = useState<AttendanceRecord | null>(null);

  const loadSchoolData = async () => {
    setLoading(true);
    try {
      const [schoolData, teachersData, summaryData, attendanceData] = await Promise.all([
        ApiService.getSchoolById(schoolId),
        ApiService.getTeachers({ schoolId }),
        ApiService.getAttendanceSummary({ schoolId }),
        ApiService.getAttendance({ schoolId, limit: 100 }),
      ]);
      setSchool(schoolData);
      setTeachers(teachersData);
      setSummary(summaryData);
      setAttendance(attendanceData);
    } catch (err) {
      console.error('Failed to load school admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, [schoolId]);

  const filteredAttendance = attendance.filter((a) => {
    return !search || 
      (a.teacher_name && a.teacher_name.toLowerCase().includes(search.toLowerCase())) ||
      a.employee_code.toLowerCase().includes(search.toLowerCase());
  });

  const filteredTeachers = teachers.filter((t) => {
    return !search || 
      t.full_name.toLowerCase().includes(search.toLowerCase()) || 
      t.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(search.toLowerCase()));
  });

  const todayPunches = filteredAttendance.filter((a) => {
    const today = new Date().toISOString().slice(0, 10);
    return a.date === today || a.timestamp.startsWith(today);
  });

  const displayPunches = activeTab === 'live' ? todayPunches : filteredAttendance;

  return (
    <div style={{ padding: '28px 0' }}>
      {/* School Campus Header Card */}
      {school && (
        <div className="white-card" style={{ padding: '20px 26px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: 'var(--accent-emerald-subtle)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <SchoolIcon size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {school.name}
                  </h2>
                  <span className="pill pill-slate">
                    {school.code}
                  </span>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {school.address || 'Campus Location'} · District: <strong>{school.district_name}</strong>
                </p>
              </div>
            </div>

            {/* Geofence Active Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'var(--bg-subtle)',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.8rem',
            }}>
              <Compass size={16} color="#059669" />
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Campus Geofence:</span>{' '}
                <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                  {Number(school.latitude).toFixed(5)}, {Number(school.longitude).toFixed(5)}
                </strong>
                <span className="pill pill-emerald" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                  &plusmn;{school.radius_meters}m
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          title="FACULTY ROSTER"
          value={teachers.length}
          subtitle="Assigned to this campus"
          icon={<Users size={20} color="#334155" />}
          badge={{ text: 'Staff', type: 'slate' }}
        />
        <StatCard
          title="TODAY'S PUNCHES"
          value={summary?.todayRecords ?? 0}
          subtitle="Check-in / Check-out events"
          icon={<Clock size={20} color="#059669" />}
          badge={{ text: 'Live Feed', type: 'emerald' }}
        />
        <StatCard
          title="ON-TIME PRESENT"
          value={summary?.presentToday ?? 0}
          subtitle="Verified inside campus perimeter"
          icon={<CheckCircle size={20} color="#059669" />}
          badge={{ text: 'Verified', type: 'emerald' }}
        />
        <StatCard
          title="LATE ARRIVALS"
          value={summary?.lateToday ?? 0}
          subtitle="Punched post cutoff"
          icon={<AlertCircle size={20} color="#d97706" />}
          badge={{ text: 'Late', type: 'amber' }}
        />
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: 24,
        paddingBottom: 2,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'live' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'live' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Clock size={16} />
            <span>Today's Live Punch Feed</span>
            <span style={{
              fontSize: '0.725rem',
              padding: '2px 6px',
              borderRadius: 999,
              backgroundColor: activeTab === 'live' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: activeTab === 'live' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {todayPunches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('faculty')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'faculty' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'faculty' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Users size={16} />
            <span>Campus Faculty Roster</span>
            <span style={{
              fontSize: '0.725rem',
              padding: '2px 6px',
              borderRadius: 999,
              backgroundColor: activeTab === 'faculty' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: activeTab === 'faculty' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {teachers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'history' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <CheckCircle size={16} />
            <span>Full Attendance History</span>
            <span style={{
              fontSize: '0.725rem',
              padding: '2px 6px',
              borderRadius: 999,
              backgroundColor: activeTab === 'history' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: activeTab === 'history' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {attendance.length}
            </span>
          </button>
        </div>

        <button
          onClick={loadSchoolData}
          disabled={loading}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search teacher by name or employee code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* TAB 1 & 3: PUNCH FEED / HISTORY TABLE */}
      {(activeTab === 'live' || activeTab === 'history') && (
        <div className="clean-table-container">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Punch Time</th>
                <th>Punch Type</th>
                <th>Status</th>
                <th>Campus Distance</th>
                <th>Face Match Score</th>
                <th>Liveness Score</th>
                <th>Geofence Fix</th>
                <th style={{ textAlign: 'right' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {displayPunches.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    {activeTab === 'live' 
                      ? 'No attendance punches recorded today yet.' 
                      : 'No historical records found.'}
                  </td>
                </tr>
              ) : (
                displayPunches.map((rec) => {
                  const face = Math.round(Number(rec.face_match_score || 0) * 100);
                  const live = Math.round(Number(rec.liveness_score || 0) * 100);
                  const isLate = String(rec.status).toUpperCase() === 'LATE';

                  return (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {rec.teacher_name || rec.employee_code}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {rec.employee_code} · {rec.teacher_department || ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {new Date(rec.timestamp).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="pill pill-slate">
                          {rec.punch_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${isLate ? 'pill-amber' : 'pill-emerald'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        <span className="pill pill-emerald">
                          {Math.round(rec.distance_meters || 0)}m
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: face >= 75 ? '#059669' : '#e11d48' }}>
                          {face}%
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: live >= 70 ? '#059669' : '#e11d48' }}>
                          {live}%
                        </strong>
                      </td>
                      <td>
                        <span className={`pill ${rec.is_inside_geofence ? 'pill-emerald' : 'pill-rose'}`}>
                          {rec.is_inside_geofence ? 'IN CAMPUS' : 'OUTSIDE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setInspectingRecord(rec)}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                        >
                          <Eye size={13} />
                          <span>Audit &nearr;</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CAMPUS FACULTY ROSTER */}
      {activeTab === 'faculty' && (
        <div className="clean-table-container">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Faculty Member</th>
                <th>Employee Code</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Biometrics Enrollment</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {t.full_name}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {t.employee_code}
                    </span>
                  </td>
                  <td>{t.department || 'General Faculty'}</td>
                  <td>{t.designation || 'Faculty Member'}</td>
                  <td>
                    {t.face_registered ? (
                      <span className="pill pill-emerald">
                        <CheckCircle size={12} /> Biometrics Registered
                      </span>
                    ) : (
                      <span className="pill pill-amber">
                        Pending Registration
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{t.email}</div>
                    {t.phone_number && <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{t.phone_number}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {inspectingRecord && (
        <AuditModal
          record={inspectingRecord}
          onClose={() => setInspectingRecord(null)}
        />
      )}
    </div>
  );
};
