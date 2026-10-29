export type AdminRole = 'state_admin' | 'district_admin' | 'school_admin' | 'admin';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminRole;
  jurisdictionDistrictId?: string | null;
  jurisdictionSchoolId?: string | null;
}

export interface School {
  id: string;
  code: string;
  name: string;
  district_id: string;
  district_name: string;
  state: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string;
  principal_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  teacher_count?: number;
}

export interface District {
  district_id: string;
  district_name: string;
  state: string;
  school_count: number;
  teacher_count: number;
}

export interface Teacher {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone_number?: string;
  department?: string;
  designation?: string;
  avatar_url?: string;
  face_registered: number | boolean;
  school_id: string;
  school_name: string;
  school_code?: string;
  district_id?: string;
  district_name?: string;
  joined_date?: string;
  is_active: number | boolean;
}

export interface AttendanceRecord {
  id: string;
  teacher_id: string;
  employee_code: string;
  teacher_name?: string;
  teacher_code?: string;
  teacher_department?: string;
  school_id?: string;
  school_name?: string;
  school_code?: string;
  district_id?: string;
  district_name?: string;
  date: string;
  punch_type: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  status: string;
  verification_status: string;
  latitude: number;
  longitude: number;
  gps_accuracy?: number;
  distance_meters?: number;
  is_inside_geofence: number;
  verification_id: string;
  liveness_score?: number;
  face_match_score?: number;
  device_integrity_passed?: number;
  audit_status?: string;
  verification_meta?: string;
  rejection_reason?: string;
  rejection_message?: string;
}

export interface AttendanceSummary {
  totalRecords: number;
  todayRecords: number;
  presentToday: number;
  lateToday: number;
  teachersSeen: number;
}

export interface VerificationCheck {
  id: string;
  label?: string;
  status: 'PASS' | 'FAIL' | 'BYPASSED' | string;
  detail?: string;
  score?: number;
}
