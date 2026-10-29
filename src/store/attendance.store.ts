import { create } from 'zustand';
import { AttendanceRecord, AttendanceSummary, AttendanceStats, PunchType } from '../types/attendance';
import { AttendanceService, MarkAttendanceResult } from '../services/attendance.service';
import { TeacherProfile } from '../types/teacher';
import { LocationVerificationResult } from '../types/location';
import { VerificationResult } from '../types/verification';

interface AttendanceStoreState {
  todayCheckIn?: AttendanceRecord;
  todayCheckOut?: AttendanceRecord;
  history: AttendanceSummary[];
  stats: AttendanceStats | null;
  isLoading: boolean;
  isMarking: boolean;
  error: string | null;

  loadTodayStatus: (teacherId: string) => Promise<void>;
  loadHistory: (teacherId: string) => Promise<void>;
  loadStats: (teacherId: string) => Promise<void>;
  markAttendance: (params: {
    teacher: TeacherProfile;
    punchType: PunchType;
    locationResult: LocationVerificationResult;
    verificationResult: VerificationResult;
  }) => Promise<MarkAttendanceResult>;
}

export const useAttendanceStore = create<AttendanceStoreState>((set, get) => ({
  todayCheckIn: undefined,
  todayCheckOut: undefined,
  history: [],
  stats: null,
  isLoading: false,
  isMarking: false,
  error: null,

  loadTodayStatus: async (teacherId: string, employeeCode?: string) => {
    try {
      const today = await AttendanceService.getTodayStatus(teacherId, employeeCode);
      set({ todayCheckIn: today.checkIn, todayCheckOut: today.checkOut });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  loadHistory: async (teacherId: string, employeeCode?: string) => {
    set({ isLoading: true });
    try {
      const summaries = await AttendanceService.getDailySummaries(teacherId, employeeCode);
      set({ history: summaries, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  loadStats: async (teacherId: string) => {
    try {
      const stats = await AttendanceService.getStats(teacherId);
      set({ stats });
    } catch {
      // Ignore
    }
  },

  markAttendance: async (params) => {
    set({ isMarking: true, error: null });
    try {
      const result = await AttendanceService.markAttendance(params);
      if (result.success && result.record) {
        if (params.punchType === 'CHECK_IN') {
          set({ todayCheckIn: result.record });
        } else {
          set({ todayCheckOut: result.record });
        }
        await get().loadHistory(params.teacher.id);
        await get().loadStats(params.teacher.id);
      }
      set({ isMarking: false });
      return result;
    } catch (err: any) {
      set({ isMarking: false, error: err.message });
      return { success: false, rejectionMessage: err.message };
    }
  }
}));

export default useAttendanceStore;
