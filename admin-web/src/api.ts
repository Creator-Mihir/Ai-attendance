import { AdminUser, AttendanceRecord, AttendanceSummary, District, School, Teacher } from './types';

const TOKEN_KEY = 'ai_attend_admin_token';
const USER_KEY = 'ai_attend_admin_user';
const API_BASE_KEY = 'ai_attend_admin_base';

export class ApiService {
  private static baseUrl = localStorage.getItem(API_BASE_KEY) || '/api';

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  public static setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
    localStorage.setItem(API_BASE_KEY, this.baseUrl);
  }

  public static getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  public static setSession(token: string, admin: AdminUser): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(admin));
  }

  public static getAdminUser(): AdminUser | null {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  }

  public static logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      throw new Error(payload.message || `Request failed with status ${response.status}`);
    }

    return payload.data !== undefined ? payload.data : payload;
  }

  // AUTH
  public static async login(emailOrUsername: string, password: string): Promise<{ token: string; admin: AdminUser }> {
    const data = await this.request<{ token: string; admin: AdminUser }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrUsername, password }),
    });
    this.setSession(data.token, data.admin);
    return data;
  }

  // ATTENDANCE & SUMMARY
  public static async getAttendanceSummary(params?: { schoolId?: string; districtId?: string }): Promise<AttendanceSummary> {
    const q = new URLSearchParams();
    if (params?.schoolId) q.set('schoolId', params.schoolId);
    if (params?.districtId) q.set('districtId', params.districtId);
    return this.request<AttendanceSummary>(`/admin/attendance/summary?${q.toString()}`);
  }

  public static async getAttendance(params: {
    from?: string;
    to?: string;
    teacher?: string;
    punchType?: string;
    status?: string;
    schoolId?: string;
    districtId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AttendanceRecord[]> {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.teacher) q.set('teacher', params.teacher);
    if (params.punchType) q.set('punchType', params.punchType);
    if (params.status) q.set('status', params.status);
    if (params.schoolId) q.set('schoolId', params.schoolId);
    if (params.districtId) q.set('districtId', params.districtId);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset !== undefined) q.set('offset', String(params.offset));

    return this.request<AttendanceRecord[]>(`/admin/attendance?${q.toString()}`);
  }

  // SCHOOLS
  public static async getSchools(districtId?: string, search?: string): Promise<School[]> {
    const q = new URLSearchParams();
    if (districtId) q.set('districtId', districtId);
    if (search) q.set('search', search);
    return this.request<School[]>(`/schools?${q.toString()}`);
  }

  public static async getSchoolById(id: string): Promise<School> {
    return this.request<School>(`/schools/${id}`);
  }

  public static async createSchool(data: Partial<School>): Promise<School> {
    return this.request<School>('/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async updateSchool(id: string, data: Partial<School>): Promise<School> {
    return this.request<School>(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static async updateSchoolCoordinates(id: string, latitude: number, longitude: number, radiusMeters: number): Promise<School> {
    return this.request<School>(`/schools/${id}/coordinates`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude, radiusMeters }),
    });
  }

  // DISTRICTS
  public static async getDistricts(): Promise<District[]> {
    return this.request<District[]>('/districts');
  }

  // TEACHERS
  public static async getTeachers(params?: { schoolId?: string; districtId?: string; search?: string }): Promise<Teacher[]> {
    const q = new URLSearchParams();
    if (params?.schoolId) q.set('schoolId', params.schoolId);
    if (params?.districtId) q.set('districtId', params.districtId);
    if (params?.search) q.set('search', params.search);
    return this.request<Teacher[]>(`/admin/teachers?${q.toString()}`);
  }

  public static async transferTeacherSchool(teacherId: string, newSchoolId: string, newSchoolName?: string): Promise<Teacher> {
    return this.request<Teacher>(`/admin/teachers/${teacherId}/school`, {
      method: 'PUT',
      body: JSON.stringify({ newSchoolId, newSchoolName }),
    });
  }
}
