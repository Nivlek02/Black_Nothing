import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2, AlertTriangle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import {
  AgendaTask,
  getTasksForDate,
  getOverdueTasks,
  saveAgendaTask,
  deleteAgendaTask,
  createAgendaTask,
  getDayHours,
  TASK_COLORS,
} from '@/data/agenda';

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function fmt(d: Date): string { return d.toISOString().split('T')[0]; }

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function colorClass(color: string): string {
  const map: Record<string, string> = {
    primary: 'bg-primary/20 border-primary/40 text-primary',
    accent: 'bg-accent/20 border-accent/40 text-accent',
    warning: 'bg-warning/20 border-warning/40 text-warning',
    destructive: 'bg-destructive/20 border-destructive/40 text-destructive',
    muted: 'bg-muted border-border text-muted-foreground',
  };
  return map[color] || map.primary;
}

function dotColor(color: string): string {
  const map: Record<string, string> = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    muted: 'bg-muted-foreground',
  };
  return map[color] || map.primary;
}

export default function AgendaPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [weekTasks, setWeekTasks] = useState<Record<string, AgendaTask[]>>({});
  const [overdueTasks, setOverdueTasks] = useState<AgendaTask[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<AgendaTask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formColor, setFormColor] = useState('primary');

  const dateStr = fmt(selectedDate);
  const today = fmt(new Date());
  const weekDays = useMemo(() => getWeekDays(selectedDate), [dateStr]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const dayTasks = await getTasksForDate(dateStr);
    setTasks(dayTasks);

    const overdue = await getOverdueTasks(today);
    setOverdueTasks(overdue);

    const wt: Record<string, AgendaTask[]> = {};
    await Promise.all(weekDays.map(async d => {
      const ds = fmt(d);
      wt[ds] = await getTasksForDate(ds);
    }));
    setWeekTasks(wt);
    setLoading(false);
  }, [dateStr, weekDays, today]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const isToday = dateStr === today;

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const navigateWeek = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(d);
  };

  const openCreate = () => {
    setEditTask(null);
    setFormTitle(''); setFormDesc(''); setFormStart('09:00'); setFormEnd('10:00'); setFormColor('primary');
    setDialogOpen(true);
  };

  const openEdit = (task: AgendaTask) => {
    setEditTask(task);
    setFormTitle(task.title); setFormDesc(task.description); setFormStart(task.startTime); setFormEnd(task.endTime); setFormColor(task.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    try {
      if (editTask) {
        await saveAgendaTask({ ...editTask, title: formTitle, description: formDesc, startTime: formStart, endTime: formEnd, color: formColor });
        toast({ title: 'Tarea actualizada' });
      } else {
        await createAgendaTask({ title: formTitle, description: formDesc, date: dateStr, startTime: formStart, endTime: formEnd, color: formColor });
        toast({ title: 'Tarea creada' });
      }
      setDialogOpen(false);
      loadTasks();
    } catch { toast({ title: 'Error al guardar', variant: 'destructive' }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAgendaTask(deleteId);
    setDeleteId(null);
    toast({ title: 'Tarea eliminada' });
    loadTasks();
  };

  const toggleComplete = async (task: AgendaTask) => {
    await saveAgendaTask({ ...task, completed: !task.completed });
    loadTasks();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus tareas por día y hora</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Week navigation */}
      <Card className="card-metallic">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS_ES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(d => {
              const ds = fmt(d);
              const isSelected = ds === dateStr;
              const isTodayDay = ds === today;
              const dayTasks = weekTasks[ds] || [];
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all text-center ${
                    isSelected ? 'bg-primary/15 border border-primary/30'
                      : isTodayDay ? 'bg-accent/10 border border-accent/20'
                        : 'hover:bg-secondary/50'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase">{DAYS_ES[d.getDay()]}</span>
                  <span className={`text-lg font-bold font-mono-data ${isSelected ? 'text-primary' : isTodayDay ? 'text-accent' : 'text-foreground'}`}>
                    {d.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayTasks.slice(0, 3).map(t => (
                        <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${dotColor(t.color)}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day view */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {isToday ? 'Hoy' : selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigateDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!isToday && (
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoy</Button>
        )}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <Card className="card-metallic">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{loading ? 'Cargando...' : 'No hay tareas para este día'}</p>
            {!loading && (
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Agregar tarea
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <Card key={task.id} className={`card-metallic border-l-4 transition-all hover:shadow-md ${
              task.completed ? 'opacity-60 border-l-muted-foreground' : `border-l-${task.color === 'primary' ? 'primary' : task.color === 'accent' ? 'accent' : task.color === 'warning' ? 'warning' : task.color === 'destructive' ? 'destructive' : 'muted-foreground'}`
            }`}>
              <CardContent className="p-3 flex items-start gap-3">
                <Checkbox checked={task.completed} onCheckedChange={() => toggleComplete(task)} className="mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colorClass(task.color)}`}>{task.startTime} – {task.endTime}</Badge>
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(task)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overdue tasks */}
      {overdueTasks.length > 0 && (
        <div className="space-y-2 mt-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">Tareas pendientes de días anteriores ({overdueTasks.length})</h3>
          </div>
          {overdueTasks.map(task => (
            <Card key={task.id} className="card-metallic border-l-4 border-l-warning/60 transition-all hover:shadow-md opacity-80">
              <CardContent className="p-3 flex items-start gap-3">
                <Checkbox checked={task.completed} onCheckedChange={() => toggleComplete(task)} className="mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{task.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warning/10 border-warning/30 text-warning">
                      {task.date} · {task.startTime} – {task.endTime}
                    </Badge>
                  </div>
                  {task.description && <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(task)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Título *</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Nombre de la tarea" className="mt-1 bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Descripción</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Detalles..." rows={2} className="mt-1 bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Hora inicio</label>
                <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="mt-1 bg-secondary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Hora fin</label>
                <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="mt-1 bg-secondary/50" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Color</label>
              <Select value={formColor} onValueChange={setFormColor}>
                <SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_COLORS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${dotColor(c.value)}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim()}>{editTask ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
