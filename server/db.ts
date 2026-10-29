import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'backend.db');

export interface SchoolRecord {
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
}

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  password_salt: string;
  full_name: string;
  role: 'state_admin' | 'district_admin' | 'school_admin' | 'admin';
  jurisdiction_district_id?: string;
  jurisdiction_school_id?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class BackendDatabase {
  public db: DatabaseSync;

  constructor(filePath: string = DB_FILE) {
    this.db = new DatabaseSync(filePath);
    this.initTables();
    this.seedDefaultSchoolsAndAdmins();
    this.seedDefaultTeacher();
  }

  public static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 1000, 64, 'sha512').toString('hex');
    return { hash, salt: s };
  }

  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    const computed = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        employee_code TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone_number TEXT,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        department TEXT,
        designation TEXT,
        avatar_url TEXT,
        face_registered INTEGER NOT NULL DEFAULT 0,
        face_embedding_json TEXT,
        enrolled_device_id TEXT,
        school_id TEXT,
        school_branch_id TEXT NOT NULL,
        school_branch_name TEXT,
        joined_date TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        district_id TEXT NOT NULL,
        district_name TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters REAL NOT NULL DEFAULT 150,
        address TEXT,
        principal_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        jurisdiction_district_id TEXT,
        jurisdiction_school_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS attendance_logs (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        employee_code TEXT NOT NULL,
        date TEXT NOT NULL,
        check_in_time TEXT,
        punch_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        verification_status TEXT NOT NULL DEFAULT 'verified',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gps_accuracy REAL,
        distance_meters REAL,
        is_inside_geofence INTEGER NOT NULL DEFAULT 1,
        verification_id TEXT NOT NULL,
        liveness_score REAL,
        face_match_score REAL,
        device_integrity_passed INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS verification_records (
        id TEXT PRIMARY KEY,
        attendance_id TEXT,
        teacher_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'initial',
        liveness_score REAL,
        face_match_score REAL,
        location_verified INTEGER NOT NULL DEFAULT 1,
        device_verified INTEGER NOT NULL DEFAULT 1,
        liveness_passed INTEGER NOT NULL DEFAULT 1,
        face_match_passed INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL,
        rejection_reason TEXT,
        rejection_message TEXT,
        timestamp TEXT NOT NULL,
        meta_json TEXT
      );

      CREATE TABLE IF NOT EXISTS otps (
        phone_number TEXT PRIMARY KEY,
        otp_code TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);

    // Dynamic schema migration: ensure school_id column exists on existing teachers table
    try {
      const teacherColumns = this.db.prepare("PRAGMA table_info(teachers)").all() as any[];
      const hasSchoolId = teacherColumns.some((col) => col.name === 'school_id');
      if (!hasSchoolId) {
        this.db.exec("ALTER TABLE teachers ADD COLUMN school_id TEXT;");
      }
      this.db.exec("UPDATE teachers SET school_id = school_branch_id WHERE school_id IS NULL OR school_id = '';");
    } catch (e) {
      console.error('[DB] Migration verification error:', e);
    }
  }

  public seedDefaultSchoolsAndAdmins(): void {
    const now = new Date().toISOString();

    // 1. Seed initial schools with exact coordinates if not present
    const schoolsToSeed = [
      {
        id: 'branch-main-01',
        code: 'SCH-BPL-001',
        name: 'Metropolitan Science Academy - Main Campus',
        district_id: 'DIST-BPL-01',
        district_name: 'Bhopal',
        state: 'Madhya Pradesh',
        latitude: 23.2135,
        longitude: 77.3885,
        radius_meters: 150,
        address: 'Hoshangabad Road, Zone-II, MP Nagar, Bhopal',
        principal_name: 'Dr. Vikram Sarabhai',
        contact_email: 'principal.msa@mp.gov.in',
        contact_phone: '+91 755 244 5501',
      },
      {
        id: 'branch-bpl-02',
        code: 'SCH-BPL-002',
        name: 'Government Model Higher Secondary School - North',
        district_id: 'DIST-BPL-01',
        district_name: 'Bhopal',
        state: 'Madhya Pradesh',
        latitude: 23.2599,
        longitude: 77.4126,
        radius_meters: 200,
        address: 'TT Nagar, Model School Square, Bhopal',
        principal_name: 'Smt. Anita Sharma',
        contact_email: 'principal.gmhss@mp.gov.in',
        contact_phone: '+91 755 255 1202',
      },
      {
        id: 'branch-ind-01',
        code: 'SCH-IND-001',
        name: 'Indore Central Polytechnic & Model School',
        district_id: 'DIST-IND-02',
        district_name: 'Indore',
        state: 'Madhya Pradesh',
        latitude: 22.7196,
        longitude: 75.8577,
        radius_meters: 180,
        address: 'MG Road, South Tukoganj, Indore',
        principal_name: 'Prof. Rajesh Gupta',
        contact_email: 'principal.icpms@mp.gov.in',
        contact_phone: '+91 731 289 4401',
      },
      {
        id: 'branch-jbl-01',
        code: 'SCH-JBL-001',
        name: 'Jabalpur Apex Government High School',
        district_id: 'DIST-JBL-03',
        district_name: 'Jabalpur',
        state: 'Madhya Pradesh',
        latitude: 23.1815,
        longitude: 79.9864,
        radius_meters: 175,
        address: 'Civil Lines, High Court Road, Jabalpur',
        principal_name: 'Dr. Rameshwar Verma',
        contact_email: 'principal.jagh@mp.gov.in',
        contact_phone: '+91 761 240 8820',
      },
    ];

    const insertSchoolStmt = this.db.prepare(`
      INSERT OR IGNORE INTO schools (
        id, code, name, district_id, district_name, state,
        latitude, longitude, radius_meters, address, principal_name,
        contact_email, contact_phone, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const sch of schoolsToSeed) {
      insertSchoolStmt.run(
        sch.id, sch.code, sch.name, sch.district_id, sch.district_name, sch.state,
        sch.latitude, sch.longitude, sch.radius_meters, sch.address, sch.principal_name,
        sch.contact_email, sch.contact_phone, now, now
      );
    }

    // 2. Seed Default Admins for State, District, and School tiers
    const adminsToSeed = [
      {
        id: 'adm-state-01',
        username: 'state_admin',
        email: 'stateadmin@attendance.gov',
        password: 'admin123456',
        fullName: 'Directorate of School Education (State Admin)',
        role: 'state_admin',
        jurisdiction_district_id: null,
        jurisdiction_school_id: null,
      },
      {
        id: 'adm-dist-01',
        username: 'district_bhopal',
        email: 'districtadmin@attendance.gov',
        password: 'admin123456',
        fullName: 'District Education Officer (Bhopal)',
        role: 'district_admin',
        jurisdiction_district_id: 'DIST-BPL-01',
        jurisdiction_school_id: null,
      },
      {
        id: 'adm-sch-01',
        username: 'admin_msa_main',
        email: 'schooladmin@attendance.gov',
        password: 'admin123456',
        fullName: 'Principal - Metropolitan Science Academy',
        role: 'school_admin',
        jurisdiction_district_id: 'DIST-BPL-01',
        jurisdiction_school_id: 'branch-main-01',
      },
    ];

    for (const adm of adminsToSeed) {
      const existing = this.db.prepare('SELECT id FROM admin_users WHERE email = ?').get(adm.email);
      if (!existing) {
        const { hash, salt } = BackendDatabase.hashPassword(adm.password);
        this.db.prepare(`
          INSERT INTO admin_users (
            id, username, email, password_hash, password_salt,
            full_name, role, jurisdiction_district_id, jurisdiction_school_id,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(
          adm.id, adm.username, adm.email, hash, salt,
          adm.fullName, adm.role, adm.jurisdiction_district_id, adm.jurisdiction_school_id,
          now, now
        );
      }
    }
  }

  private seedDefaultTeacher(): void {
    const existing = this.db.prepare('SELECT id FROM teachers WHERE employee_code = ?').get('TCH-1042');
    const now = new Date().toISOString();
    if (!existing) {
      const { hash, salt } = BackendDatabase.hashPassword('password123');
      const seedFaceEmbedding = {
        version: 'MobileFaceNet-Offline-v2.1',
        vector: [0.35, -0.12, 0.78, 0.44, -0.25, 0.61, 0.18, -0.52],
        anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
        enrolledAt: '2026-01-15T09:00:00.000Z',
        qualityScore: 0.98,
      };

      this.db.prepare(`
        INSERT INTO teachers (
          id, employee_code, full_name, email, phone_number,
          password_hash, password_salt, department, designation,
          avatar_url, face_registered, face_embedding_json,
          enrolled_device_id, school_id, school_branch_id, school_branch_name,
          joined_date, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'tch-8849-ae12',
        'TCH-1042',
        'Dr. Sarah Mitchell',
        'sarah.mitchell@academy.edu',
        '+1 (555) 234-5678',
        hash,
        salt,
        'Department of Computer Science',
        'Senior Faculty & Dept Head',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop',
        1,
        JSON.stringify(seedFaceEmbedding),
        'DEV-IPHONE-16P',
        'branch-main-01',
        'branch-main-01',
        'Metropolitan Science Academy - Main Campus',
        '2021-08-10',
        1,
        now,
        now
      );
    }

    // Seed additional faculty across different schools to verify listing & transfer
    const extraFaculty = [
      {
        id: 'tch-2001-prof',
        code: 'TCH-2001',
        name: 'Prof. Alok Verma',
        email: 'alok.verma@academy.edu',
        phone: '+91 98260 11223',
        dept: 'Mathematics & Computing',
        desig: 'Associate Professor',
        schoolId: 'branch-main-01',
        schoolName: 'Metropolitan Science Academy - Main Campus',
      },
      {
        id: 'tch-3001-north',
        code: 'TCH-3001',
        name: 'Dr. Priya Nambiar',
        email: 'priya.nambiar@gov.in',
        phone: '+91 98260 33445',
        dept: 'Physical Sciences',
        desig: 'Assistant Professor',
        schoolId: 'branch-bpl-02',
        schoolName: 'Government Model Higher Secondary School - North',
      },
      {
        id: 'tch-4001-indore',
        code: 'TCH-4001',
        name: 'Sunil Sen',
        email: 'sunil.sen@icpms.edu',
        phone: '+91 98260 55667',
        dept: 'Mechanical Engineering',
        desig: 'Lecturer',
        schoolId: 'branch-ind-01',
        schoolName: 'Indore Central Polytechnic & Model School',
      },
    ];

    for (const f of extraFaculty) {
      const exists = this.db.prepare('SELECT id FROM teachers WHERE employee_code = ?').get(f.code);
      if (!exists) {
        const { hash, salt } = BackendDatabase.hashPassword('password123');
        this.db.prepare(`
          INSERT INTO teachers (
            id, employee_code, full_name, email, phone_number,
            password_hash, password_salt, department, designation,
            avatar_url, face_registered, face_embedding_json,
            enrolled_device_id, school_id, school_branch_id, school_branch_name,
            joined_date, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?, ?, ?, '2023-01-10', 1, ?, ?)
        `).run(
          f.id, f.code, f.name, f.email, f.phone,
          hash, salt, f.dept, f.desig,
          null, f.schoolId, f.schoolId, f.schoolName, now, now
        );
      }
    }
  }

  // SCHOOLS METHODS
  public getSchools(filters?: { districtId?: string; search?: string }): any[] {
    const where: string[] = ['s.is_active = 1'];
    const params: any[] = [];
    if (filters?.districtId) {
      where.push('s.district_id = ?');
      params.push(filters.districtId);
    }
    if (filters?.search) {
      where.push('(LOWER(s.name) LIKE ? OR LOWER(s.code) LIKE ? OR LOWER(s.district_name) LIKE ?)');
      const v = `%${filters.search.toLowerCase()}%`;
      params.push(v, v, v);
    }

    return this.db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM teachers t WHERE COALESCE(t.school_id, t.school_branch_id) = s.id AND t.is_active = 1) AS teacher_count
      FROM schools s
      WHERE ${where.join(' AND ')}
      ORDER BY s.district_name ASC, s.name ASC
    `).all(...params) as any[];
  }

  public getSchoolById(id: string): any {
    return this.db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM teachers t WHERE COALESCE(t.school_id, t.school_branch_id) = s.id AND t.is_active = 1) AS teacher_count
      FROM schools s
      WHERE s.id = ?
    `).get(id);
  }

  public createSchool(data: {
    id?: string;
    code: string;
    name: string;
    districtId: string;
    districtName: string;
    state?: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    address?: string;
    principalName?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): any {
    const id = data.id || 'sch-' + crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO schools (
        id, code, name, district_id, district_name, state,
        latitude, longitude, radius_meters, address, principal_name,
        contact_email, contact_phone, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.code.trim().toUpperCase(),
      data.name.trim(),
      data.districtId,
      data.districtName.trim(),
      data.state || 'Madhya Pradesh',
      data.latitude,
      data.longitude,
      data.radiusMeters || 150,
      data.address || null,
      data.principalName || null,
      data.contactEmail || null,
      data.contactPhone || null,
      now,
      now
    );
    return this.getSchoolById(id);
  }

  public updateSchool(id: string, updates: {
    name?: string;
    code?: string;
    districtId?: string;
    districtName?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    address?: string;
    principalName?: string;
    contactEmail?: string;
    contactPhone?: string;
    isActive?: boolean;
  }): any {
    const existing = this.getSchoolById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const code = updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code;
    const districtId = updates.districtId !== undefined ? updates.districtId : existing.district_id;
    const districtName = updates.districtName !== undefined ? updates.districtName.trim() : existing.district_name;
    const state = updates.state !== undefined ? updates.state : existing.state;
    const latitude = updates.latitude !== undefined ? Number(updates.latitude) : existing.latitude;
    const longitude = updates.longitude !== undefined ? Number(updates.longitude) : existing.longitude;
    const radiusMeters = updates.radiusMeters !== undefined ? Number(updates.radiusMeters) : existing.radius_meters;
    const address = updates.address !== undefined ? updates.address : existing.address;
    const principalName = updates.principalName !== undefined ? updates.principalName : existing.principal_name;
    const contactEmail = updates.contactEmail !== undefined ? updates.contactEmail : existing.contact_email;
    const contactPhone = updates.contactPhone !== undefined ? updates.contactPhone : existing.contact_phone;
    const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : existing.is_active;

    this.db.prepare(`
      UPDATE schools
      SET name = ?, code = ?, district_id = ?, district_name = ?, state = ?,
          latitude = ?, longitude = ?, radius_meters = ?, address = ?,
          principal_name = ?, contact_email = ?, contact_phone = ?, is_active = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      name, code, districtId, districtName, state,
      latitude, longitude, radiusMeters, address,
      principalName, contactEmail, contactPhone, isActive,
      now, id
    );

    return this.getSchoolById(id);
  }

  public updateSchoolCoordinates(id: string, latitude: number, longitude: number, radiusMeters: number): any {
    const existing = this.getSchoolById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE schools
      SET latitude = ?, longitude = ?, radius_meters = ?, updated_at = ?
      WHERE id = ?
    `).run(latitude, longitude, radiusMeters, now, id);

    return this.getSchoolById(id);
  }

  public getDistricts(): any[] {
    return this.db.prepare(`
      SELECT 
        district_id,
        district_name,
        state,
        COUNT(id) AS school_count,
        SUM((SELECT COUNT(*) FROM teachers t WHERE COALESCE(t.school_id, t.school_branch_id) = schools.id AND t.is_active = 1)) AS teacher_count
      FROM schools
      WHERE is_active = 1
      GROUP BY district_id, district_name, state
      ORDER BY district_name ASC
    `).all() as any[];
  }

  // TEACHER METHODS
  public getTeacherById(id: string): any {
    return this.db.prepare(`
      SELECT t.*,
        COALESCE(t.school_id, t.school_branch_id) AS school_id,
        COALESCE(s.name, t.school_branch_name) AS school_name,
        s.district_id,
        s.district_name,
        s.latitude AS school_latitude,
        s.longitude AS school_longitude,
        s.radius_meters AS school_radius_meters
      FROM teachers t
      LEFT JOIN schools s ON s.id = COALESCE(t.school_id, t.school_branch_id)
      WHERE t.id = ?
    `).get(id);
  }

  public getTeacherByIdentifier(identifier: string): any {
    const trimmed = identifier.trim().toLowerCase();
    return this.db.prepare(`
      SELECT t.*,
        COALESCE(t.school_id, t.school_branch_id) AS school_id,
        COALESCE(s.name, t.school_branch_name) AS school_name,
        s.district_id,
        s.district_name,
        s.latitude AS school_latitude,
        s.longitude AS school_longitude,
        s.radius_meters AS school_radius_meters
      FROM teachers t
      LEFT JOIN schools s ON s.id = COALESCE(t.school_id, t.school_branch_id)
      WHERE LOWER(t.employee_code) = ? 
         OR LOWER(t.email) = ? 
         OR t.phone_number = ?
      LIMIT 1
    `).get(trimmed, trimmed, identifier.trim());
  }

  public getTeachers(filters?: { schoolId?: string; districtId?: string; search?: string }): any[] {
    const where: string[] = ['t.is_active = 1'];
    const params: any[] = [];

    if (filters?.schoolId) {
      where.push('(t.school_id = ? OR t.school_branch_id = ?)');
      params.push(filters.schoolId, filters.schoolId);
    }
    if (filters?.districtId) {
      where.push('s.district_id = ?');
      params.push(filters.districtId);
    }
    if (filters?.search) {
      where.push('(LOWER(t.full_name) LIKE ? OR LOWER(t.employee_code) LIKE ? OR LOWER(t.email) LIKE ? OR LOWER(t.department) LIKE ?)');
      const v = `%${filters.search.toLowerCase()}%`;
      params.push(v, v, v, v);
    }

    return this.db.prepare(`
      SELECT t.*,
        COALESCE(t.school_id, t.school_branch_id) AS school_id,
        COALESCE(s.name, t.school_branch_name) AS school_name,
        s.code AS school_code,
        s.district_id,
        s.district_name
      FROM teachers t
      LEFT JOIN schools s ON s.id = COALESCE(t.school_id, t.school_branch_id)
      WHERE ${where.join(' AND ')}
      ORDER BY t.full_name ASC
    `).all(...params) as any[];
  }

  public updateTeacherSchool(teacherId: string, newSchoolId: string, newSchoolName?: string): any {
    const teacher = this.getTeacherById(teacherId);
    if (!teacher) return null;

    let finalSchoolName = newSchoolName;
    const school = this.getSchoolById(newSchoolId);
    if (school) {
      finalSchoolName = school.name;
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE teachers
      SET school_id = ?, school_branch_id = ?, school_branch_name = ?, updated_at = ?
      WHERE id = ?
    `).run(newSchoolId, newSchoolId, finalSchoolName || 'School Campus', now, teacherId);

    return this.getTeacherById(teacherId);
  }

  public createTeacher(teacher: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    password: string;
    department?: string;
    designation?: string;
    schoolId?: string;
    schoolBranchId?: string;
    schoolBranchName?: string;
    avatarUrl?: string;
    faceEmbedding?: any;
  }): any {
    const now = new Date().toISOString();
    const { hash, salt } = BackendDatabase.hashPassword(teacher.password);
    const hasFace = Boolean(teacher.faceEmbedding);
    const faceJson = teacher.faceEmbedding ? JSON.stringify(teacher.faceEmbedding) : null;
    const finalSchoolId = teacher.schoolId || teacher.schoolBranchId || 'branch-main-01';

    let schoolName = teacher.schoolBranchName;
    if (!schoolName) {
      const sch = this.getSchoolById(finalSchoolId);
      schoolName = sch ? sch.name : 'Metropolitan Science Academy - Main Campus';
    }

    this.db.prepare(`
      INSERT INTO teachers (
        id, employee_code, full_name, email, phone_number,
        password_hash, password_salt, department, designation,
        avatar_url, face_registered, face_embedding_json,
        enrolled_device_id, school_id, school_branch_id, school_branch_name,
        joined_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      teacher.id,
      teacher.employeeCode.trim().toUpperCase(),
      teacher.fullName.trim(),
      teacher.email ? teacher.email.trim().toLowerCase() : null,
      teacher.phoneNumber ? teacher.phoneNumber.trim() : null,
      hash,
      salt,
      teacher.department || 'General Faculty',
      teacher.designation || 'Faculty Member',
      teacher.avatarUrl || null,
      hasFace ? 1 : 0,
      faceJson,
      null,
      finalSchoolId,
      finalSchoolId,
      schoolName || 'Metropolitan Science Academy - Main Campus',
      now.substring(0, 10),
      1,
      now,
      now
    );

    return this.getTeacherById(teacher.id);
  }

  public updateTeacherFace(teacherId: string, faceEmbedding: any): any {
    const now = new Date().toISOString();
    const faceJson = JSON.stringify(faceEmbedding);

    this.db.prepare(`
      UPDATE teachers 
      SET face_registered = 1, face_embedding_json = ?, updated_at = ?
      WHERE id = ?
    `).run(faceJson, now, teacherId);

    return this.getTeacherById(teacherId);
  }

  // ADMIN USERS METHODS
  public getAdminUserByEmail(email: string): AdminUserRecord | null {
    const trimmed = email.trim().toLowerCase();
    const row = this.db.prepare(`
      SELECT * FROM admin_users 
      WHERE LOWER(email) = ? OR LOWER(username) = ? 
      LIMIT 1
    `).get(trimmed, trimmed) as any;
    return row || null;
  }

  public getAdminUserById(id: string): AdminUserRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM admin_users WHERE id = ?
    `).get(id) as any;
    return row || null;
  }

  // ATTENDANCE METHODS WITH JURISDICTION SUPPORT
  public saveAttendanceSync(entry: any, authenticatedTeacherId: string): { success: boolean; status: number; message: string; created?: boolean; record?: any } {
    const record = entry?.attendance;
    const verification = entry?.verification;
    const fail = (status: number, message: string) => ({ success: false, status, message });
    let teacher = this.getTeacherById(authenticatedTeacherId);
    if (!teacher && record.employeeCode) {
      teacher = this.getTeacherByIdentifier(record.employeeCode);
    }
    if (!teacher && entry.teacher) {
      try {
        teacher = this.createTeacher({
          id: entry.teacher.id || authenticatedTeacherId || ('tch-' + crypto.randomUUID()),
          employeeCode: entry.teacher.employeeCode || record.employeeCode,
          fullName: entry.teacher.fullName || 'Faculty Member',
          email: entry.teacher.email || undefined,
          phoneNumber: entry.teacher.phoneNumber || undefined,
          password: 'AutoSyncedTeacher123!',
          department: entry.teacher.department || 'General Faculty',
          designation: entry.teacher.designation || 'Faculty Member',
          schoolId: entry.teacher.schoolId || entry.teacher.schoolBranchId,
          schoolBranchId: entry.teacher.schoolBranchId || entry.teacher.schoolId,
          schoolBranchName: entry.teacher.schoolBranchName,
          faceEmbedding: entry.teacher.faceEmbedding,
        });
      } catch (e) {
        console.warn('[saveAttendanceSync] Auto-registering teacher failed:', e);
      }
    }

    if (!teacher || !teacher.is_active) {
      return fail(403, 'Teacher account is unavailable in database.');
    }
    if (String(teacher.employee_code).toUpperCase() !== String(record.employeeCode).toUpperCase()) {
      return fail(403, 'The attendance record employee code does not match the teacher account.');
    }

    const actualTeacherId = teacher.id;

    if (typeof record.id !== 'string' || !record.id || typeof record.verificationId !== 'string' || !record.verificationId) return fail(400, 'Attendance and verification IDs are required.');
    if (verification.id !== record.verificationId || verification.passed !== true) return fail(400, 'The verification receipt is missing, mismatched, or failed.');
    if (!['CHECK_IN', 'CHECK_OUT'].includes(record.punchType) || !Number.isFinite(Date.parse(record.timestamp))) return fail(400, 'Attendance type or timestamp is invalid.');
    if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude) || !Number.isFinite(record.gpsAccuracyMeters) || record.gpsAccuracyMeters > 50 || record.isInsideGeofence !== true) return fail(400, 'A valid in-campus location fix is required.');
    if (record.verificationStatus !== 'verified' || !Number.isFinite(record.faceMatchScore) || !Number.isFinite(record.livenessScore)) return fail(400, 'Attendance verification fields are invalid.');
    if (verification.faceMatchPassed !== true || verification.geofencePassed !== true || verification.livenessPassed !== true) return fail(400, 'Required face, location, or liveness checks did not pass.');
    const checks = Array.isArray(verification.checks) ? verification.checks : verification.auditMeta?.checks;
    if (!Array.isArray(checks)) return fail(400, 'The per-check verification audit is missing.');
    const required = ['face_identity', 'face_continuity', 'spoken_challenge', 'lip_sync', 'location'];
    for (const id of required) {
      if (!checks.some((check: any) => check?.id === id && (check.status === 'PASS' || check.status === 'BYPASSED'))) return fail(400, `Required verification check did not pass: ${id}.`);
    }
    if (!checks.some((check: any) => check?.id === 'device_integrity' && ['PASS', 'BYPASSED'].includes(check.status))) return fail(400, 'Device integrity check evidence is missing.');
    const existing = this.db.prepare('SELECT * FROM attendance_logs WHERE id = ?').get(record.id) as any;
    if (existing) {
      return { success: true, status: 200, message: 'Already synchronized.', created: false, record: existing };
    }

    const now = new Date().toISOString();
    const date = record.timestamp.slice(0, 10);
    try {
      this.db.exec('BEGIN IMMEDIATE');
      this.db.prepare(`INSERT INTO attendance_logs (
        id, teacher_id, employee_code, date, check_in_time, punch_type, timestamp, status,
        verification_status, latitude, longitude, gps_accuracy, distance_meters, is_inside_geofence,
        verification_id, liveness_score, face_match_score, device_integrity_passed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        record.id, actualTeacherId, teacher.employee_code, date,
        record.punchType === 'CHECK_IN' ? record.timestamp : null,
        record.punchType, record.timestamp, record.status || 'PRESENT', 'verified',
        record.latitude, record.longitude, record.gpsAccuracyMeters, record.distanceFromCampusMeters || 0,
        1, record.verificationId, record.livenessScore, record.faceMatchScore,
        record.deviceIntegrityPassed ? 1 : 0, record.createdAt || now
      );
      this.db.prepare(`INSERT INTO verification_records (
        id, attendance_id, teacher_id, type, liveness_score, face_match_score, location_verified,
        device_verified, liveness_passed, face_match_passed, status, rejection_reason,
        rejection_message, timestamp, meta_json
      ) VALUES (?, ?, ?, 'initial', ?, ?, ?, ?, ?, ?, 'passed', NULL, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET attendance_id = excluded.attendance_id, meta_json = excluded.meta_json`).run(
        verification.id, record.id, actualTeacherId, verification.livenessScore ?? record.livenessScore,
        verification.faceMatchScore ?? record.faceMatchScore, verification.geofencePassed ? 1 : 0,
        verification.deviceIntegrityPassed ? 1 : 0, verification.livenessPassed ? 1 : 0,
        verification.faceMatchPassed ? 1 : 0, verification.timestamp || record.timestamp,
        JSON.stringify({ checks, auditMeta: verification.auditMeta || null })
      );
      this.db.exec('COMMIT');
      const saved = this.db.prepare('SELECT * FROM attendance_logs WHERE id = ?').get(record.id);
      return { success: true, status: 201, message: 'Attendance synchronized.', created: true, record: saved };
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch {}
      return fail(409, error instanceof Error ? error.message : 'Attendance could not be stored.');
    }
  }

  public getAdminAttendance(filters: {
    from?: string;
    to?: string;
    teacher?: string;
    punchType?: string;
    status?: string;
    schoolId?: string;
    districtId?: string;
    limit: number;
    offset: number;
  }): any[] {
    const where: string[] = [];
    const params: any[] = [];

    if (filters.schoolId) {
      where.push('(t.school_id = ? OR t.school_branch_id = ?)');
      params.push(filters.schoolId, filters.schoolId);
    }
    if (filters.districtId) {
      where.push('s.district_id = ?');
      params.push(filters.districtId);
    }
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
      where.push('a.date >= ?');
      params.push(filters.from);
    }
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
      where.push('a.date <= ?');
      params.push(filters.to);
    }
    if (filters.teacher) {
      where.push('(LOWER(t.full_name) LIKE ? OR LOWER(t.employee_code) LIKE ?)');
      const value = `%${filters.teacher.toLowerCase()}%`;
      params.push(value, value);
    }
    if (filters.punchType && ['CHECK_IN', 'CHECK_OUT'].includes(filters.punchType)) {
      where.push('a.punch_type = ?');
      params.push(filters.punchType);
    }
    if (filters.status) {
      where.push('LOWER(a.status) = LOWER(?)');
      params.push(filters.status);
    }

    params.push(filters.limit, filters.offset);

    return this.db.prepare(`
      SELECT a.*, 
        t.full_name AS teacher_name, 
        t.employee_code AS teacher_code,
        t.department AS teacher_department,
        COALESCE(t.school_id, t.school_branch_id) AS school_id,
        COALESCE(s.name, t.school_branch_name) AS school_name,
        s.code AS school_code,
        s.district_id,
        s.district_name,
        v.status AS audit_status, 
        v.meta_json AS verification_meta, 
        v.rejection_reason, 
        v.rejection_message
      FROM attendance_logs a 
      JOIN teachers t ON t.id = a.teacher_id
      LEFT JOIN schools s ON s.id = COALESCE(t.school_id, t.school_branch_id)
      LEFT JOIN verification_records v ON v.id = a.verification_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(...params) as any[];
  }

  public getAdminAttendanceSummary(filters?: { schoolId?: string; districtId?: string }): any {
    const today = new Date().toISOString().slice(0, 10);
    const where: string[] = [];
    const params: any[] = [today, today, today];

    if (filters?.schoolId) {
      where.push('(t.school_id = ? OR t.school_branch_id = ?)');
      params.push(filters.schoolId, filters.schoolId);
    }
    if (filters?.districtId) {
      where.push('s.district_id = ?');
      params.push(filters.districtId);
    }

    return this.db.prepare(`
      SELECT 
        COUNT(a.id) AS totalRecords,
        SUM(CASE WHEN a.date = ? THEN 1 ELSE 0 END) AS todayRecords,
        SUM(CASE WHEN UPPER(a.status) = 'PRESENT' AND a.date = ? THEN 1 ELSE 0 END) AS presentToday,
        SUM(CASE WHEN UPPER(a.status) = 'LATE' AND a.date = ? THEN 1 ELSE 0 END) AS lateToday,
        COUNT(DISTINCT a.teacher_id) AS teachersSeen
      FROM attendance_logs a
      JOIN teachers t ON t.id = a.teacher_id
      LEFT JOIN schools s ON s.id = COALESCE(t.school_id, t.school_branch_id)
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    `).get(...params);
  }

  public createAttendanceLog(log: any): void {
    const now = new Date().toISOString();
    const dateStr = log.date || (log.timestamp ? log.timestamp.substring(0, 10) : now.substring(0, 10));
    const empCode = log.employeeCode || log.employee_code || 'TCH-FACULTY';
    const vId = log.verificationId || log.verification_id || 'v-auto';
    const dist = log.distanceMeters ?? log.distance_meters ?? log.distanceFromCampusMeters ?? 0;
    const gpsAcc = log.gpsAccuracy ?? log.gps_accuracy ?? log.gpsAccuracyMeters ?? null;

    this.db.prepare(`
      INSERT OR REPLACE INTO attendance_logs (
        id, teacher_id, employee_code, date, check_in_time, punch_type,
        timestamp, status, verification_status, latitude, longitude,
        gps_accuracy, distance_meters, is_inside_geofence, verification_id,
        liveness_score, face_match_score, device_integrity_passed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id ?? '',
      log.teacherId || log.teacher_id || 'tch-unknown',
      empCode,
      dateStr,
      log.checkInTime || log.check_in_time || null,
      log.punchType || log.punch_type || 'CHECK_IN',
      log.timestamp || now,
      log.status || 'PRESENT',
      log.verificationStatus || log.verification_status || 'verified',
      log.latitude ?? 0,
      log.longitude ?? 0,
      gpsAcc ?? null,
      dist ?? 0,
      log.isInsideGeofence ? 1 : 0,
      vId,
      log.livenessScore ?? log.liveness_score ?? null,
      log.faceMatchScore ?? log.face_match_score ?? null,
      log.deviceIntegrityPassed !== false ? 1 : 0,
      log.createdAt || log.created_at || now
    );
  }

  public getTodayAttendance(teacherId: string, employeeCode?: string): { checkIn?: any; checkOut?: any } {
    const todayUtc = new Date().toISOString().substring(0, 10);
    const rows = this.db.prepare(`
      SELECT * FROM attendance_logs 
      WHERE (teacher_id = ? OR employee_code = ?)
        AND (date = ? OR date = date('now') OR timestamp LIKE ? || '%')
      ORDER BY timestamp ASC
    `).all(teacherId, employeeCode || teacherId, todayUtc, todayUtc) as any[];

    const checkIn = rows.find(r => r.punch_type === 'CHECK_IN');
    const checkOut = rows.find(r => r.punch_type === 'CHECK_OUT');
    return { checkIn, checkOut };
  }

  public getAttendanceHistory(teacherId: string, employeeCode?: string): any[] {
    return this.db.prepare(`
      SELECT * FROM attendance_logs 
      WHERE teacher_id = ? OR employee_code = ?
      ORDER BY timestamp DESC
    `).all(teacherId, employeeCode || teacherId) as any[];
  }

  public createVerificationRecord(record: any): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO verification_records (
        id, attendance_id, teacher_id, type, liveness_score, face_match_score,
        location_verified, device_verified, liveness_passed, face_match_passed,
        status, rejection_reason, rejection_message, timestamp, meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.attendanceId || null,
      record.teacherId,
      record.type || 'initial',
      record.livenessScore || null,
      record.faceMatchScore || null,
      record.locationVerified ? 1 : 0,
      record.deviceVerified ? 1 : 0,
      record.livenessPassed ? 1 : 0,
      record.faceMatchPassed ? 1 : 0,
      record.status,
      record.rejectionReason || null,
      record.rejectionMessage || null,
      record.timestamp,
      record.metaJson ? JSON.stringify(record.metaJson) : null
    );
  }

  public saveOtp(phoneNumber: string, code: string, validSeconds: number = 300): void {
    const expiresAt = new Date(Date.now() + validSeconds * 1000).toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO otps (phone_number, otp_code, expires_at)
      VALUES (?, ?, ?)
    `).run(phoneNumber, code, expiresAt);
  }

  public verifyOtp(phoneNumber: string, code: string): boolean {
    const row: any = this.db.prepare(`
      SELECT * FROM otps WHERE phone_number = ? LIMIT 1
    `).get(phoneNumber);

    if (!row) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;
    return row.otp_code === code;
  }
}

export const backendDb = new BackendDatabase();
