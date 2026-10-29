import { TeacherProfile } from '../../types/teacher';

export class TeacherDomain {
  public static isProfileComplete(teacher: TeacherProfile | null): boolean {
    if (!teacher) return false;
    return Boolean(
      teacher.employeeCode &&
      teacher.fullName &&
      teacher.department &&
      teacher.faceRegistered
    );
  }

  public static getInitials(name: string): string {
    if (!name) return 'TA';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }
}
