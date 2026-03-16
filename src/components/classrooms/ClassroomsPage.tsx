import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Edit2, Trash2, X, DoorOpen, Users, Building2, Layers } from 'lucide-react';
import DataTable from '../ui/DataTable';
import ToolbarBtn from '../ui/ToolbarBtn';
import type { Classroom, UserProfile } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface ClassroomsPageProps {
  classrooms: Classroom[];
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onDelete: (id: string) => void;
  onOpenNew: () => void;
  onOpenEdit: (classroom: Classroom) => void;
}

const col = createColumnHelper<Classroom>();

const TYPE_LABEL: Record<string, string> = {
  classroom:  'Aula',
  laboratory: 'Laboratorio',
  workshop:   'Taller',
  other:      'Otro',
};

const TYPE_COLOR: Record<string, string> = {
  classroom:  'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  laboratory: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  workshop:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  other:      'bg-gray-100 text-gray-600',
};

export default function ClassroomsPage({
  classrooms, userProfile, user, isDataLoading,
  onDelete, onOpenNew, onOpenEdit,
}: ClassroomsPageProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const isAdmin  = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => classrooms.find(c => c.id === selectedId) ?? null, [classrooms, selectedId]);

  const columns = useMemo(() => [
    col.accessor('name', {
      header: 'Nombre',
      cell: info => (
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold text-gray-900">{info.getValue()}</span>
        </div>
      ),
    }),

    col.accessor('type', {
      header: 'Tipo',
      cell: info => {
        const t = info.getValue() ?? 'other';
        return (
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_COLOR[t] ?? TYPE_COLOR.other}`}>
            {TYPE_LABEL[t] ?? 'Otro'}
          </span>
        );
      },
    }),

    col.accessor('building', {
      header: 'Edificio',
      cell: info => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {info.getValue() || <span className="text-gray-300 italic">—</span>}
        </div>
      ),
    }),

    col.accessor('floor', {
      header: 'Piso',
      cell: info => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {info.getValue() ? `Piso ${info.getValue()}` : <span className="text-gray-300 italic">—</span>}
        </div>
      ),
    }),

    col.accessor('capacity', {
      header: 'Capacidad',
      cell: info => (
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {info.getValue() != null ? `${info.getValue()} alumnos` : <span className="text-gray-300 italic">—</span>}
        </div>
      ),
    }),
  ], []);

  return (
    <motion.div key="classrooms" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Control de Salones</h2>
        <p className="text-gray-400 text-sm mt-0.5">{classrooms.length} espacios registrados</p>
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
            <ToolbarBtn onClick={() => selected && onDelete(selected.id!)} disabled={!selected} color="rose" icon={<Trash2 className="w-4 h-4" />} label="Eliminar" />
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
            className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm">
            <DoorOpen className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-emerald-800">{selected.name}</span>
            {selected.building && <span className="text-emerald-500 text-xs">{selected.building}</span>}
            <button onClick={() => setSelectedId(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable<Classroom>
        data={classrooms}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron salones"
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
