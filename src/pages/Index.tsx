import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, ArrowRight, CalendarDays, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAgendaTasks } from '@/data/agenda';

export default function HomePage() {
  const agendaTasks = useMemo(() => getAgendaTasks(), []);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = agendaTasks
    .filter(t => t.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingCount = agendaTasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Anchor className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Mando</h1>
          <p className="text-sm text-muted-foreground">Bienvenido al Centro de Comando</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Agenda */}
        <Card className="card-metallic">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agenda Hoy</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-data text-foreground">{todayTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">tareas para hoy</p>
            {todayTasks.slice(0, 2).map(t => (
              <div key={t.id} className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono-data text-muted-foreground">{t.startTime}</span>
                <span className="text-xs text-foreground truncate">{t.title}</span>
              </div>
            ))}
            <Link to="/agenda">
              <Button variant="ghost" size="sm" className="mt-3 w-full text-primary hover:text-primary hover:bg-primary/10">
                Ver agenda <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="card-metallic">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tareas Pendientes</CardTitle>
            <Clock className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-data text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">tareas sin completar</p>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="card-metallic">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calendario</CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-1">Festivos y fechas especiales</p>
            <Link to="/calendario">
              <Button variant="ghost" size="sm" className="mt-3 w-full text-primary hover:text-primary hover:bg-primary/10">
                Ver calendario <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Today's schedule */}
      <Card className="card-metallic">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agenda del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay tareas programadas para hoy</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {todayTasks.slice(0, 6).map(task => (
                  <div key={task.id} className="relative flex items-start gap-4 pl-10">
                    <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${task.completed ? 'bg-primary border-primary' : 'bg-background border-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                      <p className="text-xs text-muted-foreground font-mono-data mt-0.5">
                        {task.startTime} - {task.endTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
