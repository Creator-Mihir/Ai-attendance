export const DATABASE_NAME = 'teacher_attendance.db';
export const DATABASE_VERSION = 1;

export const SCHEMA = {
  version: DATABASE_VERSION,
  tables: {
    teachers: `
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        employee_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        phone_number TEXT,
        department TEXT,
        designation TEXT,
        avatar_url TEXT,
        face_registered INTEGER NOT NULL DEFAULT 0,
        face_embedding_json TEXT,
        enrolled_device_id TEXT,
        school_id TEXT NOT NULL,
        school_branch_id TEXT NOT NULL,
        school_branch_name TEXT,
        joined_date TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
    attendanceLogs: `
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
        sync_status TEXT NOT NULL DEFAULT 'PENDING',
        sync_attempts INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT,
        last_sync_error TEXT,
        created_at TEXT NOT NULL
      );
    `,
    verificationRecords: `
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
    `,
    syncQueue: `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL DEFAULT 'CREATE',
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 5,
        last_attempt_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL
      );
    `,
    appKeyValues: `
      CREATE TABLE IF NOT EXISTS app_key_values (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  },
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_teachers_emp_code ON teachers (employee_code);`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date ON attendance_logs (teacher_id, date);`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_sync_status ON attendance_logs (sync_status);`,
    `CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs (timestamp);`,
    `CREATE INDEX IF NOT EXISTS idx_verification_attendance ON verification_records (attendance_id);`,
    `CREATE INDEX IF NOT EXISTS idx_verification_teacher ON verification_records (teacher_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status, created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue (entity_id);`
  ]
};

export default SCHEMA;
