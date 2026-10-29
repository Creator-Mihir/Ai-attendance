import { createClient, Client } from '@libsql/client';
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
  public client: Client;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(filePath?: string) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && !filePath) {
      this.client = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      });
    } else {
      this.client = createClient({
        url: `file:${filePath || DB_FILE}`,
      });
    }
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await this.initTables();
      await this.seedDefaultSchoolsAndAdmins();
      await this.seedDefaultTeacher();
      this.initialized = true;
    })();

    return this.initPromise;
  }

  public async all<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    await this.init();
    const res = await this.client.execute({ sql, args });
    return res.rows as unknown as T[];
  }

  public async get<T = any>(sql: string, args: any[] = []): Promise<T | null> {
    await this.init();
    const res = await this.client.execute({ sql, args });
    return (res.rows[0] as unknown as T) || null;
  }

  public async run(sql: string, args: any[] = []): Promise<void> {
    await this.init();
    await this.client.execute({ sql, args });
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

  private async initTables(): Promise<void> {
    await this.client.execute(`
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
    `);

    await this.client.execute(`
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
    `);

    await this.client.execute(`
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
    `);

    await this.client.execute(`
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
    `);

    await this.client.execute(`
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
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS otps (
        phone_number TEXT PRIMARY KEY,
        otp_code TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);

    // Schema migration check for school_id
    try {
      const res = await this.client.execute("PRAGMA table_info(teachers)");
      const teacherColumns = res.rows as any[];
      const hasSchoolId = teacherColumns.some((col) => col.name === 'school_id');
      if (!hasSchoolId) {
        await this.client.execute("ALTER TABLE teachers ADD COLUMN school_id TEXT;");
      }
      await this.client.execute("UPDATE teachers SET school_id = school_branch_id WHERE school_id IS NULL OR school_id = '';");
    } catch (e) {
      console.error('[DB] Migration verification error:', e);
    }
  }

  public async seedDefaultSchoolsAndAdmins(): Promise<void> {
    const now = new Date().toISOString();

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

    for (const sch of schoolsToSeed) {
      await this.client.execute({
        sql: `INSERT OR IGNORE INTO schools (
          id, code, name, district_id, district_name, state,
          latitude, longitude, radius_meters, address, principal_name,
          contact_email, contact_phone, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          sch.id, sch.code, sch.name, sch.district_id, sch.district_name, sch.state,
          sch.latitude, sch.longitude, sch.radius_meters, sch.address, sch.principal_name,
          sch.contact_email, sch.contact_phone, now, now,
        ],
      });
    }

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
      const existing = await this.client.execute({
        sql: 'SELECT id FROM admin_users WHERE email = ?',
        args: [adm.email],
      });
      if (!existing.rows.length) {
        const { hash, salt } = BackendDatabase.hashPassword(adm.password);
        await this.client.execute({
          sql: `INSERT INTO admin_users (
            id, username, email, password_hash, password_salt,
            full_name, role, jurisdiction_district_id, jurisdiction_school_id,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          args: [
            adm.id, adm.username, adm.email, hash, salt,
            adm.fullName, adm.role, adm.jurisdiction_district_id, adm.jurisdiction_school_id,
            now, now,
          ],
        });
      }
    }
  }

  private async seedDefaultTeacher(): Promise<void> {
    const existing = await this.client.execute({
      sql: 'SELECT id FROM teachers WHERE employee_code = ?',
      args: ['TCH-1042'],
    });
    const now = new Date().toISOString();

    if (!existing.rows.length) {
      const { hash, salt } = BackendDatabase.hashPassword('password123');
      const seedFaceEmbedding = {
        version: 'MobileFaceNet-Offline-v2.1',
        vector: [0.35, -0.12, 0.78, 0.44, -0.25, 0.61, 0.18, -0.52],
        anglesCaptured: ['FRONT', 'LEFT', 'RIGHT', 'UP'],
        enrolledAt: '2026-01-15T09:00:00.000Z',
        qualityScore: 0.98,
      };

      await this.client.execute({
        sql: `INSERT INTO teachers (
          id, employee_code, full_name, email, phone_number,
          password_hash, password_salt, department, designation,
          avatar_url, face_registered, face_embedding_json,
          enrolled_device_id, school_id, school_branch_id, school_branch_name,
          joined_date, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
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
          now,
        ],
      });
    }

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
      const exists = await this.client.execute({
        sql: 'SELECT id FROM teachers WHERE employee_code = ?',
        args: [f.code],
      });
      if (!exists.rows.length) {
        const { hash, salt } = BackendDatabase.hashPassword('password123');
        await this.client.execute({
          sql: `INSERT INTO teachers (
            id, employee_code, full_name, email, phone_number,
            password_hash, password_salt, department, designation,
            avatar_url, face_registered, face_embedding_json,
            enrolled_device_id, school_id, school_branch_id, school_branch_name,
            joined_date, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?, ?, ?, '2023-01-10', 1, ?, ?)`,
          args: [
            f.id, f.code, f.name, f.email, f.phone,
            hash, salt, f.dept, f.desig,
            null, f.schoolId, f.schoolId, f.schoolName, now, now,
          ],
        });
      }
    }
  }

  // SCHOOLS METHODS
  public async getSchools(filters?: { districtId?: string; search?: string }): Promise<any[]> {
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

    return this.all(`
      SELECT s.*,
        (SELECT COUNT(*) FROM teachers t WHERE COALESCE(t.school_id, t.school_branch_id) = s.id AND t.is_active = 1) AS teacher_count
      FROM schools s
      WHERE ${where.join(' AND ')}
      ORDER BY s.district_name ASC, s.name ASC
    `, params);
  }

  public async getSchoolById(id: string): Promise<any> {
    return this.get(`
      SELECT s.*,
        (SELECT COUNT(*) FROM teachers t WHERE COALESCE(t.school_id, t.school_branch_id) = s.id AND t.is_active = 1) AS teacher_count
      FROM schools s
      WHERE s.id = ?
    `, [id]);
  }

  public async createSchool(data: {
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
  }): Promise<any> {
    const id = data.id || 'sch-' + crypto.randomUUID();
    const now = new Date().toISOString();
    await this.run(`
      INSERT INTO schools (
        id, code, name, district_id, district_name, state,
        latitude, longitude, radius_meters, address, principal_name,
        contact_email, contact_phone, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
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
      now,
    ]);
    return this.getSchoolById(id);
  }

  public async updateSchool(id: string, updates: {
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
  }): Promise<any> {
    const existing = await this.getSchoolById(id);
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

    await this.run(`
      UPDATE schools
      SET name = ?, code = ?, district_id = ?, district_name = ?, state = ?,
          latitude = ?, longitude = ?, radius_meters = ?, address = ?,
          principal_name = ?, contact_email = ?, contact_phone = ?, is_active = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      name, code, districtId, districtName, state,
      latitude, longitude, radiusMeters, address,
      principalName, contactEmail, contactPhone, isActive,
      now, id,
    ]);

    return this.getSchoolById(id);
  }

  public async updateSchoolCoordinates(id: string, latitude: number, longitude: number, radiusMeters: number): Promise<any> {
    const existing = await this.getSchoolById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    await this.run(`
      UPDATE schools
      SET latitude = ?, longitude = ?, radius_meters = ?, updated_at = ?
      WHERE id = ?
    `, [latitude, longitude, radiusMeters, now, id]);

    return this.getSchoolById(id);
  }

  public async getDistricts(): Promise<any[]> {
    return this.all(`
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
    `);
  }

  // TEACHER METHODS
  public async getTeacherById(id: string): Promise<any> {
    return this.get(`
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
    `, [id]);
  }

  public async getTeacherByIdentifier(identifier: string): Promise<any> {
    const trimmed = identifier.trim().toLowerCase();
    return this.get(`
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
    `, [trimmed, trimmed, identifier.trim()]);
  }

  public async getTeachers(filters?: { schoolId?: string; districtId?: string; search?: string }): Promise<any[]> {
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

    return this.all(`
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
    `, params);
  }

  public async updateTeacherSchool(teacherId: string, newSchoolId: string, newSchoolName?: string): Promise<any> {
    const teacher = await this.getTeacherById(teacherId);
    if (!teacher) return null;

    let finalSchoolName = newSchoolName;
    const school = await this.getSchoolById(newSchoolId);
    if (school) {
      finalSchoolName = school.name;
    }

    const now = new Date().toISOString();
    await this.run(`
      UPDATE teachers
      SET school_id = ?, school_branch_id = ?, school_branch_name = ?, updated_at = ?
      WHERE id = ?
    `, [newSchoolId, newSchoolId, finalSchoolName || 'School Campus', now, teacherId]);

    return this.getTeacherById(teacherId);
  }

  public async createTeacher(teacher: {
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
  }): Promise<any> {
    const now = new Date().toISOString();
    const { hash, salt } = BackendDatabase.hashPassword(teacher.password);
    const hasFace = Boolean(teacher.faceEmbedding);
    const faceJson = teacher.faceEmbedding ? JSON.stringify(teacher.faceEmbedding) : null;
    const finalSchoolId = teacher.schoolId || teacher.schoolBranchId || 'branch-main-01';

    let schoolName = teacher.schoolBranchName;
    if (!schoolName) {
      const sch = await this.getSchoolById(finalSchoolId);
      schoolName = sch ? sch.name : 'Metropolitan Science Academy - Main Campus';
    }

    await this.run(`
      INSERT INTO teachers (
        id, employee_code, full_name, email, phone_number,
        password_hash, password_salt, department, designation,
        avatar_url, face_registered, face_embedding_json,
        enrolled_device_id, school_id, school_branch_id, school_branch_name,
        joined_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      now,
    ]);

    return this.getTeacherById(teacher.id);
  }

  public async updateTeacherFace(teacherId: string, faceEmbedding: any): Promise<any> {
    const now = new Date().toISOString();
    const faceJson = JSON.stringify(faceEmbedding);

    await this.run(`
      UPDATE teachers 
      SET face_registered = 1, face_embedding_json = ?, updated_at = ?
      WHERE id = ?
    `, [faceJson, now, teacherId]);

    return this.getTeacherById(teacherId);
  }

  // ADMIN USERS METHODS
  public async getAdminUserByEmail(email: string): Promise<AdminUserRecord | null> {
    const trimmed = email.trim().toLowerCase();
    return this.get(`
      SELECT * FROM admin_users 
      WHERE LOWER(email) = ? OR LOWER(username) = ? 
      LIMIT 1
    `, [trimmed, trimmed]);
  }

  public async getAdminUserById(id: string): Promise<AdminUserRecord | null> {
    return this.get(`
      SELECT * FROM admin_users WHERE id = ?
    `, [id]);
  }

  // ATTENDANCE METHODS WITH JURISDICTION SUPPORT
  public async saveAttendanceSync(entry: any, authenticatedTeacherId: string): Promise<{ success: boolean; status: number; message: string; created?: boolean; record?: any }> {
    const record = entry?.attendance;
    const verification = entry?.verification;
    const fail = (status: number, message: string) => ({ success: false, status, message });
    let teacher = await this.getTeacherById(authenticatedTeacherId);
    if (!teacher && record?.employeeCode) {
      teacher = await this.getTeacherByIdentifier(record.employeeCode);
    }
    if (!teacher && entry?.teacher) {
      try {
        teacher = await this.createTeacher({
          id: entry.teacher.id || authenticatedTeacherId || ('tch-' + crypto.randomUUID()),
          employeeCode: entry.teacher.employeeCode || record?.employeeCode,
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
    if (String(teacher.employee_code).toUpperCase() !== String(record?.employeeCode).toUpperCase()) {
      return fail(403, 'The attendance record employee code does not match the teacher account.');
    }

    const actualTeacherId = teacher.id;

    if (typeof record.id !== 'string' || !record.id || typeof record.verificationId !== 'string' || !record.verificationId) return fail(400, 'Attendance and verification IDs are required.');
    if (verification?.id !== record.verificationId || verification?.passed !== true) return fail(400, 'The verification receipt is missing, mismatched, or failed.');
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
    
    const existing = await this.get('SELECT * FROM attendance_logs WHERE id = ?', [record.id]);
    if (existing) {
      return { success: true, status: 200, message: 'Already synchronized.', created: false, record: existing };
    }

    const now = new Date().toISOString();
    const date = record.timestamp.slice(0, 10);
    try {
      await this.client.batch([
        {
          sql: `INSERT INTO attendance_logs (
            id, teacher_id, employee_code, date, check_in_time, punch_type, timestamp, status,
            verification_status, latitude, longitude, gps_accuracy, distance_meters, is_inside_geofence,
            verification_id, liveness_score, face_match_score, device_integrity_passed, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            record.id, actualTeacherId, teacher.employee_code, date,
            record.punchType === 'CHECK_IN' ? record.timestamp : null,
            record.punchType, record.timestamp, record.status || 'PRESENT', 'verified',
            record.latitude, record.longitude, record.gpsAccuracyMeters, record.distanceFromCampusMeters || 0,
            1, record.verificationId, record.livenessScore, record.faceMatchScore,
            record.deviceIntegrityPassed ? 1 : 0, record.createdAt || now,
          ],
        },
        {
          sql: `INSERT INTO verification_records (
            id, attendance_id, teacher_id, type, liveness_score, face_match_score, location_verified,
            device_verified, liveness_passed, face_match_passed, status, rejection_reason,
            rejection_message, timestamp, meta_json
          ) VALUES (?, ?, ?, 'initial', ?, ?, ?, ?, ?, ?, 'passed', NULL, NULL, ?, ?)
          ON CONFLICT(id) DO UPDATE SET attendance_id = excluded.attendance_id, meta_json = excluded.meta_json`,
          args: [
            verification.id, record.id, actualTeacherId, verification.livenessScore ?? record.livenessScore,
            verification.faceMatchScore ?? record.faceMatchScore, verification.geofencePassed ? 1 : 0,
            verification.deviceIntegrityPassed ? 1 : 0, verification.livenessPassed ? 1 : 0,
            verification.faceMatchPassed ? 1 : 0, verification.timestamp || record.timestamp,
            JSON.stringify({ checks, auditMeta: verification.auditMeta || null }),
          ],
        },
      ]);
      const saved = await this.get('SELECT * FROM attendance_logs WHERE id = ?', [record.id]);
      return { success: true, status: 201, message: 'Attendance synchronized.', created: true, record: saved };
    } catch (error) {
      return fail(409, error instanceof Error ? error.message : 'Attendance could not be stored.');
    }
  }

  public async getAdminAttendance(filters: {
    from?: string;
    to?: string;
    teacher?: string;
    punchType?: string;
    status?: string;
    schoolId?: string;
    districtId?: string;
    limit: number;
    offset: number;
  }): Promise<any[]> {
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

    return this.all(`
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
    `, params);
  }

  public async getAdminAttendanceSummary(filters?: { schoolId?: string; districtId?: string }): Promise<any> {
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

    return this.get(`
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
    `, params);
  }

  public async createAttendanceLog(log: any): Promise<void> {
    const now = new Date().toISOString();
    const dateStr = log.date || (log.timestamp ? log.timestamp.substring(0, 10) : now.substring(0, 10));
    const empCode = log.employeeCode || log.employee_code || 'TCH-FACULTY';
    const vId = log.verificationId || log.verification_id || 'v-auto';
    const dist = log.distanceMeters ?? log.distance_meters ?? log.distanceFromCampusMeters ?? 0;
    const gpsAcc = log.gpsAccuracy ?? log.gps_accuracy ?? log.gpsAccuracyMeters ?? null;

    await this.run(`
      INSERT OR REPLACE INTO attendance_logs (
        id, teacher_id, employee_code, date, check_in_time, punch_type,
        timestamp, status, verification_status, latitude, longitude,
        gps_accuracy, distance_meters, is_inside_geofence, verification_id,
        liveness_score, face_match_score, device_integrity_passed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      log.createdAt || log.created_at || now,
    ]);
  }

  public async getTodayAttendance(teacherId: string, employeeCode?: string): Promise<{ checkIn?: any; checkOut?: any }> {
    const todayUtc = new Date().toISOString().substring(0, 10);
    const rows = await this.all(`
      SELECT * FROM attendance_logs 
      WHERE (teacher_id = ? OR employee_code = ?)
        AND (date = ? OR date = date('now') OR timestamp LIKE ? || '%')
      ORDER BY timestamp ASC
    `, [teacherId, employeeCode || teacherId, todayUtc, todayUtc]);

    const checkIn = rows.find(r => r.punch_type === 'CHECK_IN');
    const checkOut = rows.find(r => r.punch_type === 'CHECK_OUT');
    return { checkIn, checkOut };
  }

  public async getAttendanceHistory(teacherId: string, employeeCode?: string): Promise<any[]> {
    return this.all(`
      SELECT * FROM attendance_logs 
      WHERE teacher_id = ? OR employee_code = ?
      ORDER BY timestamp DESC
    `, [teacherId, employeeCode || teacherId]);
  }

  public async createVerificationRecord(record: any): Promise<void> {
    await this.run(`
      INSERT OR REPLACE INTO verification_records (
        id, attendance_id, teacher_id, type, liveness_score, face_match_score,
        location_verified, device_verified, liveness_passed, face_match_passed,
        status, rejection_reason, rejection_message, timestamp, meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      record.metaJson ? JSON.stringify(record.metaJson) : null,
    ]);
  }

  public async saveOtp(phoneNumber: string, code: string, validSeconds: number = 300): Promise<void> {
    const expiresAt = new Date(Date.now() + validSeconds * 1000).toISOString();
    await this.run(`
      INSERT OR REPLACE INTO otps (phone_number, otp_code, expires_at)
      VALUES (?, ?, ?)
    `, [phoneNumber, code, expiresAt]);
  }

  public async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const row = await this.get(`
      SELECT * FROM otps WHERE phone_number = ? LIMIT 1
    `, [phoneNumber]);

    if (!row) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;
    return row.otp_code === code;
  }
}

export const backendDb = new BackendDatabase();
