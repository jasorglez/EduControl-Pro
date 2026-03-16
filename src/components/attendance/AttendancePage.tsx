import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'motion/react';
import { Search, LogIn, LogOut, X, Clock } from 'lucide-react';
import DataTable from '../ui/DataTable';
import type { Attendance, Student, Teacher } from '../../types';

interface AttendancePageProps {
  attendanceLogs: Attendance[];
  students: Student[];
  teachers: Teacher[];
  isDataLoading: boolean;
}

const col = createColumnHelper<Attendance>();

type TypeFilter     = 'all' | 'entry' | 'exit';
type PersonFilter   = 'all' | 'student' | 'teacher';

/** Convierte cualquier timestamp (Firestore o Date) a Date */
function toDate(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

export default function AttendancePage({
  attendanceLogs, students, teachers, isDataLoading,
}: AttendancePageProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all');
  const [personFilter, setPersonFilter] = useState<PersonFilter>('all');

  const tableData = useMemo(() => {
    let data = attendanceLogs;
    if (typeFilter   !== 'all') data = data.filter(l => l.type       === typeFilter);
    if (personFilter !== 'all') data = data.filter(l => l.personType === personFilter);
    return data;
  }, [attendanceLogs, typeFilter, personFilter]);

  const columns = useMemo(() => [
    col.accessor('personType', {
      header: 'Tipo',
      cell: info => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
          info.getValue() === 'student'
            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${info.getValue() === 'student' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
          {info.getValue() === 'student' ? 'Alumno' : 'Maestro'}
        </span>
      ),
    }),

    col.accessor('personId', {
      header: 'Persona',
      cell: ({ row }) => {
        const log = row.original;
        let name = log.personId;
        if (log.personType === 'student') {
          const s = students.find(s => s.controlNumber === log.personId);
          if (s) name = `${s.firstName} ${s.lastName}`;
        } else {
          const t = teachers.find(t => t.employeeId === log.personId);
          if (t) name = `${t.firstName} ${t.lastName}`;
        }
        const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        const isStudent = log.personType === 'student';
        return (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
              isStudent ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {initials}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{name}</p>
              <p className="text-[10px] text-gray-400 font-mono">{log.personId}</p>
            </div>
          </div>
        );
      },
    }),

    col.accessor('type', {
      header: 'Movimiento',
      cell: info => (
        info.getValue() === 'entry'
          ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold ring-1 ring-emerald-200">
              <LogIn className="w-3 h-3" /> Entrada
            </span>
          : <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold ring-1 ring-rose-200">
              <LogOut className="w-3 h-3" /> Salida
            </span>
      ),
    }),

    col.accessor('timestamp', {
      header: 'Fecha y Hora',
      enableSorting: true,
      sortingFn: (a, b) => {
        const da = toDate(a.original.timestamp).getTime();
        const db = toDate(b.original.timestamp).getTime();
        return da - db;
      },
      cell: info => {
        const d = toDate(info.getValue());
        return (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[10px] text-gray-400">{d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        );
      },
    }),
  ], [students, teachers]);

  const entryCount = attendanceLogs.filter(l => l.type === 'entry').length;
  const exitCount  = attendanceLogs.filter(l => l.type === 'exit').length;

  return (
    <motion.div key="attendance" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Registro de Asistencias</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {attendanceLogs.length} movimientos —{' '}
          <span className="text-emerald-600 font-semibold">{entryCount} entradas</span>
          {' · '}
          <span className="text-rose-500 font-semibold">{exitCount} salidas</span>
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          {(['all', 'entry', 'exit'] as TypeFilter[]).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === f
                  ? f === 'all'    ? 'bg-indigo-600 text-white shadow-sm'
                  : f === 'entry'  ? 'bg-emerald-500 text-white shadow-sm'
                                   : 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'entry' ? 'Entradas' : 'Salidas'}
            </button>
          ))}

          <div className="w-px h-6 bg-gray-200" />

          {/* Person type filter */}
          {(['all', 'student', 'teacher'] as PersonFilter[]).map(f => (
            <button key={f} onClick={() => setPersonFilter(f)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                personFilter === f
                  ? f === 'all'      ? 'bg-gray-700 text-white shadow-sm'
                  : f === 'student'  ? 'bg-indigo-500 text-white shadow-sm'
                                     : 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'student' ? 'Alumnos' : 'Maestros'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Buscar ID, nombre..."
            value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all"
          />
          {globalFilter && (
            <button onClick={() => setGlobalFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <DataTable<Attendance>
        data={tableData}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron registros de asistencia"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        getRowId={row => row.id ?? ''}
        onClearFilters={() => { setGlobalFilter(''); setTypeFilter('all'); setPersonFilter('all'); }}
        defaultPageSize={20}
      />
    </motion.div>
  );
}
