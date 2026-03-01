import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, BookOpen, ChevronDown, Clock, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Subject, Activity, ChecklistItem, ActivityStatus, ACTIVITY_STATUS_LABELS } from '@/data/models';
import { generateId, getSubjects, saveSubject, deleteSubject, getActivitiesBySubject, saveActivity, deleteActivity, daysUntil } from '@/data/store';

function getTimeAlert(dueDate: string, status: ActivityStatus): { label: string; color: string; icon: React.ReactNode } {
  if (status === 'completed') return { label: 'Completada', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
  const days = daysUntil(dueDate);
  if (days < 0) return { label: `Vencida hace ${Math.abs(days)}d`, color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: <AlertTriangle className="h-3.5 w-3.5" /> };
  if (days <= 3) return { label: `${days}d restantes`, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: <Clock className="h-3.5 w-3.5" /> };
  return { label: `${days}d restantes`, color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: <Clock className="h-3.5 w-3.5" /> };
}

function getStatusBadge(status: ActivityStatus) {
  const styles: Record<ActivityStatus, string> = {
    pending: 'bg-muted text-muted-foreground border-border',
    'in-progress': 'bg-primary/10 text-primary border-primary/30',
    completed: 'bg-green-400/10 text-green-400 border-green-400/30',
  };
  return <Badge variant="outline" className={`text-xs ${styles[status]}`}>{ACTIVITY_STATUS_LABELS[status]}</Badge>;
}

export default function UnadPage() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>(() => getSubjects());
  const [activities, setActivities] = useState<Record<string, Activity[]>>(() => {
    const map: Record<string, Activity[]> = {};
    getSubjects().forEach(s => { map[s.id] = getActivitiesBySubject(s.id); });
    return map;
  });

  // Subject dialog
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);

  // Activity dialog
  const [actDialog, setActDialog] = useState(false);
  const [actSubjectId, setActSubjectId] = useState('');
  const [editingAct, setEditingAct] = useState<Activity | null>(null);
  const [actForm, setActForm] = useState({ name: '', startDate: '', dueDate: '', status: 'pending' as ActivityStatus });
  const [deleteActId, setDeleteActId] = useState<string | null>(null);

  const refreshActivities = (subjectId: string) => {
    setActivities(prev => ({ ...prev, [subjectId]: getActivitiesBySubject(subjectId) }));
  };

  // Subject CRUD
  const openSubjectDialog = (subject?: Subject) => {
    setEditingSubject(subject || null);
    setSubjectName(subject?.name || '');
    setSubjectDialog(true);
  };

  const handleSaveSubject = () => {
    if (!subjectName.trim()) return;
    const s: Subject = editingSubject
      ? { ...editingSubject, name: subjectName.trim() }
      : { id: generateId(), name: subjectName.trim(), createdAt: new Date().toISOString() };
    saveSubject(s);
    setSubjects(getSubjects());
    if (!editingSubject) setActivities(prev => ({ ...prev, [s.id]: [] }));
    setSubjectDialog(false);
    toast({ title: editingSubject ? 'Materia actualizada' : 'Materia creada' });
  };

  const handleDeleteSubject = () => {
    if (!deleteSubjectId) return;
    deleteSubject(deleteSubjectId);
    setSubjects(getSubjects());
    setActivities(prev => { const n = { ...prev }; delete n[deleteSubjectId]; return n; });
    setDeleteSubjectId(null);
    toast({ title: 'Materia eliminada' });
  };

  // Activity CRUD
  const openActDialog = (subjectId: string, act?: Activity) => {
    setActSubjectId(subjectId);
    setEditingAct(act || null);
    setActForm(act ? { name: act.name, startDate: act.startDate, dueDate: act.dueDate, status: act.status } : { name: '', startDate: '', dueDate: '', status: 'pending' });
    setActDialog(true);
  };

  const handleSaveAct = () => {
    if (!actForm.name.trim() || !actForm.startDate || !actForm.dueDate) return;
    const a: Activity = editingAct
      ? { ...editingAct, ...actForm }
      : { id: generateId(), subjectId: actSubjectId, ...actForm, notes: '', checklist: [], createdAt: new Date().toISOString() };
    saveActivity(a);
    refreshActivities(actSubjectId);
    setActDialog(false);
    toast({ title: editingAct ? 'Actividad actualizada' : 'Actividad creada' });
  };

  const handleDeleteAct = () => {
    if (!deleteActId) return;
    const act = Object.values(activities).flat().find(a => a.id === deleteActId);
    if (!act) return;
    deleteActivity(deleteActId);
    refreshActivities(act.subjectId);
    setDeleteActId(null);
    toast({ title: 'Actividad eliminada' });
  };

  // Notes
  const updateNotes = (act: Activity, notes: string) => {
    saveActivity({ ...act, notes });
    refreshActivities(act.subjectId);
  };

  // Checklist
  const addCheckItem = (act: Activity) => {
    const updated = { ...act, checklist: [...act.checklist, { id: generateId(), text: '', completed: false }] };
    saveActivity(updated);
    refreshActivities(act.subjectId);
  };

  const updateCheckItem = (act: Activity, itemId: string, changes: Partial<ChecklistItem>) => {
    const updated = { ...act, checklist: act.checklist.map(c => c.id === itemId ? { ...c, ...changes } : c) };
    saveActivity(updated);
    refreshActivities(act.subjectId);
  };

  const deleteCheckItem = (act: Activity, itemId: string) => {
    const updated = { ...act, checklist: act.checklist.filter(c => c.id !== itemId) };
    saveActivity(updated);
    refreshActivities(act.subjectId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> UNAD — Gestión Académica
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Materias, actividades y control de tiempos</p>
        </div>
        <Button onClick={() => openSubjectDialog()} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Nueva Materia
        </Button>
      </div>

      {/* Subjects */}
      {subjects.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay materias registradas. Crea una para comenzar.
          </CardContent>
        </Card>
      )}

      {subjects.map(subject => {
        const acts = activities[subject.id] || [];
        const totalChecks = acts.reduce((s, a) => s + a.checklist.length, 0);
        const doneChecks = acts.reduce((s, a) => s + a.checklist.filter(c => c.completed).length, 0);
        const overallProgress = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;

        return (
          <Card key={subject.id} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{subject.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{acts.length} actividad{acts.length !== 1 ? 'es' : ''} · {overallProgress}% completado</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openSubjectDialog(subject)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteSubjectId(subject.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {totalChecks > 0 && <Progress value={overallProgress} className="h-2" />}

              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => openActDialog(subject.id)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar Actividad
              </Button>

              {acts.length > 0 && (
                <Accordion type="multiple" className="space-y-2">
                  {acts.map(act => {
                    const alert = getTimeAlert(act.dueDate, act.status);
                    const checkDone = act.checklist.filter(c => c.completed).length;
                    const checkTotal = act.checklist.length;
                    const actProgress = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

                    return (
                      <AccordionItem key={act.id} value={act.id} className="border border-border rounded-lg px-4 bg-secondary/20">
                        <AccordionTrigger className="hover:no-underline py-3 gap-3">
                          <div className="flex flex-1 items-center gap-3 min-w-0 text-left">
                            <span className="font-medium text-sm truncate">{act.name}</span>
                            <div className="hidden sm:flex items-center gap-2">
                              {getStatusBadge(act.status)}
                              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${alert.color}`}>
                                {alert.icon} {alert.label}
                              </Badge>
                            </div>
                            {checkTotal > 0 && (
                              <span className="text-xs text-muted-foreground hidden md:inline">{checkDone}/{checkTotal} tareas</span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                          {/* Mobile badges */}
                          <div className="flex flex-wrap gap-2 sm:hidden">
                            {getStatusBadge(act.status)}
                            <Badge variant="outline" className={`text-xs flex items-center gap-1 ${alert.color}`}>
                              {alert.icon} {alert.label}
                            </Badge>
                          </div>

                          {/* Dates & actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground space-x-3">
                              <span>Inicio: <strong className="text-foreground">{act.startDate}</strong></span>
                              <span>Entrega: <strong className="text-foreground">{act.dueDate}</strong></span>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openActDialog(act.subjectId, act)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteActId(act.id)}><Trash2 className="h-3 w-3 mr-1" /> Eliminar</Button>
                            </div>
                          </div>

                          {/* Progress */}
                          {checkTotal > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progreso</span>
                                <span className="font-mono-data">{actProgress}%</span>
                              </div>
                              <Progress value={actProgress} className="h-2" />
                            </div>
                          )}

                          {/* Checklist */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-foreground">Checklist</h4>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addCheckItem(act)}>
                                <Plus className="h-3 w-3 mr-1" /> Tarea
                              </Button>
                            </div>
                            {act.checklist.map(item => (
                              <div key={item.id} className="flex items-center gap-2 group">
                                <Checkbox checked={item.completed} onCheckedChange={(v) => updateCheckItem(act, item.id, { completed: !!v })} />
                                <Input
                                  value={item.text}
                                  onChange={(e) => updateCheckItem(act, item.id, { text: e.target.value })}
                                  placeholder="Descripción de la tarea..."
                                  className={`h-8 text-sm flex-1 bg-transparent border-border/50 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => deleteCheckItem(act, item.id)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            {act.checklist.length === 0 && <p className="text-xs text-muted-foreground">Sin tareas aún.</p>}
                          </div>

                          {/* Notes */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-foreground">Notas</h4>
                            <Textarea
                              value={act.notes}
                              onChange={(e) => updateNotes(act, e.target.value)}
                              placeholder="Agregar notas o comentarios..."
                              className="min-h-[60px] text-sm bg-secondary/30 border-border/50"
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Subject Dialog */}
      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editingSubject ? 'Editar Materia' : 'Nueva Materia'}</DialogTitle></DialogHeader>
          <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Nombre de la materia" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveSubject} disabled={!subjectName.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editingAct ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={actForm.name} onChange={(e) => setActForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la actividad" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha inicio</label>
                <Input type="date" value={actForm.startDate} onChange={(e) => setActForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha entrega</label>
                <Input type="date" value={actForm.dueDate} onChange={(e) => setActForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
              <Select value={actForm.status} onValueChange={(v) => setActForm(f => ({ ...f, status: v as ActivityStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveAct} disabled={!actForm.name.trim() || !actForm.startDate || !actForm.dueDate}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirms */}
      <AlertDialog open={!!deleteSubjectId} onOpenChange={() => setDeleteSubjectId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar materia?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán la materia y todas sus actividades. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteActId} onOpenChange={() => setDeleteActId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
