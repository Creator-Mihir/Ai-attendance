import { create } from 'zustand';
import { TeacherProfile } from '../types/teacher';

interface TeacherStoreState {
  profile: TeacherProfile | null;
  isLoading: boolean;
  setProfile: (profile: TeacherProfile) => void;
  registerFace: (angles: ('FRONT' | 'LEFT' | 'RIGHT' | 'UP')[]) => Promise<boolean>;
}

export const useTeacherStore = create<TeacherStoreState>((set) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  registerFace: async (angles) => {
    void angles;
    set({ isLoading: false });
    // Registration must receive a vector from a real on-device face model.
    return false;
  }
}));

export default useTeacherStore;
