import { User } from './types';

// Mock user database
const USERS_DB: Record<string, User> = {
  'usr_student_01': {
    id: 'usr_student_01',
    name: 'Alice Smith',
    email: 'alice.smith@university.edu',
    role: 'Student',
    department: 'Computer Science',
    timetable: [
      { courseCode: 'CS101', courseName: 'Data Structures', timeSlot: 'Mon 09:00-10:30', room: 'Hall A' },
      { courseCode: 'CS204', courseName: 'Database Systems', timeSlot: 'Tue 11:00-12:30', room: 'Lab 2' },
      { courseCode: 'CS305', courseName: 'AI Agent Architecture', timeSlot: 'Thu 14:00-15:30', room: 'Auditorium 1' }
    ]
  },
  'usr_student_02': {
    id: 'usr_student_02',
    name: 'Bob Jones',
    email: 'bob.jones@university.edu',
    role: 'Student',
    department: 'Electrical Engineering',
    timetable: [
      { courseCode: 'EE102', courseName: 'Circuit Analysis', timeSlot: 'Mon 11:00-12:30', room: 'Hall B' },
      { courseCode: 'EE210', courseName: 'Signals & Systems', timeSlot: 'Wed 14:00-15:30', room: 'Lab 4' }
    ]
  },
  'usr_faculty_01': {
    id: 'usr_faculty_01',
    name: 'Dr. Evelyn Reed',
    email: 'evelyn.reed@university.edu',
    role: 'Faculty',
    department: 'Computer Science',
    timetable: [
      { courseCode: 'CS305', courseName: 'AI Agent Architecture', timeSlot: 'Thu 14:00-15:30', room: 'Auditorium 1' }
    ]
  }
};

export class UserService {
  public static getUserProfile(userId: string): { success: boolean; user?: User; error?: string } {
    const user = USERS_DB[userId];
    if (!user) {
      return { success: false, error: `User with ID '${userId}' not found.` };
    }
    return { success: true, user };
  }

  public static getUserTimetable(userId: string): { success: boolean; timetable?: User['timetable']; error?: string } {
    const user = USERS_DB[userId];
    if (!user) {
      return { success: false, error: `User with ID '${userId}' not found.` };
    }
    return { success: true, timetable: user.timetable };
  }
}
