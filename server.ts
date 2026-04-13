import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import * as admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import nodemailer from 'nodemailer';

dotenv.config();

const firebaseConfig = JSON.parse(
  readFileSync(new URL('./firebase-applet-config.json', import.meta.url), 'utf-8')
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// ─── Session types ─────────────────────────────────────────────────────────────
type BotState = 'await_identifier' | 'await_password' | 'authenticated' | 'ai_mode' | 'await_attendance_id';
type BotRole  = 'admin' | 'teacher' | 'staff' | 'student';

interface BotSession {
  state:       BotState;
  schoolId:    string;
  role?:       BotRole;
  profileId?:  string;   // uid (users) or doc id (students)
  name?:       string;
  identifier?: string;
  attempts:    number;
  attendanceType?: 'entry' | 'exit';
}

const sessions = new Map<number, BotSession>();

// ─── Reply Keyboards by role ───────────────────────────────────────────────────
const KB = {
  remove: { remove_keyboard: true },

  admin: {
    keyboard: [
      ['👥 Alumnos',        '👨‍🏫 Maestros'    ],
      ['✅ Asistencia Hoy', '💰 Finanzas'     ],
      ['📈 Reporte Mensual','🏫 Mi Escuela'   ],
      ['🤖 Consulta IA',   '🔓 Cerrar Sesión'],
    ],
    resize_keyboard: true,
  },

  teacher: {
    keyboard: [
      ['📚 Mis Materias',   '👥 Mis Alumnos'  ],
      ['📝 Calificaciones', '✅ Asistencia'    ],
      ['🔓 Cerrar Sesión'],
    ],
    resize_keyboard: true,
  },

  staff: {
    keyboard: [
      ['✅ Registrar Entrada', '🚪 Registrar Salida'],
      ['👥 Lista Alumnos',     '📊 Estadísticas'    ],
      ['🔓 Cerrar Sesión'],
    ],
    resize_keyboard: true,
  },

  student: {
    keyboard: [
      ['📊 Mis Calificaciones', '💳 Mis Pagos'   ],
      ['✅ Mi Asistencia',      '👤 Mi Perfil'   ],
      ['👨‍🏫 Mis Maestros',       '🔓 Cerrar Sesión'],
    ],
    resize_keyboard: true,
  },

  ai_back: {
    keyboard: [['⬅️ Volver al Menú']],
    resize_keyboard: true,
  },
};

// ─── Gemini tools ──────────────────────────────────────────────────────────────
const AI_TOOLS = [{
  functionDeclarations: [
    { name: 'contar_alumnos',     description: 'Cuenta alumnos. status: active|inactive|all', parameters: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ['active','inactive','all'] } } } },
    { name: 'asistencia_hoy',     description: 'Resumen de asistencias de hoy.',               parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'reporte_asistencia', description: 'Reporte asistencia por rango de fechas.',       parameters: { type: Type.OBJECT, properties: { fechaInicio: { type: Type.STRING }, fechaFin: { type: Type.STRING } }, required: ['fechaInicio','fechaFin'] } },
    { name: 'alumnos_reprobados', description: 'Alumnos reprobados, opcional por materia.',     parameters: { type: Type.OBJECT, properties: { materiaId: { type: Type.STRING } } } },
    { name: 'resumen_pagos',      description: 'Resumen de ingresos/pagos. mes: YYYY-MM',       parameters: { type: Type.OBJECT, properties: { mes: { type: Type.STRING } } } },
    { name: 'resumen_egresos',    description: 'Resumen de egresos/gastos. mes: YYYY-MM',       parameters: { type: Type.OBJECT, properties: { mes: { type: Type.STRING } } } },
    { name: 'buscar_alumno',      description: 'Busca alumno por nombre o número de control.',  parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] } },
    { name: 'info_escuela',       description: 'Info general de la escuela.',                   parameters: { type: Type.OBJECT, properties: {} } },
  ]
}];

