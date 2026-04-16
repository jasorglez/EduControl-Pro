/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import StudentsPage   from './components/students/StudentsPage';
import TeachersPage   from './components/teachers/TeachersPage';
import SubjectsPage   from './components/subjects/SubjectsPage';
import ClassroomsPage from './components/classrooms/ClassroomsPage';
import MajorsPage     from './components/majors/MajorsPage';
import AttendancePage from './components/attendance/AttendancePage';
import PaymentsPage   from './components/payments/PaymentsPage';
import ExpensesPage   from './components/expenses/ExpensesPage';
import UsersPage        from './components/users/UsersPage';
import SchoolSetupPage  from './components/school/SchoolSetupPage';
import LoginPage        from './components/auth/LoginPage';
import SchoolsPage      from './components/schools/SchoolsPage';
import TasksPage        from './components/tasks/TasksPage';
import { useState, useEffect, useMemo, Component } from 'react';
import {
  Users,
  User,
  UserCheck,
  BookOpen,
  Clock,
  Search,
  Plus,
  LogOut,
  LogIn,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  X,
  Menu,
  Shield,
  Settings,
  UserPlus,
  FileDown,
  DoorOpen,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers,
  Cpu,
  Save,
  Play,
  Check,
  ChevronDown,
  Info,
  LayoutDashboard,
  CreditCard,
  DollarSign,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  FileText,
  Receipt,
  BarChart as BarChartIcon,
  Video,
  Film,
  PlayCircle,
  Sparkle,
  Building2,
  Crown,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Student, Teacher, Subject, Attendance, UserProfile, SchoolConfig, Classroom, Major, AcademicGroup, ScheduleScenario, ScheduleEntry, Payment, Expense, Grade, SchoolInvite, Task, TaskAssignment, TaskSubmission } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Initialize pdfMake fonts
if ((pdfFonts as any)?.pdfMake?.vfs) {
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
}

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

