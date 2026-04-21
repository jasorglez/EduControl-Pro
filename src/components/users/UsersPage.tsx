import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { motion } from 'motion/react';
import { UserPlus, Search, X, Shield, Users, KeyRound, RefreshCw, Eye, EyeOff, Copy, Mail, Check } from 'lucide-react';
import DataTable from '../ui/DataTable';
import type { UserProfile } from '../../types';

interface UsersPageProps {
  usersList: UserProfile[];
  currentUserEmail: string;
  onOpenNewUser: () => void;
  onUpdateRole: (uid: string, role: 'admin' | 'staff' | 'teacher') => void;
  onSetBotPin: (uid: string, pin: string) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<string | null>;
}

const col = createColumnHelper<UserProfile>();

const ROLE_STYLE: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  teacher: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200',
  staff:   'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador', teacher: 'Maestro', staff: 'Personal',
};

function genPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function PinCell({ user, onSetBotPin }: { user: UserProfile; onSetBotPin: (uid: string, pin: string) => Promise<void> }) {
  const [visible, setVisible]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [copied,  setCopied]    = useState(false);

  const handleGenerate = async () => {
    const pin = genPin();
    setSaving(true);
    await onSetBotPin(user.uid, pin);
    setSaving(false);
  };

  const handleCopy = () => {
    if (!user.botPin) return;
    navigator.clipboard.writeText(user.botPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!user.botPin) {
    return (
      <button
        onClick={handleGenerate}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all disabled:opacity-50"
      >
        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
        Generar PIN
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-bold text-gray-800 bg-gray-100 rounded-lg px-2.5 py-1 tracking-widest">
        {visible ? user.botPin : '••••'}
      </span>
      <button onClick={() => setVisible(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors" title={visible ? 'Ocultar' : 'Ver PIN'}>
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button onClick={handleCopy} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Copiar">
        <Copy className="w-3.5 h-3.5" />
      </button>
      {copied && <span className="text-[10px] text-emerald-600 font-bold">¡Copiado!</span>}
      <button
        onClick={handleGenerate}
        disabled={saving}
        className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
        title="Regenerar PIN"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

function ResetCell({ email, onSendPasswordReset }: { email: string; onSendPasswordReset: (email: string) => Promise<string | null> }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  const handle = async () => {
    setSending(true); setErr(null);
    const e = await onSendPasswordReset(email);
    setSending(false);
    if (e) { setErr(e); } else { setSent(true); setTimeout(() => setSent(false), 3000); }
  };

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        onClick={handle}
        disabled={sending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-200 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all disabled:opacity-50"
      >
        {sending ? <RefreshCw className="w-3 h-3 animate-spin" /> : sent ? <Check className="w-3 h-3 text-emerald-500" /> : <Mail className="w-3 h-3" />}
        {sent ? '¡Enviado!' : 'Enviar contraseña'}
      </button>
      {err && <span className="text-[10px] text-red-500">{err}</span>}
    </div>
  );
}

export default function UsersPage({
  usersList, currentUserEmail, onOpenNewUser, onUpdateRole, onSetBotPin, onSendPasswordReset,
}: UsersPageProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => [
    col.accessor('email', {
      header: 'Usuario',
      cell: info => {
        const email = info.getValue();
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0 shadow-inner">
              {email[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{email.split('@')[0]}</p>
              <p className="text-[10px] text-gray-400">{email}</p>
            </div>
          </div>
        );
      },
    }),

    col.accessor('role', {
      header: 'Rol',
      cell: info => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_STYLE[info.getValue()] ?? ROLE_STYLE.staff}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          {ROLE_LABEL[info.getValue()] ?? info.getValue()}
        </span>
      ),
    }),

    col.display({
      id: 'change_role',
      header: 'Cambiar Rol',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isProtected = u.email === currentUserEmail;
        return (
          <select
            value={u.role}
            onChange={e => onUpdateRole(u.uid, e.target.value as any)}
            disabled={isProtected}
            className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 transition-all cursor-pointer"
          >
            <option value="staff">Personal (Staff)</option>
            <option value="teacher">Maestro</option>
            <option value="admin">Administrador</option>
          </select>
        );
      },
    }),

    col.display({
      id: 'bot_pin',
      header: 'PIN Telegram',
      enableSorting: false,
      cell: ({ row }) => (
        <PinCell user={row.original} onSetBotPin={onSetBotPin} />
      ),
    }),

    col.display({
      id: 'password_reset',
      header: 'Contraseña',
      enableSorting: false,
      cell: ({ row }) => (
        <ResetCell email={row.original.email} onSendPasswordReset={onSendPasswordReset} />
      ),
    }),
  ], [currentUserEmail, onUpdateRole, onSetBotPin, onSendPasswordReset]);

  return (
    <motion.div key="users" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gestión de Usuarios</h2>
          <p className="text-gray-400 text-sm mt-0.5">{usersList.length} usuarios registrados</p>
        </div>
        <button
          onClick={onOpenNewUser}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 text-sm font-semibold self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Pre-registrar Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {(['admin', 'teacher', 'staff'] as const).map(role => (
          <div key={role} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${ROLE_STYLE[role]}`}>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">{ROLE_LABEL[role]}</p>
            <p className="text-xl font-black text-gray-900">{usersList.filter(u => u.role === role).length}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar usuario..."
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

      <DataTable<UserProfile>
        data={usersList}
        columns={columns}
        isLoading={false}
        emptyMessage="No hay usuarios registrados"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        getRowId={row => row.uid}
        onClearFilters={() => setGlobalFilter('')}
        defaultPageSize={15}
      />

      {/* Info bot */}
      <div className="bg-indigo-50 px-5 py-4 rounded-2xl border border-indigo-100 flex items-start gap-4">
        <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">
          <Shield className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-900">PIN de acceso al Bot de Telegram</p>
          <p className="text-xs text-indigo-700/80 leading-relaxed mt-0.5">
            Genera un PIN de 4 dígitos para cada usuario. Ellos lo usan junto con su email para acceder al bot.
            Los alumnos usan su número de control + contraseña de internet.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
