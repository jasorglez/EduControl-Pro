import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Edit2, Trash2, Eye,
  LogIn, LogOut, UserCheck, BookOpen, X, Phone, Mail,
} from 'lucide-react';
import DataTable from '../ui/DataTable';
import type { Teacher, Subject, UserProfile } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

// ─── Props ────────────────────────────────────────────────────────────────────
interface TeachersPageProps {
  teachers: Teacher[];
  subjects: Subject[];
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onLogAttendance: (id: string, type: 'student' | 'teacher', action: 'entry' | 'exit') => void;
  onDelete: (col: string, id: string) => void;
  onOpenNew: () => void;
  onOpenEdit: (teacher: Teacher) => void;
  onViewProfile: (teacher: Teacher) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const col = createColumnHelper<Teacher>();

const AVATAR_COLORS = [
  'from-amber-500 to-orange-500',   'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600',       'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',      'from-indigo-500 to-indigo-700',
  'from-fuchsia-500 to-pink-500',   'from-cyan-500 to-sky-600',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeachersPage({
  teachers, subjects, userProfile, user, isDataLoading,
  onLogAttendance, onDelete, onOpenNew, onOpenEdit, onViewProfile,
}: TeachersPageProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const isAdmin  = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => teachers.find(t => t.id === selectedId) ?? null, [teachers, selectedId]);

  const tableData = useMemo(() =>
    statusFilter === 'all' ? teachers : teachers.filter(t => t.status === statusFilter),
  [teachers, statusFilter]);

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    col.accessor(r => `${r.firstName} ${r.lastName}`, {
      id: 'name',
      header: 'Maestro',
      cell: ({ row: { original: t } }) => {
        const color = avatarColor(t.firstName + t.lastName);
        return (
          <div className="flex items-center gap-2.5 py-0.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
              {t.firstName[0]}{t.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{t.firstName} {t.lastName}</p>
              {t.specialty && (
                <span className="text-[11px] text-amber-600 font-medium">{t.specialty}</span>
              )}
            </div>
          </div>
        );
      },
    }),

    col.accessor('employeeId', {
      header: 'ID Empleado',
      cell: info => (
        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
          {info.getValue()}
        </span>
      ),
    }),

    col.accessor('email', {
      header: 'Correo',
      cell: info => (
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          {info.getValue()
            ? <><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />{info.getValue()}</>
            : <span className="text-gray-300 italic">—</span>
          }
        </span>
      ),
    }),

    col.accessor('phone', {
      header: 'Teléfono',
      cell: info => (
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          {info.getValue()
            ? <><Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />{info.getValue()}</>
            : <span className="text-gray-300 italic">—</span>
          }
        </span>
      ),
    }),

    col.accessor('subjectIds', {
      header: 'Materias',
      enableSorting: false,
      cell: info => {
        const ids = info.getValue() ?? [];
        if (ids.length === 0) return <span className="text-gray-300 italic text-xs">Sin asignar</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {ids.slice(0, 3).map(sid => {
              const s = subjects.find(sub => sub.id === sid);
              return s ? (
                <span key={sid} className="flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">
                  <BookOpen className="w-2.5 h-2.5" />{s.name}
                </span>
              ) : null;
            })}
            {ids.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold">
                +{ids.length - 3}
              </span>
            )}
          </div>
        );
      },
    }),

    col.accessor('status', {
      header: 'Estado',
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

    col.display({
      id: 'attendance',
      header: 'Asistencia',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onLogAttendance(row.original.employeeId, 'teacher', 'entry'); }}
            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" /> Entrada
          </button>
          <button
            onClick={e => { e.stopPropagation(); onLogAttendance(row.original.employeeId, 'teacher', 'exit'); }}
            className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" /> Salida
          </button>
        </div>
      ),
    }),
  ], [subjects, onLogAttendance]);

  const activeCount   = teachers.filter(t => t.status === 'active').length;
  const inactiveCount = teachers.filter(t => t.status === 'inactive').length;

  return (
    <motion.div
      key="teachers"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Control de Maestros</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {teachers.length} docentes —{' '}
          <span className="text-emerald-600 font-semibold">{activeCount} activos</span>
          {' · '}
          <span className="text-rose-500 font-semibold">{inactiveCount} inactivos</span>
        </p>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

        {/* CRUD buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button onClick={onOpenNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          )}

          <ToolbarBtn onClick={() => selected && onViewProfile(selected)} disabled={!selected}
            hoverColor="indigo" icon={<Eye className="w-4 h-4" />} label="Ver perfil" />

          {isAdmin && (
            <>
              <ToolbarBtn onClick={() => selected && onOpenEdit(selected)} disabled={!selected}
                hoverColor="amber" icon={<Edit2 className="w-4 h-4" />} label="Editar" />
              <ToolbarBtn onClick={() => selected && onDelete('teachers', selected.id!)} disabled={!selected}
                hoverColor="rose" icon={<Trash2 className="w-4 h-4" />} label="Eliminar" />
            </>
          )}
        </div>

        {/* Search + status filter */}
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder="Buscar..."
              value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
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

      {/* ── Selected chip ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl text-sm"
          >
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${avatarColor(selected.firstName + selected.lastName)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
              {selected.firstName[0]}{selected.lastName[0]}
            </div>
            <span className="font-semibold text-amber-800">{selected.firstName} {selected.lastName}</span>
            <span className="text-amber-500 font-mono text-xs">{selected.employeeId}</span>
            {selected.specialty && (
              <span className="text-amber-600 text-xs italic">{selected.specialty}</span>
            )}
            <button onClick={() => setSelectedId(null)} className="ml-auto text-amber-400 hover:text-amber-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DataTable ───────────────────────────────────────────────────── */}
      <DataTable<Teacher>
        data={tableData}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron maestros"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        selectedRowId={selectedId ?? undefined}
        onRowClick={row => setSelectedId(prev => prev === row.id ? null : row.id!)}
        getRowId={row => row.id ?? ''}
        onClearFilters={() => { setGlobalFilter(''); setStatusFilter('all'); }}
        defaultPageSize={15}
      />
    </motion.div>
  );
}

// ─── ToolbarBtn ───────────────────────────────────────────────────────────────
function ToolbarBtn({
  onClick, disabled, hoverColor, icon, label,
}: {
  onClick: () => void; disabled: boolean;
  hoverColor: 'indigo' | 'amber' | 'rose';
  icon: React.ReactNode; label: string;
}) {
  const hover = {
    indigo: 'hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50',
    amber:  'hover:border-amber-300  hover:text-amber-600  hover:bg-amber-50',
    rose:   'hover:border-rose-300   hover:text-rose-600   hover:bg-rose-50',
  }[hoverColor];

  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all
        ${hover}
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-600`}
    >
      {icon}{label}
    </button>
  );
}
