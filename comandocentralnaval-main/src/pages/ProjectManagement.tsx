import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Sparkles, Trash2, Paperclip, Loader2, ChevronRight, ChevronDown, ArrowLeft, Download } from 'lucide-react';

type Priority = 'alta' | 'media' | 'baja';
type Status = 'pendiente' | 'en_analisis' | 'listo_dev' | 'en_desarrollo' | 'en_qa' | 'en_revision' | 'aprobado' | 'desplegado' | 'cancelado';
type Kind = 'epic' | 'story' | 'task' | 'subtask';

interface Requirement {
  id: string;
  name: string;
  client: string | null;
  priority: Priority;
  request_date: string;
  status: Status;
  description: string | null;
  business_goal: string | null;
  observations: string | null;
  complexity: string | null;
  risks: string | null;
  dependencies: string | null;
  impact: string | null;
  areas: string | null;
  created_at: string;
}

interface Task {
  id: string;
  requirement_id: string;
  parent_id: string | null;
  kind: Kind;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  sort_order: number;
}

interface Attachment {
  id: string;
  requirement_id: string;
  file_name: string;
  storage_path: string;
}

const STATUS_LABEL: Record<Status, string> = {
  pendiente: 'Pendiente', en_analisis: 'En análisis', listo_dev: 'Listo para dev',
  en_desarrollo: 'En desarrollo', en_qa: 'En QA', en_revision: 'En revisión',
  aprobado: 'Aprobado', desplegado: 'Desplegado', cancelado: 'Cancelado',
};
const STATUS_LIST: Status[] = ['pendiente','en_analisis','listo_dev','en_desarrollo','en_qa','en_revision','aprobado','desplegado','cancelado'];
const PRIORITY_LIST: Priority[] = ['alta','media','baja'];
const PRIORITY_LABEL: Record<Priority, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const PRIORITY_COLOR: Record<Priority, string> = {
  alta: 'bg-destructive/15 text-destructive border-destructive/30',
  media: 'bg-warning/15 text-warning border-warning/30',
  baja: 'bg-muted text-muted-foreground border-border',
};
const KIND_LABEL: Record<Kind, string> = { epic: 'Épica', story: 'Historia', task: 'Tarea', subtask: 'Subtarea' };

const db = supabase as any;

