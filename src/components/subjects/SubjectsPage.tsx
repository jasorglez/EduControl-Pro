import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Edit2, Trash2, X, UserCheck, DoorOpen, Clock, BookOpen, DollarSign } from 'lucide-react';
import DataTable from '../ui/DataTable';
import ToolbarBtn from '../ui/ToolbarBtn';
import type { Subject, Teacher, Classroom, UserProfile } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface SubjectsPageProps {
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onDelete: (col: string, id: string) => void;
  onOpenNew: () => void;
  onOpenEdit: (subject: Subject) => void;
}

const col = createColumnHelper<Subject>();

export default function SubjectsPage({
  subjects, teachers, classrooms, userProfile, user,
  isDataLoading, onDelete, onOpenNew, onOpenEdit,
}: SubjectsPageProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const isAdmin  = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => subjects.find(s => s.id === selectedId) ?? null, [subjects, selectedId]);

  const columns = useMemo(() => [
    col.accessor('code', {
      header: 'Código',
      cell: info => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
          {info.getValue()}
        </span>
      ),
    }),

    col.accessor('name', {
      header: 'Materia',
      cell: info => (
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-semibold text-gray-900">{info.getValue()}</span>
        </div>
      ),
    }),

    col.accessor('teacherId', {
      header: 'Docente',
      cell: info => {
        const teacher = teachers.find(t => t.employeeId === info.getValue());
        return teacher
          ? <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {teacher.firstName} {teacher.lastName}
            </div>
          : <span className="text-gray-300 italic text-sm">Sin asignar</span>;
      },
    }),

    col.accessor('classroomId', {
      header: 'Salón',
      cell: info => {
        const room = classrooms.find(c => c.id === info.getValue());
        return room
          ? <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <DoorOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {room.name}
            </div>
          : <span className="text-gray-300 italic text-sm">Sin asignar</span>;
      },
    }),

    col.accessor('weeklyHours', {
      header: 'Hrs/sem',
      cell: info => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {info.getValue() ?? <span className="text-gray-300">—</span>}
        </div>
      ),
    }),

    col.accessor('schedule', {
      header: 'Horario',
      cell: ({ row }) => {
        const s = row.original;
        const text = [s.schedule, s.days?.join(', ')].filter(Boolean).join(' ');
        return <span className="text-sm text-gray-500">{text || <span className="text-gray-300 italic">Por definir</span>}</span>;
      },
    }),

    col.accessor('cost', {
      header: 'Costo',
      cell: info => {
        const v = info.getValue();
        return v != null
          ? <span className="flex items-center gap-0.5 text-sm font-semibold text-emerald-700">
              <DollarSign className="w-3.5 h-3.5" />{v.toLocaleString()}
            </span>
          : <span className="text-gray-300 italic text-sm">—</span>;
      },
    }),
  ], [teachers, classrooms]);

  return (
    <motion.div key="subjects" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Asignación de Materias</h2>
        <p className="text-gray-400 text-sm mt-0.5">{subjects.length} materias registradas</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button onClick={onOpenNew} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          )}
          {isAdmin && <>
            <ToolbarBtn onClick={() => selected && onOpenEdit(selected)} disabled={!selected} color="amber" icon={<Edit2 className="w-4 h-4" />} label="Editar" />
            <ToolbarBtn onClick={() => selected && onDelete('subjects', selected.id!)} disabled={!selected} color="rose" icon={<Trash2 className="w-4 h-4" />} label="Eliminar" />
          </>}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Buscar..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all" />
          {globalFilter && (
            <button onClick={() => setGlobalFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selected chip */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm">
            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="font-semibold text-indigo-700">{selected.name}</span>
            <span className="text-indigo-400 font-mono text-xs">{selected.code}</span>
            <button onClick={() => setSelectedId(null)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable<Subject>
        data={subjects}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron materias"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        selectedRowId={selectedId ?? undefined}
        onRowClick={row => setSelectedId(prev => prev === row.id ? null : row.id!)}
        getRowId={row => row.id ?? ''}
        onClearFilters={() => setGlobalFilter('')}
        defaultPageSize={15}
      />
    </motion.div>
  );
}