export class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
            <p className="text-gray-500 mb-6">Ha ocurrido un error inesperado en la aplicación.</p>
            <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40">
              {/* @ts-ignore */}
              <code className="text-xs text-red-600">{this.state.errorInfo}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-bottom border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all border-b-2 ${
      active 
        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const InfoCard = ({ label, value, icon: Icon, isMono, className }: { label: string; value?: string; icon: any; isMono?: boolean; className?: string }) => (
  <div className={`p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-start gap-4 ${className}`}>
    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100 shrink-0">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-bold text-gray-700 ${isMono ? 'font-mono' : ''}`}>
        {value || 'No registrado'}
      </p>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [needsSchoolSetup, setNeedsSchoolSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'teachers' | 'subjects' | 'classrooms' | 'majors' | 'attendance' | 'search' | 'users' | 'settings' | 'scheduling' | 'payments' | 'expenses' | 'marketing' | 'schools' | 'tasks'>('dashboard');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [fichaTab, setFichaTab] = useState<'info' | 'kardex'>('info');
  const [isTeacherProfileOpen, setIsTeacherProfileOpen] = useState(false);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [academicGroups, setAcademicGroups] = useState<AcademicGroup[]>([]);
  const [scheduleScenarios, setScheduleScenarios] = useState<ScheduleScenario[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [promoScript, setPromoScript] = useState<string>('');
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [allSchools, setAllSchools] = useState<SchoolConfig[]>([]);
  const [pendingInvites, setPendingInvites] = useState<SchoolInvite[]>([]);
  const [settingsInviteEmail, setSettingsInviteEmail] = useState('');
  const [settingsInviteRole, setSettingsInviteRole] = useState<'admin' | 'staff' | 'teacher'>('teacher');
  const [isInvitingFromSettings, setIsInvitingFromSettings] = useState(false);

  type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  type SlotEntry = { start: string; end: string; subjectId: string };
  type WeekAvail = Record<DayKey, SlotEntry[]>;
  const DAY_LABELS: { key: DayKey; label: string }[] = [
    { key: 'monday',    label: 'Lunes'      },
    { key: 'tuesday',   label: 'Martes'     },
    { key: 'wednesday', label: 'Miércoles'  },
    { key: 'thursday',  label: 'Jueves'     },
    { key: 'friday',    label: 'Viernes'    },
  ];
  const emptyWeek = (): WeekAvail => ({ monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] });
  const [teacherAvail, setTeacherAvail] = useState<WeekAvail>(emptyWeek());
  // null = ver la propia escuela; string = super admin viendo otra empresa
  const [viewingSchoolId, setViewingSchoolId] = useState<string | null>(null);

  // ─── School-scoped Firestore helpers ────────────────────────────────────────
  // activeSchoolId: escuela actualmente en contexto (puede ser otra si el super
  // admin cambió de empresa). Usar SIEMPRE estos helpers en lugar de schoolId directo.
  const activeSchoolId = viewingSchoolId ?? schoolId;
  const SC = (name: string) => collection(db, 'schools', activeSchoolId!, name);
  const SD = (col: string, id: string) => doc(db, 'schools', activeSchoolId!, col, id);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const generateScheduleReport = (scenarioId: string) => {
    const scenario = scheduleScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const entries = scheduleEntries.filter(e => e.scenarioId === scenarioId);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames: { [key: string]: string } = {
      monday: 'Lunes',
      tuesday: 'Martes',
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes'
    };

    const docDefinition: any = {
      content: [
        {
          columns: [
            schoolConfig?.logo ? {
              image: schoolConfig.logo,
              width: 80,
            } : { text: '', width: 80 },
            {
              stack: [
                { text: schoolConfig?.name || 'EduControl Pro', style: 'header', alignment: 'center' },
                { text: schoolConfig?.address || '', style: 'subheader', alignment: 'center' },
              ],
              margin: [0, 10, 0, 0]
            },
            { text: '', width: 80 }
          ]
        },
        { text: '\n' },
        { 
          canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#eeeeee' }] 
        },
        { text: '\n' },
        { text: `Escenario: ${scenario.name}`, style: 'scenarioTitle', alignment: 'center' },
        { text: scenario.description || '', style: 'scenarioDesc', alignment: 'center', margin: [0, 0, 0, 20] },
        { text: `Fecha de generación: ${new Date().toLocaleString()}`, style: 'dateInfo', alignment: 'right' },
        { text: '\n' },
        
        // Table for each day
        ...days.map(day => {
          const dayEntries = entries.filter(e => e.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (dayEntries.length === 0) return null;

          return [
            { text: dayNames[day], style: 'dayHeader', margin: [0, 10, 0, 5] },
            {
              table: {
                headerRows: 1,
                widths: ['15%', '25%', '25%', '20%', '15%'],
                body: [
                  [
                    { text: 'Horario', style: 'tableHeader' },
                    { text: 'Materia', style: 'tableHeader' },
                    { text: 'Maestro', style: 'tableHeader' },
                    { text: 'Grupo', style: 'tableHeader' },
                    { text: 'Salón', style: 'tableHeader' }
                  ],
                  ...dayEntries.map(e => {
                    const teacher = teachers.find(t => t.id === e.teacherId);
                    const subject = subjects.find(s => s.id === e.subjectId);
                    const classroom = classrooms.find(c => c.id === e.classroomId);
                    const group = academicGroups.find(g => g.id === e.groupId);

                    return [
                      { text: `${e.startTime} - ${e.endTime}`, style: 'tableCell' },
                      { text: subject?.name || 'N/A', style: 'tableCell' },
                      { text: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A', style: 'tableCell' },
                      { text: group?.name || 'N/A', style: 'tableCell' },
                      { text: classroom?.name || 'N/A', style: 'tableCell' }
                    ];
                  })
                ]
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#eeeeee',
                vLineColor: () => '#eeeeee',
                paddingLeft: () => 8,
                paddingRight: () => 8,
                paddingTop: () => 6,
                paddingBottom: () => 6,
              }
            },
            { text: '\n' }
          ];
        }).filter(Boolean)
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#4f46e5',
        },
        subheader: {
          fontSize: 10,
          color: '#6b7280',
          margin: [0, 2, 0, 0]
        },
        scenarioTitle: {
          fontSize: 16,
          bold: true,
          color: '#111827',
          margin: [0, 10, 0, 5]
        },
        scenarioDesc: {
          fontSize: 11,
          color: '#4b5563',
          italic: true
        },
        dayHeader: {
          fontSize: 14,
          bold: true,
          color: '#ffffff',
          background: '#4f46e5',
          padding: [10, 5]
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: '#374151',
          fillColor: '#f9fafb',
          margin: [0, 2, 0, 2]
        },
        tableCell: {
          fontSize: 9,
          color: '#4b5563'
        },
        dateInfo: {
          fontSize: 8,
          color: '#9ca3af'
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    pdfMake.createPdf(docDefinition).download(`Horario_${scenario.name.replace(/\s+/g, '_')}.pdf`);
    setNotification({ message: 'PDF generado con éxito.', type: 'success' });
  };

  const generateStudentReport = () => {
    const docDefinition: any = {
      content: [
        {
          columns: [
            schoolConfig?.logo ? {
              image: schoolConfig.logo,
              width: 80,
            } : { text: '', width: 80 },
            {
              text: schoolConfig?.name || 'EduControl Pro',
              style: 'header',
              alignment: 'center',
              margin: [0, 15, 0, 0]
            },
            { text: '', width: 80 }
          ]
        },
        { text: schoolConfig?.address || '', style: 'subheader', alignment: 'center', margin: [0, 5, 0, 5] },
        { text: `Reporte de Alumnos`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 10] },
        { text: `Fecha de generación: ${new Date().toLocaleString()}`, style: 'dateInfo', alignment: 'right' },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: '# Control', style: 'tableHeader' },
                { text: 'Nombre Completo', style: 'tableHeader' },
                { text: 'Grado', style: 'tableHeader' },
                { text: 'Grupo', style: 'tableHeader' },
                { text: 'Estado', style: 'tableHeader' }
              ],
              ...filteredStudents.map(s => [
                s.controlNumber,
                `${s.firstName} ${s.lastName}`,
                (s.grade ?? '').toString(),
                s.group || '',
                s.status === 'active' ? 'Activo' : 'Inactivo'
              ])
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ].filter(Boolean),
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: '#4f46e5',
          margin: [0, 0, 0, 5]
        },
        subheader: {
          fontSize: 14,
          bold: true,
          color: '#374151'
        },
        dateInfo: {
          fontSize: 10,
          color: '#6b7280',
          italic: true
        },
        tableHeader: {
          bold: true,
          fontSize: 13,
          color: 'white',
          fillColor: '#4f46e5',
          margin: [0, 5, 0, 5]
        }
      },
      defaultStyle: {
        fontSize: 10
      }
    };

    pdfMake.createPdf(docDefinition).download(`Reporte_Alumnos_${new Date().getTime()}.pdf`);
  };

  const generateReceipt = (payment: Payment) => {
    const student = students.find(s => s.controlNumber === payment.studentId);
    const date = payment.date instanceof Timestamp ? payment.date.toDate() : 
                 (payment.date ? new Date(payment.date as any) : new Date());

    const docDefinition: any = {
      content: [
        {
          columns: [
            schoolConfig?.logo ? {
              image: schoolConfig.logo,
              width: 80,
            } : { text: '', width: 80 },
            {
              stack: [
                { text: schoolConfig?.name || 'EduControl Pro', style: 'header', alignment: 'center' },
                { text: schoolConfig?.address || '', style: 'subheader', alignment: 'center' },
                { text: `Tel: ${schoolConfig?.phone || ''}`, style: 'subheader', alignment: 'center' },
              ],
              margin: [0, 10, 0, 0]
            },
            { text: `FOLIO: ${payment.reference || payment.id?.slice(-6).toUpperCase()}`, style: 'folio', alignment: 'right', width: 80 }
          ]
        },
        { text: '\n' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#eeeeee' }] },
        { text: '\n' },
        { text: 'RECIBO DE PAGO', style: 'title', alignment: 'center', margin: [0, 10, 0, 20] },
        
        {
          columns: [
            {
              stack: [
                { text: 'DATOS DEL ALUMNO', style: 'sectionTitle' },
                { text: `Nombre: ${student?.firstName} ${student?.lastName}`, style: 'infoText' },
                { text: `Matrícula: ${payment.studentId}`, style: 'infoText' },
                { text: `Carrera: ${majors.find(m => m.id === student?.majorId)?.name || 'N/A'}`, style: 'infoText' },
              ]
            },
            {
              stack: [
                { text: 'DETALLES DEL PAGO', style: 'sectionTitle', alignment: 'right' },
                { text: `Fecha: ${date.toLocaleDateString()}`, style: 'infoText', alignment: 'right' },
                { text: `Método: ${payment.paymentMethod === 'cash' ? 'Efectivo' : payment.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}`, style: 'infoText', alignment: 'right' },
                { text: `Estado: ${payment.status === 'completed' ? 'PAGADO' : 'PENDIENTE'}`, style: 'infoText', alignment: 'right' },
              ]
            }
          ]
        },
        
        { text: '\n\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'CONCEPTO', style: 'tableHeader' },
                { text: 'IMPORTE', style: 'tableHeader', alignment: 'right' }
              ],
              [
                { text: payment.concept, style: 'tableCell' },
                { text: `$${payment.amount.toLocaleString()}`, style: 'tableCell', alignment: 'right' }
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        },
        
        { text: '\n' },
        {
          columns: [
            { text: '', width: '*' },
            {
              stack: [
                { text: `TOTAL: $${payment.amount.toLocaleString()}`, style: 'totalText', alignment: 'right' },
              ],
              width: 150
            }
          ]
        },
        
        { text: '\n\n\n\n' },
        {
          columns: [
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                { text: 'Firma del Cajero', style: 'signature', alignment: 'center' }
              ]
            },
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                { text: 'Firma del Alumno', style: 'signature', alignment: 'center' }
              ]
            }
          ],
          margin: [40, 0, 40, 0]
        },
        
        { text: '\n\n' },
        { text: 'Gracias por su pago. Este documento es un comprobante oficial.', style: 'footer', alignment: 'center' }
      ],
      styles: {
        header: { fontSize: 18, bold: true, color: '#4f46e5' },
        subheader: { fontSize: 10, color: '#6b7280' },
        folio: { fontSize: 12, bold: true, color: '#ef4444' },
        title: { fontSize: 22, bold: true, letterSpacing: 2 },
        sectionTitle: { fontSize: 10, bold: true, color: '#4f46e5', margin: [0, 0, 0, 5] },
        infoText: { fontSize: 11, margin: [0, 2, 0, 2] },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#f9fafb', margin: [5, 5, 5, 5] },
        tableCell: { fontSize: 11, margin: [5, 10, 5, 10] },
        totalText: { fontSize: 14, bold: true, color: '#111827' },
        signature: { fontSize: 9, italic: true, margin: [0, 5, 0, 0] },
        footer: { fontSize: 9, color: '#9ca3af', italic: true }
      }
    };

    pdfMake.createPdf(docDefinition).download(`Recibo_${payment.studentId}_${date.getTime()}.pdf`);
  };

  const generatePaymentsReport = () => {
    const docDefinition: any = {
      content: [
        {
          columns: [
            schoolConfig?.logo ? {
              image: schoolConfig.logo,
              width: 80,
            } : { text: '', width: 80 },
            {
              stack: [
                { text: schoolConfig?.name || 'EduControl Pro', style: 'header', alignment: 'center' },
                { text: schoolConfig?.address || '', style: 'subheader', alignment: 'center' },
              ],
              margin: [0, 10, 0, 0]
            },
            { text: '', width: 80 }
          ]
        },
        { text: '\n' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#eeeeee' }] },
        { text: '\n' },
        { text: 'REPORTE DE PAGOS', style: 'title', alignment: 'center' },
        { 
          text: (paymentStartDate || paymentEndDate) 
            ? `Periodo: ${paymentStartDate || 'Inicio'} al ${paymentEndDate || 'Fin'}`
            : 'Periodo: Todos los registros',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        { text: `Fecha de generación: ${new Date().toLocaleString()}`, style: 'dateInfo', alignment: 'right' },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto'],
            body: [
              [
                { text: 'Fecha', style: 'tableHeader' },
                { text: 'ID Alumno', style: 'tableHeader' },
                { text: 'Concepto', style: 'tableHeader' },
                { text: 'Método', style: 'tableHeader' },
                { text: 'Monto', style: 'tableHeader', alignment: 'right' }
              ],
              ...filteredPayments.map(p => {
                const date = p.date instanceof Timestamp ? p.date.toDate() : 
                             (p.date ? new Date(p.date as any) : new Date());
                return [
                  { text: date.toLocaleDateString(), style: 'tableCell' },
                  { text: p.studentId, style: 'tableCell' },
                  { text: p.concept, style: 'tableCell' },
                  { text: p.paymentMethod || 'N/A', style: 'tableCell' },
                  { text: `$${p.amount.toLocaleString()}`, style: 'tableCell', alignment: 'right' }
                ];
              }),
              [
                { text: 'TOTAL', colSpan: 4, style: 'tableHeader', alignment: 'right' },
                {}, {}, {},
                { text: `$${filteredPayments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}`, style: 'tableHeader', alignment: 'right' }
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true, color: '#4f46e5' },
        subheader: { fontSize: 10, color: '#6b7280' },
        title: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#f9fafb', margin: [0, 5, 0, 5] },
        tableCell: { fontSize: 9, margin: [0, 5, 0, 5] },
        dateInfo: { fontSize: 8, color: '#9ca3af' }
      }
    };

    pdfMake.createPdf(docDefinition).download(`Reporte_Pagos_${new Date().getTime()}.pdf`);
  };
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(studentSearch.toLowerCase()) || 
                            s.controlNumber.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesFilter = studentFilter === 'all' || s.status === studentFilter;
      return matchesSearch && matchesFilter;
    });
  }, [students, studentSearch, studentFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = p.date instanceof Timestamp ? p.date.toDate() : 
                    (p.date ? new Date(p.date as any) : new Date());
      
      if (paymentStartDate) {
        const start = new Date(paymentStartDate);
        if (pDate < start) return false;
      }
      
      if (paymentEndDate) {
        const end = new Date(paymentEndDate);
        end.setHours(23, 59, 59, 999);
        if (pDate > end) return false;
      }
      
      return true;
    }).sort((a, b) => {
      const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date as any).getTime();
      const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date as any).getTime();
      return dateB - dateA;
    });
  }, [payments, paymentStartDate, paymentEndDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eDate = e.date instanceof Timestamp ? e.date.toDate() : 
                    (e.date ? new Date(e.date as any) : new Date());
      
      if (expenseStartDate) {
        const start = new Date(expenseStartDate);
        if (eDate < start) return false;
      }
      
      if (expenseEndDate) {
        const end = new Date(expenseEndDate);
        end.setHours(23, 59, 59, 999);
        if (eDate > end) return false;
      }

      if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      const dateA = a.date instanceof Timestamp ? a.date.toMillis() : new Date(a.date as any).getTime();
      const dateB = b.date instanceof Timestamp ? b.date.toMillis() : new Date(b.date as any).getTime();
      return dateB - dateA;
    });
  }, [expenses, expenseStartDate, expenseEndDate, expenseCategoryFilter]);

  // --- Auth ---
  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        const { getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'users', 'connection-test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc    = await getDoc(userDocRef);
          const isAdminEmail = currentUser.email === 'jsorglez@gmail.com';

          // Shared helper: resolve which school this profile belongs to.
          // Sets schoolId state or triggers setup if none found.
          const resolveSchool = async (profile: UserProfile) => {
            if (profile.schoolId) {
              setSchoolId(profile.schoolId);
              return;
            }
            // Look for a pending invite (may fail if rules not yet deployed → treat as no invite)
            try {
              const inviteSnap = await getDocs(query(
                collection(db, 'school_invites'),
                where('email', '==', currentUser.email),
                where('status', '==', 'pending')
              ));
              if (!inviteSnap.empty) {
                const inviteDoc  = inviteSnap.docs[0];
                const invite     = inviteDoc.data();
                const updated: UserProfile = { ...profile, schoolId: invite.schoolId, role: invite.role };
                await setDoc(userDocRef, updated);
                await updateDoc(inviteDoc.ref, { status: 'accepted' });
                setUserProfile(updated);
                setSchoolId(invite.schoolId);
                return;
              }
            } catch {
              // Permission denied or index missing — fall through to setup
            }
            setNeedsSchoolSetup(true);
          };

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (isAdminEmail && data.role !== 'admin') {
              const updated: UserProfile = { ...data, role: 'admin' };
              await setDoc(userDocRef, updated);
              setUserProfile(updated);
              await resolveSchool(updated);
            } else {
              setUserProfile(data);
              await resolveSchool(data);
            }
          } else {
            // Brand-new user — check for an invite first (may fail if rules not deployed)
            let acceptedFromInvite = false;
            try {
              const inviteSnap = await getDocs(query(
                collection(db, 'school_invites'),
                where('email', '==', currentUser.email),
                where('status', '==', 'pending')
              ));
              if (!inviteSnap.empty) {
                const inviteDoc = inviteSnap.docs[0];
                const invite    = inviteDoc.data();
                const newProfile: UserProfile = {
                  uid:      currentUser.uid,
                  email:    currentUser.email || '',
                  role:     invite.role,
                  schoolId: invite.schoolId,
                };
                await setDoc(userDocRef, newProfile);
                await updateDoc(inviteDoc.ref, { status: 'accepted' });
                setUserProfile(newProfile);
                setSchoolId(invite.schoolId);
                acceptedFromInvite = true;
              }
            } catch {
              // Permission denied or index missing — fall through to setup
            }
            if (!acceptedFromInvite) {
              const newProfile: UserProfile = {
                uid:      currentUser.uid,
                email:    currentUser.email || '',
                role:     isAdminEmail ? 'admin' : 'staff',
                schoolId: '',
              };
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
              setNeedsSchoolSetup(true);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
        setSchoolId(null);
        setNeedsSchoolSetup(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleEmailLogin = async (email: string, password: string): Promise<string | null> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        return 'Correo o contraseña incorrectos.';
      }
      return 'Error al iniciar sesión. Intenta de nuevo.';
    }
  };

  const handleEmailRegister = async (email: string, password: string): Promise<string | null> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return null;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        return 'Este correo ya tiene cuenta. Inicia sesión.';
      }
      if (err.code === 'auth/weak-password') {
        return 'La contraseña debe tener al menos 6 caracteres.';
      }
      return 'Error al crear la cuenta. Intenta de nuevo.';
    }
  };

  const handlePasswordReset = async (email: string): Promise<string | null> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return null;
    } catch {
      return 'No se pudo enviar el correo. Verifica el email.';
    }
  };

  const handleLogout = () => signOut(auth);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user || !userProfile || !schoolId) return;

    const unsubStudents = onSnapshot(query(SC('students'), orderBy('createdAt', 'desc')), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setIsDataLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
      setIsDataLoading(false);
    });

    const unsubTeachers = onSnapshot(SC('teachers'), (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teachers'));

    const unsubSubjects = onSnapshot(SC('subjects'), (snapshot) => {
      setSubjects(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Subject))
        .filter(s => s.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'subjects'));

    const unsubClassrooms = onSnapshot(SC('classrooms'), (snapshot) => {
      setClassrooms(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Classroom))
        .filter(c => c.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classrooms'));

    const unsubMajors = onSnapshot(SC('majors'), (snapshot) => {
      setMajors(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Major))
        .filter(m => m.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'majors'));

    const unsubAcademicGroups = onSnapshot(SC('academic_groups'), (snapshot) => {
      setAcademicGroups(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as AcademicGroup))
        .filter(g => g.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'academic_groups'));

    const unsubScheduleScenarios = onSnapshot(SC('schedule_scenarios'), (snapshot) => {
      setScheduleScenarios(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ScheduleScenario))
        .filter(s => s.status !== 'archived'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedule_scenarios'));

    const unsubScheduleEntries = onSnapshot(SC('schedule_entries'), (snapshot) => {
      setScheduleEntries(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry))
        .filter(e => e.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedule_entries'));

    const unsubAttendance = onSnapshot(query(SC('attendance'), orderBy('timestamp', 'desc')), (snapshot) => {
      setAttendanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('schoolId', '==', activeSchoolId!)), (snapshot) => {
      setUsersList(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubPayments = onSnapshot(query(SC('payments'), orderBy('date', 'desc')), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));

    const unsubExpenses = onSnapshot(query(SC('expenses'), orderBy('date', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Expense))
        .filter(e => e.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'expenses'));

    const unsubGrades = onSnapshot(SC('grades'), (snapshot) => {
      setGrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'grades'));

    // Tasks: admins/super-admin see all; teachers see only their own
    const isSuperAdminUser = user.email === 'jsorglez@gmail.com';
    const isAdminRole = userProfile.role === 'admin';
    const tasksQuery = (isSuperAdminUser || isAdminRole)
      ? query(SC('tasks'), orderBy('createdAt', 'desc'))
      : query(SC('tasks'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Task))
        .filter(t => t.status !== 'inactive'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const unsubTaskAssignments = onSnapshot(SC('task_assignments'), (snapshot) => {
      setTaskAssignments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskAssignment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'task_assignments'));

    const unsubTaskSubmissions = onSnapshot(SC('task_submissions'), (snapshot) => {
      setTaskSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskSubmission)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'task_submissions'));

    const unsubSchool = onSnapshot(doc(db, 'schools', activeSchoolId!), (snapshot) => {
      if (snapshot.exists()) {
        setSchoolConfig({ id: snapshot.id, ...snapshot.data() } as SchoolConfig);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'school_config'));

    // All schools (super admin sees all; admin sees only theirs)
    const isSuperAdmin = user.email === 'jsorglez@gmail.com';
    const schoolsQuery = isSuperAdmin
      ? collection(db, 'schools')
      : query(collection(db, 'schools'), where('__name__', '==', schoolId!));
    const unsubAllSchools = onSnapshot(schoolsQuery, (snap) => {
      setAllSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolConfig)));
    });

    // Pending invites for this school
    const unsubInvites = onSnapshot(
      query(collection(db, 'school_invites'), where('schoolId', '==', activeSchoolId!), where('status', '==', 'pending')),
      (snap) => {
        setPendingInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolInvite)));
      }
    );

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubSubjects();
      unsubClassrooms();
      unsubMajors();
      unsubAcademicGroups();
      unsubScheduleScenarios();
      unsubScheduleEntries();
      unsubAttendance();
      unsubUsers();
      unsubPayments();
      unsubExpenses();
      unsubGrades();
      unsubTasks();
      unsubTaskAssignments();
      unsubTaskSubmissions();
      unsubSchool();
      unsubAllSchools();
      unsubInvites();
    };
  }, [user, userProfile, schoolId, viewingSchoolId]);

  // --- Actions ---
  const handleGenerateRandomStudents = async () => {
    const firstNames = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Elena', 'Pedro', 'Sofía', 'Miguel', 'Lucía', 'Roberto', 'Patricia', 'Fernando', 'Gabriela', 'Diego', 'Isabel', 'Ricardo', 'Carmen', 'Javier', 'Adriana'];
    const lastNames = ['García', 'Martínez', 'López', 'Rodríguez', 'Pérez', 'Sánchez', 'González', 'Ramírez', 'Torres', 'Flores', 'Vázquez', 'Castillo', 'Jiménez', 'Moreno', 'Rojas', 'Ortiz', 'Mendoza', 'Cruz', 'Morales', 'Reyes'];
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const groups = ['A', 'B', 'C', 'D'];
    
    const count = 10; // Generate 10 random students
    
    try {
      for (let i = 0; i < count; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const controlNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        const randomStudent = {
          controlNumber,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}@example.com`,
          phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`,
          address: `Calle ${Math.floor(Math.random() * 100)}, Col. ${['Centro', 'Norte', 'Sur', 'Poniente', 'Oriente'][Math.floor(Math.random() * 5)]}`,
          birthDate: `${1995 + Math.floor(Math.random() * 15)}-0${1 + Math.floor(Math.random() * 9)}-${10 + Math.floor(Math.random() * 18)}`,
          bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
          grade: Math.floor(Math.random() * 9) + 1,
          group: groups[Math.floor(Math.random() * groups.length)],
          status: 'active',
          createdAt: serverTimestamp(),
        };
        
        await addDoc(SC('students'), randomStudent);
      }
      setNotification({ message: `${count} alumnos generados con éxito.`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'students');
    }
  };

  const handleSeedSchedulingData = async () => {
    setIsDataLoading(true);
    setNotification({ message: 'Cargando datos de ejemplo para programación...', type: 'info' });
    try {
      // Seed Classrooms
      const classroomData = [
        { name: 'Aula 101', capacity: 30 },
        { name: 'Aula 102', capacity: 30 },
        { name: 'Laboratorio A', capacity: 20 },
        { name: 'Auditorio', capacity: 100 }
      ];
      for (const c of classroomData) {
        if (!classrooms.find(ex => ex.name === c.name)) {
          await addDoc(SC('classrooms'), c);
        }
      }

      // Seed Teachers
      const teacherData = [
        { employeeId: 'T001', firstName: 'Roberto', lastName: 'Gómez', specialty: 'Matemáticas', availability: { monday: ["07:00-14:00"], tuesday: ["07:00-14:00"], wednesday: ["07:00-14:00"], thursday: ["07:00-14:00"], friday: ["07:00-14:00"] }, status: 'active' },
        { employeeId: 'T002', firstName: 'Laura', lastName: 'Sánchez', specialty: 'Física', availability: { monday: ["07:00-12:00"], wednesday: ["07:00-12:00"], friday: ["07:00-12:00"] }, status: 'active' },
        { employeeId: 'T003', firstName: 'Miguel', lastName: 'Ángel', specialty: 'Historia', availability: { tuesday: ["09:00-14:00"], thursday: ["09:00-14:00"] }, status: 'active' }
      ];
      for (const t of teacherData) {
        if (!teachers.find(ex => ex.employeeId === t.employeeId)) {
          await addDoc(SC('teachers'), { ...t, createdAt: serverTimestamp() });
        }
      }

      // Seed Subjects
      const subjectData = [
        { code: 'MAT101', name: 'Cálculo Diferencial', weeklyHours: 5, sessionDuration: 60, days: [] },
        { code: 'FIS101', name: 'Física I', weeklyHours: 4, sessionDuration: 120, days: [] },
        { code: 'HIS101', name: 'Historia de México', weeklyHours: 3, sessionDuration: 90, days: [] }
      ];
      for (const s of subjectData) {
        if (!subjects.find(ex => ex.code === s.code)) {
          await addDoc(SC('subjects'), s);
        }
      }

      // Seed Academic Groups
      const groupData = [
        { name: '1A', grade: 1, majorId: 'GENERIC', studentIds: [] },
        { name: '2B', grade: 2, majorId: 'GENERIC', studentIds: [] }
      ];
      for (const g of groupData) {
        if (!academicGroups.find(ex => ex.name === g.name)) {
          await addDoc(SC('academic_groups'), g);
        }
      }

      setNotification({ message: 'Datos de ejemplo cargados con éxito.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'seed');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (teachers.length === 0 || subjects.length === 0 || classrooms.length === 0 || academicGroups.length === 0) {
      setNotification({ message: 'Faltan datos base (maestros, materias, salones o grupos) para generar el horario.', type: 'error' });
      return;
    }

    setIsDataLoading(true);
    setNotification({ message: 'La IA está diseñando el mejor horario posible...', type: 'info' });
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Actúa como un experto en logística educativa. Genera un horario escolar optimizado para "${schoolConfig?.name || 'la institución'}".
        
        DATOS DISPONIBLES:
        - Maestros: ${JSON.stringify(teachers.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, specialty: t.specialty, availability: t.availability })))}
        - Materias: ${JSON.stringify(subjects.map(s => ({ id: s.id, name: s.name, weeklyHours: s.weeklyHours, sessionDuration: s.sessionDuration })))}
        - Salones: ${JSON.stringify(classrooms.map(c => ({ id: c.id, name: c.name, capacity: c.capacity })))}
        - Grupos: ${JSON.stringify(academicGroups.map(g => ({ id: g.id, name: g.name, grade: g.grade })))}

        RESTRICCIONES CRÍTICAS:
        1. UNICIDAD DE MAESTRO: Un maestro no puede estar en dos lugares al mismo tiempo.
        2. UNICIDAD DE SALÓN: Un salón no puede albergar dos clases simultáneas.
        3. DISPONIBILIDAD: Respeta estrictamente los días y horas que cada maestro marcó como disponibles en su JSON de availability.
        4. CARGA ACADÉMICA: Intenta cubrir el total de 'weeklyHours' para cada materia por grupo.
        5. BLOQUES: Cada sesión debe durar lo indicado en 'sessionDuration' (en minutos).
        6. RANGO HORARIO: Las clases deben ocurrir entre las 07:00 y las 14:00.
        7. DÍAS: Usa únicamente: monday, tuesday, wednesday, thursday, friday.

        FORMATO DE SALIDA:
        Responde exclusivamente con un objeto JSON válido que siga este esquema:
        {
          "scenario": { "name": "Nombre del Escenario", "description": "Explicación de la optimización realizada" },
          "entries": [
            { "teacherId": "ID_DEL_MAESTRO", "subjectId": "ID_DE_LA_MATERIA", "classroomId": "ID_DEL_SALON", "groupId": "ID_DEL_GRUPO", "day": "day_string", "startTime": "HH:mm", "endTime": "HH:mm" }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenario: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "description"]
              },
              entries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    teacherId: { type: Type.STRING },
                    subjectId: { type: Type.STRING },
                    classroomId: { type: Type.STRING },
                    groupId: { type: Type.STRING },
                    day: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    endTime: { type: Type.STRING }
                  },
                  required: ["teacherId", "subjectId", "classroomId", "groupId", "day", "startTime", "endTime"]
                }
              }
            },
            required: ["scenario", "entries"]
          }
        }
      });

      const result = JSON.parse(response.text);
      
      // Save Scenario
      const scenarioRef = await addDoc(SC('schedule_scenarios'), {
        ...result.scenario,
        status: 'draft',
        createdAt: serverTimestamp()
      });

      // Save Entries using Batch for efficiency
      const batch = writeBatch(db);
      result.entries.forEach((entry: any) => {
        const entryRef = doc(SC('schedule_entries'));
        batch.set(entryRef, {
          ...entry,
          scenarioId: scenarioRef.id
        });
      });

      await batch.commit();

      setNotification({ message: '¡Escenario generado y guardado con éxito!', type: 'success' });
      setSelectedScenarioId(scenarioRef.id);
    } catch (error) {
      console.error("AI Generation Error:", error);
      setNotification({ message: 'Error al generar el escenario. Verifica que los datos base sean correctos.', type: 'error' });
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSaveAcademicGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const groupData = {
      ...data,
      grade: parseInt(data.grade as string, 10),
      studentIds: [],
      status: (data.status as string) || 'active',
    };
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'academic_groups', editingItem.id), groupData);
      } else {
        await addDoc(SC('academic_groups'), groupData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'academic_groups');
    }
  };

  const handleDeleteScenario = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archivar Escenario',
      message: '¿Estás seguro? El escenario y sus horarios quedarán archivados (inactivos).',
      onConfirm: async () => {
        try {
          await updateDoc(SD('schedule_scenarios', id), { status: 'archived' });
          // Marcar entradas asociadas como inactivas
          const entriesToArchive = scheduleEntries.filter(e => e.scenarioId === id);
          for (const entry of entriesToArchive) {
            await updateDoc(SD('schedule_entries', entry.id!), { status: 'inactive' });
          }
          if (selectedScenarioId === id) setSelectedScenarioId(null);
          setNotification({ message: 'Escenario archivado con éxito.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'schedule_scenarios');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteAcademicGroup = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desactivar Grupo',
      message: '¿Estás seguro? El grupo quedará inactivo.',
      onConfirm: async () => {
        try {
          await updateDoc(SD('academic_groups', id), { status: 'inactive' });
          setNotification({ message: 'Grupo desactivado con éxito.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'academic_groups');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSaveStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const newControl = (data.controlNumber as string).trim();
    const newEmail   = (data.email as string).trim().toLowerCase();
    const editingId  = editingItem?.id;

    // Duplicate control number check
    const dupControl = students.find(s => s.controlNumber === newControl && s.id !== editingId);
    if (dupControl) {
      setNotification({ message: `El número de control "${newControl}" ya está registrado para ${dupControl.firstName} ${dupControl.lastName}.`, type: 'error' });
      return;
    }

    // Duplicate email check (only if email provided)
    if (newEmail) {
      const dupEmail = students.find(s => (s.email ?? '').toLowerCase() === newEmail && s.id !== editingId);
      if (dupEmail) {
        setNotification({ message: `El correo "${newEmail}" ya está registrado para ${dupEmail.firstName} ${dupEmail.lastName}.`, type: 'error' });
        return;
      }
    }

    const subjectIds = formData.getAll('subjectIds') as string[];

    const studentData = {
      ...data,
      controlNumber: newControl,
      email: newEmail || undefined,
      grade: data.grade ? parseInt(data.grade as string, 10) : 0,
      group: data.group || '',
      subjectIds: subjectIds,
      status: data.status || 'active',
      createdAt: editingItem ? editingItem.createdAt : serverTimestamp(),
    } as any;

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'students', editingItem.id), studentData);
      } else {
        await addDoc(SC('students'), studentData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'students');
    }
  };

  const handleSaveMajor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const majorData = { ...data, status: (data.status as string) || 'active' };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'majors', editingItem.id), majorData);
      } else {
        await addDoc(SC('majors'), majorData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'majors');
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const subjectIds = formData.getAll('subjectIds') as string[];
    
    // Build availability from visual state (slots per day)
    const availability: Record<string, { start: string; end: string; subjectId: string }[]> = {};
    (Object.keys(teacherAvail) as DayKey[]).forEach(day => {
      const slots = teacherAvail[day];
      if (slots.length > 0) availability[day] = slots;
    });

    const teacherData = {
      ...data,
      availability,
      subjectIds,
      status: data.status || 'active',
      createdAt: editingItem ? editingItem.createdAt : serverTimestamp(),
    } as any;

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'teachers', editingItem.id), teacherData);
      } else {
        await addDoc(SC('teachers'), teacherData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'teachers');
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Validate studentId matches exactly a known controlNumber
    const validControl = students.some(s => s.controlNumber === data.studentId);
    if (!validControl) {
      setNotification({ message: 'El alumno seleccionado no es válido. Recarga y vuelve a intentarlo.', type: 'error' });
      return;
    }

    const paymentData = {
      ...data,
      amount: Number(data.amount),
      date: data.date ? Timestamp.fromDate(new Date((data.date as string) + 'T12:00:00')) : serverTimestamp(),
      createdAt: editingItem ? editingItem.createdAt : serverTimestamp(),
    } as any;

    try {
      let paymentId = editingItem?.id;
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'payments', editingItem.id), paymentData);
      } else {
        const docRef = await addDoc(SC('payments'), paymentData);
        paymentId = docRef.id;
      }
      
      // Automatically generate receipt
      generateReceipt({ ...paymentData, id: paymentId });
      
      setIsModalOpen(false);
      setEditingItem(null);
      setNotification({ message: 'Pago registrado con éxito. Descargando recibo...', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'payments');
    }
  };

  const handleDeletePayment = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancelar Pago',
      message: '¿Estás seguro? El pago se marcará como cancelado.',
      onConfirm: async () => {
        try {
          await updateDoc(SD('payments', id), { status: 'cancelled' });
          setNotification({ message: 'Pago cancelado.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'payments');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const expenseData = {
      ...data,
      amount: Number(data.amount),
      date: data.date ? Timestamp.fromDate(new Date((data.date as string) + 'T12:00:00')) : serverTimestamp(),
      createdAt: editingItem ? editingItem.createdAt : serverTimestamp(),
      status: (data.status as string) || 'active',
    } as any;

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'expenses', editingItem.id), expenseData);
      } else {
        await addDoc(SC('expenses'), expenseData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setNotification({ message: 'Egreso registrado con éxito.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'expenses');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desactivar Egreso',
      message: '¿Estás seguro? El egreso quedará inactivo.',
      onConfirm: async () => {
        try {
          await updateDoc(SD('expenses', id), { status: 'inactive' });
          setNotification({ message: 'Egreso desactivado.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'expenses');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSaveSchoolConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      await setDoc(doc(db, 'schools', activeSchoolId!), {
        ...data,
        semesterCost: parseInt(data.semesterCost as string, 10) || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setNotification({ message: 'Configuración guardada con éxito.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'school_config');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      // Resize to max 512×512 to stay well under Firestore's 1MB doc limit
      const MAX = 512;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64String = canvas.toDataURL('image/png', 0.85);
      try {
        await setDoc(doc(db, 'schools', activeSchoolId!), {
          logo: base64String,
          updatedAt: serverTimestamp()
        }, { merge: true });
        setNotification({ message: 'Logo actualizado con éxito.', type: 'success' });
      } catch (error) {
        setNotification({ message: 'Error al guardar el logo. Intenta con una imagen más pequeña.', type: 'error' });
        console.error('[Logo] Error:', error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setNotification({ message: 'No se pudo leer la imagen.', type: 'error' });
    };
    img.src = objectUrl;
  };

  const handleSaveSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Process days array if it exists in the form (we'll add checkboxes later)
    const days = formData.getAll('days') as string[];
    
    const subjectData = {
      ...data,
      weeklyHours: parseInt(data.weeklyHours as string, 10) || 0,
      sessionDuration: parseInt(data.sessionDuration as string, 10) || 60,
      cost: parseInt(data.cost as string, 10) || 0,
      days: days.length > 0 ? days : [],
      status: (data.status as string) || 'active',
    };
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'subjects', editingItem.id), subjectData);
      } else {
        await addDoc(SC('subjects'), subjectData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'subjects');
    }
  };

  const handleSaveClassroom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const classroomData = {
      ...data,
      capacity: data.capacity ? parseInt(data.capacity as string, 10) : 0,
      status: (data.status as string) || 'active',
    };
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schools', schoolId!, 'classrooms', editingItem.id), classroomData);
      } else {
        await addDoc(SC('classrooms'), classroomData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'classrooms');
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desactivar Salón',
      message: '¿Estás seguro? El salón quedará inactivo.',
      onConfirm: async () => {
        try {
          await updateDoc(SD('classrooms', id), { status: 'inactive' });
          setNotification({ message: 'Salón desactivado.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'classrooms');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSeedFinancialData = async () => {
    setIsDataLoading(true);
    setNotification({ message: 'Generando datos financieros de prueba...', type: 'info' });
    try {
      const batch = writeBatch(db);
      const now = new Date();
      
      // 1. Seed Payments (Income)
      const paymentConcepts = ['Inscripción Semestral', 'Colegiatura Mensual', 'Examen Extraordinario', 'Constancia de Estudios', 'Seguro Estudiantil'];
      const methods = ['cash', 'transfer', 'card'];
      
      // Generate 25 payments over the last 10 days
      for (let i = 0; i < 25; i++) {
        const daysAgo = Math.floor(Math.random() * 10);
        const date = subDays(now, daysAgo);
        // Random student from existing or random ID
        const student = students.length > 0 ? students[Math.floor(Math.random() * students.length)] : null;
        const studentId = student ? student.controlNumber : `DUMMY${Math.floor(1000 + Math.random() * 9000)}`;
        
        const paymentRef = doc(SC('payments'));
        batch.set(paymentRef, {
          studentId,
          concept: paymentConcepts[Math.floor(Math.random() * paymentConcepts.length)],
          amount: Math.floor(500 + Math.random() * 4500),
          date: Timestamp.fromDate(date),
          type: Math.random() > 0.5 ? 'semester' : 'subject',
          paymentMethod: methods[Math.floor(Math.random() * methods.length)],
          reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
          status: 'completed',
          createdAt: serverTimestamp()
        });
      }

      // 2. Seed Expenses (Outgoings)
      const expenseCategories = ['services', 'supplies', 'maintenance', 'payroll', 'other'];
      const expenseDescriptions = [
        'Pago de Energía Eléctrica', 'Suministro de Agua Potable', 'Mantenimiento de Aire Acondicionado',
        'Compra de Papelería y Tóner', 'Reparación de Mobiliario', 'Pago de Nómina Administrativa',
        'Servicio de Internet Fibra Óptica', 'Limpieza de Instalaciones', 'Publicidad en Redes Sociales'
      ];

      // Generate 15 expenses over the last 10 days
      for (let i = 0; i < 15; i++) {
        const daysAgo = Math.floor(Math.random() * 10);
        const date = subDays(now, daysAgo);
        
        const expenseRef = doc(SC('expenses'));
        batch.set(expenseRef, {
          category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
          amount: Math.floor(200 + Math.random() * 8000),
          description: expenseDescriptions[Math.floor(Math.random() * expenseDescriptions.length)],
          date: Timestamp.fromDate(date),
          paymentMethod: methods[Math.floor(Math.random() * methods.length)],
          reference: `EXP-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      setNotification({ message: 'Datos financieros generados con éxito.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'financial_data');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLogAttendance = async (personId: string, personType: 'student' | 'teacher', type: 'entry' | 'exit') => {
    try {
      await addDoc(SC('attendance'), {
        personId,
        personType,
        type,
        timestamp: serverTimestamp()
      });
      setNotification({ message: `Asistencia registrada: ${type === 'entry' ? 'Entrada' : 'Salida'} para ${personId}`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desactivar Registro',
      message: '¿Estás seguro? El registro quedará inactivo (no se eliminará físicamente).',
      onConfirm: async () => {
        try {
          await updateDoc(SD(collectionName, id), { status: 'inactive' });
          setNotification({ message: 'Registro desactivado con éxito.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, collectionName);
        }
        setConfirmDialog(null);
      }
    });
  };

  // ─── Task handlers ──────────────────────────────────────────────────────────

  const handleSaveTask = async (data: Omit<Task, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const { _id, ...rest } = data as any;
      if (_id) {
        // Update existing task (e.g. adding/removing attachments)
        await updateDoc(SD('tasks', _id), rest);
        return _id as string;
      }
      const taskData = { ...rest, teacherId: userProfile!.uid, createdAt: serverTimestamp() };
      const docRef = await addDoc(SC('tasks'), taskData);
      setNotification({ message: 'Tarea guardada con éxito.', type: 'success' });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
      throw error;
    }
  };

  const handleAssignTask = async (taskId: string, studentIds: string[], groupId?: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      if (groupId) {
        // one assignment record for the group
        const assignRef = doc(SC('task_assignments'));
        batch.set(assignRef, {
          taskId,
          assignedBy: userProfile!.uid,
          groupId,
          assignedAt: serverTimestamp(),
        });
        // create a submission record per student in the group
        for (const studentId of studentIds) {
          const student = students.find(s => s.id === studentId);
          if (!student) continue;
          const subRef = doc(SC('task_submissions'));
          batch.set(subRef, {
            taskId,
            studentId,
            controlNumber: student.controlNumber,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'pending',
            attachments: [],
            createdAt: serverTimestamp(),
          });
        }
      } else {
        // individual assignments
        for (const studentId of studentIds) {
          const student = students.find(s => s.id === studentId);
          if (!student) continue;
          const assignRef = doc(SC('task_assignments'));
          batch.set(assignRef, {
            taskId,
            assignedBy: userProfile!.uid,
            studentId,
            assignedAt: serverTimestamp(),
          });
          const subRef = doc(SC('task_submissions'));
          batch.set(subRef, {
            taskId,
            studentId,
            controlNumber: student.controlNumber,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'pending',
            attachments: [],
            createdAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
      setNotification({ message: 'Tarea asignada con éxito.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'task_assignments');
      throw error;
    }
  };

  const handleGradeSubmission = async (submissionId: string, grade: string, feedback: string): Promise<void> => {
    try {
      await updateDoc(SD('task_submissions', submissionId), {
        grade,
        feedback,
        status: 'graded',
        gradedAt: serverTimestamp(),
        gradedBy: userProfile!.uid,
      });
      setNotification({ message: 'Tarea calificada con éxito.', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'task_submissions');
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Desactivar Tarea',
        message: '¿Estás seguro? La tarea quedará inactiva y no será visible.',
        onConfirm: async () => {
          try {
            await updateDoc(SD('tasks', taskId), { status: 'inactive' });
            setNotification({ message: 'Tarea desactivada con éxito.', type: 'success' });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'tasks');
          }
          setConfirmDialog(null);
          resolve();
        }
      });
    });
  };

  const handleSearch = () => {
    const student = students.find(s => s.controlNumber === searchQuery);
    setSearchResults(student || null);
    if (!student) {
      setNotification({ message: 'No se encontró ningún alumno con ese número de control.', type: 'error' });
    }
  };

  const handleGeneratePromoVideo = async () => {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      return;
    }

    setIsGeneratingVideo(true);
    setVideoStatus('Iniciando generación de video cinemático...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: 'Intro cinemática profesional para un software de gestión escolar llamado EduControl Pro. Primer plano de una interfaz digital elegante en una tablet sostenida por un profesor en un aula moderna y luminosa. La pantalla muestra un tablero vibrante con estadísticas de alumnos y gráficos financieros con textos en ESPAÑOL como "Panel de Control", "Ingresos" y "Asistencia". Iluminación de alta gama, 4k, movimiento de cámara suave, profundidad de campo superficial.',
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      setVideoStatus('Procesando video en los servidores de Google (esto puede tardar 1-2 minutos)...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        // @ts-ignore
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.API_KEY || '',
          },
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setGeneratedVideoUrl(url);
        setNotification({ message: '¡Video promocional generado con éxito!', type: 'success' });
      }
    } catch (error: any) {
      console.error("Video Generation Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      setNotification({ message: 'Error al generar el video. Verifica tu configuración de API.', type: 'error' });
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatus('');
    }
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera un guion publicitario corto (30-45 segundos) en español para YouTube promocionando "EduControl Pro", un sistema integral de gestión escolar. 
        El guion debe mencionar:
        1. Control total de alumnos y maestros.
        2. Generación de horarios con IA.
        3. Gestión financiera (ingresos y egresos).
        4. Kardex académico y reportes PDF.
        El tono debe ser profesional, innovador y persuasivo. Incluye indicaciones de locución.`,
      });
      setPromoScript(response.text || '');
      setNotification({ message: '¡Guion generado con éxito!', type: 'success' });
    } catch (error) {
      console.error("Script Generation Error:", error);
      setNotification({ message: 'Error al generar el guion.', type: 'error' });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!promoScript) {
      setNotification({ message: 'Primero genera un guion para poder crear la locución.', type: 'info' });
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Lee este guion publicitario con un tono entusiasta y profesional: ${promoScript.replace(/\[.*?\]/g, '')}` }] }],
        config: {
          // @ts-ignore
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        setGeneratedAudioUrl(audioUrl);
        setNotification({ message: '¡Locución generada con éxito!', type: 'success' });
      }
    } catch (error) {
      console.error("Voiceover Error:", error);
      setNotification({ message: 'Error al generar la locución.', type: 'error' });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSetBotPin = async (uid: string, pin: string) => {
    await updateDoc(doc(db, 'users', uid), { botPin: pin });
  };

  const handleUpdateUserRole = async (uid: string, newRole: 'admin' | 'staff' | 'teacher') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });

      // Si el nuevo rol es maestro, verificar que exista en el catálogo de maestros.
      // Si no existe, crear un registro mínimo para que aparezca en el catálogo.
      if (newRole === 'teacher') {
        const targetUser = usersList.find(u => u.uid === uid);
        if (targetUser?.email) {
          const existing = await getDocs(
            query(SC('teachers'), where('email', '==', targetUser.email))
          );
          if (existing.empty) {
            const namePart = targetUser.email.split('@')[0];
            await addDoc(SC('teachers'), {
              employeeId: uid.slice(0, 8).toUpperCase(),
              firstName:  namePart,
              lastName:   '',
              email:      targetUser.email,
              status:     'active',
              subjectIds: [],
              createdAt:  serverTimestamp(),
            });
            setNotification({ message: `Rol actualizado y maestro "${namePart}" agregado al catálogo.`, type: 'success' });
            return;
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleInviteUser = async (email: string, role: 'admin' | 'staff' | 'teacher', targetSchoolId: string) => {
    try {
      await addDoc(collection(db, 'school_invites'), {
        email: email.trim().toLowerCase(),
        role,
        schoolId: targetSchoolId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setNotification({ message: `Invitación enviada a ${email}`, type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al enviar invitación', type: 'error' });
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, 'school_invites', inviteId));
      setNotification({ message: 'Invitación revocada', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al revocar invitación', type: 'error' });
    }
  };

  const handleSaveGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (!selectedStudent) return;

    const gradeVal = parseFloat(data.grade as string) || 0;
    const gradeData = {
      studentId: selectedStudent.id,
      subjectId: data.subjectId as string,
      semester: parseInt(data.semester as string, 10) || 1,
      grade: gradeVal,
      status: (gradeVal >= 60 ? 'approved' : 'failed') as 'approved' | 'failed',
      period: data.period as string,
      createdAt: serverTimestamp(),
    };
    
    try {
      if (editingItem && editingItem.studentId) {
        await updateDoc(doc(db, 'schools', schoolId!, 'grades', editingItem.id), gradeData);
        setNotification({ message: 'Calificación actualizada con éxito.', type: 'success' });
      } else {
        await addDoc(SC('grades'), gradeData);
        setNotification({ message: 'Calificación guardada con éxito.', type: 'success' });
      }
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'grades');
    }
  };

  const handleDeleteGrade = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Calificación',
      message: '¿Estás seguro de eliminar esta calificación?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'schools', schoolId!, 'grades', id));
          setNotification({ message: 'Calificación eliminada.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'grades');
        }
        setConfirmDialog(null);
      }
    });
  };

  const generateKardexPDF = (student: Student) => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const major = majors.find(m => m.id === student.majorId);
    
    const docDefinition: any = {
      content: [
        { text: 'KARDEX ACADÉMICO', style: 'header', alignment: 'center' },
        { text: '\n' },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: `Alumno: ${student.firstName} ${student.lastName}`, bold: true },
                { text: `No. Control: ${student.controlNumber}` },
                { text: `Carrera: ${major?.name || 'N/A'}` },
              ]
            },
            {
              width: '*',
              stack: [
                { text: `Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, alignment: 'right' },
                { text: `Estatus: ${student.status === 'active' ? 'ACTIVO' : 'INACTIVO'}`, alignment: 'right' },
              ]
            }
          ]
        },
        { text: '\nHistorial Académico', style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Materia', style: 'tableHeader' },
                { text: 'Semestre', style: 'tableHeader' },
                { text: 'Periodo', style: 'tableHeader' },
                { text: 'Calificación', style: 'tableHeader' },
                { text: 'Estatus', style: 'tableHeader' },
              ],
              ...studentGrades.map(g => {
                const subject = subjects.find(s => s.id === g.subjectId);
                return [
                  { text: subject?.name || 'N/A', style: 'tableCell' },
                  { text: g.semester.toString(), style: 'tableCell', alignment: 'center' },
                  { text: g.period, style: 'tableCell' },
                  { text: g.grade.toString(), style: 'tableCell', alignment: 'center' },
                  { text: g.status === 'approved' ? 'APROBADA' : 'REPROBADA', style: 'tableCell', color: g.status === 'approved' ? '#10b981' : '#ef4444' },
                ];
              })
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: '\n' },
        {
          columns: [
            { text: `Promedio General: ${(studentGrades.reduce((acc, curr) => acc + curr.grade, 0) / (studentGrades.length || 1)).toFixed(2)}`, bold: true },
            { text: `Materias Aprobadas: ${studentGrades.filter(g => g.status === 'approved').length}`, alignment: 'right' }
          ]
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true, color: '#4f46e5' },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
        tableHeader: { fontSize: 10, bold: true, fillColor: '#f3f4f6', margin: [0, 5, 0, 5] },
        tableCell: { fontSize: 9, margin: [0, 5, 0, 5] }
      }
    };

    pdfMake.createPdf(docDefinition).download(`Kardex_${student.controlNumber}.pdf`);
  };

  const handlePreRegisterUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) return;
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim().toLowerCase();
    const role  = formData.get('role') as 'admin' | 'staff' | 'teacher';
    if (!email) return;

    try {
      // Check if already a member of this school
      const existingSnap = await getDocs(query(
        collection(db, 'users'),
        where('email', '==', email),
        where('schoolId', '==', schoolId)
      ));
      if (!existingSnap.empty) {
        setNotification({ message: 'Este usuario ya pertenece a tu escuela.', type: 'info' });
        return;
      }
      // Check for duplicate pending invite
      const dupSnap = await getDocs(query(
        collection(db, 'school_invites'),
        where('email', '==', email),
        where('schoolId', '==', schoolId),
        where('status', '==', 'pending')
      ));
      if (!dupSnap.empty) {
        setNotification({ message: 'Ya existe una invitación pendiente para ese correo.', type: 'info' });
        return;
      }
      await addDoc(collection(db, 'school_invites'), {
        email, role, schoolId, status: 'pending', createdAt: serverTimestamp(),
      });

      // Send real email invitation
      let emailOk = false;
      let emailErr = '';
      try {
        const resp = await fetch('/api/send-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role, schoolName: schoolConfig?.name ?? 'tu escuela' }),
        });
        if (resp.ok) emailOk = true;
        else { const d = await resp.json(); emailErr = d.error ?? 'Error desconocido'; }
      } catch (e: any) { emailErr = e.message; }

      setIsUserModalOpen(false);
      setNotification({
        message: emailOk
          ? `Invitación enviada a ${email}. Recibirá un correo con instrucciones.`
          : `Invitación guardada, pero el correo falló: ${emailErr}`,
        type: emailOk ? 'success' : 'warning',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'school_invites');
    }
  };

  // ─── Migrate existing root-level data to schools/{schoolId}/... ────────────
  const migrateExistingData = async (targetSchoolId: string) => {
    const SCHOOL_COLS = [
      'students', 'teachers', 'subjects', 'classrooms', 'majors',
      'payments', 'expenses', 'attendance', 'grades',
      'schedule_scenarios', 'schedule_entries', 'academic_groups',
    ];
    let count = 0;
    try {
      for (const colName of SCHOOL_COLS) {
        const snap = await getDocs(collection(db, colName));
        if (snap.empty) continue;
        const batch = writeBatch(db);
        snap.forEach(d => {
          batch.set(doc(db, 'schools', targetSchoolId, colName, d.id), d.data());
          count++;
        });
        await batch.commit();
      }
      // Migrate school_config/main → schools/{id} (merge)
      const cfgSnap = await getDoc(doc(db, 'school_config', 'main'));
      if (cfgSnap.exists()) {
        await setDoc(doc(db, 'schools', targetSchoolId), { ...cfgSnap.data(), updatedAt: serverTimestamp() }, { merge: true });
      }
      if (count > 0) setNotification({ message: `Migración completa: ${count} registros transferidos.`, type: 'success' });
    } catch (err) {
      console.error('Migration error:', err);
    }
  };

  // ─── Switch empresa context (solo super admin) ──────────────────────────────
  // null = volver a la propia escuela; string = ver datos de otra empresa.
  const handleSwitchSchool = (id: string | null) => {
    setViewingSchoolId(id === schoolId ? null : id);
  };

  // ─── Create new school ──────────────────────────────────────────────────────
  // Dos flujos:
  //   1. Primer setup (userProfile.schoolId vacío): liga al usuario a la nueva escuela.
  //   2. Super admin creando empresa adicional: crea la escuela sin cambiar su propio schoolId.
  const handleCreateSchool = async (data: { name: string; address?: string; phone?: string; email?: string; semesterCost?: number }) => {
    if (!user || !userProfile) return;
    try {
      const schoolRef = await addDoc(collection(db, 'schools'), {
        ...data, semesterCost: data.semesterCost ?? 0, createdAt: serverTimestamp(),
      });
      const newSchoolId = schoolRef.id;
      if (!userProfile.schoolId) {
        // Primer setup: ligar al usuario a esta escuela
        const updatedProfile: UserProfile = { ...userProfile, schoolId: newSchoolId, role: 'admin' };
        await setDoc(doc(db, 'users', user.uid), updatedProfile);
        setUserProfile(updatedProfile);
        await migrateExistingData(newSchoolId);
        setSchoolId(newSchoolId);
        setNeedsSchoolSetup(false);
        setNotification({ message: '¡Escuela creada con éxito! Bienvenido a EduControl Pro.', type: 'success' });
      } else {
        // Super admin creando empresa adicional — no cambiar su propio schoolId
        setNotification({ message: `Empresa "${data.name}" creada con éxito.`, type: 'success' });
      }
    } catch (err) {
      console.error('Create school error:', err);
      setNotification({ message: 'Error al crear la escuela. Intenta de nuevo.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage
      onGoogleLogin={handleLogin}
      onEmailLogin={handleEmailLogin}
      onEmailRegister={handleEmailRegister}
      onPasswordReset={handlePasswordReset}
    />;
  }

  if (needsSchoolSetup) {
    return (
      <SchoolSetupPage
        userName={user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
        userEmail={user?.email || ''}
        onCreateSchool={handleCreateSchool}
        onLogout={handleLogout}
      />
    );
  }

  if (!schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ===== SIDEBAR ===== */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 flex flex-col h-screen sticky top-0 z-50 shrink-0 shadow-2xl`}>

        {/* Logo */}
        <div className={`flex items-center h-16 px-3 border-b border-white/10 shrink-0 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <img src="/bi2.png" alt="Logo" className="w-9 h-9 rounded-xl object-contain shrink-0" />
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">EduControl Pro</p>
              <p className="text-indigo-300 text-[10px] font-medium uppercase tracking-widest whitespace-nowrap">Administración</p>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden px-2 space-y-0.5">
          {([
            { tab: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard'     },
            { tab: 'students',   icon: Users,           label: 'Alumnos'       },
            { tab: 'teachers',   icon: UserCheck,       label: 'Maestros'      },
            { tab: 'classrooms', icon: DoorOpen,        label: 'Salones'       },
            { tab: 'majors',     icon: GraduationCap,   label: 'Carreras'      },
            { tab: 'subjects',   icon: BookOpen,        label: 'Materias'      },
            { tab: 'attendance', icon: Clock,           label: 'Asistencias'   },
            { tab: 'search',     icon: Search,          label: 'Búsqueda'      },
            { tab: 'payments',   icon: CreditCard,      label: 'Pagos'         },
            { tab: 'expenses',   icon: Receipt,         label: 'Egresos'       },
            { tab: 'scheduling', icon: Cpu,             label: 'Programación'  },
            { tab: 'tasks',      icon: ClipboardList,   label: 'Tareas'        },
            { tab: 'marketing',  icon: Video,           label: 'Marketing IA'  },
            ...(userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com' ? [
              { tab: 'users',    icon: UserPlus,        label: 'Usuarios'      },
              { tab: 'settings', icon: Building2,       label: 'Admon Escuelas'},
            ] : []),
          ] as { tab: typeof activeTab; icon: any; label: string }[]).map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              title={sidebarCollapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                activeTab === tab
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-indigo-300 hover:bg-white/10 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">{label}</span>
              )}
              {activeTab === tab && !sidebarCollapsed && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60] shadow-xl border border-gray-700">
                  {label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* School logo */}
        {schoolConfig && (
          <div className={`shrink-0 border-t border-white/10 px-3 py-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            {sidebarCollapsed ? (
              schoolConfig.logo
                ? <img src={schoolConfig.logo} alt={schoolConfig.name} className="w-9 h-9 rounded-xl object-cover" />
                : <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white text-xs font-black">{schoolConfig.name?.[0]}</div>
            ) : (
              <div className="flex items-center gap-2.5 px-1">
                {schoolConfig.logo
                  ? <img src={schoolConfig.logo} alt={schoolConfig.name} className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-md" />
                  : <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0">{schoolConfig.name?.[0]}</div>
                }
                <div className="overflow-hidden">
                  <p className="text-white text-xs font-semibold truncate leading-tight">{schoolConfig.name}</p>
                  <p className="text-indigo-400 text-[10px]">Escuela activa</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User info + Collapse toggle */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 px-1 py-1">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                {(user.displayName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-white text-xs font-semibold truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-indigo-300 text-[10px] truncate">{user.email}</p>
                <p className="text-indigo-400 text-[10px]">
                  {userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'teacher' ? 'Maestro' : 'Personal'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="w-full flex items-center justify-center gap-2 py-2 text-indigo-400 hover:text-white hover:bg-white/10 rounded-xl transition-all text-xs font-medium"
          >
            {sidebarCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span>Contraer menú</span></>
            }
          </button>
        </div>
      </aside>

      {/* ===== CONTENT AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* --- Banner: super admin viendo otra empresa --- */}
        {viewingSchoolId && viewingSchoolId !== schoolId && (
          <div className="shrink-0 bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between gap-4 shadow-md z-40">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-base">👁</span>
              Viendo datos de:&nbsp;
              <span className="font-bold">
                {allSchools.find(s => s.id === viewingSchoolId)?.name ?? viewingSchoolId}
              </span>
              <span className="opacity-75 font-normal">— los cambios afectan esta empresa</span>
            </div>
            <button
              onClick={() => handleSwitchSchool(null)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
            >
              ✕ Volver a mi empresa
            </button>
          </div>
        )}

        {/* --- Main Content --- */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Welcome Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Hola, {user.displayName?.split(' ')[0]}! 👋</h2>
                  <p className="text-gray-500 font-medium">Aquí tienes un resumen de lo que está pasando hoy en {schoolConfig?.name || 'tu institución'}.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {(userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com') && (
                    <button 
                      onClick={handleSeedFinancialData}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 font-bold text-xs"
                      title="Generar datos de ingresos y egresos de prueba"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generar Datos Financieros
                    </button>
                  )}
                  <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="pr-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Fecha Actual</p>
                      <p className="text-sm font-bold text-gray-700">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+{students.filter(s => s.status === 'active').length} Activos</span>
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Alumnos</p>
                  <h3 className="text-3xl font-black text-gray-900">{students.length}</h3>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{teachers.length} Docentes</span>
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Maestros</p>
                  <h3 className="text-3xl font-black text-gray-900">{teachers.length}</h3>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      {Math.round((attendanceLogs.filter(l => {
                        const d = l.timestamp instanceof Timestamp ? l.timestamp.toDate() : (l.timestamp ? new Date(l.timestamp) : null);
                        return d && isSameDay(new Date(), d);
                      }).length / (students.length || 1)) * 100)}% Hoy
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Asistencia</p>
                  <h3 className="text-3xl font-black text-gray-900">{attendanceLogs.filter(l => {
                    const d = l.timestamp instanceof Timestamp ? l.timestamp.toDate() : (l.timestamp ? new Date(l.timestamp) : null);
                    return d && isSameDay(new Date(), d);
                  }).length}</h3>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{scheduleScenarios.length} Escenarios</span>
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Programaciones</p>
                  <h3 className="text-3xl font-black text-gray-900">{scheduleEntries.length} <span className="text-sm font-medium text-gray-400">clases</span></h3>
                </div>
              </div>

              {/* Financial Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-inner">
                      <DollarSign className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Ingresos</span>
                      <span className="text-[10px] text-gray-400 font-bold mt-1">Total Acumulado</span>
                    </div>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">
                    ${payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                  </h3>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform shadow-inner">
                      <Receipt className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest">Egresos</span>
                      <span className="text-[10px] text-gray-400 font-bold mt-1">Total Acumulado</span>
                    </div>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">
                    ${expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}
                  </h3>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-inner">
                      <TrendingUp className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Balance</span>
                      <span className="text-[10px] text-gray-400 font-bold mt-1">Neto</span>
                    </div>
                  </div>
                  <h3 className={`text-4xl font-black tracking-tight ${
                    (payments.reduce((acc, p) => acc + p.amount, 0) - expenses.reduce((acc, e) => acc + e.amount, 0)) >= 0 
                    ? 'text-gray-900' : 'text-rose-600'
                  }`}>
                    ${(payments.reduce((acc, p) => acc + p.amount, 0) - expenses.reduce((acc, e) => acc + e.amount, 0)).toLocaleString()}
                  </h3>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          (payments.reduce((acc, p) => acc + p.amount, 0) - expenses.reduce((acc, e) => acc + e.amount, 0)) >= 0 
                          ? 'bg-indigo-500' : 'bg-rose-500'
                        }`} 
                        style={{ width: '100%' }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attendance Trend */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Tendencia de Asistencia</h3>
                      <p className="text-sm text-gray-500">Últimos 7 días</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={Array.from({ length: 7 }).map((_, i) => {
                          const date = subDays(new Date(), 6 - i);
                          const count = attendanceLogs.filter(l => {
                            const d = l.timestamp instanceof Timestamp ? l.timestamp.toDate() : (l.timestamp ? new Date(l.timestamp) : null);
                            return d && isSameDay(date, d);
                          }).length;
                          return {
                            name: format(date, 'EEE', { locale: es }),
                            asistencias: count
                          };
                        })}
                      >
                        <defs>
                          <linearGradient id="colorAsist" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#9ca3af' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#9ca3af' }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="asistencias" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorAsist)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Students by Major */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Distribución por Carrera</h3>
                      <p className="text-sm text-gray-500">Alumnos inscritos</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <PieChartIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={majors.map(m => ({
                            name: m.name,
                            value: students.filter(s => s.majorId === m.id).length
                          })).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {majors.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {majors.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }} />
                        <span className="text-xs font-medium text-gray-600 truncate">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Balance Chart */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Balance Financiero</h3>
                    <p className="text-sm text-gray-500">Ingresos vs Egresos (Últimos 7 días)</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <BarChartIcon className="w-5 h-5" />
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Array.from({ length: 7 }).map((_, i) => {
                        const date = subDays(new Date(), 6 - i);
                        const income = payments.filter(p => {
                          const d = p.date instanceof Timestamp ? p.date.toDate() : (p.date ? new Date(p.date as any) : null);
                          return d && isSameDay(date, d);
                        }).reduce((acc, p) => acc + p.amount, 0);
                        const expense = expenses.filter(e => {
                          const d = e.date instanceof Timestamp ? e.date.toDate() : (e.date ? new Date(e.date as any) : null);
                          return d && isSameDay(date, d);
                        }).reduce((acc, e) => acc + e.amount, 0);
                        return {
                          name: format(date, 'EEE', { locale: es }),
                          ingresos: income,
                          egresos: expense
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" />
                      <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Actividad Reciente</h3>
                  <div className="space-y-6">
                    {attendanceLogs.slice(0, 5).map((log, i) => {
                      const student = students.find(s => s.controlNumber === log.personId);
                      const teacher = teachers.find(t => t.employeeId === log.personId);
                      const person = student || teacher;
                      const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : (log.timestamp ? new Date(log.timestamp) : new Date());
                      
                      return (
                        <div key={log.id || i} className="flex items-center gap-4 group">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${log.type === 'entry' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {log.type === 'entry' ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{person ? `${person.firstName} ${person.lastName}` : 'Usuario Desconocido'}</p>
                            <p className="text-xs text-gray-500">Registró {log.type === 'entry' ? 'entrada' : 'salida'} ({log.personType === 'student' ? 'Alumno' : 'Maestro'})</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-400">{format(logDate, 'HH:mm')}</p>
                          </div>
                        </div>
                      );
                    })}
                    {attendanceLogs.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 italic">No hay actividad reciente para mostrar.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                  <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <h3 className="text-xl font-bold mb-6 relative z-10">Acciones Rápidas</h3>
                  <div className="space-y-3 relative z-10">
                    <button 
                      onClick={() => setActiveTab('students')}
                      className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center gap-4 transition-all text-left border border-white/10"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span className="font-bold text-sm">Inscribir Alumno</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center gap-4 transition-all text-left border border-white/10"
                    >
                      <Clock className="w-5 h-5" />
                      <span className="font-bold text-sm">Pasar Asistencia</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('scheduling')}
                      className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center gap-4 transition-all text-left border border-white/10"
                    >
                      <Cpu className="w-5 h-5" />
                      <span className="font-bold text-sm">Generar Horarios</span>
                    </button>
                  </div>
                  <div className="mt-10 p-4 bg-indigo-500/30 rounded-2xl border border-white/10">
                    <p className="text-xs font-medium text-indigo-100 leading-relaxed">
                      "La educación es el arma más poderosa que puedes usar para cambiar el mundo."
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-indigo-200">— Nelson Mandela</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'students' && (
            <StudentsPage
              students={students}
              majors={majors}
              subjects={subjects}
              teachers={teachers}
              grades={grades}
              payments={payments}
              attendanceLogs={attendanceLogs}
              userProfile={userProfile}
              user={user}
              isDataLoading={isDataLoading}
              onLogAttendance={handleLogAttendance}
              onDelete={handleDelete}
              onGenerateReport={generateStudentReport}
              onGenerateRandom={handleGenerateRandomStudents}
              onOpenNew={() => { setEditingItem(null); setIsModalOpen(true); }}
              onOpenEdit={(student) => { setEditingItem(student); setIsModalOpen(true); }}
              onViewDetail={(student) => { setSelectedStudent(student); setIsFichaOpen(true); }}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersPage
              teachers={teachers}
              subjects={subjects}
              userProfile={userProfile}
              user={user}
              isDataLoading={isDataLoading}
              onLogAttendance={handleLogAttendance}
              onDelete={handleDelete}
              onOpenNew={() => {
                setEditingItem(null);
                setTeacherAvail(emptyWeek());
                setIsModalOpen(true);
              }}
              onOpenEdit={t => {
                setEditingItem(t);
                const av = (t.availability ?? {}) as any;
                const week = emptyWeek();
                (Object.keys(week) as DayKey[]).forEach(day => {
                  const raw = av[day] ?? [];
                  week[day] = raw.map((s: any) => {
                    // support both old string format "07:00-14:00" and new object format
                    if (typeof s === 'string') {
                      const [start, end] = s.split('-');
                      return { start: start ?? '07:00', end: end ?? '14:00', subjectId: '' };
                    }
                    return { start: s.start ?? '07:00', end: s.end ?? '14:00', subjectId: s.subjectId ?? '' };
                  });
                });
                setTeacherAvail(week);
                setIsModalOpen(true);
              }}
              onViewProfile={t => { setSelectedTeacher(t); setIsTeacherProfileOpen(true); }}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectsPage
              subjects={subjects}
              teachers={teachers}
              classrooms={classrooms}
              userProfile={userProfile}
              user={user}
              isDataLoading={isDataLoading}
              onDelete={handleDelete}
              onOpenNew={() => { setEditingItem(null); setIsModalOpen(true); }}
              onOpenEdit={s => { setEditingItem(s); setIsModalOpen(true); }}
            />
          )}

          {activeTab === 'classrooms' && (
            <ClassroomsPage
              classrooms={classrooms}
              userProfile={userProfile}
              user={user}
              isDataLoading={isDataLoading}
              onDelete={handleDeleteClassroom}
              onOpenNew={() => { setEditingItem(null); setIsModalOpen(true); }}
              onOpenEdit={c => { setEditingItem(c); setIsModalOpen(true); }}
            />
          )}

          {activeTab === 'majors' && (
            <MajorsPage
              majors={majors}
              userProfile={userProfile}
              user={user}
              isDataLoading={isDataLoading}
              onDelete={handleDelete}
              onOpenNew={() => { setEditingItem(null); setIsModalOpen(true); }}
              onOpenEdit={m => { setEditingItem(m); setIsModalOpen(true); }}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendancePage
              attendanceLogs={attendanceLogs}
              students={students}
              teachers={teachers}
              isDataLoading={isDataLoading}
            />
          )}

          {activeTab === 'users' && (
            <UsersPage
              usersList={usersList}
              currentUserEmail={user?.email ?? ''}
              onOpenNewUser={() => setIsUserModalOpen(true)}
              onUpdateRole={handleUpdateUserRole}
              onSetBotPin={handleSetBotPin}
            />
          )}

          {activeTab === 'schools' && (
            <SchoolsPage
              schools={allSchools}
              currentSchoolId={schoolId!}
              activeSchoolId={activeSchoolId!}
              userProfile={userProfile!}
              isSuperAdmin={user?.email === 'jsorglez@gmail.com'}
              pendingInvites={pendingInvites}
              usersList={usersList}
              isDataLoading={isDataLoading}
              onCreateSchool={handleCreateSchool}
              onInviteUser={handleInviteUser}
              onRevokeInvite={handleRevokeInvite}
              onUpdateRole={handleUpdateUserRole}
              onSwitchSchool={handleSwitchSchool}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksPage
              tasks={tasks}
              taskAssignments={taskAssignments}
              taskSubmissions={taskSubmissions}
              students={students.filter(s => s.status === 'active')}
              teachers={teachers}
              academicGroups={academicGroups}
              subjects={subjects}
              userProfile={userProfile!}
              schoolId={activeSchoolId!}
              isSuperAdmin={user?.email === 'jsorglez@gmail.com'}
              onSaveTask={handleSaveTask}
              onAssignTask={handleAssignTask}
              onGrade={handleGradeSubmission}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Configuración de la Escuela</h2>
                  <p className="text-gray-500">Personaliza los datos y la imagen de tu institución.</p>
                </div>
              </div>

              {/* ── Usuarios de la escuela ── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Usuarios de la Escuela</p>
                  <span className="text-xs text-gray-400">{usersList.length} usuarios</span>
                </div>

                {/* Invite form */}
                <div className="px-6 py-4 border-b border-gray-50">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!settingsInviteEmail.trim()) return;
                      setIsInvitingFromSettings(true);
                      try {
                        await handleInviteUser(settingsInviteEmail.trim(), settingsInviteRole, activeSchoolId!);
                        setSettingsInviteEmail('');
                      } finally { setIsInvitingFromSettings(false); }
                    }}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="email"
                      required
                      value={settingsInviteEmail}
                      onChange={e => setSettingsInviteEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <select
                      value={settingsInviteRole}
                      onChange={e => setSettingsInviteRole(e.target.value as 'admin' | 'staff' | 'teacher')}
                      className="w-full sm:w-40 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="teacher">Maestro</option>
                      <option value="staff">Personal</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isInvitingFromSettings || !settingsInviteEmail.trim()}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isInvitingFromSettings
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <UserPlus className="w-4 h-4" />}
                      Invitar
                    </button>
                  </form>
                </div>

                {/* Users list */}
                <div className="divide-y divide-gray-50 px-6">
                  {usersList.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin usuarios registrados</p>
                  ) : usersList.map(u => (
                    <div key={u.uid} className="flex items-center gap-3 py-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {(u.email?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.email}</p>
                        <p className="text-xs text-gray-400">{u.uid === userProfile!.uid ? 'Tú' : 'Usuario'}</p>
                      </div>
                      <select
                        disabled={u.uid === userProfile!.uid}
                        value={u.role}
                        onChange={e => handleUpdateUserRole(u.uid, e.target.value as 'admin' | 'staff' | 'teacher')}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <option value="teacher">Maestro</option>
                        <option value="staff">Personal</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  ))}
                </div>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                  <div className="px-6 pb-4 pt-2 border-t border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Invitaciones pendientes</p>
                    <div className="divide-y divide-gray-50">
                      {pendingInvites.map(inv => (
                        <div key={inv.id} className="flex items-center gap-3 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{inv.email}</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pendiente</span>
                          <button
                            onClick={() => handleRevokeInvite(inv.id!)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Lista de escuelas ── */}
              {allSchools.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mis Escuelas</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allSchools.map(s => {
                      const isCurrent = s.id === activeSchoolId;
                      const isOwn     = s.id === schoolId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => user?.email === 'jsorglez@gmail.com' && handleSwitchSchool(s.id!)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          {s.logo
                            ? <img src={s.logo} className="w-9 h-9 rounded-xl object-cover shrink-0" alt={s.name} />
                            : <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 font-black text-sm">{s.name?.[0]}</div>
                          }
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-indigo-700' : 'text-gray-800'}`}>{s.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isCurrent && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">📍 Estás aquí</span>}
                              {isOwn    && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Tu escuela</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
                    <div className="w-32 h-32 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-6 overflow-hidden relative group">
                      {schoolConfig?.logo ? (
                        <img src={schoolConfig.logo} className="w-full h-full object-contain" alt="Logo" />
                      ) : (
                        <Shield className="w-12 h-12 text-gray-300" />
                      )}
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Plus className="w-8 h-8 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Logo Institucional</h3>
                    <p className="text-xs text-gray-500">Recomendado: PNG transparente, 512x512px.</p>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <form onSubmit={handleSaveSchoolConfig} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Nombre de la Escuela</label>
                          <input name="name" defaultValue={schoolConfig?.name} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Teléfono</label>
                          <input name="phone" defaultValue={schoolConfig?.phone} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Correo de Contacto</label>
                          <input name="email" type="email" defaultValue={schoolConfig?.email} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Costo Semestre ($)</label>
                          <input name="semesterCost" type="number" defaultValue={schoolConfig?.semesterCost || 0} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Dirección</label>
                          <input name="address" defaultValue={schoolConfig?.address} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        Guardar Cambios
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="max-w-2xl mx-auto text-center space-y-4">
                <h2 className="text-3xl font-bold text-gray-900">Búsqueda de Alumno</h2>
                <p className="text-gray-500">Ingresa el número de control para ver la información detallada.</p>
                <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <input 
                    type="text" 
                    placeholder="Ej. 2024001"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-3 outline-none text-gray-900"
                  />
                  <button 
                    onClick={handleSearch}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {searchResults && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl shadow-indigo-500/10 overflow-hidden border border-gray-100"
                >
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="relative flex flex-col md:flex-row items-center gap-8">
                      <div className="w-32 h-32 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-4xl font-black shadow-2xl border border-white/20">
                        {searchResults.firstName[0]}{searchResults.lastName[0]}
                      </div>
                      <div className="text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                          <h3 className="text-4xl font-black tracking-tight">{searchResults.firstName} {searchResults.lastName}</h3>
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 backdrop-blur-md ${
                            searchResults.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {searchResults.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-indigo-100 font-mono text-xl opacity-80">Expediente #{searchResults.controlNumber}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                      <section>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Información de Contacto</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InfoCard label="Correo Electrónico" value={searchResults.email} icon={Users} />
                          <InfoCard label="Teléfono" value={searchResults.phone} icon={Clock} />
                          <InfoCard label="Dirección" value={searchResults.address} icon={BookOpen} className="md:col-span-2" />
                        </div>
                      </section>

                      <section>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Detalles Académicos</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InfoCard label="Grado y Grupo" value={`${searchResults.grade}° ${searchResults.group}`} icon={BookOpen} />
                          <InfoCard label="Fecha de Nacimiento" value={searchResults.birthDate} icon={Clock} />
                          <InfoCard label="Clave de Acceso" value={searchResults.internetPassword} icon={Shield} isMono />
                        </div>
                      </section>
                    </div>

                    <div className="space-y-10">
                      <section className="bg-rose-50/50 p-8 rounded-[2.5rem] border border-rose-100">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                          <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest">Emergencias</h4>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1">Tipo de Sangre</p>
                            <p className="text-2xl font-black text-rose-700">{searchResults.bloodType || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1">Contacto</p>
                            <p className="text-lg font-bold text-rose-900">{searchResults.emergencyContact || 'No registrado'}</p>
                            <p className="text-sm font-mono text-rose-600">{searchResults.emergencyPhone || 'Sin teléfono'}</p>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
          {activeTab === 'scheduling' && (
            <motion.div 
              key="scheduling"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Programación Académica</h2>
                  <p className="text-gray-500 font-medium">Genera y gestiona escenarios de horarios para el próximo ciclo.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSeedSchedulingData}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:border-emerald-600 hover:text-emerald-600 transition-all shadow-sm"
                    disabled={isDataLoading}
                  >
                    <BookOpen className="w-5 h-5" />
                    Cargar Datos Ejemplo
                  </button>
                  <button 
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    <Layers className="w-5 h-5" />
                    Grupos Académicos
                  </button>
                  <button 
                    onClick={handleGenerateSchedule}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                    disabled={isDataLoading}
                  >
                    <Cpu className="w-5 h-5" />
                    {isDataLoading ? 'Generando...' : 'Generar Escenario IA'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Scenarios List */}
                <div className="lg:col-span-1 space-y-6">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Escenarios</h3>
                  <div className="space-y-4">
                    {scheduleScenarios.length === 0 ? (
                      <div className="p-8 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
                        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No hay escenarios generados aún.</p>
                      </div>
                    ) : scheduleScenarios.map(scenario => (
                      <div 
                        key={scenario.id} 
                        onClick={() => setSelectedScenarioId(scenario.id!)}
                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer group relative ${
                          selectedScenarioId === scenario.id 
                            ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 text-white' 
                            : 'bg-white border-gray-100 shadow-sm hover:shadow-md text-gray-900'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            selectedScenarioId === scenario.id ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {scenario.status}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteScenario(scenario.id!); }}
                            className={`p-2 rounded-lg transition-all ${
                              selectedScenarioId === scenario.id ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-rose-600'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="text-lg font-bold mb-1">{scenario.name}</h4>
                        <p className={`text-sm line-clamp-2 mb-4 ${selectedScenarioId === scenario.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {scenario.description}
                        </p>
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter ${selectedScenarioId === scenario.id ? 'text-white/60' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(scenario.createdAt?.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] pt-4">Grupos Académicos</h3>
                  <div className="space-y-2">
                    {academicGroups.map(group => (
                      <div key={group.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{group.name}</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Grado {group.grade}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteAcademicGroup(group.id!)}
                          className="p-2 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Schedule View */}
                <div className="lg:col-span-3 space-y-6">
                  {selectedScenarioId ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">
                          Horario: {scheduleScenarios.find(s => s.id === selectedScenarioId)?.name}
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => generateScheduleReport(selectedScenarioId)}
                            className="px-4 py-2 bg-white border-2 border-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Exportar PDF
                          </button>
                          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Activar Escenario
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-4">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                          <div key={day} className="space-y-4">
                            <div className="p-3 bg-gray-900 rounded-xl text-center">
                              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                {day === 'monday' ? 'Lunes' : 
                                 day === 'tuesday' ? 'Martes' : 
                                 day === 'wednesday' ? 'Miércoles' : 
                                 day === 'thursday' ? 'Jueves' : 'Viernes'}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {scheduleEntries
                                .filter(e => e.scenarioId === selectedScenarioId && e.day === day)
                                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                .map(entry => {
                                  const teacher = teachers.find(t => t.employeeId === entry.teacherId);
                                  const subject = subjects.find(s => s.id === entry.subjectId);
                                  const classroom = classrooms.find(c => c.id === entry.classroomId);
                                  const group = academicGroups.find(g => g.id === entry.groupId);

                                  return (
                                    <div key={entry.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-600 transition-all group">
                                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter mb-1">
                                        {entry.startTime} - {entry.endTime}
                                      </p>
                                      <h5 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{subject?.name || 'Materia'}</h5>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                          <User className="w-3 h-3" />
                                          {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Sin maestro'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                          <DoorOpen className="w-3 h-3" />
                                          {classroom?.name || 'Sin salón'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                          <Users className="w-3 h-3" />
                                          Grupo {group?.name || 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 min-h-[600px] flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-6">
                        <Calendar className="w-10 h-10" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">Selecciona un escenario</h4>
                      <p className="text-gray-500 max-w-xs mx-auto">Elige un escenario de la lista de la izquierda para visualizar la distribución de maestros, materias y salones.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <PaymentsPage
              payments={payments}
              students={students}
              schoolConfig={schoolConfig}
              userProfile={userProfile}
              user={user!}
              isDataLoading={isDataLoading}
              onDelete={handleDeletePayment}
              onGenerateReport={generatePaymentsReport}
              onGenerateReceipt={generateReceipt}
              onOpenNew={() => { setEditingItem(null); setIsModalOpen(true); }}
              onOpenEdit={p => { setEditingItem(p); setIsModalOpen(true); }}
              onGoToSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesPage
              expenses={expenses}
              userProfile={userProfile}
              user={user!}
              isDataLoading={isDataLoading}
              onDelete={handleDeleteExpense}
              onOpenNew={() => { setEditingItem(null); setIsModalOpen(true); }}
              onOpenEdit={e => { setEditingItem(e); setIsModalOpen(true); }}
            />
          )}

          {activeTab === 'marketing' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">Marketing AI <span className="text-indigo-600">Español</span></h2>
                  <p className="text-gray-500 font-medium mt-1">Genera contenido promocional profesional para tu institución</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Video Generation Section */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Film className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Video Promocional</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Crea clips cinemáticos con interfaces en español para mostrar la potencia de EduControl Pro.
                    </p>
                  </div>

                  <button
                    onClick={handleGeneratePromoVideo}
                    disabled={isGeneratingVideo}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg ${
                      isGeneratingVideo 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                    }`}
                  >
                    {isGeneratingVideo ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <Video className="w-5 h-5" />
                        Generar Video
                      </>
                    )}
                  </button>

                  {videoStatus && (
                    <p className="text-center text-[10px] font-bold text-indigo-600 animate-pulse">
                      {videoStatus}
                    </p>
                  )}

                  <div className="aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center">
                    {generatedVideoUrl ? (
                      <video src={generatedVideoUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-12 h-12 text-gray-800" />
                    )}
                  </div>
                </div>

                {/* Script Generation Section */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900">Guion y Locución</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingScript ? 'Generando...' : 'Generar Guion'}
                      </button>
                      <button
                        onClick={handleGenerateVoiceover}
                        disabled={isGeneratingAudio || !promoScript}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingAudio ? 'Generando...' : 'Generar Voz'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-3xl p-6 border border-gray-100 overflow-y-auto max-h-[300px]">
                    {promoScript ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                          {promoScript}
                        </pre>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
                        <Sparkles className="w-8 h-8 opacity-20" />
                        <p className="text-sm italic">Haz clic en "Generar Guion" para crear un texto publicitario profesional.</p>
                      </div>
                    )}
                  </div>

                  {generatedAudioUrl && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm">
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Locución Generada</p>
                        <audio src={generatedAudioUrl} controls className="w-full h-8 mt-1" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isTeacherProfileOpen && selectedTeacher && (
          <Modal 
            isOpen={isTeacherProfileOpen} 
            onClose={() => { setIsTeacherProfileOpen(false); setSelectedTeacher(null); }}
            title="Ficha del Maestro"
          >
            <div className="space-y-8">
              <div className="flex items-center gap-6 p-6 bg-amber-600 rounded-2xl text-white">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-bold">
                  {selectedTeacher.firstName[0]}{selectedTeacher.lastName[0]}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{selectedTeacher.firstName} {selectedTeacher.lastName}</h3>
                  <p className="text-amber-100 font-mono">ID: {selectedTeacher.employeeId}</p>
                  <p className="text-sm opacity-80">{selectedTeacher.specialty || 'Docente'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Información Profesional</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Especialidad</p>
                      <p className="text-gray-900 font-medium">{selectedTeacher.specialty || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Correo Electrónico</p>
                      <p className="text-gray-900 font-medium">{selectedTeacher.email || 'No registrado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Materias Impartidas</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedTeacher.subjectIds && selectedTeacher.subjectIds.length > 0 ? (
                          selectedTeacher.subjectIds.map(sid => {
                            const sub = subjects.find(s => s.id === sid);
                            return sub ? (
                              <span key={sid} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">
                                {sub.name}
                              </span>
                            ) : null;
                          })
                        ) : (
                          <p className="text-gray-400 text-sm italic">Sin materias asignadas</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest">Disponibilidad</h4>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                    {selectedTeacher.availability && Object.entries(selectedTeacher.availability).map(([day, slots]) => (
                      <div key={day} className="flex justify-between items-center text-xs">
                        <span className="font-black uppercase text-amber-600">{day}</span>
                        <span className="font-bold text-amber-900">{(slots as string[]).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </main>

      {/* --- Modals --- */}
      {/* --- Toast Notification --- */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
              notification.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' :
              'bg-gray-900 border-gray-800 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
             notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
             <Info className="w-5 h-5" />}
            <span className="font-bold text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Confirm Dialog --- */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mb-6">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">{confirmDialog.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:border-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUserModalOpen && (
          <Modal 
            isOpen={isUserModalOpen} 
            onClose={() => setIsUserModalOpen(false)} 
            title="Pre-registrar Nuevo Usuario"
          >
            <form onSubmit={handlePreRegisterUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (Google)</label>
                <input 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="ejemplo@gmail.com"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">El usuario debe usar este correo para iniciar sesión.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol Asignado</label>
                <select 
                  name="role" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="staff">Personal (Staff)</option>
                  <option value="teacher">Maestro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Registrar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {isModalOpen && (
          <Modal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
            title={editingItem ? 'Editar Registro' : 'Nuevo Registro'}
          >
            {activeTab === 'students' && (
              <form onSubmit={handleSaveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── Bloque 1: Identificación (más usados) ── */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Número de Control</label>
                  <input name="controlNumber" defaultValue={editingItem?.controlNumber} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nivel Educativo</label>
                  <select name="educationLevel" defaultValue={editingItem?.educationLevel ?? ''} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                    <option value="">Seleccionar Nivel</option>
                    <option value="kinder">Kinder</option>
                    <option value="primaria">Primaria</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="preparatoria">Preparatoria</option>
                    <option value="universidad">Universidad</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre(s)</label>
                  <input name="firstName" defaultValue={editingItem?.firstName} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Apellidos</label>
                  <input name="lastName" defaultValue={editingItem?.lastName} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Grado</label>
                  <input name="grade" type="number" min="1" max="12" defaultValue={editingItem?.grade} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Grupo</label>
                  <input name="group" defaultValue={editingItem?.group} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Carrera / Programa</label>
                  <select name="majorId" defaultValue={editingItem?.majorId} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                    <option value="">Seleccionar Carrera</option>
                    {majors.map(major => (
                      <option key={major.id} value={major.id}>{major.name} ({major.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Clave de Internet</label>
                  <input name="internetPassword" defaultValue={editingItem?.internetPassword} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>

                {/* ── Bloque 2: Contacto ── */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Correo</label>
                  <input name="email" type="email" defaultValue={editingItem?.email} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Teléfono</label>
                  <input name="phone" defaultValue={editingItem?.phone} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Contacto Emergencia</label>
                  <input name="emergencyContact" defaultValue={editingItem?.emergencyContact} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tel. Emergencia</label>
                  <input name="emergencyPhone" defaultValue={editingItem?.emergencyPhone} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>

                {/* ── Bloque 3: Datos adicionales ── */}
                <div className="col-span-full space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Dirección</label>
                  <input name="address" defaultValue={editingItem?.address} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Sangre</label>
                  <input name="bloodType" defaultValue={editingItem?.bloodType} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>

                {/* ── Bloque 4: Materias ── */}
                <div className="col-span-full space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Asignar Materias</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 max-h-48 overflow-y-auto">
                    {subjects.map(subject => (
                      <label key={subject.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group">
                        <input
                          type="checkbox"
                          name="subjectIds"
                          value={subject.id}
                          defaultChecked={editingItem?.subjectIds?.includes(subject.id)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{subject.name}</span>
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{subject.code}</span>
                        </div>
                      </label>
                    ))}
                    {subjects.length === 0 && (
                      <p className="col-span-full text-center py-4 text-gray-400 text-sm italic">No hay materias registradas.</p>
                    )}
                  </div>
                </div>

                <button type="submit" className="col-span-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Guardar Alumno
                </button>
              </form>
            )}

            {activeTab === 'majors' && (
              <form onSubmit={handleSaveMajor} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Código de Carrera</label>
                  <input name="code" defaultValue={editingItem?.code} required placeholder="EJ: ISC, LNI, ARQ" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-amber-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre de la Carrera</label>
                  <input name="name" defaultValue={editingItem?.name} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-amber-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                  <textarea name="description" defaultValue={editingItem?.description} rows={3} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-amber-600 transition-colors resize-none" />
                </div>
                <button type="submit" className="w-full mt-4 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100">
                  Guardar Carrera
                </button>
              </form>
            )}

            {activeTab === 'teachers' && (
              <form onSubmit={handleSaveTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">ID Empleado</label>
                  <input name="employeeId" defaultValue={editingItem?.employeeId} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre(s)</label>
                  <input name="firstName" defaultValue={editingItem?.firstName} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Apellidos</label>
                  <input name="lastName" defaultValue={editingItem?.lastName} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Especialidad</label>
                  <input name="specialty" defaultValue={editingItem?.specialty} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="col-span-full space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Correo</label>
                  <input name="email" type="email" defaultValue={editingItem?.email} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="col-span-full space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase">Disponibilidad Semanal</label>
                  <div className="space-y-3">
                    {DAY_LABELS.map(({ key, label }) => (
                      <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
                        {/* Day header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
                          <span className="text-sm font-bold text-gray-700">{label}</span>
                          <button
                            type="button"
                            onClick={() => setTeacherAvail(prev => ({
                              ...prev,
                              [key]: [...prev[key], { start: '07:00', end: '08:00', subjectId: '' }]
                            }))}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <span className="text-base leading-none">＋</span> Agregar clase
                          </button>
                        </div>
                        {/* Slots list */}
                        {teacherAvail[key].length === 0 ? (
                          <p className="text-xs text-gray-400 italic px-4 py-2">Sin clases asignadas</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {teacherAvail[key].map((slot, idx) => (
                              <div key={idx} className="flex items-center gap-2 px-4 py-2 flex-wrap">
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={e => setTeacherAvail(prev => {
                                    const updated = prev[key].map((s, i) => i === idx ? { ...s, start: e.target.value } : s);
                                    return { ...prev, [key]: updated };
                                  })}
                                  className="p-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <span className="text-gray-400 text-xs font-medium">a</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={e => setTeacherAvail(prev => {
                                    const updated = prev[key].map((s, i) => i === idx ? { ...s, end: e.target.value } : s);
                                    return { ...prev, [key]: updated };
                                  })}
                                  className="p-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <select
                                  value={slot.subjectId}
                                  onChange={e => setTeacherAvail(prev => {
                                    const updated = prev[key].map((s, i) => i === idx ? { ...s, subjectId: e.target.value } : s);
                                    return { ...prev, [key]: updated };
                                  })}
                                  className="flex-1 min-w-[140px] p-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                  <option value="">— Materia —</option>
                                  {subjects.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setTeacherAvail(prev => ({
                                    ...prev,
                                    [key]: prev[key].filter((_, i) => i !== idx)
                                  }))}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar clase"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Asignar Materias</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 max-h-48 overflow-y-auto">
                    {subjects.map(subject => (
                      <label key={subject.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name="subjectIds" 
                          value={subject.id} 
                          defaultChecked={editingItem?.subjectIds?.includes(subject.id)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{subject.name}</span>
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{subject.code}</span>
                        </div>
                      </label>
                    ))}
                    {subjects.length === 0 && (
                      <p className="col-span-full text-center py-4 text-gray-400 text-sm italic">No hay materias registradas.</p>
                    )}
                  </div>
                </div>
                <button type="submit" className="col-span-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Guardar Maestro
                </button>
              </form>
            )}

            {activeTab === 'subjects' && (
              <form onSubmit={handleSaveSubject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Código Materia</label>
                    <input name="code" defaultValue={editingItem?.code} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre de la Materia</label>
                    <input name="name" defaultValue={editingItem?.name} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Horas Semanales</label>
                    <input name="weeklyHours" type="number" defaultValue={editingItem?.weeklyHours || 4} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Duración Sesión (min)</label>
                    <input name="sessionDuration" type="number" defaultValue={editingItem?.sessionDuration || 60} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Costo Materia ($)</label>
                    <input name="cost" type="number" defaultValue={editingItem?.cost || 0} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Maestro Asignado</label>
                    <select name="teacherId" defaultValue={editingItem?.teacherId} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="">Seleccionar Maestro</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.employeeId}>{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Salón Asignado</label>
                    <select name="classroomId" defaultValue={editingItem?.classroomId} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="">Seleccionar Salón</option>
                      {classrooms.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.building})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Horario Sugerido</label>
                  <input name="schedule" defaultValue={editingItem?.schedule} placeholder="Ej. 08:00 - 10:00" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Días Sugeridos</label>
                  <div className="flex flex-wrap gap-3">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name="days" 
                          value={day} 
                          defaultChecked={editingItem?.days?.includes(day)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                        />
                        <span className="text-sm text-gray-600 group-hover:text-indigo-600 transition-colors">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Guardar Materia
                </button>
              </form>
            )}

            {activeTab === 'classrooms' && (
              <form onSubmit={handleSaveClassroom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Salón</label>
                  <input name="name" defaultValue={editingItem?.name} required placeholder="Ej. Aula 101" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                  <select name="type" defaultValue={editingItem?.type || 'classroom'} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                    <option value="classroom">Aula</option>
                    <option value="laboratory">Laboratorio</option>
                    <option value="workshop">Taller</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Edificio</label>
                  <input name="building" defaultValue={editingItem?.building} placeholder="Ej. Edificio A" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Piso</label>
                  <input name="floor" defaultValue={editingItem?.floor} placeholder="Ej. 1" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Capacidad</label>
                  <input name="capacity" type="number" defaultValue={editingItem?.capacity} placeholder="Ej. 30" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <button type="submit" className="col-span-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Guardar Salón
                </button>
              </form>
            )}

            {activeTab === 'scheduling' && (
              <form onSubmit={handleSaveAcademicGroup} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Grupo</label>
                  <input name="name" defaultValue={editingItem?.name} required placeholder="Ej. 1A, 2B, 3C" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Grado / Semestre</label>
                  <input name="grade" type="number" min="1" max="12" defaultValue={editingItem?.grade} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Carrera</label>
                  <select name="majorId" defaultValue={editingItem?.majorId} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                    <option value="">Seleccionar Carrera</option>
                    {majors.map(major => (
                      <option key={major.id} value={major.id}>{major.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Guardar Grupo
                </button>
              </form>
            )}

            {activeTab === 'payments' && (
              <form onSubmit={handleSavePayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Alumno</label>
                    <select name="studentId" defaultValue={editingItem?.studentId} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="">Seleccionar Alumno</option>
                      {students.map(s => (
                        <option key={s.id} value={s.controlNumber}>{s.firstName} {s.lastName} ({s.controlNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Pago</label>
                    <select name="type" defaultValue={editingItem?.type || 'semester'} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="semester">Semestre Completo</option>
                      <option value="subject">Materia Individual</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Concepto / Descripción</label>
                  <input name="concept" defaultValue={editingItem?.concept} required placeholder="Ej. Pago Semestre 1, Recurso de Matemáticas" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Monto ($)</label>
                    <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Método de Pago</label>
                    <select name="paymentMethod" defaultValue={editingItem?.paymentMethod || 'cash'} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Referencia / Folio</label>
                    <input name="reference" defaultValue={editingItem?.reference} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Fecha de Pago</label>
                    <input 
                      name="date" 
                      type="date" 
                      defaultValue={editingItem?.date ? 
                        (editingItem.date instanceof Timestamp ? 
                          editingItem.date.toDate().toISOString().split('T')[0] : 
                          new Date(editingItem.date).toISOString().split('T')[0]
                        ) : new Date().toISOString().split('T')[0]
                      } 
                      required 
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
                  <select name="status" defaultValue={editingItem?.status || 'completed'} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                    <option value="completed">Completado</option>
                    <option value="pending">Pendiente</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <button type="submit" className="w-full mt-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  {editingItem ? 'Actualizar Pago' : 'Registrar Pago'}
                </button>
              </form>
            )}

            {activeTab === 'expenses' && (
              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                    <select name="category" defaultValue={editingItem?.category || 'services'} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="services">Servicios</option>
                      <option value="supplies">Insumos</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="payroll">Nómina</option>
                      <option value="other">Otros</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Monto ($)</label>
                    <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Descripción / Motivo</label>
                  <input name="description" defaultValue={editingItem?.description} required placeholder="Ej. Pago de luz, Compra de papelería" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Método de Pago</label>
                    <select name="paymentMethod" defaultValue={editingItem?.paymentMethod || 'cash'} required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors">
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                    <input 
                      name="date" 
                      type="date" 
                      defaultValue={editingItem?.date ? 
                        (editingItem.date instanceof Timestamp ? 
                          editingItem.date.toDate().toISOString().split('T')[0] : 
                          new Date(editingItem.date).toISOString().split('T')[0]
                        ) : new Date().toISOString().split('T')[0]
                      } 
                      required 
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Referencia / Comprobante</label>
                  <input name="reference" defaultValue={editingItem?.reference} placeholder="Ej. Folio de factura, # de transferencia" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <button type="submit" className="w-full mt-4 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">
                  {editingItem ? 'Actualizar Egreso' : 'Registrar Egreso'}
                </button>
              </form>
            )}
          </Modal>
        )}

        {isFichaOpen && selectedStudent && (
          <Modal 
            isOpen={isFichaOpen} 
            onClose={() => { setIsFichaOpen(false); setSelectedStudent(null); setFichaTab('info'); }}
            title="Ficha del Alumno"
          >
            <div className="space-y-8">
              <div className="flex items-center gap-6 p-6 bg-indigo-600 rounded-2xl text-white">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-bold">
                  {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                  <p className="text-indigo-100 font-mono">#{selectedStudent.controlNumber}</p>
                  <p className="text-sm opacity-80">
                    {selectedStudent.grade}° {selectedStudent.group} 
                    {selectedStudent.majorId && ` • ${majors.find(m => m.id === selectedStudent.majorId)?.name}`}
                  </p>
                </div>
              </div>

              <div className="flex border-b border-gray-100">
                <button 
                  onClick={() => setFichaTab('info')}
                  className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${fichaTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
                >
                  Información General
                </button>
                <button 
                  onClick={() => setFichaTab('kardex')}
                  className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${fichaTab === 'kardex' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
                >
                  Kardex Académico
                </button>
              </div>

              {fichaTab === 'info' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Información Académica</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Carrera</p>
                        <p className="text-gray-900 font-medium">{majors.find(m => m.id === selectedStudent.majorId)?.name || 'No asignada'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Materias Asignadas</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedStudent.subjectIds && selectedStudent.subjectIds.length > 0 ? (
                            selectedStudent.subjectIds.map(sid => {
                              const sub = subjects.find(s => s.id === sid);
                              return sub ? (
                                <span key={sid} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                  {sub.name}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <p className="text-gray-400 text-sm italic">Sin materias asignadas</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-8">Información de Contacto</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Correo Electrónico</p>
                        <p className="text-gray-900 font-medium">{selectedStudent.email || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Teléfono</p>
                        <p className="text-gray-900 font-medium">{selectedStudent.phone || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Dirección</p>
                        <p className="text-gray-900 font-medium">{selectedStudent.address || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Clave de Internet</p>
                        <p className="text-gray-900 font-medium font-mono">{selectedStudent.internetPassword || 'No asignada'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Datos Médicos y Emergencia</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Tipo de Sangre</p>
                        <p className="text-gray-900 font-medium">{selectedStudent.bloodType || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Contacto de Emergencia</p>
                        <p className="text-gray-900 font-medium">{selectedStudent.emergencyContact || 'No registrado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Teléfono de Emergencia</p>
                        <p className="text-gray-900 font-medium">{selectedStudent.emergencyPhone || 'No registrado'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Historial de Calificaciones</h4>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => generateKardexPDF(selectedStudent)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all"
                      >
                        <FileDown className="w-4 h-4" />
                        Exportar PDF
                      </button>
                      {(userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com') && (
                        <button 
                          onClick={() => { setEditingItem({}); }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar Calificación
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Grade Form (Admin only) */}
                  {editingItem && !editingItem.amount && !editingItem.controlNumber && !editingItem.employeeId && !editingItem.code && !editingItem.name && (
                    <motion.form 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleSaveGrade} 
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Materia</label>
                          <select name="subjectId" required className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-600">
                            <option value="">Seleccionar Materia</option>
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Semestre</label>
                          <input name="semester" type="number" min="1" max="12" required className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-600" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Calificación (0-100)</label>
                          <input name="grade" type="number" step="0.1" min="0" max="100" required className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-600" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Periodo</label>
                          <input name="period" placeholder="Ej. Ene-Jun 2025" required className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-600" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">Guardar</button>
                      </div>
                    </motion.form>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Materia</th>
                          <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sem</th>
                          <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Periodo</th>
                          <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Calif</th>
                          <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estatus</th>
                          {(userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com') && (
                            <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {grades.filter(g => g.studentId === selectedStudent.id).sort((a, b) => a.semester - b.semester).map(g => {
                          const subject = subjects.find(s => s.id === g.subjectId);
                          return (
                            <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-4">
                                <p className="text-sm font-bold text-gray-900">{subject?.name || 'Materia no encontrada'}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{subject?.code}</p>
                              </td>
                              <td className="p-4 text-center text-sm font-bold text-gray-600">{g.semester}</td>
                              <td className="p-4 text-sm text-gray-500">{g.period}</td>
                              <td className="p-4 text-center">
                                <span className={`text-sm font-black ${g.grade >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {g.grade}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                                  g.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {g.status === 'approved' ? 'Aprobada' : 'Reprobada'}
                                </span>
                              </td>
                              {(userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com') && (
                                <td className="p-4 text-right">
                                  <button 
                                    onClick={() => handleDeleteGrade(g.id!)}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {grades.filter(g => g.studentId === selectedStudent.id).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400 italic text-sm">
                              No hay calificaciones registradas aún.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => { setIsFichaOpen(false); setFichaTab('info'); setSelectedStudent(null); }}
                  className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      </div>{/* end .flex-1.flex.flex-col (content area) */}
    </div>
  );
}
