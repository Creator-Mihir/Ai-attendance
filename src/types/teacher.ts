export interface FaceEmbedding {
  version: string;
  vector: number[];
  /** Count of distinct camera captures used to make the enrolled template. */
  sampleCount?: number;
  /** Legacy metadata only; the current face runtime does not report head pose. */
  anglesCaptured?: ('FRONT' | 'LEFT' | 'RIGHT' | 'UP')[];
  enrolledAt: string;
  /** Only present when the active model provides a measured quality value. */
  qualityScore?: number;
}

export interface TeacherProfile {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  avatarUrl?: string;
  faceRegistered: boolean;
  faceEmbedding?: FaceEmbedding;
  enrolledDeviceId?: string;
  schoolId?: string;
  schoolBranchId: string;
  schoolBranchName: string;
  schoolLatitude?: number;
  schoolLongitude?: number;
  schoolRadiusMeters?: number;
  schoolCampus?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    allowedToleranceMeters?: number;
  };
  districtId?: string;
  districtName?: string;
  joinedDate: string;
  isActive: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  expiresAt: string;
  teacher: TeacherProfile;
}
