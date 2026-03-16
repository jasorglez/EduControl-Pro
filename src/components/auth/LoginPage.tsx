import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';

interface LoginPageProps {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, password: string) => Promise<string | null>;
  onEmailRegister: (email: string, password: string) => Promise<string | null>;
  onPasswordReset: (email: string) => Promise<string | null>;
}

type Tab = 'google' | 'email';
type EmailMode = 'login' | 'register' | 'reset';

export default function LoginPage({ onGoogleLogin, onEmailLogin, onEmailRegister, onPasswordReset }: LoginPageProps) {
  const [tab, setTab]           = useState<Tab>('google');
  const [mode, setMode]         = useState<EmailMode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const resetForm = (nextMode: EmailMode) => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirm('');
    setShowPwd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'reset') {
      if (!email) { setError('Ingresa tu correo.'); return; }
      setLoading(true);
      const err = await onPasswordReset(email);
      setLoading(false);
      if (err) setError(err);
      else setSuccess('¡Revisa tu correo! Te enviamos un enlace para restablecer tu contraseña.');
      return;
    }

    if (!email || !password) { setError('Completa todos los campos.'); return; }

    if (mode === 'register') {
      if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
      if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
      setLoading(true);
      const err = await onEmailRegister(email, password);
      setLoading(false);
      if (err) setError(err);
      return;
    }

    // login
    setLoading(true);
    const err = await onEmailLogin(email, password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex bg-[#0f0f1a]">

      {/* ── Left panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-1 relative overflow-hidden"
      >
        <img src="/erp.png" alt="EduControl bi" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0f0f1a]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a]/60 via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/70 text-xs font-semibold tracking-wider">
            ✦ La solución integral para tu escuela
          </div>
        </div>
      </motion.div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 lg:max-w-[480px] items-center justify-center p-8 relative">
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-violet-600/15 rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/bi2.png" alt="Business Intelligent" className="w-36 h-36 object-contain mx-auto mb-4 drop-shadow-2xl" />
            <h1 className="text-3xl font-black text-white tracking-tight">
              EduControl <span className="text-indigo-400">bi</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 font-medium">Gestión escolar inteligente</p>
          </div>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl">

            {/* Tabs */}
            <div className="flex bg-white/5 rounded-2xl p-1 mb-6 gap-1">
              {(['google', 'email'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    tab === t
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t === 'google' ? 'Google' : 'Correo institucional'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === 'google' ? (
                <motion.div key="google" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
                    Accede con tu cuenta de Google
                  </p>
                  <button
                    onClick={onGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-bold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all shadow-lg shadow-black/20"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Acceder con Google
                  </button>
                </motion.div>
              ) : (
                <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

                  {/* Mode header */}
                  <p className="text-gray-300 text-sm font-semibold text-center mb-1">
                    {mode === 'login'    && 'Iniciar sesión'}
                    {mode === 'register' && 'Crear cuenta nueva'}
                    {mode === 'reset'    && 'Recuperar contraseña'}
                  </p>
                  {mode === 'register' && (
                    <p className="text-indigo-300/70 text-xs text-center mb-4 leading-relaxed">
                      Ingresa el correo al que te enviaron la invitación y elige una contraseña nueva.
                    </p>
                  )}
                  {mode === 'login' && (
                    <p className="text-gray-500 text-xs text-center mb-4">
                      ¿Primera vez? Usa <span className="text-indigo-400 font-semibold">¿Primera vez? Crear cuenta</span>
                    </p>
                  )}

                  {success ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                      <p className="text-emerald-300 text-sm text-center leading-relaxed">{success}</p>
                      <button onClick={() => resetForm('login')} className="text-indigo-400 text-xs hover:underline mt-1">
                        Volver al inicio de sesión
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      {/* Email */}
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-white/8 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          autoComplete="email"
                        />
                      </div>

                      {/* Password */}
                      {mode !== 'reset' && (
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type={showPwd ? 'text' : 'password'}
                            placeholder="Contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-3 bg-white/8 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                          />
                          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Confirm password */}
                      {mode === 'register' && (
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type={showPwd ? 'text' : 'password'}
                            placeholder="Confirmar contraseña"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-white/8 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            autoComplete="new-password"
                          />
                        </div>
                      )}

                      {/* Error */}
                      {error && (
                        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
                      )}

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 active:scale-[0.98] mt-1"
                      >
                        {loading
                          ? <RefreshCw className="w-4 h-4 animate-spin" />
                          : <>
                              {mode === 'login'    && 'Iniciar sesión'}
                              {mode === 'register' && 'Crear cuenta'}
                              {mode === 'reset'    && 'Enviar enlace'}
                              <ArrowRight className="w-4 h-4" />
                            </>
                        }
                      </button>

                      {/* Mode links */}
                      <div className="flex flex-col items-center gap-1.5 pt-1">
                        {mode === 'login' && <>
                          <button type="button" onClick={() => resetForm('register')} className="text-indigo-400 text-xs hover:underline">
                            ¿Primera vez? Crear cuenta
                          </button>
                          <button type="button" onClick={() => resetForm('reset')} className="text-gray-500 text-xs hover:text-gray-300 hover:underline">
                            ¿Olvidaste tu contraseña?
                          </button>
                        </>}
                        {(mode === 'register' || mode === 'reset') && (
                          <button type="button" onClick={() => resetForm('login')} className="text-gray-500 text-xs hover:text-gray-300 hover:underline">
                            ← Volver a iniciar sesión
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-gray-700 text-xs mt-6">
            Business Intelligent © 2025 · v1.1
          </p>
        </motion.div>
      </div>
    </div>
  );
}
