import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, ArrowRight, LogOut, Sparkles, Database } from 'lucide-react';

interface SchoolSetupPageProps {
  userName: string;
  userEmail: string;
  onCreateSchool: (data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    semesterCost?: number;
  }) => Promise<void>;
  onLogout: () => void;
}

export default function SchoolSetupPage({ userName, userEmail, onCreateSchool, onLogout }: SchoolSetupPageProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await onCreateSchool({
        name:         (fd.get('name') as string).trim(),
        address:      (fd.get('address') as string) || undefined,
        phone:        (fd.get('phone') as string) || undefined,
        email:        (fd.get('email') as string) || undefined,
        semesterCost: Number(fd.get('semesterCost')) || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        {/* Header card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 mb-4 text-white">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Configura tu Escuela</h1>
              <p className="text-indigo-200 text-sm">Bienvenido, {userName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-4">
            <Database className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
            <p className="text-indigo-100 text-sm leading-relaxed">
              Se detectaron registros existentes en el sistema. Serán <strong>migrados automáticamente</strong> a tu nuevo entorno escolar al crear la institución.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Nombre de la Institución <span className="text-rose-500">*</span>
              </label>
              <input
                name="name"
                required
                placeholder="Ej. CBTA No. 5 — Plantel Norte"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Teléfono</label>
                <input
                  name="phone"
                  placeholder="(999) 000-0000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Correo</label>
                <input
                  name="email"
                  type="email"
                  placeholder="escuela@mail.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Dirección</label>
              <input
                name="address"
                placeholder="Calle, Colonia, Ciudad, CP"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Costo por Semestre ($)</label>
              <input
                name="semesterCost"
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando escuela...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear Escuela y Continuar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">{userEmail}</p>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