async function execTool(name: string, args: any, db: admin.firestore.Firestore, schoolId: string): Promise<string> {
  const school = db.collection('schools').doc(schoolId);
  try {
    switch (name) {
      case 'contar_alumnos': {
        const ref  = school.collection('students');
        const snap = await (args.status && args.status !== 'all' ? ref.where('status','==',args.status) : ref).get();
        const active   = snap.docs.filter(d => d.data().status === 'active').length;
        const inactive = snap.docs.filter(d => d.data().status === 'inactive').length;
        return JSON.stringify({ total: snap.size, activos: active, inactivos: inactive });
      }
      case 'asistencia_hoy': {
        const today    = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
        const [attSnap, studSnap] = await Promise.all([
          school.collection('attendance').where('timestamp','>=',today).where('timestamp','<',tomorrow).get(),
          school.collection('students').where('status','==','active').get(),
        ]);
        const entries    = attSnap.docs.map(d => d.data());
        const studentsIn = new Set(entries.filter(e => e.type==='entry' && e.personType==='student').map(e => e.personId));
        return JSON.stringify({ fecha: today.toLocaleDateString('es-MX'), registros_hoy: entries.length, alumnos_que_entraron: studentsIn.size, alumnos_sin_registro: studSnap.size - studentsIn.size, total_alumnos_activos: studSnap.size });
      }
      case 'reporte_asistencia': {
        const start = new Date(args.fechaInicio+'T00:00:00');
        const end   = new Date(args.fechaFin+'T23:59:59');
        const snap  = await school.collection('attendance').where('timestamp','>=',start).where('timestamp','<=',end).get();
        const byDay = new Map<string,number>();
        snap.docs.forEach(d => { const k = (d.data().timestamp?.toDate?.()??new Date()).toLocaleDateString('es-MX'); byDay.set(k,(byDay.get(k)??0)+1); });
        return JSON.stringify({ periodo: `${args.fechaInicio} al ${args.fechaFin}`, total_registros: snap.size, por_dia: Object.fromEntries(byDay) });
      }
      case 'alumnos_reprobados': {
        let q: any = school.collection('grades').where('status','==','failed');
        if (args.materiaId) q = q.where('subjectId','==',args.materiaId);
        const [gSnap, stSnap, sbSnap] = await Promise.all([q.get(), school.collection('students').get(), school.collection('subjects').get()]);
        const sm = new Map(stSnap.docs.map((d:any) => [d.id, d.data()]));
        const sbm = new Map(sbSnap.docs.map((d:any) => [d.id, d.data()]));
        const lista = gSnap.docs.slice(0,20).map((d:any) => { const g=d.data(); const st=sm.get(g.studentId) as any; const sb=sbm.get(g.subjectId) as any; return { alumno: st?`${st.firstName} ${st.lastName}`:g.studentId, materia: sb?.name??g.subjectId, calificacion: g.grade }; });
        return JSON.stringify({ total_reprobados: gSnap.size, lista });
      }
      case 'resumen_pagos': {
        let ref: any = school.collection('payments');
        if (args.mes) { const [yr,mo]=args.mes.split('-').map(Number); ref=ref.where('date','>=',new Date(yr,mo-1,1)).where('date','<=',new Date(yr,mo,0,23,59,59)); }
        const snap=await ref.get();
        return JSON.stringify({ total_registros: snap.size, monto_total: snap.docs.reduce((s:number,d:any)=>s+(d.data().amount??0),0), pagados: snap.docs.filter((d:any)=>['paid','completed'].includes(d.data().status)).length, pendientes: snap.docs.filter((d:any)=>d.data().status==='pending').length });
      }
      case 'resumen_egresos': {
        let ref: any = school.collection('expenses');
        if (args.mes) { const [yr,mo]=args.mes.split('-').map(Number); ref=ref.where('date','>=',new Date(yr,mo-1,1)).where('date','<=',new Date(yr,mo,0,23,59,59)); }
        const snap=await ref.get(); const pc: Record<string,number>={};
        snap.docs.forEach((d:any)=>{ const c=d.data().category??'other'; pc[c]=(pc[c]??0)+(d.data().amount??0); });
        return JSON.stringify({ total_registros: snap.size, monto_total: snap.docs.reduce((s:number,d:any)=>s+(d.data().amount??0),0), por_categoria: pc });
      }
      case 'buscar_alumno': {
        const q=(args.query??'').toLowerCase(); const snap=await school.collection('students').get();
        const hits=snap.docs.filter(d=>{ const s=d.data(); return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)||(s.controlNumber??'').toLowerCase().includes(q); }).slice(0,5);
        if (!hits.length) return JSON.stringify({ encontrado: false });
        return JSON.stringify({ encontrado: true, resultados: hits.map(d=>{ const s=d.data(); return { nombre:`${s.firstName} ${s.lastName}`, control:s.controlNumber, grado:s.grade, estatus:s.status==='active'?'Activo':'Inactivo' }; }) });
      }
      case 'info_escuela': {
        const [sc,st,tc]=await Promise.all([school.get(), school.collection('students').get(), school.collection('teachers').get()]);
        const sd=sc.data()??{} as any;
        return JSON.stringify({ nombre:sd.name, total_alumnos:st.size, alumnos_activos:st.docs.filter(d=>d.data().status==='active').length, total_maestros:tc.size });
      }
      default: return JSON.stringify({ error: `Tool ${name} no implementada` });
    }
  } catch(e:any) { return JSON.stringify({ error: e.message }); }
}

async function processWithAI(userMessage: string, db: admin.firestore.Firestore, schoolId: string): Promise<string> {
  const today = new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const systemInstruction = `Eres el asistente IA de EduControl Pro. Hoy es ${today}. Responde en español, de forma concisa para un director escolar. Usa las herramientas para datos reales. Formatea montos con $.`;
  const contents: any[] = [{ role:'user', parts:[{ text: userMessage }] }];
  for (let i=0; i<5; i++) {
    const result = await ai.models.generateContent({ model:'gemini-2.5-flash', contents, config:{ tools:AI_TOOLS, systemInstruction } });
    const calls = result.functionCalls;
    if (!calls?.length) return result.text?.trim() || 'Sin respuesta.';
    contents.push({ role:'model', parts: calls.map(fc=>({ functionCall:{ name:fc.name, args:fc.args } })) });
    const parts = await Promise.all(calls.map(async fc=>({ functionResponse:{ name:fc.name!, response:{ result: await execTool(fc.name!,fc.args??{},db,schoolId) } } })));
    contents.push({ role:'user', parts });
  }
  return 'No pude completar la consulta.';
}

