import db from '../database';
import { TeacherProfile } from '../../types/teacher';

const CURRENT_TEACHER_KEY = 'current_teacher_id';
const AUTH_TOKEN_KEY = 'server_auth_token';

function mapRowToTeacher(row: any): TeacherProfile {
  let faceEmbedding = undefined;
  if (row.face_embedding_json) {
    try {
      faceEmbedding = JSON.parse(row.face_embedding_json);
    } catch {}
  }
  return {
    id: row.id,
    employeeCode: row.employee_code || row.employee_id || '',
    fullName: row.full_name || row.name || '',
    email: row.email || '',
    phoneNumber: row.phone_number || row.phone || '',
    department: row.department || '',
    designation: row.designation || '',
    avatarUrl: row.avatar_url || undefined,
    faceRegistered: Boolean(row.face_registered),
    faceEmbedding,
    enrolledDeviceId: row.enrolled_device_id || undefined,
    schoolBranchId: row.school_branch_id || row.school_id || '',
    schoolBranchName: row.school_branch_name || 'Main Campus',
    joinedDate: row.joined_date || row.created_at || new Date().toISOString(),
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
  };
}

export class TeacherRepository {
  public static async getAll(): Promise<TeacherProfile[]> {
    const rows = await db.getAllAsync('SELECT * FROM teachers ORDER BY full_name ASC;');
    return rows.map(mapRowToTeacher);
  }

  public static async getById(id: string): Promise<TeacherProfile | null> {
    const row = await db.getFirstAsync('SELECT * FROM teachers WHERE id = ? LIMIT 1;', [id]);
    return row ? mapRowToTeacher(row) : null;
  }

  public static async getByEmployeeCode(code: string): Promise<TeacherProfile | null> {
    const normalized = code.trim().toUpperCase();
    const row = await db.getFirstAsync(
      'SELECT * FROM teachers WHERE UPPER(employee_code) = ? OR UPPER(employee_id) = ? LIMIT 1;',
      [normalized, normalized]
    );
    return row ? mapRowToTeacher(row) : null;
  }

  public static async create(teacher: TeacherProfile): Promise<void> {
    return this.save(teacher);
  }

  public static async save(teacher: TeacherProfile): Promise<void> {
    const now = new Date().toISOString();
    const embeddingJson = teacher.faceEmbedding ? JSON.stringify(teacher.faceEmbedding) : null;
    const createdAt = teacher.joinedDate || now;
    const updatedAt = now;

    await db.runAsync(
      `INSERT INTO teachers (
        id, employee_id, employee_code, name, full_name, email, phone, phone_number,
        department, designation, avatar_url, face_registered, face_embedding_json,
        enrolled_device_id, school_id, school_branch_id, school_branch_name,
        joined_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        employee_id = excluded.employee_id,
        employee_code = excluded.employee_code,
        name = excluded.name,
        full_name = excluded.full_name,
        email = excluded.email,
        phone = excluded.phone,
        phone_number = excluded.phone_number,
        department = excluded.department,
        designation = excluded.designation,
        avatar_url = excluded.avatar_url,
        face_registered = excluded.face_registered,
        face_embedding_json = excluded.face_embedding_json,
        enrolled_device_id = excluded.enrolled_device_id,
        school_id = excluded.school_id,
        school_branch_id = excluded.school_branch_id,
        school_branch_name = excluded.school_branch_name,
        joined_date = excluded.joined_date,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at;`,
      [
        teacher.id,
        teacher.employeeCode,
        teacher.employeeCode,
        teacher.fullName,
        teacher.fullName,
        teacher.email || '',
        teacher.phoneNumber || '',
        teacher.phoneNumber || '',
        teacher.department || '',
        teacher.designation || '',
        teacher.avatarUrl || null,
        teacher.faceRegistered ? 1 : 0,
        embeddingJson,
        teacher.enrolledDeviceId || null,
        teacher.schoolBranchId,
        teacher.schoolBranchId,
        teacher.schoolBranchName || 'Main Campus',
        teacher.joinedDate || now,
        teacher.isActive ? 1 : 0,
        createdAt,
        updatedAt,
      ]
    );
  }

  public static async getCurrentTeacher(): Promise<TeacherProfile | null> {
    let currentId = await db.get<string>(CURRENT_TEACHER_KEY);
    if (!currentId && typeof window !== 'undefined' && window.localStorage) {
      try {
        currentId = window.localStorage.getItem('@current_auth_teacher_id') || null;
      } catch {}
    }

    if (currentId) {
      const teacher = await this.getById(currentId);
      if (teacher) return teacher;
      // Also try employee code lookup if ID didn't match
      const byCode = await this.getByEmployeeCode(currentId);
      if (byCode) return byCode;
    }
    return null;
  }

  public static async setCurrentTeacher(id: string): Promise<void> {
    await db.set(CURRENT_TEACHER_KEY, id);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('@current_auth_teacher_id', id);
      } catch {}
    }
  }

  public static async setAuthToken(token: string | null): Promise<void> {
    if (token) await db.set(AUTH_TOKEN_KEY, token);
    else await db.remove(AUTH_TOKEN_KEY);
  }

  public static async getAuthToken(): Promise<string | null> {
    return (await db.get<string>(AUTH_TOKEN_KEY)) || null;
  }

  public static async clearCurrentTeacher(): Promise<void> {
    await db.remove(CURRENT_TEACHER_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('@current_auth_teacher_id');
      } catch {}
    }
  }

  public static async delete(id: string): Promise<void> {
    await db.runAsync('DELETE FROM teachers WHERE id = ?;', [id]);
    const currentId = await db.get<string>(CURRENT_TEACHER_KEY);
    if (currentId === id) {
      await this.clearCurrentTeacher();
    }
  }

  public static async count(): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM teachers;');
    return row ? Number(row.count) : 0;
  }
}

export default TeacherRepository;
