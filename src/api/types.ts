import { TeacherProfile } from '../types/teacher';
import { AttendanceRecord } from '../types/attendance';
import { BatchSyncResponse } from '../types/sync';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface LoginRequest {
  identifier: string; // email, employee code, or phone
  password?: string;
  schoolBranchId?: string;
}

export interface RegisterTeacherRequest {
  fullName: string;
  employeeCode: string;
  email: string;
  phoneNumber?: string;
  password: string;
  department?: string;
  designation?: string;
  schoolBranchId?: string;
  schoolBranchName?: string;
  avatarUrl?: string;
  faceEmbedding?: any;
}

export interface OtpSendRequest {
  phoneNumber: string;
}

export interface OtpVerifyRequest {
  phoneNumber: string;
  otp: string;
}

export interface FaceRegistrationRequest {
  teacherId: string;
  faceEmbeddingVector: number[];
  anglesCaptured?: ('FRONT' | 'LEFT' | 'RIGHT' | 'UP')[];
  qualityScore?: number;
}