export default function ProjectManagementPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selected, setSelected] = useState<Requirement | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [r, t, a] = await Promise.all([
      db.from('pm_requirements').select('*').order('created_at', { ascending: false }),
      db.from('pm_tasks').select('*').order('sort_order'),
      db.from('pm_attachments').select('*').order('created_at', { ascending: false }),
    ]);
    setRequirements(r.data ?? []);
    setTasks(t.data ?? []);
    setAttachments(a.data ?? []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  // Dashboard metrics
  const stats = useMemo(() => {
    const byStatus: Record<Status, number> = STATUS_LIST.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as any);
    requirements.forEach(r => { byStatus[r.status]++; });
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks.filter(t => {
      const r = requirements.find(r => r.id === t.requirement_id);
      return r && t.status !== 'aprobado' && t.status !== 'desplegado' && t.status !== 'cancelado';
    });
    const critical = tasks.filter(t => t.priority === 'alta' && t.status !== 'aprobado' && t.status !== 'desplegado' && t.status !== 'cancelado');
    return { total: requirements.length, byStatus, openTasks: overdue.length, critical: critical.length };
  }, [requirements, tasks]);

  if (selected) {
    return (
      <RequirementDetail
        requirement={selected}
        tasks={tasks.filter(t => t.requirement_id === selected.id)}
        attachments={attachments.filter(a => a.requirement_id === selected.id)}
        onBack={() => setSelected(null)}
        onReload={loadAll}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Management</h1>
          <p className="text-sm text-muted-foreground">Captura requerimientos y genera tareas con IA.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nuevo requerimiento</Button>
          </DialogTrigger>
          <NewRequirementDialog onClose={() => setCreating(false)} onCreated={loadAll} />
        </Dialog>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Requerimientos" value={stats.total} />
        <StatCard label="Tareas abiertas" value={stats.openTasks} />
        <StatCard label="Críticas (alta)" value={stats.critical} accent="destructive" />
        <StatCard label="Desplegados" value={stats.byStatus.desplegado} accent="info" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Por estado</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STATUS_LIST.map(s => (
            <div key={s} className="px-3 py-1.5 rounded-md border border-border bg-card text-xs flex items-center gap-2">
              <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
              <span className="font-mono-data font-semibold">{stats.byStatus[s]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Requerimientos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!loading && requirements.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin requerimientos. Crea el primero.</p>
          )}
          {requirements.map(r => {
            const tCount = tasks.filter(t => t.requirement_id === r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.client || 'Sin cliente'} · {new Date(r.request_date + 'T12:00:00').toLocaleDateString('es-CO')}
                  </div>
                </div>
                <Badge variant="outline" className={PRIORITY_COLOR[r.priority]}>{PRIORITY_LABEL[r.priority]}</Badge>
                <Badge variant="outline">{STATUS_LABEL[r.status]}</Badge>
                <span className="text-xs text-muted-foreground font-mono-data">{tCount} tareas</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'destructive' | 'info' }) {
  const color = accent === 'destructive' ? 'text-destructive' : accent === 'info' ? 'text-info' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-bold font-mono-data mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewRequirementDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', client: '', priority: 'media' as Priority,
    request_date: new Date().toISOString().slice(0, 10),
    description: '', business_goal: '', observations: '',
    complexity: '', risks: '', dependencies: '', impact: '', areas: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    const { data, error } = await db.from('pm_requirements').insert(form).select().single();
    if (error) { toast.error(error.message); setSaving(false); return; }

    for (const f of files) {
      const path = `${data.id}/${Date.now()}-${f.name}`;
      const up = await supabase.storage.from('pm-attachments').upload(path, f);
      if (!up.error) {
        await db.from('pm_attachments').insert({
          requirement_id: data.id, file_name: f.name, storage_path: path,
          size_bytes: f.size, mime_type: f.type,
        });
      }
    }

    toast.success('Requerimiento creado');
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Nuevo requerimiento</DialogTitle></DialogHeader>
      <Tabs defaultValue="basico">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
          <TabsTrigger value="adjuntos">Adjuntos</TabsTrigger>
        </TabsList>
        <TabsContent value="basico" className="space-y-3 pt-3">
          <Field label="Nombre"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente / solicitante"><Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></Field>
            <Field label="Fecha de solicitud"><Input type="date" value={form.request_date} onChange={e => setForm({ ...form, request_date: e.target.value })} /></Field>
          </div>
          <Field label="Prioridad">
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Priority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITY_LIST.map(p => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Descripción"><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Objetivo de negocio"><Textarea rows={2} value={form.business_goal} onChange={e => setForm({ ...form, business_goal: e.target.value })} /></Field>
          <Field label="Observaciones"><Textarea rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></Field>
        </TabsContent>
        <TabsContent value="analisis" className="space-y-3 pt-3">
          <Field label="Complejidad estimada"><Input value={form.complexity} onChange={e => setForm({ ...form, complexity: e.target.value })} placeholder="Baja / Media / Alta" /></Field>
          <Field label="Riesgos"><Textarea rows={2} value={form.risks} onChange={e => setForm({ ...form, risks: e.target.value })} /></Field>
          <Field label="Dependencias"><Textarea rows={2} value={form.dependencies} onChange={e => setForm({ ...form, dependencies: e.target.value })} /></Field>
          <Field label="Impacto en otros módulos"><Textarea rows={2} value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} /></Field>
          <Field label="Áreas involucradas"><Input value={form.areas} onChange={e => setForm({ ...form, areas: e.target.value })} placeholder="Producto, Ingeniería, QA…" /></Field>
        </TabsContent>
        <TabsContent value="adjuntos" className="space-y-3 pt-3">
          <Input type="file" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} />
          {files.length > 0 && (
            <ul className="text-sm space-y-1">
              {files.map((f, i) => <li key={i} className="flex items-center gap-2"><Paperclip className="h-3 w-3" />{f.name}</li>)}
            </ul>
          )}
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Crear</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function RequirementDetail({ requirement, tasks, attachments, onBack, onReload }: {
  requirement: Requirement; tasks: Task[]; attachments: Attachment[]; onBack: () => void; onReload: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const epics = tasks.filter(t => t.kind === 'epic');

  async function generateWithAI() {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('pm-generate-tasks', { body: { requirement } });
    if (error || !data?.epics) {
      toast.error('No se pudo generar: ' + (error?.message ?? 'sin datos'));
      setGenerating(false); return;
    }
    let order = tasks.length;
    for (const epic of data.epics) {
      const { data: eRow, error: eErr } = await db.from('pm_tasks').insert({
        requirement_id: requirement.id, kind: 'epic', title: epic.title,
        description: epic.description ?? null, priority: requirement.priority, sort_order: order++,
      }).select().single();
      if (eErr || !eRow) continue;
      for (const story of epic.stories ?? []) {
        const { data: sRow } = await db.from('pm_tasks').insert({
          requirement_id: requirement.id, parent_id: eRow.id, kind: 'story', title: story.title,
          description: story.description ?? null, priority: requirement.priority, sort_order: order++,
        }).select().single();
        if (!sRow) continue;
        for (const sub of story.subtasks ?? []) {
          await db.from('pm_tasks').insert({
            requirement_id: requirement.id, parent_id: sRow.id, kind: 'subtask', title: sub.title,
            description: sub.description ?? null, priority: requirement.priority, sort_order: order++,
          });
        }
      }
    }
    toast.success('Tareas generadas');
    setGenerating(false);
    onReload();
  }

  async function updateTaskStatus(id: string, status: Status) {
    await db.from('pm_tasks').update({ status }).eq('id', id);
    onReload();
  }
  async function updateReqStatus(status: Status) {
    await db.from('pm_requirements').update({ status }).eq('id', requirement.id);
    onReload();
  }
  async function deleteTask(id: string) {
    await db.from('pm_tasks').delete().eq('id', id);
    onReload();
  }
  async function deleteRequirement() {
    if (!confirm('¿Eliminar este requerimiento y sus tareas?')) return;
    await db.from('pm_requirements').delete().eq('id', requirement.id);
    toast.success('Eliminado');
    onBack();
  }

  async function downloadAttachment(a: Attachment) {
    const { data } = await supabase.storage.from('pm-attachments').createSignedUrl(a.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Volver</Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={generateWithAI} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generar tareas con IA
        </Button>
        <Button variant="destructive" size="sm" onClick={deleteRequirement}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>{requirement.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {requirement.client || 'Sin cliente'} · {new Date(requirement.request_date + 'T12:00:00').toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className={PRIORITY_COLOR[requirement.priority]}>{PRIORITY_LABEL[requirement.priority]}</Badge>
              <Select value={requirement.status} onValueChange={v => updateReqStatus(v as Status)}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          {requirement.description && <Info label="Descripción">{requirement.description}</Info>}
          {requirement.business_goal && <Info label="Objetivo de negocio">{requirement.business_goal}</Info>}
          {requirement.complexity && <Info label="Complejidad">{requirement.complexity}</Info>}
          {requirement.risks && <Info label="Riesgos">{requirement.risks}</Info>}
          {requirement.dependencies && <Info label="Dependencias">{requirement.dependencies}</Info>}
          {requirement.impact && <Info label="Impacto">{requirement.impact}</Info>}
          {requirement.areas && <Info label="Áreas">{requirement.areas}</Info>}
          {requirement.observations && <Info label="Observaciones">{requirement.observations}</Info>}
        </CardContent>
      </Card>

      {attachments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Adjuntos</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {attachments.map(a => (
              <button key={a.id} onClick={() => downloadAttachment(a)} className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-sm">
                <Paperclip className="h-3 w-3" /> <span className="flex-1 text-left truncate">{a.file_name}</span> <Download className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tareas ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {epics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay tareas. Usa "Generar tareas con IA" para empezar.</p>
          ) : (
            <div className="space-y-2">
              {epics.map(e => <TaskNode key={e.id} task={e} all={tasks} onStatus={updateTaskStatus} onDelete={deleteTask} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function TaskNode({ task, all, onStatus, onDelete }: {
  task: Task; all: Task[]; onStatus: (id: string, s: Status) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const children = all.filter(t => t.parent_id === task.id);
  const indent = task.kind === 'epic' ? 0 : task.kind === 'story' ? 4 : 8;
  const kindColor = task.kind === 'epic' ? 'bg-primary/10 text-primary border-primary/30'
    : task.kind === 'story' ? 'bg-info/10 text-info border-info/30'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <div>
      <div className="flex items-center gap-2 p-2 rounded border border-border bg-card" style={{ marginLeft: indent * 12 }}>
        {children.length > 0 ? (
          <button onClick={() => setOpen(!open)} className="text-muted-foreground">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-4" />}
        <Badge variant="outline" className={`text-[10px] ${kindColor}`}>{KIND_LABEL[task.kind]}</Badge>
        <span className="flex-1 text-sm">{task.title}</span>
        <Select value={task.status} onValueChange={v => onStatus(task.id, v as Status)}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(task.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && children.map(c => <TaskNode key={c.id} task={c} all={all} onStatus={onStatus} onDelete={onDelete} />)}
    </div>
  );
}
