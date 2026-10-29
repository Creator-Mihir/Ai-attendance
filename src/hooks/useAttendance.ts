import { useEffect } from 'react';
import { useAttendanceStore } from '../store/attendance.store';
import { useAuthStore } from '../store/auth.store';

export function useAttendance() {
  const { teacher } = useAuthStore();
  const store = useAttendanceStore();

  useEffect(() => {
    if (teacher?.id) {
      store.loadTodayStatus(teacher.id);
      store.loadHistory(teacher.id);
      store.loadStats(teacher.id);
    }
  }, [teacher?.id, teacher?.employeeCode]);

  return {
    ...store,
    teacher,
  };
}

export default useAttendance;
