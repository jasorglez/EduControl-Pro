export type EducationLevel = 'kinder' | 'primaria' | 'secundaria' | 'preparatoria' | 'universidad';

export interface Student {
  id?: string;
  controlNumber: string;
  firstName: string;
  lastName: string;
  educationLevel?: EducationLevel;
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
  status: 'active' | 'inactive';
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
  status: 'active' | 'inactive';
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
  status: 'active' | 'inactive';
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
  status?: 'active' | 'inactive';
}

export interface Classroom {
  id?: string;
  name: string;
  building?: string;
  floor?: string;
  capacity?: number;
  type?: 'classroom' | 'laboratory' | 'workshop' | 'other';
  status: 'active' | 'inactive';
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
  status: 'active' | 'inactive';
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

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskAttachment {
  name: string;
  url: string;
  storagePath: string;
  type: 'pdf' | 'word' | 'excel' | 'video' | 'image' | 'other';
  size: number; // bytes
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  teacherId: string;   // UserProfile.uid
  teacherName?: string;
  subjectId?: string;
  dueDate?: any;
  status: 'active' | 'inactive';
  attachments: TaskAttachment[];
  createdAt: any;
}

export interface TaskAssignment {
  id?: string;
  taskId: string;
  assignedBy: string;    // UserProfile.uid
  studentId?: string;    // individual assignment (Firestore student doc ID)
  groupId?: string;      // group assignment
  assignedAt: any;
}

export interface TaskSubmission {
  id?: string;
  taskId: string;
  studentId: string;     // Firestore student doc ID
  controlNumber: string;
  studentName: string;
  status: 'pending' | 'submitted' | 'graded';
  submittedAt?: any;
  attachments: TaskAttachment[];
  grade?: string;        // free text — número, letra, lo que el maestro quiera
  feedback?: string;
  gradedAt?: any;
  gradedBy?: string;     // UserProfile.uid
  createdAt: any;
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
