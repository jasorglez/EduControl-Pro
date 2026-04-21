import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Users,
  Mail,
  Shield,
  UserPlus,
  Trash2,
  Crown,
  ChevronRight,
  X,
  Sparkles,
  Check,
  Copy,
} from 'lucide-react';
import { SchoolConfig, UserProfile, SchoolInvite } from '../../types';

interface SchoolsPageProps {
  schools: SchoolConfig[];
  currentSchoolId: string;
  /** Empresa cuyo contexto de datos está activo (puede ser otra si el super admin cambió). */
  activeSchoolId: string;
  userProfile: UserProfile;
  isSuperAdmin: boolean;
  pendingInvites: SchoolInvite[];
  usersList: UserProfile[];
  isDataLoading: boolean;
  onCreateSchool: (data: { name: string; address?: string; phone?: string; email?: string; semesterCost?: number }) => Promise<void>;
  onInviteUser: (email: string, role: 'admin' | 'staff' | 'teacher', schoolId: string) => Promise<void>;
  onRevokeInvite: (inviteId: string) => Promise<void>;
  onUpdateRole: (uid: string, role: 'admin' | 'staff' | 'teacher') => Promise<void>;
  /** Super admin: cambia la empresa cuyo contexto de datos se visualiza. null = volver a la propia. */
  onSwitchSchool: (id: string | null) => void;
  /** Super admin: elimina una escuela con todos sus datos. */
  onDeleteSchool: (schoolId: string) => Promise<void>;
  /** Super admin: mueve un usuario a otra escuela por email. Devuelve error string o null. */
  onMoveUser: (email: string, targetSchoolId: string) => Promise<string | null>;
}

const roleBadgeStyle: Record<string, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-emerald-100 text-emerald-700',
  staff: 'bg-amber-100 text-amber-700',
};

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Maestro',
  staff: 'Personal',
};

