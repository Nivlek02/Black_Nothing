import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, ArrowRight, CalendarDays, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPlatforms, getPayments, daysUntil, formatCurrency } from '@/data/store';
import { chargeAlertStyle } from '@/lib/statusStyles';
import { getAgendaTasks } from '@/data/agenda';

export default function HomePage() {
  const platforms = useMemo(() => getPlatforms(), []);
  const payments = useMemo(() => getPayments(), []);
  const agendaTasks = useMemo(() => getAgendaTasks(), []);

  const activePlatforms = platforms.filter(p => p.status === 'active');
  const monthlyTotal = activePlatforms
    .filter(p => p.currency === 'USD' && p.frequency === 'monthly')
    .reduce((sum, p) => sum + p.cost, 0);
  const monthlyCOP = activePlatforms
    .filter(p => p.currency === 'COP' && p.frequency === 'monthly')
    .reduce((sum, p) => sum + p.cost, 0);

  const upcomingCharges = activePlatforms
    .map(p => ({ ...p, daysLeft: daysUntil(p.nextCharge) }))
    .filter(p => p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = agendaTasks
    .filter(t => t.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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

        {/* Facturación */}
        <Card className="card-metallic">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturación Mensual</CardTitle>
            <CreditCard className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-data text-foreground">
              {formatCurrency(monthlyTotal, 'USD')}
            </div>
            {monthlyCOP > 0 && (
              <div className="text-sm font-mono-data text-muted-foreground mt-1">
                + {formatCurrency(monthlyCOP, 'COP')}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {activePlatforms.length} plataformas activas
            </p>
            <Link to="/billing">
              <Button variant="ghost" size="sm" className="mt-3 w-full text-accent hover:text-accent hover:bg-accent/10">
                Ver facturación <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className={`card-metallic ${upcomingCharges.length > 0 ? 'border-warning/30' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
            <AlertTriangle className={`h-5 w-5 ${upcomingCharges.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-data text-foreground">{upcomingCharges.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cobros próximos (7 días)</p>
            {upcomingCharges.slice(0, 3).map(p => {
              const alert = chargeAlertStyle(p.daysLeft);
              return (
                <div key={p.id} className="flex items-center justify-between mt-2">
                  <span className="text-xs text-foreground truncate mr-2">{p.name}</span>
                  <Badge variant="outline" className={`text-xs shrink-0 ${alert.style}`}>{alert.label}</Badge>
                </div>
              );
            })}
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
