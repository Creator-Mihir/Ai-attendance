import { create } from 'zustand';
import { TeacherProfile } from '../types/teacher';
import { TeacherRepository } from '../database/repositories/teacher.repository';
import { apiClient } from '../api/client';
import { RegisterTeacherRequest } from '../api/types';
import { LocationService } from '../services/location.service';

function syncCampusCoordinates(teacher: TeacherProfile | null) {
  if (teacher) {
    const campus = teacher.schoolCampus || (teacher.schoolLatitude !== undefined ? {
      id: teacher.schoolId || teacher.schoolBranchId,
      name: teacher.schoolBranchName,
      latitude: teacher.schoolLatitude,
      longitude: teacher.schoolLongitude,
      radiusMeters: teacher.schoolRadiusMeters,
    } : null);
    LocationService.setActiveCampus(campus);
  } else {
    LocationService.setActiveCampus(null);
  }
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  teacher: TeacherProfile | null;
  isLoading: boolean;
  error: string | null;

  login: (identifier: string, password?: string) => Promise<boolean>;
  register: (data: RegisterTeacherRequest) => Promise<boolean>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
  updateTeacher: (teacher: TeacherProfile) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  teacher: null,
  isLoading: false,
  error: null,

  login: async (identifier: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.login({ identifier, password });
      const teacher = res.data.teacher;
      const serverToken = res.data.token.startsWith('local-') || res.data.token.startsWith('offline-') || res.data.token.startsWith('mock-') ? null : res.data.token;
      apiClient.setAuthToken(serverToken);
      await TeacherRepository.setAuthToken(serverToken);
      await TeacherRepository.save(teacher);
      await TeacherRepository.setCurrentTeacher(teacher.id);
      syncCampusCoordinates(teacher);

      set({
        isAuthenticated: true,
        token: res.data.token,
        teacher,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' });
      return false;
    }
  },

  register: async (data: RegisterTeacherRequest) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.register(data);
      const teacher = res.data.teacher;
      const serverToken = res.data.token.startsWith('local-') || res.data.token.startsWith('offline-') || res.data.token.startsWith('mock-') ? null : res.data.token;
      apiClient.setAuthToken(serverToken);
      await TeacherRepository.setAuthToken(serverToken);
      await TeacherRepository.save(teacher);
      await TeacherRepository.setCurrentTeacher(teacher.id);
      syncCampusCoordinates(teacher);

      set({
        isAuthenticated: true,
        token: res.data.token,
        teacher,
        isLoading: false,
      });

      // Trigger background sync to ensure server receives profile
      try {
        const { syncManager } = await import('../sync/sync-manager');
        syncManager.triggerSync().catch(() => {});
      } catch {}

      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registration failed' });
      return false;
    }
  },

  verifyOtp: async (phoneNumber: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.verifyOtp({ phoneNumber, otp });
      const teacher = res.data.teacher;
      const serverToken = res.data.token.startsWith('local-') || res.data.token.startsWith('offline-') || res.data.token.startsWith('mock-') ? null : res.data.token;
      apiClient.setAuthToken(serverToken);
      await TeacherRepository.setAuthToken(serverToken);
      await TeacherRepository.save(teacher);
      await TeacherRepository.setCurrentTeacher(teacher.id);
      syncCampusCoordinates(teacher);

      set({
        isAuthenticated: true,
        token: res.data.token,
        teacher,
        isLoading: false,
      });

      try {
        const { syncManager } = await import('../sync/sync-manager');
        syncManager.triggerSync().catch(() => {});
      } catch {}

      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'OTP verification failed' });
      return false;
    }
  },

  logout: async () => {
    await TeacherRepository.clearCurrentTeacher();
    await TeacherRepository.setAuthToken(null);
    apiClient.setAuthToken(null);
    syncCampusCoordinates(null);
    set({
      isAuthenticated: false,
      token: null,
      teacher: null,
      error: null,
    });
  },

  loadStoredSession: async () => {
    try {
      const teacher = await TeacherRepository.getCurrentTeacher();
      if (teacher) {
        const token = await TeacherRepository.getAuthToken();
        apiClient.setAuthToken(token);
        syncCampusCoordinates(teacher);
        set({
          isAuthenticated: true,
          token,
          teacher,
        });

        // Trigger sync when app loads with active session
        try {
          const { syncManager } = await import('../sync/sync-manager');
          syncManager.triggerSync().catch(() => {});
        } catch {}
      }
    } catch {
      // No session
    }
  },

  updateTeacher: async (teacher: TeacherProfile) => {
    await TeacherRepository.save(teacher);
    syncCampusCoordinates(teacher);
    set({ teacher });

    try {
      const { SyncQueue } = await import('../sync/sync-queue');
      await SyncQueue.pushTeacher(teacher);
      const { syncManager } = await import('../sync/sync-manager');
      syncManager.triggerSync().catch(() => {});
    } catch {}
  },
}));

export default useAuthStore;
