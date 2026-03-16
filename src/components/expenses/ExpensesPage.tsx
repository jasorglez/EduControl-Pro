import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Edit2, Trash2, Search, X,
  TrendingDown, Calendar, Receipt, DollarSign, Tag,
} from 'lucide-react';
import DataTable from '../ui/DataTable';
import ToolbarBtn from '../ui/ToolbarBtn';
import type { Expense, UserProfile } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface ExpensesPageProps {
  expenses: Expense[];
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onDelete: (id: string) => void;
  onOpenNew: () => void;
  onOpenEdit: (expense: Expense) => void;
}

const col = createColumnHelper<Expense>();

function toDate(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

const CATEGORY_STYLE: Record<string, string> = {
  payroll:     'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  services:    'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
  maintenance: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  supplies:    'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  other:       'bg-gray-50   text-gray-600   ring-1 ring-gray-200',
};

const CATEGORY_LABEL: Record<string, string> = {
  payroll:     'Nómina',
  services:    'Servicios',
  maintenance: 'Mantenimiento',
  supplies:    'Insumos',
  other:       'Otros',
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
};

export default function ExpensesPage({
  expenses, userProfile, user, isDataLoading,
  onDelete, onOpenNew, onOpenEdit,
}: ExpensesPageProps) {
  const [globalFilter,     setGlobalFilter]     = useState('');
  const [startDate,        setStartDate]        = useState('');
  const [endDate,          setEndDate]          = useState('');
  const [categoryFilter,   setCategoryFilter]   = useState('all');
  const [selectedId,       setSelectedId]       = useState<string | null>(null);

  const isAdmin = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => expenses.find(e => e.id === selectedId) ?? null, [expenses, selectedId]);

  const tableData = useMemo(() => {
    let data = expenses;
    if (startDate) data = data.filter(e => toDate(e.date) >= new Date(startDate));
    if (endDate)   data = data.filter(e => toDate(e.date) <= new Date(endDate + 'T23:59:59'));
    if (categoryFilter !== 'all') data = data.filter(e => e.category === categoryFilter);
    return data;
  }, [expenses, startDate, endDate, categoryFilter]);

  const totalAmount  = tableData.reduce((s, e) => s + e.amount, 0);
  const thisMonthAmt = expenses.filter(e => {
    const d = toDate(e.createdAt ?? e.date);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  const columns = useMemo(() => [
    col.accessor('date', {
      header: 'Fecha',
      sortingFn: (a, b) => toDate(a.original.date).getTime() - toDate(b.original.date).getTime(),
      cell: info => {
        const d = toDate(info.getValue());
        return (
          <div>
            <p className="text-sm font-semibold text-gray-900">{d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-[10px] text-gray-400">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        );
      },
    }),

    col.accessor('category', {
      header: 'Categoría',
      cell: info => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${CATEGORY_STYLE[info.getValue()] ?? CATEGORY_STYLE.other}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {CATEGORY_LABEL[info.getValue()] ?? info.getValue()}
        </span>
      ),
    }),

    col.accessor('description', {
      header: 'Descripción',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold text-gray-800">{row.original.description}</p>
          {row.original.reference && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Ref: {row.original.reference}
              {row.original.paymentMethod && ` · ${METHOD_LABEL[row.original.paymentMethod] ?? row.original.paymentMethod}`}
            </p>
          )}
          {!row.original.reference && row.original.paymentMethod && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {METHOD_LABEL[row.original.paymentMethod] ?? row.original.paymentMethod}
            </p>
          )}
        </div>
      ),
    }),

    col.accessor('amount', {
      header: 'Monto',
      cell: info => (
        <span className="font-black text-rose-600 text-sm">
          -${info.getValue().toLocaleString()}
        </span>
      ),
    }),
  ], []);

  return (
    <motion.div key="expenses" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Control de Egresos</h2>
          <p className="text-gray-400 text-sm mt-0.5">{expenses.length} registros — Total: <span className="text-rose-600 font-bold">${totalAmount.toLocaleString()}</span></p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingDown className="w-5 h-5" />} label="Total egresos" value={`$${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}`} color="rose" />
        <StatCard icon={<DollarSign className="w-5 h-5" />}  label="Este mes"     value={`$${thisMonthAmt.toLocaleString()}`} color="amber" />
        <StatCard icon={<Receipt className="w-5 h-5" />}     label="Registros"    value={String(expenses.length)} color="violet" />
        <StatCard icon={<Tag className="w-5 h-5" />}         label="Filtrado"     value={`$${tableData.reduce((s, e) => s + e.amount, 0).toLocaleString()}`} color="gray" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-200 text-sm font-semibold">
            <Plus className="w-4 h-4" /> Registrar Egreso
          </button>
          <ToolbarBtn onClick={() => selected && onOpenEdit(selected)} disabled={!selected} color="amber" icon={<Edit2 className="w-4 h-4" />} label="Editar" />
          <ToolbarBtn onClick={() => selected && onDelete(selected.id!)} disabled={!selected} color="rose" icon={<Trash2 className="w-4 h-4" />} label="Eliminar" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="text-xs text-gray-600 outline-none bg-transparent w-28" />
            <span className="text-gray-300">—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="text-xs text-gray-600 outline-none bg-transparent w-28" />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-rose-400">
            <option value="all">Todas las categorías</option>
            <option value="services">Servicios</option>
            <option value="supplies">Insumos</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="payroll">Nómina</option>
            <option value="other">Otros</option>
          </select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Buscar..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-400 outline-none transition-all" />
            {globalFilter && (
              <button onClick={() => setGlobalFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected chip */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 px-4 py-2 bg-rose-50 border border-rose-100 rounded-2xl text-sm">
            <Receipt className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-semibold text-rose-700">{selected.description}</span>
            <span className="text-rose-500 font-black">-${selected.amount.toLocaleString()}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_STYLE[selected.category]}`}>
              {CATEGORY_LABEL[selected.category]}
            </span>
            <button onClick={() => setSelectedId(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable<Expense>
        data={tableData}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron egresos"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        selectedRowId={selectedId ?? undefined}
        onRowClick={row => setSelectedId(prev => prev === row.id ? null : row.id!)}
        getRowId={row => row.id ?? ''}
        onClearFilters={() => { setGlobalFilter(''); setStartDate(''); setEndDate(''); setCategoryFilter('all'); }}
        defaultPageSize={15}
      />
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bg: Record<string, string> = {
    rose:   'bg-rose-50   text-rose-600',
    amber:  'bg-amber-50  text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    gray:   'bg-gray-100  text-gray-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
    </div>
  );
}