export default function SchoolsPage({
  schools,
  currentSchoolId,
  activeSchoolId,
  userProfile,
  isSuperAdmin,
  pendingInvites,
  usersList,
  isDataLoading,
  onCreateSchool,
  onInviteUser,
  onRevokeInvite,
  onUpdateRole,
  onSwitchSchool,
  onDeleteSchool,
  onMoveUser,
}: SchoolsPageProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveEmail, setMoveEmail] = useState('');
  const [moveTargetId, setMoveTargetId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveSuccess, setMoveSuccess] = useState(false);

  // Create school form state
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createSemesterCost, setCreateSemesterCost] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff' | 'teacher'>('staff');
  const [isInviting, setIsInviting] = useState(false);

  const selectedSchool = schools.find(s => s.id === selectedSchoolId) ?? null;
  const pendingCount = pendingInvites.filter(i => i.status === 'pending').length;
  const schoolToDelete = schools.find(s => s.id === deleteConfirmId) ?? null;

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId || !schoolToDelete) return;
    if (deleteConfirmName !== schoolToDelete.name) return;
    setIsDeleting(true);
    try {
      await onDeleteSchool(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      if (selectedSchoolId === deleteConfirmId) setSelectedSchoolId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateSchool({
        name: createName.trim(),
        phone: createPhone.trim() || undefined,
        email: createEmail.trim() || undefined,
        address: createAddress.trim() || undefined,
        semesterCost: createSemesterCost ? parseFloat(createSemesterCost) : undefined,
      });
      setCreateName('');
      setCreatePhone('');
      setCreateEmail('');
      setCreateAddress('');
      setCreateSemesterCost('');
      setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedSchoolId) return;
    setIsInviting(true);
    try {
      await onInviteUser(inviteEmail.trim(), inviteRole, selectedSchoolId);
      setInviteEmail('');
      setInviteRole('staff');
      setShowInviteForm(false);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <motion.div
      key="schools"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Escuelas
          </h2>
          <p className="text-gray-500 mt-0.5">
            {isSuperAdmin ? 'Gestión global de escuelas y permisos de usuario.' : 'Gestiona tu escuela y permisos de usuario.'}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <Crown className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-600">Super Admin</span>
          </div>
        )}
      </div>

      {/* ─── Section A: Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Escuelas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Escuelas</p>
            <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '…' : schools.length}</p>
          </div>
        </div>

        {/* Usuarios Activos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Usuarios Activos</p>
            <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '…' : usersList.length}</p>
          </div>
        </div>

        {/* Invitaciones Pendientes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Invitaciones Pendientes</p>
            <p className="text-2xl font-bold text-gray-900">{isDataLoading ? '…' : pendingCount}</p>
          </div>
        </div>
      </div>

      {/* ─── Section B: Schools grid ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Escuelas Registradas
          </h3>
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <span className="text-base leading-none">+</span>}
              {showCreateForm ? 'Cancelar' : 'Nueva Escuela'}
            </button>
          )}
        </div>

        {/* Inline creation form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-b border-gray-100"
            >
              <form onSubmit={handleCreateSubmit} className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Nueva Escuela</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Nombre de la escuela"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={createPhone}
                    onChange={e => setCreatePhone(e.target.value)}
                    placeholder="(000) 000-0000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Correo</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    placeholder="contacto@escuela.edu"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={createAddress}
                    onChange={e => setCreateAddress(e.target.value)}
                    placeholder="Calle, número, ciudad"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Costo por semestre ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createSemesterCost}
                    onChange={e => setCreateSemesterCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isCreating || !createName.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Crear Escuela
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schools grid */}
        <div className="p-6">
          {isDataLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : schools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm font-medium">No hay escuelas registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {schools.map(school => {
                const isOwn    = school.id === currentSchoolId;
                const isActive = school.id === activeSchoolId;
                return (
                  <motion.div
                    key={school.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className={`relative p-5 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-amber-300 bg-amber-50/60 shadow-md shadow-amber-100'
                        : selectedSchoolId === school.id
                          ? 'border-indigo-300 bg-indigo-50/60 shadow-md shadow-indigo-100'
                          : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {/* Badges: activa (contexto) y propia */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      {isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                          👁 Activa
                        </span>
                      )}
                      {isOwn && !isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                          <Check className="w-2.5 h-2.5" />
                          Tu escuela
                        </span>
                      )}
                      {/* Super admin: botón eliminar escuela */}
                      {isSuperAdmin && !isOwn && (
                        <button
                          onClick={() => { setDeleteConfirmId(school.id!); setDeleteConfirmName(''); }}
                          className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white text-[10px] font-bold rounded-full transition-colors"
                          title="Eliminar escuela"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          Eliminar
                        </button>
                      )}
                    </div>

                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug mb-1">{school.name}</h4>
                    <p className="text-xs text-gray-400 truncate">{school.address || 'Sin dirección'}</p>

                    {/* School ID — needed for Telegram /vincular */}
                    <div className="mt-3 mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">ID Escuela (Telegram)</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-700 break-all flex-1 select-all">{school.id}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(school.id!); }}
                          title="Copiar ID"
                          className="shrink-0 p-1 rounded-md text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Gestionar usuarios de esta escuela */}
                      <button
                        onClick={() => setSelectedSchoolId(school.id === selectedSchoolId ? null : school.id!)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {selectedSchoolId === school.id ? 'Ocultar' : 'Gestionar'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Super admin: cambiar contexto de datos */}
                      {isSuperAdmin && (
                        isActive && !isOwn ? (
                          <button
                            onClick={() => onSwitchSchool(null)}
                            className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors ml-auto"
                          >
                            ✕ Volver a la mía
                          </button>
                        ) : !isActive ? (
                          <button
                            onClick={() => onSwitchSchool(school.id!)}
                            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors ml-auto"
                          >
                            Ver datos →
                          </button>
                        ) : null
                      )}

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section C: User & Invite Management ─────────────────────────────── */}
      <AnimatePresence>
        {selectedSchool && (
          <motion.div
            key={selectedSchool.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Usuarios —{' '}
                <span className="text-indigo-600">{selectedSchool.name}</span>
              </h3>
              <button
                onClick={() => setShowInviteForm(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {showInviteForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {showInviteForm ? 'Cancelar' : 'Invitar Usuario'}
              </button>
            </div>

            {/* Inline invite form */}
            <AnimatePresence>
              {showInviteForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden border-b border-gray-100"
                >
                  <form onSubmit={handleInviteSubmit} className="px-6 py-5 flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Correo electrónico</label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="w-full sm:w-44">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as 'admin' | 'staff' | 'teacher')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Personal</option>
                        <option value="teacher">Maestro</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isInviting || !inviteEmail.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isInviting ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Enviar invitación
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current users table */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Usuarios actuales</p>
              {usersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="w-10 h-10 text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">No hay usuarios en esta escuela</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {usersList.map(u => (
                    <div key={u.uid} className="flex items-center gap-3 py-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {(u.email?.[0] ?? 'U').toUpperCase()}
                      </div>
                      {/* Name / email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.email}</p>
                        <p className="text-xs text-gray-400">{u.uid === userProfile.uid ? 'Tú' : 'Usuario'}</p>
                      </div>
                      {/* Role badge */}
                      <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeStyle[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel[u.role] ?? u.role}
                      </span>
                      {/* Role selector */}
                      <select
                        disabled={u.uid === userProfile.uid}
                        value={u.role}
                        onChange={e => onUpdateRole(u.uid, e.target.value as 'admin' | 'staff' | 'teacher')}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Personal</option>
                        <option value="teacher">Maestro</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending invites table */}
            {pendingInvites.length > 0 && (
              <div className="px-6 pb-5 border-t border-gray-50 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Invitaciones pendientes
                </p>
                <div className="divide-y divide-gray-50">
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className="flex items-center gap-3 py-3">
                      <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{invite.email}</p>
                      </div>
                      <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeStyle[invite.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel[invite.role] ?? invite.role}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Pendiente
                      </span>
                      <button
                        onClick={() => invite.id && onRevokeInvite(invite.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revocar invitación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mover usuario de escuela (solo super admin) ─────────────────────── */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Mover Usuario a otra Escuela
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={moveEmail}
              onChange={e => { setMoveEmail(e.target.value); setMoveError(null); setMoveSuccess(false); }}
              placeholder="correo@ejemplo.com"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={moveTargetId}
              onChange={e => setMoveTargetId(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Seleccionar escuela —</option>
              {schools.map(s => (
                <option key={s.id} value={s.id!}>{s.name}</option>
              ))}
            </select>
            <button
              disabled={!moveEmail.trim() || !moveTargetId || isMoving}
              onClick={async () => {
                setIsMoving(true); setMoveError(null); setMoveSuccess(false);
                const err = await onMoveUser(moveEmail.trim(), moveTargetId);
                setIsMoving(false);
                if (err) { setMoveError(err); } else { setMoveSuccess(true); setMoveEmail(''); setMoveTargetId(''); }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isMoving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Shield className="w-4 h-4" />}
              Mover Usuario
            </button>
          </div>
          {moveError   && <p className="text-xs text-red-600 font-semibold">{moveError}</p>}
          {moveSuccess && <p className="text-xs text-emerald-600 font-semibold">Usuario movido correctamente.</p>}
        </div>
      )}

      {/* ─── Delete confirmation modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && schoolToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={e => { if (e.target === e.currentTarget) { setDeleteConfirmId(null); setDeleteConfirmName(''); } }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Eliminar escuela</h3>
                  <p className="text-xs text-gray-400">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3 text-xs text-red-700 leading-relaxed">
                Se eliminarán <strong>todos los alumnos, maestros, materias, pagos, asistencias y demás datos</strong> de <strong>{schoolToDelete.name}</strong>. Los usuarios serán desvinculados de la escuela.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Escribe el nombre exacto de la escuela para confirmar:
                </label>
                <p className="text-xs font-mono bg-gray-100 rounded-lg px-3 py-1.5 text-gray-700 mb-2 select-all">{schoolToDelete.name}</p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={e => setDeleteConfirmName(e.target.value)}
                  placeholder="Nombre de la escuela"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmName !== schoolToDelete.name || isDeleting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Eliminar escuela
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
