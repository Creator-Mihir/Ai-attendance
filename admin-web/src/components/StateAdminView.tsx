import React, { useState, useEffect } from 'react';
import { School, Teacher, AttendanceRecord, AttendanceSummary, District } from '../types';
import { ApiService } from '../api';
import { StatCard } from './StatCard';
import { SchoolCoordinatesModal } from './SchoolCoordinatesModal';
import { TeacherTransferModal } from './TeacherTransferModal';
import { AuditModal } from './AuditModal';
import { 
  Building2, 
  School as SchoolIcon, 
  Users, 
  CheckCircle, 
  MapPin, 
  Plus, 
  Search, 
  Edit3, 
  ArrowRightLeft, 
  Filter, 
  Compass, 
  Eye, 
  RefreshCw,
  Landmark
} from 'lucide-react';

export const StateAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schools' | 'teachers' | 'attendance'>('schools');
  
  // Data states
  const [schools, setSchools] = useState<School[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  // Filter states
  const [loading, setLoading] = useState(true);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('');
  const [attendanceDateFrom, setAttendanceDateFrom] = useState('');
  const [attendanceDateTo, setAttendanceDateTo] = useState('');

  // Modals
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isNewSchoolModal, setIsNewSchoolModal] = useState(false);
  const [transferringTeacher, setTransferringTeacher] = useState<Teacher | null>(null);
  const [inspectingRecord, setInspectingRecord] = useState<AttendanceRecord | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [schoolsData, districtsData, teachersData, summaryData, attendanceData] = await Promise.all([
        ApiService.getSchools(),
        ApiService.getDistricts(),
        ApiService.getTeachers(),
        ApiService.getAttendanceSummary(),
        ApiService.getAttendance({ limit: 100 }),
      ]);
      setSchools(schoolsData);
      setDistricts(districtsData);
      setTeachers(teachersData);
      setSummary(summaryData);
      setAttendance(attendanceData);
    } catch (err) {
      console.error('Error loading state admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered schools
  const filteredSchools = schools.filter((s) => {
    const matchesSearch = !schoolSearch || 
      s.name.toLowerCase().includes(schoolSearch.toLowerCase()) || 
      s.code.toLowerCase().includes(schoolSearch.toLowerCase()) || 
      s.district_name.toLowerCase().includes(schoolSearch.toLowerCase());
    const matchesDistrict = !selectedDistrictFilter || s.district_id === selectedDistrictFilter;
    return matchesSearch && matchesDistrict;
  });

  // Filtered teachers
  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch = !teacherSearch || 
      t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
      t.employee_code.toLowerCase().includes(teacherSearch.toLowerCase()) || 
      (t.department && t.department.toLowerCase().includes(teacherSearch.toLowerCase()));
    const matchesDistrict = !selectedDistrictFilter || t.district_id === selectedDistrictFilter;
    const matchesSchool = !selectedSchoolFilter || t.school_id === selectedSchoolFilter;
    return matchesSearch && matchesDistrict && matchesSchool;
  });

  // Filtered attendance
  const filteredAttendance = attendance.filter((a) => {
    const matchesSchool = !selectedSchoolFilter || a.school_id === selectedSchoolFilter;
    const matchesDistrict = !selectedDistrictFilter || a.district_id === selectedDistrictFilter;
    return matchesSchool && matchesDistrict;
  });

  return (
    <div style={{ padding: '28px 0' }}>
      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          title="ADMINISTERED DISTRICTS"
          value={districts.length}
          subtitle="Jurisdiction across state"
          icon={<Landmark size={20} color="#d97706" />}
          badge={{ text: 'Statewide', type: 'amber' }}
        />
        <StatCard
          title="ACTIVE SCHOOL CAMPUSES"
          value={schools.length}
          subtitle="All geofenced institutions"
          icon={<SchoolIcon size={20} color="#059669" />}
          badge={{ text: `${schools.length} Active`, type: 'emerald' }}
        />
        <StatCard
          title="REGISTERED FACULTY"
          value={teachers.length}
          subtitle="Statewide faculty roster"
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
            <span>Schools & Geofence Coordinates</span>
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
            <ArrowRightLeft size={16} />
            <span>Faculty Roster & School Transfer</span>
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
            <span>Statewide Attendance Feed</span>
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeTab === 'schools' && (
            <button
              onClick={() => setIsNewSchoolModal(true)}
              className="btn-emerald"
              style={{ fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>Register New School</span>
            </button>
          )}

          <button
            onClick={loadAllData}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '8px 12px' }}
            title="Refresh state records"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TAB 1: SCHOOLS & GEOFENCE COORDINATES */}
      {activeTab === 'schools' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                placeholder="Search schools by name, code, or district…"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 38 }}
              />
            </div>

            <select
              value={selectedDistrictFilter}
              onChange={(e) => setSelectedDistrictFilter(e.target.value)}
              className="input-field"
              style={{ width: 220 }}
            >
              <option value="">All Districts ({districts.length})</option>
              {districts.map((d) => (
                <option key={d.district_id} value={d.district_id}>
                  {d.district_name} ({d.school_count} schools)
                </option>
              ))}
            </select>
          </div>

          {/* Schools Table */}
          <div className="clean-table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>School Campus</th>
                  <th>District</th>
                  <th>Geofence Coordinates</th>
                  <th>Radius Tolerance</th>
                  <th>Principal</th>
                  <th>Faculty Count</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No schools match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Code: <strong>{s.code}</strong> · {s.address || 'Campus Address'}
                        </div>
                      </td>
                      <td>
                        <span className="pill pill-slate">
                          {s.district_name}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Compass size={14} color="#059669" />
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                            {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="pill pill-emerald">
                          &plusmn;{s.radius_meters} meters
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                          {s.principal_name || 'Dr. Principal'}
                        </div>
                        {s.contact_email && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            {s.contact_email}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {s.teacher_count ?? 0}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                          teachers
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setEditingSchool(s)}
                          className="btn-secondary"
                          style={{ fontSize: '0.785rem', padding: '6px 12px' }}
                          title="Edit campus coordinates & geofence radius"
                        >
                          <Edit3 size={13} color="#059669" />
                          <span>Edit Coordinates</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY ROSTER & SCHOOL TRANSFER */}
      {activeTab === 'teachers' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                placeholder="Search faculty by name, employee code, or department…"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 38 }}
              />
            </div>

            <select
              value={selectedDistrictFilter}
              onChange={(e) => {
                setSelectedDistrictFilter(e.target.value);
                setSelectedSchoolFilter('');
              }}
              className="input-field"
              style={{ width: 200 }}
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.district_id} value={d.district_id}>
                  {d.district_name}
                </option>
              ))}
            </select>

            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="input-field"
              style={{ width: 260 }}
            >
              <option value="">All Schools ({schools.length})</option>
              {schools
                .filter((s) => !selectedDistrictFilter || s.district_id === selectedDistrictFilter)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Teachers Table */}
          <div className="clean-table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  <th>Current School Campus</th>
                  <th>District</th>
                  <th>Biometric Face Status</th>
                  <th>Contact Info</th>
                  <th style={{ textAlign: 'right' }}>State Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No teachers found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t) => (
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
                        <span className="pill pill-slate">
                          {t.district_name || 'Bhopal'}
                        </span>
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
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          {t.email}
                        </div>
                        {t.phone_number && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            {t.phone_number}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setTransferringTeacher(t)}
                          className="btn-emerald"
                          style={{ fontSize: '0.785rem', padding: '6px 12px' }}
                          title="Change school of this teacher"
                        >
                          <ArrowRightLeft size={13} />
                          <span>Change School</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STATEWIDE ATTENDANCE LOGS */}
      {activeTab === 'attendance' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="input-field"
              style={{ width: 280 }}
            >
              <option value="">All Schools Across State</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.district_name})
                </option>
              ))}
            </select>

            <select
              value={selectedDistrictFilter}
              onChange={(e) => setSelectedDistrictFilter(e.target.value)}
              className="input-field"
              style={{ width: 200 }}
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.district_id} value={d.district_id}>
                  {d.district_name}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Table */}
          <div className="clean-table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>School Campus</th>
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
                      No attendance records found.
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
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            {rec.district_name || 'Bhopal'}
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
        </div>
      )}

      {/* MODALS */}
      {editingSchool && (
        <SchoolCoordinatesModal
          school={editingSchool}
          onClose={() => setEditingSchool(null)}
          onSaved={() => {
            setEditingSchool(null);
            loadAllData();
          }}
        />
      )}

      {isNewSchoolModal && (
        <SchoolCoordinatesModal
          school={null}
          isNew={true}
          onClose={() => setIsNewSchoolModal(false)}
          onSaved={() => {
            setIsNewSchoolModal(false);
            loadAllData();
          }}
        />
      )}

      {transferringTeacher && (
        <TeacherTransferModal
          teacher={transferringTeacher}
          schools={schools}
          onClose={() => setTransferringTeacher(null)}
          onTransferred={() => {
            setTransferringTeacher(null);
            loadAllData();
          }}
        />
      )}

      {inspectingRecord && (
        <AuditModal
          record={inspectingRecord}
          onClose={() => setInspectingRecord(null)}
        />
      )}
    </div>
  );
};
