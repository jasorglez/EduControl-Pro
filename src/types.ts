export interface Student {
  id?: string;
  controlNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  bloodType?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  internetPassword?: string;
  grade: number;
  group: string;
  majorId?: string;
  subjectIds?: string[];
  status: 'active' | 'inactive';
  createdAt: any;
}

export interface Major {
  id?: string;
  code: string;
  name: string;
  description?: string;
}

export interface Teacher {
  id?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  specialty?: string;
  availability?: {
    monday?: string[];
    tuesday?: string[];
    wednesday?: string[];
    thursday?: string[];
    friday?: string[];
  };
  status: 'active' | 'inactive';
  subjectIds?: string[];
  createdAt: any;
}

export interface Subject {
  id?: string;
  code: string;
  name: string;
  weeklyHours?: number;
  sessionDuration?: number;
  teacherId?: string;
  classroomId?: string;
  schedule?: string;
  days?: string[];
  cost?: number;
}

export interface Payment {
  id?: string;
  studentId: string;
  amount: number;
  concept: string;
  type: 'subject' | 'semester' | 'other';
  date: any;
  status: 'paid' | 'pending' | 'cancelled' | 'completed';
  paymentMethod?: 'cash' | 'card' | 'transfer';
  reference?: string;
  createdAt: any;
}

export interface AcademicGroup {
  id?: string;
  name: string;
  majorId: string;
  grade: number;
  studentIds?: string[];
}

export interface ScheduleScenario {
  id?: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: any;
}

export interface ScheduleEntry {
  id?: string;
  scenarioId: string;
  teacherId: string;
  subjectId: string;
  classroomId: string;
  groupId: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  startTime: string;
  endTime: string;
}

export interface Classroom {
  id?: string;
  name: string;
  building?: string;
  floor?: string;
  capacity?: number;
  type?: 'classroom' | 'laboratory' | 'workshop' | 'other';
}

export interface Attendance {
  id?: string;
  personId: string;
  personType: 'student' | 'teacher';
  timestamp: any;
  type: 'entry' | 'exit';
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'staff' | 'teacher';
  schoolId: string;
  botPin?: string;
}

export interface SchoolInvite {
  id?: string;
  email: string;
  schoolId: string;
  role: 'admin' | 'staff' | 'teacher';
  status: 'pending' | 'accepted';
  createdAt: any;
}

export interface Expense {
  id?: string;
  amount: number;
  category: 'services' | 'supplies' | 'maintenance' | 'payroll' | 'other';
  description: string;
  date: any;
  paymentMethod: 'cash' | 'card' | 'transfer';
  reference?: string;
  createdAt: any;
}

export interface SchoolConfig {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string; // Base64
  semesterCost?: number;
  updatedAt?: any;
}

export interface Grade {
  id?: string;
  studentId: string;
  subjectId: string;
  semester: number;
  grade: number;
  status: 'approved' | 'failed' | 'pending';
  period: string; // e.g., "Aug-Dec 2025"
  createdAt: any;
}
