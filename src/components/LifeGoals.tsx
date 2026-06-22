import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Target, CheckCircle2, Circle } from 'lucide-react';
import type { WheelState, Goal, Area } from '@/data/life-wheel';
import { getActiveGoals, getGoalProgress } from '@/data/life-wheel';
import * as db from '@/data/life-wheel-db';

interface LifeGoalsProps {
  state: WheelState;
  selectedArea: string | null;
  onStateChange: (newState: WheelState) => void;
}

export default function LifeGoals({ state, selectedArea, onStateChange }: LifeGoalsProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalArea, setNewGoalArea] = useState(selectedArea || state.areas[0]?.id || '');
  const [newSubtaskInput, setNewSubtaskInput] = useState<Record<string, string>>({});

  // Filtrar metas por área seleccionada
  const areas = state.areas;
  const goals = selectedArea
    ? getActiveGoals(state, selectedArea)
    : state.goals.filter((g) => g.status === 'active');
  const completedGoals = state.goals.filter((g) => g.status === 'done');

  // Agrupar por área
  const goalsByArea: Record<string, Goal[]> = {};
  for (const g of goals) {
    if (!goalsByArea[g.areaId]) goalsByArea[g.areaId] = [];
    goalsByArea[g.areaId].push(g);
  }

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id;
  const areaColor = (id: string) => areas.find((a) => a.id === id)?.color ?? '#666';

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !newGoalArea) return;
    try {
      await db.createGoal(newGoalArea, newGoalTitle.trim());
      toast({ title: 'Meta creada' });
      setDialogOpen(false);
      setNewGoalTitle('');
      // Recargar estado
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al crear meta', variant: 'destructive' });
    }
  };

  const handleAddSubtask = async (goalId: string) => {
    const title = newSubtaskInput[goalId]?.trim();
    if (!title) return;
    try {
      await db.addSubtask(goalId, title);
      setNewSubtaskInput((prev) => ({ ...prev, [goalId]: '' }));
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al agregar subtarea', variant: 'destructive' });
    }
  };

  const handleToggleSubtask = async (subtaskId: string, done: boolean) => {
    try {
      await db.toggleSubtask(subtaskId, !done);
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al actualizar subtarea', variant: 'destructive' });
    }
  };

  const handleCompleteGoal = async (goal: Goal) => {
    try {
      const currentScore = state.ratings
        .filter((r) => r.areaId === goal.areaId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.score ?? 5;

      await db.completeGoalAndRating(
        goal.id,
        goal.areaId,
        currentScore,
        goal.impact,
        goal.title
      );
      toast({
        title: '🎉 Meta completada',
        description: `¡${goal.title} completada! La calificación de ${areaName(goal.areaId)} ha subido.`,
      });
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al completar meta', variant: 'destructive' });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await db.deleteGoal(goalId);
      toast({ title: 'Meta eliminada' });
      const newState = await db.loadWheelState();
      onStateChange(newState);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al eliminar meta', variant: 'destructive' });
    }
  };

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const progress = getGoalProgress(goal);
    return (
      <Card className="card-metallic">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: areaColor(goal.areaId) }}
                />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {areaName(goal.areaId)}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-foreground truncate">
                {goal.title}
              </h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => handleCompleteGoal(goal)}
                title="Completar meta"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteGoal(goal.id)}
                title="Eliminar meta"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          {goal.subtasks.length > 0 && (
            <div className="space-y-2">
              <Progress value={progress * 100} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">
                {goal.subtasks.filter((s) => s.done).length}/{goal.subtasks.length} subtareas
              </p>
            </div>
          )}

          {/* Subtasks */}
          {goal.subtasks.length > 0 && (
            <div className="space-y-1">
              {goal.subtasks.map((st) => (
                <label
                  key={st.id}
                  className="flex items-center gap-2 py-1 cursor-pointer group"
                >
                  <Checkbox
                    checked={st.done}
                    onCheckedChange={() => handleToggleSubtask(st.id, st.done)}
                    className="h-3.5 w-3.5"
                  />
                  <span
                    className={`text-xs flex-1 ${
                      st.done
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {st.title}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Add subtask */}
          <div className="flex gap-1.5">
            <Input
              placeholder="Agregar subtarea..."
              value={newSubtaskInput[goal.id] ?? ''}
              onChange={(e) =>
                setNewSubtaskInput((prev) => ({ ...prev, [goal.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubtask(goal.id);
              }}
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => handleAddSubtask(goal.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
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
          <h2 className="text-lg font-bold text-foreground">Metas</h2>
          <p className="text-xs text-muted-foreground">
            {selectedArea
              ? `Metas activas en ${areaName(selectedArea)}`
              : 'Todas las metas activas'}
          </p>
        </div>
        <Button onClick={() => { setNewGoalArea(selectedArea || state.areas[0]?.id || ''); setDialogOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nueva Meta
        </Button>
      </div>

      {/* Goals by area */}
      {Object.keys(goalsByArea).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay metas activas</p>
          <p className="text-xs mt-1">Crea una meta para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(goalsByArea).map(([areaId, areaGoals]) =>
            areaGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      )}

      {/* Completed goals summary */}
      {completedGoals.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            {completedGoals.length} meta{completedGoals.length !== 1 ? 's' : ''} completada{completedGoals.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {completedGoals.slice(0, 10).map((g) => (
              <Badge key={g.id} variant="secondary" className="text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                {g.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* New goal dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Área</label>
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setNewGoalArea(a.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      newGoalArea === a.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'
                    }`}
                    style={
                      newGoalArea === a.id
                        ? { borderColor: a.color, color: a.color }
                        : {}
                    }
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título de la meta</label>
              <Input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Ej: Hacer ejercicio 3 veces por semana"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGoal(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGoal} disabled={!newGoalTitle.trim()}>
              Crear Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
