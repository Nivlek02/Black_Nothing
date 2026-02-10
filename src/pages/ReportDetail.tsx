import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Pencil, Copy, FileDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Report, Task, ReportStatus, TaskStatus, TaskPriority, REPORT_STATUS_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/data/models';
import { getReport, saveReport, generateId } from '@/data/store';
import { reportStatusStyle, taskStatusStyle, priorityStyle } from '@/lib/statusStyles';
import { useToast } from '@/hooks/use-toast';

const emptyTask: Omit<Task, 'id'> = {
  title: '', description: '', project: '', priority: 'medium', status: 'pending',
  startDate: '', endDate: '', evidence: '', notes: '',
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
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
    toast({ title: 'Informe guardado' });
  };

  const handleCopy = () => {
    const text = `${report.title}\nPeriodo: ${report.startDate} - ${report.endDate}\nResponsable: ${report.responsible}\nEstado: ${REPORT_STATUS_LABELS[report.status]}\n\nResumen:\n${report.summary}\n\nTareas:\n${report.tasks.map((t, i) => `${i + 1}. [${TASK_STATUS_LABELS[t.status]}] ${t.title} - ${t.description}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado al portapapeles' });
  };

  const openTaskForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({ ...task });
    } else {
      setEditingTask(null);
      setTaskForm({ ...emptyTask });
    }
    setTaskOpen(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.title.trim()) {
      toast({ title: 'Error', description: 'El título es obligatorio', variant: 'destructive' });
      return;
    }
    let tasks: Task[];
    if (editingTask) {
      tasks = report.tasks.map(t => t.id === editingTask.id ? { ...taskForm, id: editingTask.id } as Task : t);
    } else {
      tasks = [...report.tasks, { ...taskForm, id: generateId() } as Task];
    }
    persist({ ...report, tasks });
    setTaskOpen(false);
    toast({ title: editingTask ? 'Tarea actualizada' : 'Tarea agregada' });
  };

  const handleDeleteTask = () => {
    if (!deleteTaskId) return;
    persist({ ...report, tasks: report.tasks.filter(t => t.id !== deleteTaskId) });
    setDeleteTaskId(null);
    toast({ title: 'Tarea eliminada' });
  };

  const tasksDone = report.tasks.filter(t => t.status === 'done').length;

  return (
    <div className="space-y-6">
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

      {/* Report meta */}
      <Card className="card-metallic">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Responsable</label>
              <Input value={report.responsible} onChange={e => setReport({ ...report, responsible: e.target.value })} className="mt-1 bg-secondary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={report.status} onValueChange={(v: ReportStatus) => setReport({ ...report, status: v })}>
                <SelectTrigger className="mt-1 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="review">En revisión</SelectItem>
                  <SelectItem value="final">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className={`text-sm px-3 py-1 ${reportStatusStyle(report.status)}`}>
                {REPORT_STATUS_LABELS[report.status]}
              </Badge>
              <span className="ml-3 text-sm text-muted-foreground">{tasksDone}/{report.tasks.length} tareas completadas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="tasks">Tareas ({report.tasks.length})</TabsTrigger>
          <TabsTrigger value="comments">Comentarios</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <Card className="card-metallic">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Resumen Ejecutivo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={report.summary}
                onChange={e => setReport({ ...report, summary: e.target.value })}
                placeholder="Escribe el resumen ejecutivo del periodo..."
                className="bg-secondary/50 min-h-[200px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openTaskForm()} className="gap-2">
              <Plus className="h-4 w-4" /> Agregar tarea
            </Button>
          </div>
          <Card className="card-metallic overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Tarea</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Proyecto</TableHead>
                    <TableHead className="text-muted-foreground">Prioridad</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.tasks.map(t => (
                    <TableRow key={t.id} className="border-border hover:bg-secondary/30">
                      <TableCell>
                        <div className="font-medium text-foreground">{t.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{t.description}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {t.project && <Badge variant="outline" className="text-xs bg-secondary/50">{t.project}</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${priorityStyle(t.priority)}`}>
                          {TASK_PRIORITY_LABELS[t.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${taskStatusStyle(t.status)}`}>
                          {TASK_STATUS_LABELS[t.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openTaskForm(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTaskId(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {report.tasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay tareas aún. Agrega la primera.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card className="card-metallic">
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Sección de comentarios próximamente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
              <Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descripción</label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Proyecto/Área</label>
                <Input value={taskForm.project} onChange={e => setTaskForm({ ...taskForm, project: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Prioridad</label>
                <Select value={taskForm.priority} onValueChange={(v: TaskPriority) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
              <Select value={taskForm.status} onValueChange={(v: TaskStatus) => setTaskForm({ ...taskForm, status: v })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in-progress">En progreso</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                  <SelectItem value="done">Hecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fecha inicio</label>
                <Input type="date" value={taskForm.startDate || ''} onChange={e => setTaskForm({ ...taskForm, startDate: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fecha fin</label>
                <Input type="date" value={taskForm.endDate || ''} onChange={e => setTaskForm({ ...taskForm, endDate: e.target.value })} className="bg-secondary/50" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Evidencia (link)</label>
              <Input value={taskForm.evidence || ''} onChange={e => setTaskForm({ ...taskForm, evidence: e.target.value })} placeholder="https://..." className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notas</label>
              <Textarea value={taskForm.notes || ''} onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })} className="bg-secondary/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTask}>{editingTask ? 'Actualizar' : 'Agregar'}</Button>
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
