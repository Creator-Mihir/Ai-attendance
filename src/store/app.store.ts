import { create } from 'zustand';

interface AppState {
  isInitialized: boolean;
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  setInitialized: (init: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useAppStore = create<AppState>((set) => ({
  isInitialized: false,
  theme: 'dark',
  notificationsEnabled: true,
  setInitialized: (isInitialized) => set({ isInitialized }),
  setTheme: (theme) => set({ theme }),
}));

export default useAppStore;
