import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Copy, FileDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Report, Task, ReportStatus, TaskPriority, REPORT_STATUS_LABELS, TASK_STATUS_LABELS } from '@/data/models';
import { getReport, saveReport, generateId } from '@/data/store';
import { reportStatusStyle, priorityStyle } from '@/lib/statusStyles';
import { useToast } from '@/hooks/use-toast';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDate, setTaskDate] = useState('');
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  useEffect(() => {
    const r = getReport(id!);
    if (r) setReport(r); else navigate('/reports');
  }, [id, navigate]);

  if (!report) return null;

  const persist = (updated: Report) => {
    const r = { ...updated, updatedAt: new Date().toISOString() };
    setReport(r);
    saveReport(r);
  };

  const handleSave = () => {
    persist(report);
    toast({ title: 'Reporte guardado' });
  };

  const handleCopy = () => {
    const text = `${report.title}\nPeriodo: ${report.startDate} - ${report.endDate}\nEstado: ${REPORT_STATUS_LABELS[report.status]}\n\nTareas:\n${report.tasks.map((t, i) => `${t.status === 'done' ? '✅' : '⬜'} ${t.title} (${t.startDate || 'sin fecha'})`).join('\n')}`;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado al portapapeles' });
  };

  const toggleTask = (taskId: string) => {
    const tasks = report.tasks.map(t =>
      t.id === taskId ? { ...t, status: (t.status === 'done' ? 'pending' : 'done') as any } : t
    );
    persist({ ...report, tasks });
  };

  const handleAddTask = () => {
    if (!taskTitle.trim()) {
      toast({ title: 'Error', description: 'El título es obligatorio', variant: 'destructive' });
      return;
    }
    const newTask: Task = {
      id: generateId(),
      title: taskTitle.trim(),
      description: '',
      project: '',
      priority: taskPriority,
      status: 'pending',
      startDate: taskDate || undefined,
    };
    persist({ ...report, tasks: [...report.tasks, newTask] });
    setTaskOpen(false);
    setTaskTitle('');
    setTaskPriority('medium');
    setTaskDate('');
    toast({ title: 'Tarea agregada' });
  };

  const handleDeleteTask = () => {
    if (!deleteTaskId) return;
    persist({ ...report, tasks: report.tasks.filter(t => t.id !== deleteTaskId) });
    setDeleteTaskId(null);
    toast({ title: 'Tarea eliminada' });
  };

  // Split into two 15-day periods
  const midDate = report.startDate.slice(0, 8) + '15';
  const q1Tasks = report.tasks.filter(t => !t.startDate || t.startDate <= midDate).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  const q2Tasks = report.tasks.filter(t => t.startDate && t.startDate > midDate).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  const totalTasks = report.tasks.length;
  const doneTasks = report.tasks.filter(t => t.status === 'done').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const TaskList = ({ tasks, label }: { tasks: Task[]; label: string }) => (
    <Card className="card-metallic">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground/60 py-4 text-center">Sin tareas en este periodo</p>
        )}
        {tasks.map(t => (
          <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-lg border border-border/50 transition-colors ${t.status === 'done' ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
            <Checkbox
              checked={t.status === 'done'}
              onCheckedChange={() => toggleTask(t.id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {t.title}
              </span>
              {t.startDate && (
                <span className="ml-2 text-xs text-muted-foreground font-mono-data">{t.startDate}</span>
              )}
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 hidden sm:inline-flex ${priorityStyle(t.priority)}`}>
              {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja'}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTaskId(t.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{report.title}</h1>
            <p className="text-sm text-muted-foreground font-mono-data">{report.startDate} → {report.endDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => toast({ title: 'Exportar PDF', description: 'Funcionalidad próximamente' })}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="h-4 w-4" /> Guardar
          </Button>
        </div>
      </div>

      {/* Meta */}
      <Card className="card-metallic">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={report.status} onValueChange={(v: ReportStatus) => setReport({ ...report, status: v })}>
                <SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="review">En revisión</SelectItem>
                  <SelectItem value="final">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Progreso</label>
              <div className="flex items-center gap-3 mt-2">
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-sm font-mono-data text-foreground">{doneTasks}/{totalTasks}</span>
              </div>
            </div>
            <div className="flex items-end justify-end">
              <Badge variant="outline" className={`text-sm px-3 py-1 ${reportStatusStyle(report.status)}`}>
                {REPORT_STATUS_LABELS[report.status]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add task button */}
      <div className="flex justify-end">
        <Button onClick={() => setTaskOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar tarea
        </Button>
      </div>

      {/* Tasks by period */}
      <TaskList tasks={q1Tasks} label={`Quincena 1 — ${report.startDate} al ${midDate}`} />
      <TaskList tasks={q2Tasks} label={`Quincena 2 — ${report.startDate.slice(0, 8)}16 al ${report.endDate}`} />

      {/* Add Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Nombre de la tarea" className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Fecha</label>
              <Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} className="bg-secondary/50" min={report.startDate} max={report.endDate} />
              <p className="text-xs text-muted-foreground mt-1">La fecha determina en qué quincena aparece la tarea.</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Prioridad</label>
              <Select value={taskPriority} onValueChange={(v: TaskPriority) => setTaskPriority(v)}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddTask}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirm */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
