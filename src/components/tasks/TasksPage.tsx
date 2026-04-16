import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Plus, X, Upload, FileText, File, Image,
  Play, Download, Trash2, ChevronRight, ChevronDown, CheckCircle2,
  Clock, AlertCircle, User, Users, BookOpen, Calendar,
  Star, Send, Eye, MoreVertical, Paperclip,
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';
import type {
  Task, TaskAttachment, TaskAssignment, TaskSubmission,
  Student, Teacher, AcademicGroup, Subject, UserProfile,
} from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectType(filename: string): TaskAttachment['type'] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  return 'other';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(ts: any): string {
  if (!ts) return '—';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TYPE_ICON: Record<TaskAttachment['type'], React.ReactNode> = {
  pdf:   <FileText className="w-4 h-4 text-red-500" />,
  word:  <FileText className="w-4 h-4 text-blue-500" />,
  excel: <FileText className="w-4 h-4 text-emerald-500" />,
  video: <Play className="w-4 h-4 text-purple-500" />,
  image: <Image className="w-4 h-4 text-amber-500" />,
  other: <File className="w-4 h-4 text-gray-400" />,
};

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700',   icon: <Clock className="w-3 h-3" /> },
  submitted: { label: 'Entregado', cls: 'bg-blue-100 text-blue-700',     icon: <Send className="w-3 h-3" /> },
  graded:    { label: 'Calificado', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TasksPageProps {
  tasks:           Task[];
  taskAssignments: TaskAssignment[];
  taskSubmissions: TaskSubmission[];
  students:        Student[];
  teachers:        Teacher[];
  academicGroups:  AcademicGroup[];
  subjects:        Subject[];
  userProfile:     UserProfile;
  schoolId:        string;
  isSuperAdmin:    boolean;
  onSaveTask:        (data: Omit<Task, 'id' | 'createdAt'>) => Promise<string>;
  onAssignTask:      (taskId: string, studentIds: string[], groupId?: string) => Promise<void>;
  onGrade:           (submissionId: string, grade: string, feedback: string) => Promise<void>;
  onDeleteTask:      (taskId: string) => Promise<void>;
  onUnassignStudent: (submissionId: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TasksPage({
  tasks, taskAssignments, taskSubmissions,
  students, teachers, academicGroups, subjects,
  userProfile, schoolId, isSuperAdmin,
  onSaveTask, onAssignTask, onGrade, onDeleteTask, onUnassignStudent,
}: TasksPageProps) {

  // ── Panel state ─────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailTab, setDetailTab]       = useState<'details' | 'students'>('details');
  const [showCreate, setShowCreate]     = useState(false);

  // ── Create form state ────────────────────────────────────────────────────────
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [subjectId, setSubjectId]   = useState('');
  const [dueDate, setDueDate]       = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const [saving, setSaving]         = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // ── Assignment state ─────────────────────────────────────────────────────────
  const [assignMode, setAssignMode]       = useState<'individual' | 'group'>('individual');
  const [selectedStudentIds, setSelStuds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelGroup]    = useState('');
  const [studentSearch, setStudSearch]    = useState('');
  const [assigning, setAssigning]         = useState(false);

  // ── Grading state ────────────────────────────────────────────────────────────
  const [gradingId, setGradingId]     = useState<string | null>(null);
  const [gradeVal, setGradeVal]       = useState('');
  const [feedbackVal, setFeedbackVal] = useState('');
  const [grading, setGrading]         = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isAdmin = isSuperAdmin || userProfile.role === 'admin';

  const teacherMap = useMemo(() =>
    new Map(teachers.map(t => [t.id!, `${t.firstName} ${t.lastName}`])), [teachers]);

  const subjectMap = useMemo(() =>
    new Map(subjects.map(s => [s.id!, s.name])), [subjects]);

  const groupMap = useMemo(() =>
    new Map(academicGroups.map(g => [g.id!, g.name])), [academicGroups]);

  const filteredStudents = useMemo(() =>
    students.filter(s => {
      if (!studentSearch) return true;
      const q = studentSearch.toLowerCase();
      return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
        || s.controlNumber.toLowerCase().includes(q);
    }), [students, studentSearch]);

  // submissions and assignments for the selected task
  const taskSubs = useMemo(() =>
    selectedTask ? taskSubmissions.filter(s => s.taskId === selectedTask.id) : [],
    [taskSubmissions, selectedTask]);

  const taskAssigns = useMemo(() =>
    selectedTask ? taskAssignments.filter(a => a.taskId === selectedTask.id) : [],
    [taskAssignments, selectedTask]);

  // submission counts per task (for list cards)
  const subCountMap = useMemo(() => {
    const m = new Map<string, { total: number; submitted: number; graded: number }>();
    for (const sub of taskSubmissions) {
      const cur = m.get(sub.taskId) ?? { total: 0, submitted: 0, graded: 0 };
      cur.total++;
      if (sub.status === 'submitted') cur.submitted++;
      if (sub.status === 'graded')   cur.graded++;
      m.set(sub.taskId, cur);
    }
    return m;
  }, [taskSubmissions]);

  // ── File upload helper ───────────────────────────────────────────────────────
  const uploadFiles = async (taskId: string, files: File[]): Promise<TaskAttachment[]> => {
    const results: TaskAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `${schoolId}/tasks/${taskId}/${safeName}`;
      const storageRef = ref(storage, storagePath);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on('state_changed',
          snap => setUploadPct(Math.round(((i / files.length) + (snap.bytesTransferred / snap.totalBytes / files.length)) * 100)),
          reject,
          resolve,
        );
      });
      const url = await getDownloadURL(storageRef);
      results.push({ name: file.name, url, storagePath, type: detectType(file.name), size: file.size });
    }
    return results;
  };

  // ── Create task ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Resolve teacher display name from teachers list (matched by email)
      const matchingTeacher = teachers.find(t => t.email === userProfile.email);
      const teacherName = matchingTeacher
        ? `${matchingTeacher.firstName} ${matchingTeacher.lastName}`
        : (userProfile.email ?? userProfile.uid);

      const basePayload = {
        title:       title.trim(),
        description: description.trim() || undefined,
        teacherId:   userProfile.uid,
        teacherName,
        subjectId:   subjectId || undefined,
        dueDate:     dueDate ? new Date(dueDate + 'T23:59:59') : undefined,
        status:      'active' as const,
      };

      // First save the task (without attachments) to get the ID
      const taskId = await onSaveTask({ ...basePayload, attachments: [] });

      // Upload files if any
      if (pendingFiles.length > 0) {
        setUploading(true);
        const attachments = await uploadFiles(taskId, pendingFiles);
        await onSaveTask({ ...basePayload, attachments, _id: taskId } as any);
        setUploading(false);
      }
      // Reset form
      setTitle(''); setDesc(''); setSubjectId(''); setDueDate('');
      setPendingFiles([]); setUploadPct(0); setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Assign task ──────────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!selectedTask) return;
    setAssigning(true);
    try {
      if (assignMode === 'individual') {
        await onAssignTask(selectedTask.id!, [...selectedStudentIds]);
        setSelStuds(new Set());
      } else {
        if (!selectedGroupId) return;
        const group = academicGroups.find(g => g.id === selectedGroupId);
        const studIds = group?.studentIds?.length
          ? group.studentIds
          : students.filter(s => s.status === 'active').map(s => s.id!);
        await onAssignTask(selectedTask.id!, studIds, selectedGroupId);
        setSelGroup('');
      }
    } finally {
      setAssigning(false);
    }
  };

  // ── Grade submission ─────────────────────────────────────────────────────────
  const handleGrade = async (submissionId: string) => {
    setGrading(true);
    try {
      await onGrade(submissionId, gradeVal, feedbackVal);
      setGradingId(null); setGradeVal(''); setFeedbackVal('');
    } finally {
      setGrading(false);
    }
  };

  // ── Upload more files to existing task ──────────────────────────────────────
  const addFilesToTask = async (task: Task, files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const newAttachments = await uploadFiles(task.id!, files);
      const merged = [...(task.attachments ?? []), ...newAttachments];
      await onSaveTask({ ...task, attachments: merged, _id: task.id } as any);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const removeAttachment = async (task: Task, idx: number) => {
    const att = task.attachments[idx];
    try { await deleteObject(ref(storage, att.storagePath)); } catch { /* already deleted */ }
    const updated = task.attachments.filter((_, i) => i !== idx);
    await onSaveTask({ ...task, attachments: updated, _id: task.id } as any);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <motion.div key="tasks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-0 h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Tareas
          </h2>
          <p className="text-gray-500 mt-0.5 text-sm">
            {isAdmin ? 'Gestión global de tareas y entregas.' : 'Crea tareas, sube archivos y asígnalas a tus alumnos.'}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(v => !v); setSelectedTask(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancelar' : 'Nueva Tarea'}
        </button>
      </div>

      {/* Create task panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden mb-6">
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Nueva Tarea</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Title */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Título <span className="text-red-500">*</span></label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Tarea 1 — Derivadas" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {/* Due date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de entrega</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Materia (opcional)</label>
                  <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Sin materia</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                  <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Instrucciones, criterios de evaluación..." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>

              {/* File picker */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Archivos adjuntos</label>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                  <Upload className="w-4 h-4" /> Seleccionar archivos (PDF, Word, Excel, Video, Imagen)
                </button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.mov,.avi,.jpg,.jpeg,.png,.gif,.webp,.bmp" className="hidden" onChange={e => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                {pendingFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                        {TYPE_ICON[detectType(f.name)]}
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-gray-400">{fmtSize(f.size)}</span>
                        <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {uploading && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Subiendo archivos...</span><span>{uploadPct}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadPct}%` }} /></div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button onClick={handleCreate} disabled={!title.trim() || saving || uploading} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Crear Tarea
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main grid: task list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Task list ──────────────────────────────────────────────────────── */}
        <div className={`${selectedTask ? 'lg:col-span-2' : 'lg:col-span-5'} space-y-3`}>
          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm font-medium">No hay tareas creadas</p>
              <p className="text-gray-300 text-xs mt-1">Crea una tarea con el botón superior</p>
            </div>
          ) : tasks.map(task => {
            const counts = subCountMap.get(task.id!) ?? { total: 0, submitted: 0, graded: 0 };
            const pending = counts.total - counts.submitted - counts.graded;
            const isSelected = selectedTask?.id === task.id;
            return (
              <motion.div key={task.id} whileHover={{ y: -1 }} transition={{ duration: 0.1 }}
                onClick={() => { setSelectedTask(isSelected ? null : task); setDetailTab('details'); setGradingId(null); }}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all ${isSelected ? 'border-indigo-300 shadow-indigo-100 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.subjectId && <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{subjectMap.get(task.subjectId) ?? 'Materia'}</span>}
                      {task.dueDate && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Calendar className="w-3 h-3" />{fmtDate(task.dueDate)}</span>}
                      {isAdmin && task.teacherId && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><User className="w-3 h-3" />{teacherMap.get(task.teacherId) ?? task.teacherId}</span>}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </div>
                {/* Stats row */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                  {task.attachments?.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400"><Paperclip className="w-3 h-3" />{task.attachments.length} archivo{task.attachments.length > 1 ? 's' : ''}</span>
                  )}
                  {counts.total > 0 && <>
                    <span className="flex items-center gap-1 text-[10px] text-amber-600"><Clock className="w-3 h-3" />{pending} pend.</span>
                    <span className="flex items-center gap-1 text-[10px] text-blue-600"><Send className="w-3 h-3" />{counts.submitted} entregado{counts.submitted !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 className="w-3 h-3" />{counts.graded} calif.</span>
                  </>}
                  {counts.total === 0 && <span className="text-[10px] text-gray-300">Sin alumnos asignados</span>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Task detail panel ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div key={selectedTask.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-0">

              {/* Detail header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{selectedTask.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedTask.subjectId && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{subjectMap.get(selectedTask.subjectId)}</span>}
                    {selectedTask.dueDate && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />Entrega: {fmtDate(selectedTask.dueDate)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onDeleteTask(selectedTask.id!)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Desactivar tarea"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={() => setSelectedTask(null)} className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-gray-100 px-5">
                {(['details', 'students'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${detailTab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    {t === 'details' ? 'Detalles' : `Alumnos (${taskSubs.length})`}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* ── Details tab ───────────────────────────────────────────── */}
                {detailTab === 'details' && (<>

                  {/* Description */}
                  {selectedTask.description && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Descripción</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Archivos</p>
                      <button onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.multiple=true; inp.accept='.pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.mov,.avi,.jpg,.jpeg,.png,.gif,.webp,.bmp'; inp.onchange = e => { const files = Array.from((e.target as HTMLInputElement).files ?? []); if (files.length) addFilesToTask(selectedTask, files); }; inp.click(); }} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                        <Upload className="w-3 h-3" /> Agregar
                      </button>
                    </div>
                    {uploading && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Subiendo...</span><span>{uploadPct}%</span></div>
                        <div className="w-full bg-gray-100 rounded-full h-1"><div className="bg-indigo-500 h-1 rounded-full transition-all" style={{ width: `${uploadPct}%` }} /></div>
                      </div>
                    )}
                    {(!selectedTask.attachments || selectedTask.attachments.length === 0) ? (
                      <p className="text-xs text-gray-300 italic">Sin archivos adjuntos.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedTask.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            {TYPE_ICON[att.type]}
                            <span className="text-xs text-gray-700 flex-1 truncate font-medium">{att.name}</span>
                            <span className="text-[10px] text-gray-400">{fmtSize(att.size)}</span>
                            <a href={att.url} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Ver / Descargar"><Download className="w-3.5 h-3.5" /></a>
                            <button onClick={() => removeAttachment(selectedTask, i)} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Eliminar"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>)}

                {/* ── Students tab ───────────────────────────────────────────── */}
                {detailTab === 'students' && (<>

                  {/* Assignment section */}
                  <div className="bg-indigo-50/60 rounded-2xl p-4 space-y-3 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Asignar tarea</p>

                    {/* Mode toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-indigo-200 w-fit">
                      {(['individual', 'group'] as const).map(m => (
                        <button key={m} onClick={() => setAssignMode(m)} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${assignMode === m ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}>
                          {m === 'individual' ? <><User className="w-3 h-3 inline mr-1" />Individual</> : <><Users className="w-3 h-3 inline mr-1" />Grupo</>}
                        </button>
                      ))}
                    </div>

                    {assignMode === 'individual' ? (
                      <div className="space-y-2">
                        <input value={studentSearch} onChange={e => setStudSearch(e.target.value)} placeholder="Buscar alumno..." className="w-full px-3 py-1.5 border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {filteredStudents.slice(0, 30).map(s => {
                            const alreadyAssigned = taskAssigns.some(a => a.studentId === s.id);
                            const checked = selectedStudentIds.has(s.id!);
                            return (
                              <label key={s.id} className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-white transition-colors text-xs ${alreadyAssigned ? 'opacity-40' : ''}`}>
                                <input type="checkbox" checked={checked} disabled={alreadyAssigned} onChange={e => { const ns = new Set(selectedStudentIds); e.target.checked ? ns.add(s.id!) : ns.delete(s.id!); setSelStuds(ns); }} className="rounded" />
                                <span className="flex-1 truncate text-gray-700">{s.firstName} {s.lastName}</span>
                                <span className="text-gray-400 font-mono">{s.controlNumber}</span>
                                {alreadyAssigned && <span className="text-[9px] text-indigo-500 font-bold">ASIGNADO</span>}
                              </label>
                            );
                          })}
                        </div>
                        <button onClick={handleAssign} disabled={selectedStudentIds.size === 0 || assigning} className="w-full py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                          {assigning ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3 h-3" />}
                          Asignar {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select value={selectedGroupId} onChange={e => setSelGroup(e.target.value)} className="w-full px-3 py-1.5 border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                          <option value="">Seleccionar grupo...</option>
                          {academicGroups.map(g => {
                            const alreadyAssigned = taskAssigns.some(a => a.groupId === g.id);
                            return <option key={g.id} value={g.id} disabled={alreadyAssigned}>{g.name}{alreadyAssigned ? ' (ya asignado)' : ''}</option>;
                          })}
                        </select>
                        <button onClick={handleAssign} disabled={!selectedGroupId || assigning} className="w-full py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                          {assigning ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Users className="w-3 h-3" />}
                          Asignar al grupo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submissions list */}
                  {taskSubs.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-200 mb-2" />
                      <p className="text-xs text-gray-400">Sin alumnos asignados aún</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Entregas ({taskSubs.length})</p>
                      {taskSubs.map(sub => {
                        const cfg = STATUS_CONFIG[sub.status];
                        const isGrading = gradingId === sub.id;
                        return (
                          <div key={sub.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                                {sub.studentName[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{sub.studentName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{sub.controlNumber}</p>
                              </div>
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {sub.status !== 'pending' && (
                                <button onClick={() => { setGradingId(isGrading ? null : sub.id!); setGradeVal(sub.grade ?? ''); setFeedbackVal(sub.feedback ?? ''); }} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Calificar">
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {sub.status === 'pending' && (
                                <button onClick={() => onUnassignStudent(sub.id!)} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Quitar alumno">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Submitted files */}
                            {sub.attachments?.length > 0 && (
                              <div className="space-y-1 pl-9">
                                {sub.attachments.map((att, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                    {TYPE_ICON[att.type]}
                                    <span className="flex-1 truncate">{att.name}</span>
                                    <a href={att.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 font-semibold">Abrir</a>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Grade display */}
                            {sub.status === 'graded' && !isGrading && (
                              <div className="pl-9 space-y-0.5">
                                <p className="text-[10px] font-bold text-emerald-700">Calificación: {sub.grade}</p>
                                {sub.feedback && <p className="text-[10px] text-gray-500 italic">{sub.feedback}</p>}
                              </div>
                            )}

                            {/* Grading form */}
                            {isGrading && (
                              <div className="pl-9 space-y-2">
                                <input value={gradeVal} onChange={e => setGradeVal(e.target.value)} placeholder="Calificación (ej. 9, A+, 85/100...)" className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                <textarea value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} rows={2} placeholder="Retroalimentación (opcional)..." className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                                <div className="flex gap-2">
                                  <button onClick={() => handleGrade(sub.id!)} disabled={!gradeVal.trim() || grading} className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                    {grading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                    Guardar
                                  </button>
                                  <button onClick={() => setGradingId(null)} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
