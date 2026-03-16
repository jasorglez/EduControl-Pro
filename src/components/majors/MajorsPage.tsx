import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Edit2, Trash2, X, GraduationCap } from 'lucide-react';
import DataTable from '../ui/DataTable';
import ToolbarBtn from '../ui/ToolbarBtn';
import type { Major, UserProfile } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface MajorsPageProps {
  majors: Major[];
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onDelete: (col: string, id: string) => void;
  onOpenNew: () => void;
  onOpenEdit: (major: Major) => void;
}

const col = createColumnHelper<Major>();

export default function MajorsPage({
  majors, userProfile, user, isDataLoading,
  onDelete, onOpenNew, onOpenEdit,
}: MajorsPageProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const isAdmin  = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => majors.find(m => m.id === selectedId) ?? null, [majors, selectedId]);

  const columns = useMemo(() => [
    col.accessor('code', {
      header: 'Código',
      cell: info => (
        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
          {info.getValue()}
        </span>
      ),
    }),

    col.accessor('name', {
      header: 'Carrera / Programa',
      cell: info => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold text-gray-900">{info.getValue()}</span>
        </div>
      ),
    }),

    col.accessor('description', {
      header: 'Descripción',
      enableSorting: false,
      cell: info => (
        <span className="text-sm text-gray-500 line-clamp-2">
          {info.getValue() || <span className="text-gray-300 italic">Sin descripción</span>}
        </span>
      ),
    }),
  ], []);

  return (
    <motion.div key="majors" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Control de Carreras</h2>
        <p className="text-gray-400 text-sm mt-0.5">{majors.length} programas académicos registrados</p>
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
            <ToolbarBtn onClick={() => selected && onDelete('majors', selected.id!)} disabled={!selected} color="rose" icon={<Trash2 className="w-4 h-4" />} label="Eliminar" />
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
            className="flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl text-sm">
            <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-amber-800">{selected.name}</span>
            <span className="text-amber-500 font-mono text-xs">{selected.code}</span>
            <button onClick={() => setSelectedId(null)} className="ml-auto text-amber-400 hover:text-amber-600"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable<Major>
        data={majors}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron carreras"
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
