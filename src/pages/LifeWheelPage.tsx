import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LifeWheelChart from '@/components/LifeWheelChart';
import LifeGoals from '@/components/LifeGoals';
import LifeHabits from '@/components/LifeHabits';
import { loadWheelState } from '@/data/life-wheel-db';
import type { WheelState } from '@/data/life-wheel';
import { getDashboardSummary } from '@/data/life-wheel';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Flame, BrainCircuit } from 'lucide-react';

export default function LifeWheelPage() {
  const [state, setState] = useState<WheelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [tab, setTab] = useState('wheel');

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
          <BrainCircuit className="h-10 w-10 animate-pulse mx-auto mb-3 text-primary/50" />
          <p className="text-sm text-muted-foreground">Cargando Rueda de la Vida...</p>
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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Rueda de la Vida</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Visualiza, califica y mejora el equilibrio de tu vida
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-metallic">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold font-mono-data text-primary">
                {summary.wheelAverage.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">Promedio</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-metallic">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold font-mono-data text-accent">
                {summary.activeGoals}
              </p>
              <p className="text-[10px] text-muted-foreground">Metas activas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-metallic">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-400/10 flex items-center justify-center shrink-0">
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold font-mono-data text-orange-400">
                {summary.activeHabits}
              </p>
              <p className="text-[10px] text-muted-foreground">Hábitos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-3 sm:w-full">
            <TabsTrigger value="wheel" className="text-xs sm:text-sm">Rueda</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm">Metas</TabsTrigger>
            <TabsTrigger value="habits" className="text-xs sm:text-sm">Hábitos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="wheel" className="space-y-4 mt-4">
          <LifeWheelChart
            state={state}
            selectedArea={selectedArea}
            onAreaClick={(areaId) => setSelectedArea(areaId === selectedArea ? null : areaId)}
          />

          {/* Rating legend info */}
          {selectedArea && (
            <Card className="card-metallic border-primary/20">
              <CardContent className="p-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Área seleccionada: <strong className="text-foreground">
                    {state.areas.find((a) => a.id === selectedArea)?.name}
                  </strong>
                  — las metas y hábitos están filtrados
                </p>
                <button
                  onClick={() => setSelectedArea(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Limpiar filtro
                </button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-4 mt-4">
          <LifeGoals state={state} selectedArea={selectedArea} onStateChange={setState} />
        </TabsContent>

        <TabsContent value="habits" className="space-y-4 mt-4">
          <LifeHabits state={state} selectedArea={selectedArea} onStateChange={setState} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
