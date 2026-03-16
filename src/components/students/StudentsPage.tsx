import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, FileDown, Sparkles,
  GraduationCap, LogIn, LogOut, Edit2, Trash2,
  Eye, BookOpen, X, Award, CreditCard, CheckSquare,
  ChevronDown, ChevronUp, User2,
} from 'lucide-react';
import DataTable from '../ui/DataTable';
import type {
  Student, Major, UserProfile, Subject, Teacher,
  Grade, Payment, Attendance,
} from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = 'materias' | 'calificaciones' | 'pagos' | 'asistencias';

interface ExpandedRow {
  id: string;
  section: SectionType;
}

interface StudentsPageProps {
  students: Student[];
  majors: Major[];
  subjects: Subject[];
  teachers: Teacher[];
  grades: Grade[];
  payments: Payment[];
  attendanceLogs: Attendance[];
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onLogAttendance: (id: string, type: 'student' | 'teacher', action: 'entry' | 'exit') => void;
  onDelete: (col: string, id: string) => void;
  onGenerateReport: () => void;
  onGenerateRandom: () => void;
  onOpenNew: () => void;
  onOpenEdit: (student: Student) => void;
  onViewDetail: (student: Student) => void;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-indigo-500 to-indigo-600', 'from-violet-500 to-violet-600',
  'from-sky-500 to-sky-600',       'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',   'from-rose-500 to-rose-600',
  'from-teal-500 to-teal-600',     'from-fuchsia-500 to-fuchsia-600',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function toDate(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

// ─── Section button ───────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<SectionType, {
  label: string;
  icon: React.ReactNode;
  activeClass: string;
  inactiveClass: string;
}> = {
  materias: {
    label: 'Materias',
    icon: <BookOpen className="w-3 h-3" />,
    activeClass: 'bg-indigo-600 text-white shadow-sm',
    inactiveClass: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
  },
  calificaciones: {
    label: 'Calificaciones',
    icon: <Award className="w-3 h-3" />,
    activeClass: 'bg-emerald-600 text-white shadow-sm',
    inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  pagos: {
    label: 'Pagos',
    icon: <CreditCard className="w-3 h-3" />,
    activeClass: 'bg-amber-500 text-white shadow-sm',
    inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  asistencias: {
    label: 'Asistencias',
    icon: <CheckSquare className="w-3 h-3" />,
    activeClass: 'bg-violet-600 text-white shadow-sm',
    inactiveClass: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  },
};

// ─── Sub-panel shell ──────────────────────────────────────────────────────────

function SubPanel({
  section, studentName, onClose, children,
}: {
  section: SectionType;
  studentName: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const cfg = SECTION_CONFIG[section];
  const headerColors: Record<SectionType, string> = {
    materias:       'bg-indigo-50 border-indigo-200 text-indigo-800',
    calificaciones: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    pagos:          'bg-amber-50 border-amber-200 text-amber-800',
    asistencias:    'bg-violet-50 border-violet-200 text-violet-800',
  };
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className={`border-t-2 ${headerColors[section].split(' ')[1]}`}>
        {/* Panel header */}
        <div className={`flex items-center justify-between px-5 py-2.5 ${headerColors[section]}`}>
          <div className="flex items-center gap-2 text-sm font-bold">
            {cfg.icon}
            <span>{cfg.label}</span>
            <span className="font-normal opacity-60">— {studentName}</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/60 hover:bg-white transition-all"
          >
            <X className="w-3 h-3" /> Cerrar
          </button>
        </div>
        {/* Content */}
        <div className="px-5 py-4 bg-white">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function MateriasPanel({ student, subjects, teachers, onClose }: {
  student: Student; subjects: Subject[]; teachers: Teacher[]; onClose: () => void;
}) {
  const assigned = useMemo(() =>
    (student.subjectIds ?? []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean) as Subject[],
  [student.subjectIds, subjects]);

  return (
    <SubPanel section="materias" studentName={`${student.firstName} ${student.lastName}`} onClose={onClose}>
      {assigned.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-2">No hay materias asignadas a este alumno.</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-bold border-b border-gray-200">Código</th>
                <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Materia</th>
                <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Maestro</th>
                <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Hrs/sem</th>
                <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Horario</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((s, i) => {
                const teacher = s.teacherId ? teachers.find(t => t.id === s.teacherId) : null;
                return (
                  <tr key={s.id} className={i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                    <td className="px-3 py-2 font-mono font-bold text-indigo-600">{s.code}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800 border-l border-gray-200">{s.name}</td>
                    <td className="px-3 py-2 text-gray-600 border-l border-gray-200">
                      {teacher ? `${teacher.firstName} ${teacher.lastName}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 border-l border-gray-200">{s.weeklyHours ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600 border-l border-gray-200">{s.schedule ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SubPanel>
  );
}

function CalificacionesPanel({ student, grades, subjects, onClose }: {
  student: Student; grades: Grade[]; subjects: Subject[]; onClose: () => void;
}) {
  const studentGrades = useMemo(() =>
    grades.filter(g => g.studentId === student.id).sort((a, b) => a.semester - b.semester),
  [grades, student.id]);

  const avg = useMemo(() => {
    if (!studentGrades.length) return null;
    return (studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length).toFixed(1);
  }, [studentGrades]);

  return (
    <SubPanel section="calificaciones" studentName={`${student.firstName} ${student.lastName}`} onClose={onClose}>
      {studentGrades.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-2">No hay calificaciones registradas.</p>
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200">Materia</th>
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Semestre</th>
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Periodo</th>
                  <th className="px-3 py-2 text-center font-bold border-b border-gray-200 border-l border-l-gray-200">Calificación</th>
                  <th className="px-3 py-2 text-center font-bold border-b border-gray-200 border-l border-l-gray-200">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((g, i) => {
                  const subj = subjects.find(s => s.id === g.subjectId);
                  const approved = g.status === 'approved';
                  return (
                    <tr key={g.id} className={i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                      <td className="px-3 py-2 font-semibold text-gray-800">{subj?.name ?? g.subjectId}</td>
                      <td className="px-3 py-2 text-gray-600 border-l border-gray-200">{g.semester}°</td>
                      <td className="px-3 py-2 text-gray-600 border-l border-gray-200">{g.period ?? '—'}</td>
                      <td className="px-3 py-2 text-center border-l border-gray-200">
                        <span className={`font-black text-base ${approved ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {g.grade}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center border-l border-gray-200">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          approved
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        }`}>
                          {approved ? 'Aprobado' : 'Reprobado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-right">
            Promedio general: <span className="font-black text-gray-700">{avg}</span>
            {' · '}
            Aprobadas: <span className="font-bold text-emerald-600">{studentGrades.filter(g => g.status === 'approved').length}</span>
            {' / '}
            {studentGrades.length}
          </p>
        </>
      )}
    </SubPanel>
  );
}

function PagosPanel({ student, payments, onClose }: {
  student: Student; payments: Payment[]; onClose: () => void;
}) {
  const studentPayments = useMemo(() =>
    payments
      .filter(p => p.studentId === student.controlNumber)
      .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()),
  [payments, student.controlNumber]);

  const statusLabel: Record<string, string> = {
    paid: 'Pagado', pending: 'Pendiente', cancelled: 'Cancelado', completed: 'Completado',
  };
  const statusColor: Record<string, string> = {
    paid:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending:   'bg-amber-50 text-amber-700 ring-amber-200',
    cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  };

  return (
    <SubPanel section="pagos" studentName={`${student.firstName} ${student.lastName}`} onClose={onClose}>
      {studentPayments.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-2">No hay pagos registrados.</p>
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200">Concepto</th>
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Fecha</th>
                  <th className="px-3 py-2 text-right font-bold border-b border-gray-200 border-l border-l-gray-200">Monto</th>
                  <th className="px-3 py-2 text-center font-bold border-b border-gray-200 border-l border-l-gray-200">Método</th>
                  <th className="px-3 py-2 text-center font-bold border-b border-gray-200 border-l border-l-gray-200">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {studentPayments.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                    <td className="px-3 py-2 font-semibold text-gray-800">{p.concept}</td>
                    <td className="px-3 py-2 text-gray-600 border-l border-gray-200">
                      {toDate(p.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-gray-800 border-l border-gray-200">
                      ${p.amount.toLocaleString('es-MX')}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500 border-l border-gray-200 capitalize">
                      {p.paymentMethod ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-center border-l border-gray-200">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${statusColor[p.status] ?? 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-right">
            Total pagado:{' '}
            <span className="font-black text-gray-700">
              ${studentPayments
                .filter(p => p.status === 'paid' || p.status === 'completed')
                .reduce((s, p) => s + p.amount, 0)
                .toLocaleString('es-MX')}
            </span>
          </p>
        </>
      )}
    </SubPanel>
  );
}

function AsistenciasPanel({ student, attendanceLogs, onClose }: {
  student: Student; attendanceLogs: Attendance[]; onClose: () => void;
}) {
  const logs = useMemo(() =>
    attendanceLogs
      .filter(l => l.personId === student.controlNumber && l.personType === 'student')
      .sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime())
      .slice(0, 30),
  [attendanceLogs, student.controlNumber]);

  const entries = logs.filter(l => l.type === 'entry').length;
  const exits   = logs.filter(l => l.type === 'exit').length;

  return (
    <SubPanel section="asistencias" studentName={`${student.firstName} ${student.lastName}`} onClose={onClose}>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-2">No hay registros de asistencia.</p>
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200">Fecha</th>
                  <th className="px-3 py-2 text-left font-bold border-b border-gray-200 border-l border-l-gray-200">Hora</th>
                  <th className="px-3 py-2 text-center font-bold border-b border-gray-200 border-l border-l-gray-200">Movimiento</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => {
                  const d = toDate(l.timestamp);
                  return (
                    <tr key={l.id} className={i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                      <td className="px-3 py-2 text-gray-700 font-semibold">
                        {d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-l border-gray-200 font-mono">
                        {d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-gray-200">
                        {l.type === 'entry'
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold ring-1 ring-emerald-200"><LogIn className="w-3 h-3" />Entrada</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold ring-1 ring-rose-200"><LogOut className="w-3 h-3" />Salida</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-right">
            Últimos {logs.length} registros —{' '}
            <span className="text-emerald-600 font-bold">{entries} entradas</span>
            {' · '}
            <span className="text-rose-500 font-bold">{exits} salidas</span>
          </p>
        </>
      )}
    </SubPanel>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const col = createColumnHelper<Student>();

export default function StudentsPage({
  students, majors, subjects, teachers, grades, payments, attendanceLogs,
  userProfile, user, isDataLoading,
  onLogAttendance, onDelete, onGenerateReport,
  onGenerateRandom, onOpenNew, onOpenEdit, onViewDetail,
}: StudentsPageProps) {
  const [globalFilter, setGlobalFilter]   = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedId,   setSelectedId]     = useState<string | null>(null);
  const [expandedRow,  setExpandedRow]    = useState<ExpandedRow | null>(null);

  const isAdmin  = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => students.find(s => s.id === selectedId) ?? null, [students, selectedId]);

  const tableData = useMemo(() =>
    statusFilter === 'all' ? students : students.filter(s => s.status === statusFilter),
  [students, statusFilter]);

  function handleSection(studentId: string, section: SectionType) {
    setExpandedRow(prev =>
      prev?.id === studentId && prev?.section === section
        ? null
        : { id: studentId, section }
    );
  }

  function sectionColumn(section: SectionType) {
    const cfg = SECTION_CONFIG[section];
    return col.display({
      id: section,
      header: cfg.label,
      enableSorting: false,
      size: 110,
      cell: ({ row }) => {
        const isActive = expandedRow?.id === row.original.id && expandedRow?.section === section;
        return (
          <button
            onClick={e => { e.stopPropagation(); handleSection(row.original.id!, section); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
              isActive ? cfg.activeClass : cfg.inactiveClass
            }`}
          >
            {cfg.icon}
            {cfg.label}
            {isActive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        );
      },
    });
  }

  const columns = useMemo(() => [
    col.accessor(r => `${r.firstName} ${r.lastName}`, {
      id: 'name',
      header: 'Alumno',
      cell: ({ row: { original: s } }) => {
        const color = avatarColor(s.firstName + s.lastName);
        const major = majors.find(m => m.id === s.majorId);
        return (
          <div className="flex items-center gap-2.5 py-0.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
              {s.firstName[0]}{s.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{s.firstName} {s.lastName}</p>
              {major && (
                <span className="text-[11px] text-indigo-500 font-medium flex items-center gap-0.5">
                  <GraduationCap className="w-3 h-3" />{major.name}
                </span>
              )}
            </div>
          </div>
        );
      },
    }),

    col.accessor('controlNumber', {
      header: '# Control',
      size: 110,
      cell: info => (
        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          {info.getValue()}
        </span>
      ),
    }),

    col.accessor(r => `${r.grade}° ${r.group}`, {
      id: 'gradeGroup',
      header: 'Grado / Grupo',
      size: 110,
      cell: info => (
        <span className="flex items-center gap-1.5 text-gray-700 font-semibold text-sm">
          <BookOpen className="w-3.5 h-3.5 text-gray-400" />{info.getValue()}
        </span>
      ),
    }),

    col.accessor('status', {
      header: 'Estado',
      size: 90,
      cell: info => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
          info.getValue() === 'active'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${info.getValue() === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {info.getValue() === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),

    // ── Section expand columns ──────────────────────────────────────────────
    sectionColumn('materias'),
    sectionColumn('calificaciones'),
    sectionColumn('pagos'),
    sectionColumn('asistencias'),

    // ── Registro rápido asistencia ──────────────────────────────────────────
    col.display({
      id: 'attendance',
      header: 'Registro',
      enableSorting: false,
      size: 150,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onLogAttendance(row.original.controlNumber, 'student', 'entry'); }}
            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" /> Entrada
          </button>
          <button
            onClick={e => { e.stopPropagation(); onLogAttendance(row.original.controlNumber, 'student', 'exit'); }}
            className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" /> Salida
          </button>
        </div>
      ),
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [majors, onLogAttendance, expandedRow]);

  function renderSubRow(student: Student): React.ReactNode {
    if (!expandedRow || expandedRow.id !== student.id) return null;
    const props = { student, onClose: () => setExpandedRow(null) };
    switch (expandedRow.section) {
      case 'materias':
        return <MateriasPanel {...props} subjects={subjects} teachers={teachers} />;
      case 'calificaciones':
        return <CalificacionesPanel {...props} grades={grades} subjects={subjects} />;
      case 'pagos':
        return <PagosPanel {...props} payments={payments} />;
      case 'asistencias':
        return <AsistenciasPanel {...props} attendanceLogs={attendanceLogs} />;
    }
  }

  const activeCount   = students.filter(s => s.status === 'active').length;
  const inactiveCount = students.filter(s => s.status === 'inactive').length;

  return (
    <motion.div
      key="students"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Control de Alumnos</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {students.length} registrados —{' '}
            <span className="text-emerald-600 font-semibold">{activeCount} activos</span>
            {' · '}
            <span className="text-rose-500 font-semibold">{inactiveCount} inactivos</span>
          </p>
        </div>
        <button
          onClick={onGenerateReport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm font-medium self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4 text-indigo-500" />
          Reporte PDF
        </button>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button onClick={onOpenNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          )}

          <ToolbarBtn
            onClick={() => selected && onViewDetail(selected)}
            disabled={!selected}
            hoverColor="indigo"
            icon={<Eye className="w-4 h-4" />}
            label="Ver ficha"
          />

          {isAdmin && (
            <>
              <ToolbarBtn
                onClick={() => selected && onOpenEdit(selected)}
                disabled={!selected}
                hoverColor="amber"
                icon={<Edit2 className="w-4 h-4" />}
                label="Editar"
              />
              <ToolbarBtn
                onClick={() => selected && onDelete('students', selected.id!)}
                disabled={!selected}
                hoverColor="rose"
                icon={<Trash2 className="w-4 h-4" />}
                label="Eliminar"
              />
              <button
                onClick={onGenerateRandom}
                className="p-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all"
                title="Generar alumnos de prueba"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all"
            />
            {globalFilter && (
              <button onClick={() => setGlobalFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f
                  ? f === 'all'    ? 'bg-indigo-600 text-white shadow-sm'
                  : f === 'active' ? 'bg-emerald-500 text-white shadow-sm'
                                   : 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Selected row chip ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm"
          >
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${avatarColor(selected.firstName + selected.lastName)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
              {selected.firstName[0]}{selected.lastName[0]}
            </div>
            <span className="font-semibold text-indigo-700">{selected.firstName} {selected.lastName}</span>
            <span className="text-indigo-400 font-mono text-xs">{selected.controlNumber}</span>
            <button onClick={() => setSelectedId(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DataTable ────────────────────────────────────────────────────── */}
      <DataTable<Student>
        data={tableData}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron alumnos"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        selectedRowId={selectedId ?? undefined}
        onRowClick={row => setSelectedId(prev => prev === row.id ? null : row.id!)}
        getRowId={row => row.id ?? ''}
        onClearFilters={() => { setGlobalFilter(''); setStatusFilter('all'); }}
        defaultPageSize={15}
        renderSubRow={renderSubRow}
      />
    </motion.div>
  );
}

// ─── ToolbarBtn ───────────────────────────────────────────────────────────────
function ToolbarBtn({
  onClick, disabled, hoverColor, icon, label,
}: {
  onClick: () => void;
  disabled: boolean;
  hoverColor: 'indigo' | 'amber' | 'rose';
  icon: React.ReactNode;
  label: string;
}) {
  const hover = {
    indigo: 'hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50',
    amber:  'hover:border-amber-300  hover:text-amber-600  hover:bg-amber-50',
    rose:   'hover:border-rose-300   hover:text-rose-600   hover:bg-rose-50',
  }[hoverColor];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all
        ${hover}
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600`}
    >
      {icon}{label}
    </button>
  );
}
