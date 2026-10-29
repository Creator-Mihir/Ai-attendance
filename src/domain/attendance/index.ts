import { AttendanceRecord, PunchType, AttendanceStatusType } from '../../types/attendance';
import { isTimeLate } from '../../utils/date';

export class AttendanceEntity {
  public static determineStatus(punchType: PunchType, timestampIso: string): AttendanceStatusType {
    if (punchType === 'CHECK_OUT') {
      return 'PRESENT';
    }
    const isLate = isTimeLate(timestampIso);
    return isLate ? 'LATE' : 'PRESENT';
  }

  public static canPunch(
    punchType: PunchType,
    existingPunches: { checkIn?: AttendanceRecord; checkOut?: AttendanceRecord }
  ): { allowed: boolean; reason?: string } {
    if (punchType === 'CHECK_IN') {
      if (existingPunches.checkIn) {
        return { allowed: false, reason: 'You have already checked in for today.' };
      }
      return { allowed: true };
    }

    if (punchType === 'CHECK_OUT') {
      if (!existingPunches.checkIn) {
        return { allowed: false, reason: 'You must check in before checking out.' };
      }
      if (existingPunches.checkOut) {
        return { allowed: false, reason: 'You have already checked out for today.' };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }
}
