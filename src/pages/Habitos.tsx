import { useEffect, useState, useCallback } from 'react';
import { loadWheelState } from '@/data/life-wheel-db';
import { getDashboardSummary } from '@/data/life-wheel';
import type { WheelState } from '@/data/life-wheel';
import LifeHabits from '@/components/LifeHabits';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, BrainCircuit, Target, TrendingUp } from 'lucide-react';

export default function HabitosPage() {
  const [state, setState] = useState<WheelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await loadWheelState();
      setState(s);
    } catch (err) {
      console.error('Error loading wheel state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Flame className="h-10 w-10 animate-pulse mx-auto mb-3 text-orange-400/50" />
          <p className="text-sm text-muted-foreground">Cargando hábitos...</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive">Error al cargar los datos</p>
      </div>
    );
  }

  const summary = getDashboardSummary(state);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Hábitos</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Registra y da seguimiento a tus hábitos diarios y semanales
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-metallic">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-400/10 flex items-center justify-center shrink-0">
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold font-mono-data text-orange-400">
                {summary.activeHabits}
              </p>
              <p className="text-[10px] text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-metallic">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold font-mono-data text-primary">
                {summary.activeGoals}
              </p>
              <p className="text-[10px] text-muted-foreground">Metas activas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-metallic">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold font-mono-data text-accent">
                {summary.wheelAverage.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">Prom. rueda</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Area filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedArea(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            !selectedArea
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground'
          }`}
        >
          Todos
        </button>
        {state.areas.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedArea(a.id === selectedArea ? null : a.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              selectedArea === a.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
            style={selectedArea === a.id ? { borderColor: a.color, color: a.color } : {}}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Habits */}
      <LifeHabits state={state} selectedArea={selectedArea} onStateChange={setState} />
    </div>
  );
}
