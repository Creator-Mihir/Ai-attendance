import React, { useState, useEffect } from 'react';
import { School, Teacher, AttendanceRecord, AttendanceSummary, AdminUser } from '../types';
import { ApiService } from '../api';
import { StatCard } from './StatCard';
import { AuditModal } from './AuditModal';
import { 
  Building2, 
  School as SchoolIcon, 
  Users, 
  CheckCircle, 
  Search, 
  Eye, 
  RefreshCw,
  Compass,
  MapPin
} from 'lucide-react';

interface DistrictAdminViewProps {
  user: AdminUser;
}

export const DistrictAdminView: React.FC<DistrictAdminViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'schools' | 'attendance' | 'teachers'>('schools');
  
  const districtId = user.jurisdictionDistrictId || 'DIST-BPL-01';
  const districtName = districtId === 'DIST-BPL-01' ? 'Bhopal District' : 'District Administration';

  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [inspectingRecord, setInspectingRecord] = useState<AttendanceRecord | null>(null);

  const loadDistrictData = async () => {
    setLoading(true);
    try {
      const [schoolsData, teachersData, summaryData, attendanceData] = await Promise.all([
        ApiService.getSchools(districtId),
        ApiService.getTeachers({ districtId }),
        ApiService.getAttendanceSummary({ districtId }),
        ApiService.getAttendance({ districtId, limit: 100 }),
      ]);
      setSchools(schoolsData);
      setTeachers(teachersData);
      setSummary(summaryData);
      setAttendance(attendanceData);
    } catch (err) {
      console.error('Failed to load district admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistrictData();
  }, [districtId]);

  const filteredAttendance = attendance.filter((a) => {
    const matchesSchool = !selectedSchool || a.school_id === selectedSchool;
    const matchesSearch = !search || 
      (a.teacher_name && a.teacher_name.toLowerCase().includes(search.toLowerCase())) ||
      a.employee_code.toLowerCase().includes(search.toLowerCase());
    return matchesSchool && matchesSearch;
  });

  const filteredTeachers = teachers.filter((t) => {
    const matchesSchool = !selectedSchool || t.school_id === selectedSchool;
    const matchesSearch = !search || 
      t.full_name.toLowerCase().includes(search.toLowerCase()) || 
      t.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(search.toLowerCase()));
    return matchesSchool && matchesSearch;
  });

  return (
    <div style={{ padding: '28px 0' }}>
      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          title="DISTRICT JURISDICTION"
          value={districtName}
          subtitle="Education Administrative Zone"
          icon={<Building2 size={20} color="#0f172a" />}
          badge={{ text: districtId, type: 'slate' }}
        />
        <StatCard
          title="SCHOOLS IN DISTRICT"
          value={schools.length}
          subtitle="Institutions under supervision"
          icon={<SchoolIcon size={20} color="#059669" />}
          badge={{ text: 'Active', type: 'emerald' }}
        />
        <StatCard
          title="DISTRICT FACULTY"
          value={teachers.length}
          subtitle="Total enrolled teachers"
          icon={<Users size={20} color="#334155" />}
          badge={{ text: 'Verified', type: 'slate' }}
        />
        <StatCard
          title="TODAY'S ATTENDANCE"
          value={summary?.todayRecords ?? 0}
          subtitle={`${summary?.presentToday ?? 0} Present · ${summary?.lateToday ?? 0} Late`}
          icon={<CheckCircle size={20} color="#059669" />}
          badge={{ text: 'Real-time', type: 'emerald' }}
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
            onClick={() => setActiveTab('schools')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'schools' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'schools' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <SchoolIcon size={16} />
            <span>Schools in District</span>
            <span style={{
              fontSize: '0.725rem',
              padding: '2px 6px',
              borderRadius: 999,
              backgroundColor: activeTab === 'schools' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: activeTab === 'schools' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {schools.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'attendance' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'attendance' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <CheckCircle size={16} />
            <span>District Attendance Feed</span>
            <span style={{
              fontSize: '0.725rem',
              padding: '2px 6px',
              borderRadius: 999,
              backgroundColor: activeTab === 'attendance' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: activeTab === 'attendance' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {attendance.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: activeTab === 'teachers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'teachers' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Users size={16} />
            <span>District Faculty Directory</span>
            <span style={{
              fontSize: '0.725rem',
              padding: '2px 6px',
              borderRadius: 999,
              backgroundColor: activeTab === 'teachers' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
              color: activeTab === 'teachers' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {teachers.length}
            </span>
          </button>
        </div>

        <button
          onClick={loadDistrictData}
          disabled={loading}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* TAB 1: SCHOOLS IN DISTRICT */}
      {activeTab === 'schools' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {schools.map((s) => (
            <div key={s.id} className="white-card" style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {s.name}
                  </h3>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Code: <strong>{s.code}</strong> · {s.district_name}
                  </div>
                </div>
                <span className="pill pill-slate">
                  {s.teacher_count ?? 0} Faculty
                </span>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: '0.8rem',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <MapPin size={14} color="#059669" />
                  <span style={{ color: 'var(--text-muted)' }}>Campus Geofence:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                    {s.latitude}, {s.longitude}
                  </strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 20 }}>
                  Perimeter radius tolerance: &plusmn;{s.radius_meters}m
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  Principal: <strong>{s.principal_name || 'Dr. Principal'}</strong>
                </div>
                <button
                  onClick={() => {
                    setSelectedSchool(s.id);
                    setActiveTab('attendance');
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  View Punches &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: DISTRICT ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
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

            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="input-field"
              style={{ width: 280 }}
            >
              <option value="">All Schools in {districtName}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="clean-table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>School</th>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Campus Distance</th>
                  <th>Face Match</th>
                  <th>Liveness</th>
                  <th style={{ textAlign: 'right' }}>Audit</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No attendance logs found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((rec) => {
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
                            {rec.school_name || 'Main Campus'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
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
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setInspectingRecord(rec)}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                          >
                            <Eye size={13} />
                            <span>Audit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISTRICT TEACHERS */}
      {activeTab === 'teachers' && (
        <div>
          <div className="clean-table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  <th>Assigned School</th>
                  <th>Biometric Face Status</th>
                  <th>Contact Email</th>
                  <th>Contact Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {t.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Code: <strong>{t.employee_code}</strong> · {t.department || 'General Faculty'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <SchoolIcon size={14} color="#059669" />
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                          {t.school_name || 'Main Campus'}
                        </strong>
                      </div>
                    </td>
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
                    <td>{t.email}</td>
                    <td>{t.phone_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECT MODAL */}
      {inspectingRecord && (
        <AuditModal
          record={inspectingRecord}
          onClose={() => setInspectingRecord(null)}
        />
      )}
    </div>
  );
};
