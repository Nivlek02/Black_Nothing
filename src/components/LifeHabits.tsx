import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Flame, CheckCircle2, Circle, Archive, Trash2, RotateCcw } from 'lucide-react';
import type { WheelState, Habit, Area } from '@/data/life-wheel';
import { getHabitStreak, getHabitConsistency } from '@/data/life-wheel';
import * as db from '@/data/life-wheel-db';

interface LifeHabitsProps {
  state: WheelState;
  selectedArea: string | null;
  onStateChange: (newState: WheelState) => void;
}

export default function LifeHabits({ state, selectedArea, onStateChange }: LifeHabitsProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState(selectedArea || state.areas[0]?.id || '');
  const [newCadence, setNewCadence] = useState<'daily' | 'weekly'>('daily');
  const [newPositive, setNewPositive] = useState(true);

  const areas = state.areas;
  const areaName = (id: string) => areas.find((a) => a.id)?.name ?? id;
  const areaColor = (id: string) => areas.find((a) => a.id === id)?.color ?? '#666';

  // Filtrar hábitos activos
  const visibleHabits = useMemo(() => {
    let h = state.habits.filter((hab) => !hab.archived);
    if (selectedArea) h = h.filter((hab) => hab.areaId === selectedArea);
    return h;
  }, [state.habits, selectedArea]);

  const archivedHabits = useMemo(() => {
    let h = state.habits.filter((hab) => hab.archived);
    if (selectedArea) h = h.filter((hab) => hab.areaId === selectedArea);
    return h;
  }, [state.habits, selectedArea]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await db.createHabit(newArea, newTitle.trim(), newCadence, newPositive);
      toast({ title: 'Hábito creado' });
      setDialogOpen(false);
      setNewTitle('');
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al crear hábito', variant: 'destructive' });
    }
  };

  const handleLog = async (habitId: string, date: string, done: boolean) => {
    try {
      await db.logHabitDb(habitId, date, done);
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al registrar hábito', variant: 'destructive' });
    }
  };

  const handleArchive = async (habitId: string, archived: boolean) => {
    try {
      await db.archiveHabit(habitId, archived);
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al archivar hábito', variant: 'destructive' });
    }
  };

  const handleDelete = async (habitId: string) => {
    try {
      await db.deleteHabit(habitId);
      toast({ title: 'Hábito eliminado' });
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al eliminar hábito', variant: 'destructive' });
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  // Generar últimos 7 días
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === -1) return 'Ayer';
    return d.toLocaleDateString('es-CO', { weekday: 'short' });
  };

  const isLogged = (habitId: string, date: string): boolean | null => {
    const log = state.habitLogs.find((l) => l.habitId === habitId && l.date === date);
    if (!log) return null; // no registrado
    return log.done;
  };

  const HabitCard = ({ habit }: { habit: Habit }) => {
    const streak = getHabitStreak(state, habit.id);
    const consistency = getHabitConsistency(state, habit.id);
    const todayLog = isLogged(habit.id, today);

    return (
      <Card className="card-metallic">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: areaColor(habit.areaId) }}
                />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {areaName(habit.areaId)}
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  {habit.cadence === 'daily' ? 'Diario' : 'Semanal'}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                {habit.positive ? '✅' : '🚫'} {habit.title}
              </h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleArchive(habit.id, true)}
                title="Archivar"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(habit.id)}
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-bold font-mono-data text-orange-400">{streak}</span>
              <span className="text-[10px] text-muted-foreground">días</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${consistency * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono-data text-muted-foreground">
                {(consistency * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Weekly tracker */}
          <div className="flex items-center gap-1.5">
            {last7Days.map((date) => {
              const logged = isLogged(habit.id, date);
              const isToday = date === today;
              return (
                <button
                  key={date}
                  onClick={() => handleLog(habit.id, date, logged !== true)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all border ${
                    logged === true
                      ? 'bg-primary border-primary text-white'
                      : logged === false
                        ? 'bg-destructive/20 border-destructive/40 text-destructive'
                        : 'bg-secondary border-border text-muted-foreground hover:border-primary'
                  } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
                  title={`${dayLabel(date)}: ${logged === true ? 'Hecho' : logged === false ? 'No hecho' : 'Sin registrar'}`}
                >
                  {logged === true ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : logged === false ? (
                    <Circle className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px]">—</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day labels */}
          <div className="flex items-center gap-1.5">
            {last7Days.map((date) => (
              <span
                key={date}
                className={`w-8 text-[8px] text-center ${
                  date === today ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                {dayLabel(date)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Hábitos</h2>
          <p className="text-xs text-muted-foreground">
            {selectedArea
              ? `Hábitos en ${areas.find((a) => a.id === selectedArea)?.name ?? selectedArea}`
              : 'Todos los hábitos activos'}
          </p>
        </div>
        <Button onClick={() => { setNewArea(selectedArea || state.areas[0]?.id || ''); setDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Hábito
        </Button>
      </div>

      {/* Habits grid */}
      {visibleHabits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Flame className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay hábitos activos</p>
          <p className="text-xs mt-1">Crea un hábito para empezar a trackear</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} />
          ))}
        </div>
      )}

      {/* Archived habits */}
      {archivedHabits.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-2">
            {archivedHabits.length} hábito{archivedHabits.length !== 1 ? 's' : ''} archivado{archivedHabits.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {archivedHabits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm text-muted-foreground line-through">{habit.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () => {
                    await handleArchive(habit.id, false);
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* New habit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Hábito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Área */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Área</label>
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setNewArea(a.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      newArea === a.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'
                    }`}
                    style={newArea === a.id ? { borderColor: a.color, color: a.color } : {}}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Title */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre del hábito</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Leer 30 minutos"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
            </div>
            {/* Cadence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cadencia</label>
                <Select value={newCadence} onValueChange={(v: 'daily' | 'weekly') => setNewCadence(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Positive/negative */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hábito positivo</p>
                <p className="text-xs text-muted-foreground">
                  {newPositive ? 'Algo que QUIERES hacer' : 'Algo que QUIERES EVITAR'}
                </p>
              </div>
              <Switch
                checked={newPositive}
                onCheckedChange={setNewPositive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>Crear Hábito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