// ─── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT) || 8060;
  app.use(express.json());

  // ─── Email transporter ────────────────────────────────────────────────────────
  const mailer = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // POST /api/send-invite
  app.post('/api/send-invite', async (req, res) => {
    const { email, role, schoolName } = req.body as { email: string; role: string; schoolName: string };
    if (!email || !role) { res.status(400).json({ error: 'Faltan datos' }); return; }

    const roleLabel: Record<string, string> = {
      admin: 'Administrador', teacher: 'Maestro', staff: 'Personal',
    };
    const appUrl = process.env.APP_URL || 'http://localhost:8060';

    try {
      await mailer.sendMail({
        from:    process.env.SMTP_FROM || process.env.SMTP_USER,
        to:      email,
        subject: `Invitación a ${schoolName} — EduControl bi`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 32px 24px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900">EduControl <span style="color:#a5b4fc">bi</span></h1>
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:13px">Gestión escolar inteligente</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:15px;color:#111827;margin:0 0 8px">Hola 👋,</p>
              <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px">
                Has sido invitado a unirte a <strong>${schoolName}</strong> como
                <strong style="color:#4f46e5">${roleLabel[role] ?? role}</strong>.
              </p>

              <div style="background:#f8f9ff;border:1px solid #e0e7ff;border-radius:12px;padding:20px;margin:0 0 24px">
                <p style="font-size:13px;font-weight:700;color:#4f46e5;margin:0 0 14px;text-transform:uppercase;letter-spacing:.05em">Cómo acceder — 3 pasos</p>
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
                  <div style="background:#4f46e5;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;shrink:0;flex-shrink:0">1</div>
                  <p style="font-size:13px;color:#374151;margin:0;line-height:1.5">Haz clic en el botón <strong>"Ir al sistema"</strong> de abajo.</p>
                </div>
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
                  <div style="background:#4f46e5;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">2</div>
                  <p style="font-size:13px;color:#374151;margin:0;line-height:1.5">Selecciona la pestaña <strong>"Correo institucional"</strong> y luego <strong>"¿Primera vez? Crear cuenta"</strong>.</p>
                </div>
                <div style="display:flex;align-items:flex-start;gap:12px">
                  <div style="background:#4f46e5;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">3</div>
                  <p style="font-size:13px;color:#374151;margin:0;line-height:1.5">Ingresa <strong>${email}</strong> como correo y elige una contraseña. ¡Listo!</p>
                </div>
              </div>

              <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px">
                Ir al sistema →
              </a>

              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
              <p style="font-size:11px;color:#9ca3af;margin:0">
                Si no esperabas este correo, ignóralo. Este enlace no caduca.
              </p>
            </div>
          </div>
        `,
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[Email] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Firebase Admin
  let db: admin.firestore.Firestore | null = null;
  try {
    const saPath = path.join(process.cwd(), 'firebase-service-account.json');
    try { readFileSync(saPath); process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath; console.log('[Firebase] Using service account'); }
    catch { console.warn('[Firebase] No service account file found'); }

    const fbApp = getApps().length === 0 ? initializeApp({ projectId: firebaseConfig.projectId }) : getApp();
    const dbId  = firebaseConfig.firestoreDatabaseId;
    db = dbId ? getFirestore(fbApp as admin.app.App, dbId) : getFirestore(fbApp as admin.app.App);
    await db.collection('users').limit(1).get();
    console.log('[Firebase] Connected!');
  } catch(e) { console.error('[Firebase] Error:', (e as Error).message); }

  // Helpers
  const getLinkedSchool = async (chatId: number): Promise<string|null> => {
    if (!db) return null;
    const snap = await db.collection('telegram_users').doc(String(chatId)).get();
    return snap.exists ? snap.data()!.schoolId as string : null;
  };

  // ── Show menu after login ────────────────────────────────────────────────────
  const showMenu = (chatId: number, session: BotSession, bot: TelegramBot) => {
    const greet = `✅ *Bienvenido, ${session.name || 'Usuario'}*\n\nSelecciona una opción:`;
    const kb = KB[session.role as keyof typeof KB] ?? KB.admin;
    bot.sendMessage(chatId, greet, { parse_mode:'Markdown', reply_markup: kb as any });
  };

  // ── Identifier step (email or control number) ────────────────────────────────
  const handleIdentifier = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school = db.collection('schools').doc(session.schoolId);

    // Check students first (by controlNumber)
    const studentSnap = await school.collection('students').where('controlNumber','==',text.toUpperCase().trim()).get();
    if (!studentSnap.empty) {
      const s = studentSnap.docs[0].data();
      session.identifier = text.toUpperCase().trim();
      session.role       = 'student';
      session.profileId  = studentSnap.docs[0].id;
      session.name       = `${s.firstName} ${s.lastName}`;
      session.state      = 'await_password';
      bot.sendMessage(chatId, `👤 Alumno encontrado: *${session.name}*\n\nEscribe tu contraseña de internet:`, { parse_mode:'Markdown', reply_markup: KB.remove as any });
      return;
    }

    // Check users (by email)
    const email = text.toLowerCase().trim();
    const usersSnap = await db.collection('users').where('email','==',email).where('schoolId','==',session.schoolId).get();
    if (!usersSnap.empty) {
      const u = usersSnap.docs[0].data();
      if (!u.botPin) {
        bot.sendMessage(chatId, '⚠️ Tu cuenta no tiene PIN de acceso configurado.\n\nPide al administrador que te genere un PIN desde la app en *Usuarios → PIN Telegram*.', { parse_mode:'Markdown' });
        sessions.delete(chatId);
        return;
      }
      session.identifier = email;
      session.role       = u.role as BotRole;
      session.profileId  = usersSnap.docs[0].id;
      session.name       = email.split('@')[0];
      session.state      = 'await_password';
      bot.sendMessage(chatId, `👤 Usuario encontrado: *${session.name}*\n\nEscribe tu PIN de 4 dígitos:`, { parse_mode:'Markdown', reply_markup: KB.remove as any });
      return;
    }

    session.attempts++;
    if (session.attempts >= 3) {
      bot.sendMessage(chatId, '❌ Demasiados intentos fallidos. Usa /login para intentar de nuevo.');
      sessions.delete(chatId);
      return;
    }
    bot.sendMessage(chatId, `❌ No se encontró ningún usuario con ese dato. Intento ${session.attempts}/3\n\nEscribe tu número de control (alumno) o email (personal/maestros):`);
  };

  // ── Password step ────────────────────────────────────────────────────────────
  const handlePassword = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school = db.collection('schools').doc(session.schoolId);
    let correct = false;

    if (session.role === 'student') {
      const snap = await school.collection('students').doc(session.profileId!).get();
      correct = snap.data()?.internetPassword === text;
    } else {
      const snap = await db.collection('users').doc(session.profileId!).get();
      correct = snap.data()?.botPin === text;
    }

    if (correct) {
      session.state    = 'authenticated';
      session.attempts = 0;
      showMenu(chatId, session, bot);
    } else {
      session.attempts++;
      if (session.attempts >= 3) {
        bot.sendMessage(chatId, '❌ PIN/contraseña incorrectos. Sesión bloqueada. Usa /login para intentar de nuevo.', { reply_markup: KB.remove as any });
        sessions.delete(chatId);
        return;
      }
      bot.sendMessage(chatId, `❌ Contraseña incorrecta. Intento ${session.attempts}/3\n\nVuelve a intentarlo:`);
    }
  };

  // ── Admin menu actions ───────────────────────────────────────────────────────
  const handleAdminMenu = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school = db.collection('schools').doc(session.schoolId);

    switch (text) {
      case '👥 Alumnos': {
        const snap = await school.collection('students').get();
        const active = snap.docs.filter(d => d.data().status === 'active').length;
        bot.sendMessage(chatId, `👥 *Alumnos*\n\nTotal: ${snap.size}\nActivos: ${active}\nInactivos: ${snap.size - active}`, { parse_mode:'Markdown' });
        break;
      }
      case '👨‍🏫 Maestros': {
        const snap = await school.collection('teachers').get();
        const active = snap.docs.filter(d => d.data().status === 'active').length;
        const list = snap.docs.slice(0,8).map(d => { const t=d.data(); return `• ${t.firstName} ${t.lastName}`; }).join('\n');
        bot.sendMessage(chatId, `👨‍🏫 *Maestros*\n\nTotal: ${snap.size} | Activos: ${active}\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '✅ Asistencia Hoy': {
        const result = await execTool('asistencia_hoy', {}, db, session.schoolId);
        const d = JSON.parse(result);
        bot.sendMessage(chatId, `✅ *Asistencia — ${d.fecha}*\n\nAlumnos activos: ${d.total_alumnos_activos}\nEntradas registradas: ${d.alumnos_que_entraron}\nSin registro: ${d.alumnos_sin_registro}\n\nTotal de registros hoy: ${d.registros_hoy}`, { parse_mode:'Markdown' });
        break;
      }
      case '💰 Finanzas': {
        const mes = new Date().toISOString().slice(0,7);
        const [pagos, egresos] = await Promise.all([
          execTool('resumen_pagos',   { mes }, db, session.schoolId),
          execTool('resumen_egresos', { mes }, db, session.schoolId),
        ]);
        const p = JSON.parse(pagos); const e = JSON.parse(egresos);
        const balance = (p.monto_total ?? 0) - (e.monto_total ?? 0);
        bot.sendMessage(chatId,
          `💰 *Finanzas — ${mes}*\n\n` +
          `📥 Ingresos: $${(p.monto_total??0).toLocaleString()}\n` +
          `📤 Egresos:  $${(e.monto_total??0).toLocaleString()}\n` +
          `━━━━━━━━━━━━\n` +
          `📊 Balance:  $${balance.toLocaleString()}`,
          { parse_mode:'Markdown' }
        );
        break;
      }
      case '📈 Reporte Mensual': {
        await bot.sendChatAction(chatId, 'typing');
        const mes   = new Date().toISOString().slice(0,7);
        const [info, pagos, egresos, att, alumnos] = await Promise.all([
          execTool('info_escuela',    {}, db, session.schoolId),
          execTool('resumen_pagos',   { mes }, db, session.schoolId),
          execTool('resumen_egresos', { mes }, db, session.schoolId),
          execTool('asistencia_hoy',  {}, db, session.schoolId),
          execTool('contar_alumnos',  { status:'active' }, db, session.schoolId),
        ]);
        const sc=JSON.parse(info); const p=JSON.parse(pagos); const e=JSON.parse(egresos); const a=JSON.parse(att); const al=JSON.parse(alumnos);
        bot.sendMessage(chatId,
          `📈 *Reporte Mensual — ${mes}*\n_${sc.nombre}_\n\n` +
          `👥 Alumnos activos: ${al.activos}\n` +
          `✅ Asistencia hoy: ${a.alumnos_que_entraron}/${a.total_alumnos_activos}\n\n` +
          `💰 Ingresos: $${(p.monto_total??0).toLocaleString()}\n` +
          `📤 Egresos:  $${(e.monto_total??0).toLocaleString()}\n` +
          `📊 Balance:  $${((p.monto_total??0)-(e.monto_total??0)).toLocaleString()}`,
          { parse_mode:'Markdown' }
        );
        break;
      }
      case '🏫 Mi Escuela': {
        const result = await execTool('info_escuela', {}, db, session.schoolId);
        const d = JSON.parse(result);
        bot.sendMessage(chatId, `🏫 *${d.nombre}*\n\nAlumnos: ${d.total_alumnos} (${d.alumnos_activos} activos)\nMaestros: ${d.total_maestros}`, { parse_mode:'Markdown' });
        break;
      }
      case '🤖 Consulta IA': {
        session.state = 'ai_mode';
        bot.sendMessage(chatId, '🤖 *Modo IA activado*\n\nEscribe tu pregunta en lenguaje natural.\nEjemplos:\n• ¿Cuántos alumnos reprobaron matemáticas?\n• Resumen de ingresos de febrero\n• Busca al alumno García', { parse_mode:'Markdown', reply_markup: KB.ai_back as any });
        break;
      }
      case '🔓 Cerrar Sesión': {
        sessions.delete(chatId);
        bot.sendMessage(chatId, '👋 Sesión cerrada. Hasta luego.', { reply_markup: KB.remove as any });
        break;
      }
      default:
        bot.sendMessage(chatId, 'Usa los botones del menú o escribe /login si se perdió el teclado.');
    }
  };

  // ── Teacher menu actions ─────────────────────────────────────────────────────
  const handleTeacherMenu = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school = db.collection('schools').doc(session.schoolId);

    switch (text) {
      case '📚 Mis Materias': {
        const snap = await school.collection('subjects').where('teacherId','==',session.profileId).get();
        if (snap.empty) { bot.sendMessage(chatId, 'No tienes materias asignadas.'); break; }
        const list = snap.docs.map(d => `• ${d.data().name} (${d.data().code})`).join('\n');
        bot.sendMessage(chatId, `📚 *Mis Materias*\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '👥 Mis Alumnos': {
        // Get groups taught by this teacher via schedule entries
        const schedSnap = await school.collection('schedule_entries').where('teacherId','==',session.profileId).get();
        const groupIds  = [...new Set(schedSnap.docs.map(d => d.data().groupId))];
        if (!groupIds.length) { bot.sendMessage(chatId, 'No tienes grupos asignados.'); break; }
        const groupSnap = await school.collection('academic_groups').where(FieldPath.documentId(),'in',groupIds.slice(0,10)).get();
        const list = groupSnap.docs.map(d => `• ${d.data().name}`).join('\n');
        bot.sendMessage(chatId, `👥 *Mis Grupos*\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '📝 Calificaciones': {
        const subjects = await school.collection('subjects').where('teacherId','==',session.profileId).get();
        const subIds   = subjects.docs.map(d => d.id);
        if (!subIds.length) { bot.sendMessage(chatId, 'No tienes materias asignadas.'); break; }
        const gradesSnap = await school.collection('grades').where('subjectId','in',subIds.slice(0,10)).get();
        const failed = gradesSnap.docs.filter(d => d.data().status === 'failed').length;
        bot.sendMessage(chatId, `📝 *Calificaciones*\n\nTotal registros: ${gradesSnap.size}\nReprobados: ${failed}\nAprobados: ${gradesSnap.size - failed}`, { parse_mode:'Markdown' });
        break;
      }
      case '✅ Asistencia': {
        const result = await execTool('asistencia_hoy', {}, db, session.schoolId);
        const d = JSON.parse(result);
        bot.sendMessage(chatId, `✅ *Asistencia Hoy*\n\nEntradas: ${d.alumnos_que_entraron}\nSin registro: ${d.alumnos_sin_registro}`, { parse_mode:'Markdown' });
        break;
      }
      case '🔓 Cerrar Sesión':
        sessions.delete(chatId);
        bot.sendMessage(chatId, '👋 Sesión cerrada.', { reply_markup: KB.remove as any });
        break;
      default:
        bot.sendMessage(chatId, 'Usa los botones del menú.');
    }
  };

  // ── Staff menu actions ───────────────────────────────────────────────────────
  const handleStaffMenu = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school = db.collection('schools').doc(session.schoolId);

    switch (text) {
      case '✅ Registrar Entrada':
        session.state          = 'await_attendance_id';
        session.attendanceType = 'entry';
        bot.sendMessage(chatId, '✅ *Registrar Entrada*\n\nEscribe el número de control del alumno:', { parse_mode:'Markdown' });
        break;
      case '🚪 Registrar Salida':
        session.state          = 'await_attendance_id';
        session.attendanceType = 'exit';
        bot.sendMessage(chatId, '🚪 *Registrar Salida*\n\nEscribe el número de control del alumno:', { parse_mode:'Markdown' });
        break;
      case '👥 Lista Alumnos': {
        const snap = await school.collection('students').where('status','==','active').orderBy('firstName').limit(15).get();
        const list = snap.docs.map(d => `• ${d.data().firstName} ${d.data().lastName} — ${d.data().controlNumber}`).join('\n');
        bot.sendMessage(chatId, `👥 *Alumnos Activos* (${snap.size})\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '📊 Estadísticas': {
        const result = await execTool('asistencia_hoy', {}, db, session.schoolId);
        const d = JSON.parse(result);
        bot.sendMessage(chatId, `📊 *Estadísticas de Hoy*\n\nTotal activos: ${d.total_alumnos_activos}\nEntradas: ${d.alumnos_que_entraron}\nSalidas: ${d.alumnos_que_salieron ?? 0}\nSin registro: ${d.alumnos_sin_registro}`, { parse_mode:'Markdown' });
        break;
      }
      case '🔓 Cerrar Sesión':
        sessions.delete(chatId);
        bot.sendMessage(chatId, '👋 Sesión cerrada.', { reply_markup: KB.remove as any });
        break;
      default:
        bot.sendMessage(chatId, 'Usa los botones del menú.');
    }
  };

  // ── Student menu actions ─────────────────────────────────────────────────────
  const handleStudentMenu = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school = db.collection('schools').doc(session.schoolId);

    switch (text) {
      case '📊 Mis Calificaciones': {
        const snap = await school.collection('grades').where('studentId','==',session.profileId).orderBy('semester').get();
        if (snap.empty) { bot.sendMessage(chatId, 'No tienes calificaciones registradas.'); break; }
        const list = snap.docs.map(d => { const g=d.data(); return `${g.semester}°sem — Cal: ${g.grade} ${g.status==='approved'?'✅':'❌'}`; }).join('\n');
        bot.sendMessage(chatId, `📊 *Mis Calificaciones*\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '💳 Mis Pagos': {
        // Payments use controlNumber as studentId (set by web app form)
        const snap = await school.collection('payments').where('studentId','==',session.identifier).orderBy('date','desc').limit(10).get();
        if (snap.empty) { bot.sendMessage(chatId, 'No tienes pagos registrados.'); break; }
        const list = snap.docs.map(d => { const p=d.data(); const date=(p.date?.toDate?.()??new Date()).toLocaleDateString('es-MX'); return `• $${p.amount} — ${p.concept} (${date})`; }).join('\n');
        bot.sendMessage(chatId, `💳 *Mis Pagos*\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '✅ Mi Asistencia': {
        // Attendance uses controlNumber as personId (set by web app)
        const snap = await school.collection('attendance').where('personId','==',session.identifier).orderBy('timestamp','desc').limit(10).get();
        if (snap.empty) { bot.sendMessage(chatId, 'No tienes registros de asistencia.'); break; }
        const list = snap.docs.map(d => { const a=d.data(); const ts=(a.timestamp?.toDate?.()??new Date()); return `• ${a.type==='entry'?'Entrada':'Salida'} — ${ts.toLocaleDateString('es-MX')} ${ts.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`; }).join('\n');
        bot.sendMessage(chatId, `✅ *Mi Asistencia*\n\n${list}`, { parse_mode:'Markdown' });
        break;
      }
      case '👤 Mi Perfil': {
        const snap = await school.collection('students').doc(session.profileId!).get();
        const s = snap.data() as any;
        bot.sendMessage(chatId, `👤 *Mi Perfil*\n\nNombre: ${s.firstName} ${s.lastName}\nControl: ${s.controlNumber}\nGrado: ${s.grade}° ${s.group}\nEstatus: ${s.status==='active'?'✅ Activo':'❌ Inactivo'}`, { parse_mode:'Markdown' });
        break;
      }
      case '👨‍🏫 Mis Maestros': {
        const studentSnap = await school.collection('students').doc(session.profileId!).get();
        const subjectIds: string[] = studentSnap.data()?.subjectIds ?? [];
        if (!subjectIds.length) {
          bot.sendMessage(chatId, 'No tienes materias asignadas.'); break;
        }
        const subjectsSnap = await school.collection('subjects')
          .where(FieldPath.documentId(), 'in', subjectIds.slice(0, 10))
          .get();
        if (subjectsSnap.empty) {
          bot.sendMessage(chatId, 'No se encontraron materias registradas.'); break;
        }
        const teacherIds = [...new Set(
          subjectsSnap.docs.map(d => d.data().teacherId).filter(Boolean) as string[]
        )];
        const teacherMap = new Map<string, string>();
        if (teacherIds.length) {
          const teachersSnap = await school.collection('teachers')
            .where(FieldPath.documentId(), 'in', teacherIds.slice(0, 10))
            .get();
          teachersSnap.docs.forEach(d => {
            const t = d.data();
            teacherMap.set(d.id, `${t.firstName} ${t.lastName}`);
          });
        }
        const list = subjectsSnap.docs.map(d => {
          const s = d.data();
          const teacher = s.teacherId ? (teacherMap.get(s.teacherId) ?? '—') : '—';
          return `📚 *${s.name}* (${s.code})\n   👨‍🏫 ${teacher}`;
        }).join('\n\n');
        bot.sendMessage(chatId, `👨‍🏫 *Mis Maestros*\n\n${list}`, { parse_mode: 'Markdown' });
        break;
      }
      case '🔓 Cerrar Sesión':
        sessions.delete(chatId);
        bot.sendMessage(chatId, '👋 Hasta luego.', { reply_markup: KB.remove as any });
        break;
      default:
        bot.sendMessage(chatId, 'Usa los botones del menú.');
    }
  };

  // ── Attendance registration (staff) ─────────────────────────────────────────
  const handleAttendanceId = async (chatId: number, text: string, session: BotSession, bot: TelegramBot) => {
    if (!db) return;
    const school  = db.collection('schools').doc(session.schoolId);
    const snap    = await school.collection('students').where('controlNumber','==',text.toUpperCase().trim()).get();
    if (snap.empty) {
      bot.sendMessage(chatId, `❌ No se encontró alumno con control: ${text}\n\nIntenta de nuevo o usa el menú.`);
      session.state = 'authenticated';
      return;
    }
    const student = snap.docs[0];
    const s       = student.data();
    await school.collection('attendance').add({
      personId:   s.controlNumber,
      personType: 'student',
      type:       session.attendanceType ?? 'entry',
      timestamp:  FieldValue.serverTimestamp(),
    });
    const typeLabel = session.attendanceType === 'entry' ? 'Entrada ✅' : 'Salida 🚪';
    bot.sendMessage(chatId, `${typeLabel} registrada\n\n*${s.firstName} ${s.lastName}*\nControl: ${s.controlNumber}\n🕐 ${new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`, { parse_mode:'Markdown' });
    session.state = 'authenticated';
  };

  app.get('/api/health', (_req, res) => res.json({ status:'ok' }));

  // ─── Telegram Bot ─────────────────────────────────────────────────────────────
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let bot: TelegramBot | null = null;

  if (token) {
    try {
      bot = new TelegramBot(token, {
        polling: { interval: 1000, autoStart: true, params: { timeout: 30 } },
      });
      bot.on('polling_error', (err: any) => {
        const msg = err.message ?? '';
        if (msg.includes('409')) return; // duplicate instance — ignore
        if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
          // transient network blip — polling auto-resumes, just log quietly
          console.warn('[Bot] Red temporalmente caída, reconectando...');
          return;
        }
        console.error('[Bot] Polling Error:', msg);
      });

      // /start
      bot.onText(/\/start/, async (msg) => {
        const chatId   = msg.chat.id;
        const schoolId = await getLinkedSchool(chatId);
        if (!schoolId) {
          bot!.sendMessage(chatId, '👋 Bienvenido a *EduControl bi*\n\nPrimero vincula tu cuenta:\n`/vincular <schoolId>`\n\nEncuentra el ID en la app → pestaña *Escuelas*.', { parse_mode:'Markdown' });
          return;
        }
        bot!.sendMessage(chatId, '👋 Usa /login para acceder con tu cuenta.', { reply_markup: KB.remove as any });
      });

      // /login — clear session and start fresh
      bot.onText(/\/login/, async (msg) => {
        const chatId   = msg.chat.id;
        const schoolId = await getLinkedSchool(chatId);
        if (!schoolId) {
          bot!.sendMessage(chatId, '⚠️ No estás vinculado a ninguna escuela. Usa /vincular <schoolId> primero.');
          return;
        }
        sessions.set(chatId, { state:'await_identifier', schoolId, attempts: 0 });
        bot!.sendMessage(chatId,
          '🔐 *Inicio de Sesión*\n\nEscribe tu identificador:\n\n' +
          '• *Alumno* → número de control\n' +
          '• *Director / Maestro / Staff* → correo electrónico',
          { parse_mode:'Markdown', reply_markup: KB.remove as any }
        );
      });

      // /vincular
      bot.onText(/\/vincular (.+)/, async (msg, match) => {
        const chatId   = msg.chat.id;
        const schoolId = match?.[1]?.trim();
        if (!schoolId || !db) return;
        try {
          const snap = await db.collection('schools').doc(schoolId).get();
          if (!snap.exists) { bot!.sendMessage(chatId, `❌ No existe escuela con ID: \`${schoolId}\``, { parse_mode:'Markdown' }); return; }
          await db.collection('telegram_users').doc(String(chatId)).set({ schoolId, username: msg.from?.username ?? null, linkedAt: FieldValue.serverTimestamp() });
          bot!.sendMessage(chatId, `✅ Vinculado a *${snap.data()!.name}*\n\nAhora usa /login para acceder.`, { parse_mode:'Markdown' });
        } catch(e: any) {
          bot!.sendMessage(chatId, `⚠️ Error: ${e.message}`);
        }
      });

      // /menu — show menu if authenticated
      bot.onText(/\/menu/, (msg) => {
        const chatId  = msg.chat.id;
        const session = sessions.get(chatId);
        if (!session || session.state !== 'authenticated') {
          bot!.sendMessage(chatId, 'Usa /login primero.');
          return;
        }
        showMenu(chatId, session, bot!);
      });

      // /salir
      bot.onText(/\/salir/, (msg) => {
        sessions.delete(msg.chat.id);
        bot!.sendMessage(msg.chat.id, '👋 Sesión cerrada.', { reply_markup: KB.remove as any });
      });

      // /ayuda
      bot.onText(/\/ayuda/, (msg) => {
        bot!.sendMessage(msg.chat.id,
          `📖 *Comandos*\n\n` +
          `/start — Bienvenida\n` +
          `/vincular <id> — Vincular escuela\n` +
          `/login — Iniciar sesión\n` +
          `/menu — Mostrar menú\n` +
          `/salir — Cerrar sesión\n` +
          `/debug — Diagnóstico\n` +
          `/ayuda — Esta ayuda`,
          { parse_mode:'Markdown' }
        );
      });

      // /debug
      bot.onText(/\/debug/, async (msg) => {
        const chatId   = msg.chat.id;
        const schoolId = await getLinkedSchool(chatId);
        const session  = sessions.get(chatId);
        bot!.sendMessage(chatId,
          `🔍 *Debug*\n\nDB: ${db?'✅':'❌'}\nEscuela: ${schoolId??'❌'}\nSesión: ${session?.state??'Sin sesión'}\nRol: ${session?.role??'-'}`,
          { parse_mode:'Markdown' }
        );
      });

      // ── Main message handler ───────────────────────────────────────────────────
      bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        const chatId = msg.chat.id;
        const text   = msg.text.trim();

        const schoolId = await getLinkedSchool(chatId);
        if (!schoolId) {
          bot!.sendMessage(chatId, '⚠️ Vincula tu cuenta primero con /vincular <schoolId>');
          return;
        }

        let session = sessions.get(chatId);

        // No session → prompt login
        if (!session) {
          sessions.set(chatId, { state:'await_identifier', schoolId, attempts: 0 });
          bot!.sendMessage(chatId,
            '🔐 *Inicio de Sesión*\n\nEscribe tu identificador:\n• *Alumno* → número de control\n• *Director/Maestro/Staff* → correo electrónico',
            { parse_mode:'Markdown', reply_markup: KB.remove as any }
          );
          return;
        }

        session = sessions.get(chatId)!;

        switch (session.state) {
          case 'await_identifier':
            await handleIdentifier(chatId, text, session, bot!);
            break;

          case 'await_password':
            await handlePassword(chatId, text, session, bot!);
            break;

          case 'await_attendance_id':
            await handleAttendanceId(chatId, text, session, bot!);
            break;

          case 'ai_mode':
            if (text === '⬅️ Volver al Menú') {
              session.state = 'authenticated';
              showMenu(chatId, session, bot!);
              return;
            }
            await bot!.sendChatAction(chatId, 'typing');
            try {
              const res = await processWithAI(text, db!, schoolId);
              try { await bot!.sendMessage(chatId, res, { parse_mode:'Markdown', reply_markup: KB.ai_back as any }); }
              catch { await bot!.sendMessage(chatId, res, { reply_markup: KB.ai_back as any }); }
            } catch { bot!.sendMessage(chatId, '⚠️ Error al procesar consulta.', { reply_markup: KB.ai_back as any }); }
            break;

          case 'authenticated':
            switch (session.role) {
              case 'admin':   await handleAdminMenu(chatId, text, session, bot!);   break;
              case 'teacher': await handleTeacherMenu(chatId, text, session, bot!); break;
              case 'staff':   await handleStaffMenu(chatId, text, session, bot!);   break;
              case 'student': await handleStudentMenu(chatId, text, session, bot!); break;
            }
            break;
        }
      });

      console.log('Telegram Bot initialized successfully');
    } catch(e) { console.error('Bot init error:', e); }
  }

  // Vite
  if (process.env.BOT_ONLY !== 'true') {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({ server:{ middlewareMode:true }, appType:'spa' });
      app.use(vite.middlewares);
    } else {
      const dist = path.join(process.cwd(), 'dist');
      app.use(express.static(dist));
      app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
    }
  }

  if (process.env.BOT_ONLY === 'true') {
    console.log('[Bot] Running in BOT_ONLY mode — HTTP server disabled');
    const cleanup = async () => { if (bot) await bot.stopPolling(); process.exit(0); };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    return;
  }

  const server = app.listen(PORT, '0.0.0.0', () => console.log(`Server on http://localhost:${PORT}`));
  const cleanup = async () => { if (bot) await bot.stopPolling(); server.close(() => process.exit(0)); };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startServer().catch(console.error);
