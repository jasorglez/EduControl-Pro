import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Edit2, Trash2, Search, X, FileDown, FileText,
  DollarSign, Calendar, CreditCard, TrendingUp, Settings,
} from 'lucide-react';
import DataTable from '../ui/DataTable';
import ToolbarBtn from '../ui/ToolbarBtn';
import type { Payment, Student, SchoolConfig, UserProfile } from '../../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface PaymentsPageProps {
  payments: Payment[];
  students: Student[];
  schoolConfig: SchoolConfig | null;
  userProfile: UserProfile | null;
  user: FirebaseUser;
  isDataLoading: boolean;
  onDelete: (id: string) => void;
  onGenerateReport: () => void;
  onGenerateReceipt: (payment: Payment) => void;
  onOpenNew: () => void;
  onOpenEdit: (payment: Payment) => void;
  onGoToSettings: () => void;
}

const col = createColumnHelper<Payment>();

function toDate(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  paid:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending:   'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
  cancelled: 'bg-rose-50   text-rose-700   ring-1 ring-rose-200',
};
const STATUS_LABEL: Record<string, string> = {
  completed: 'Completado', paid: 'Pagado', pending: 'Pendiente', cancelled: 'Cancelado',
};
const TYPE_LABEL: Record<string, string> = {
  semester: 'Semestre', subject: 'Materia', other: 'Otro',
};
const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
};

export default function PaymentsPage({
  payments, students, schoolConfig, userProfile, user, isDataLoading,
  onDelete, onGenerateReport, onGenerateReceipt, onOpenNew, onOpenEdit, onGoToSettings,
}: PaymentsPageProps) {
  const [globalFilter,  setGlobalFilter]  = useState('');
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [selectedId,    setSelectedId]    = useState<string | null>(null);

  const isAdmin  = userProfile?.role === 'admin' || user?.email === 'jsorglez@gmail.com';
  const selected = useMemo(() => payments.find(p => p.id === selectedId) ?? null, [payments, selectedId]);

  const tableData = useMemo(() => {
    let data = payments;
    if (startDate) data = data.filter(p => toDate(p.date) >= new Date(startDate));
    if (endDate)   data = data.filter(p => toDate(p.date) <= new Date(endDate + 'T23:59:59'));
    if (statusFilter !== 'all') data = data.filter(p => p.status === statusFilter);
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase().trim();
      data = data.filter(p => {
        const s = students.find(st => st.controlNumber === p.studentId);
        const name = s ? `${s.firstName} ${s.lastName}`.toLowerCase() : '';
        return (
          (p.studentId ?? '').toLowerCase().includes(q) ||
          name.includes(q) ||
          (p.concept ?? '').toLowerCase().includes(q) ||
          String(p.amount).includes(q)
        );
      });
    }
    return data;
  }, [payments, startDate, endDate, statusFilter, globalFilter, students]);

  const totalAmount   = tableData.reduce((s, p) => s + p.amount, 0);
  const thisMonthAmt  = payments.filter(p => {
    const d = toDate(p.createdAt ?? p.date);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

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

    col.accessor('studentId', {
      header: 'Alumno',
      cell: info => {
        const s = students.find(st => st.controlNumber === info.getValue());
        return s
          ? <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                {s.firstName[0]}{s.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{s.firstName} {s.lastName}</p>
                <p className="text-[10px] text-gray-400 font-mono">{info.getValue()}</p>
              </div>
            </div>
          : <span className="text-gray-400 font-mono text-xs">{info.getValue()}</span>;
      },
    }),

    col.accessor('concept', {
      header: 'Concepto',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold text-gray-800">{row.original.concept}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            {TYPE_LABEL[row.original.type] ?? row.original.type}
            {row.original.paymentMethod && ` · ${METHOD_LABEL[row.original.paymentMethod] ?? row.original.paymentMethod}`}
          </p>
        </div>
      ),
    }),

    col.accessor('amount', {
      header: 'Monto',
      cell: info => (
        <span className="font-black text-gray-900 text-sm">
          ${info.getValue().toLocaleString()}
        </span>
      ),
    }),

    col.accessor('status', {
      header: 'Estado',
      cell: info => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[info.getValue()] ?? STATUS_STYLE.pending}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {STATUS_LABEL[info.getValue()] ?? info.getValue()}
        </span>
      ),
    }),

    col.display({
      id: 'receipt',
      header: 'Recibo',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={e => { e.stopPropagation(); onGenerateReceipt(row.original); }}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all active:scale-95"
          title="Descargar recibo PDF"
        >
          <FileText className="w-3.5 h-3.5" /> Recibo
        </button>
      ),
    }),
  ], [students, onGenerateReceipt]);

  return (
    <motion.div key="payments" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gestión de Pagos</h2>
          <p className="text-gray-400 text-sm mt-0.5">{payments.length} registros — Total: <span className="text-emerald-600 font-bold">${totalAmount.toLocaleString()}</span></p>
        </div>
        <button onClick={onGenerateReport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm font-medium self-start sm:self-auto">
          <FileDown className="w-4 h-4 text-indigo-500" /> Reporte PDF
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total recaudado" value={`$${payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}`} color="emerald" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Este mes" value={`$${thisMonthAmt.toLocaleString()}`} color="indigo" />
        <StatCard icon={<CreditCard className="w-5 h-5" />} label="Pagos totales" value={String(payments.length)} color="violet" />
        <div className="bg-indigo-600 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Costo semestre</p>
          <p className="text-white text-xl font-black">${schoolConfig?.semesterCost?.toLocaleString() ?? '0'}</p>
          <button onClick={onGoToSettings} className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs font-semibold transition-colors mt-1">
            <Settings className="w-3 h-3" /> Ajustar precios
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 text-sm font-semibold">
            <Plus className="w-4 h-4" /> Registrar Pago
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

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">Todos los estados</option>
            <option value="completed">Completado</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="cancelled">Cancelado</option>
          </select>

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
      </div>

      {/* Selected chip */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm">
            <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="font-semibold text-indigo-700">{selected.concept}</span>
            <span className="text-indigo-500 font-black">${selected.amount.toLocaleString()}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[selected.status]}`}>
              {STATUS_LABEL[selected.status]}
            </span>
            <button onClick={() => setSelectedId(null)} className="ml-auto text-indigo-400 hover:text-indigo-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable<Payment>
        data={tableData}
        columns={columns}
        isLoading={isDataLoading}
        emptyMessage="No se encontraron pagos"
        globalFilter=""
        onGlobalFilterChange={() => {}}
        selectedRowId={selectedId ?? undefined}
        onRowClick={row => setSelectedId(prev => prev === row.id ? null : row.id!)}
        getRowId={row => row.id ?? ''}
        onClearFilters={() => { setGlobalFilter(''); setStartDate(''); setEndDate(''); setStatusFilter('all'); }}
        defaultPageSize={15}
      />
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo:  'bg-indigo-50  text-indigo-600',
    violet:  'bg-violet-50  text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg[color]}`}>{icon}</div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
    </div>
  );
}
