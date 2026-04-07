import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Calendar, Clock, CheckCircle2, Circle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasksForDate, AgendaTask } from '@/data/agenda';
import { getTotalIncomes, getTotalExpenses } from '@/data/finance';
import NotificationSettings from '@/components/NotificationSettings';

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

export default function HomePage() {
  const [todayTasks, setTodayTasks] = useState<AgendaTask[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const today = new Date();
  const todayStr = fmt(today);

  useEffect(() => {
    getTasksForDate(todayStr).then(setTodayTasks);
    getTotalIncomes().then(setTotalIncome);
    getTotalExpenses().then(setTotalExpense);
  }, [todayStr]);

  const pending = todayTasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Centro de Comando</h1>
        <p className="text-sm text-muted-foreground">Panel de control — {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/agenda">
          <Card className="card-metallic hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Agenda Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono-data text-foreground">{todayTasks.length}</p>
              <p className="text-xs text-muted-foreground">{pending} pendiente{pending !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/calendario">
          <Card className="card-metallic hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" /> Calendario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-foreground">Vista anual</p>
              <p className="text-xs text-muted-foreground">Festivos y fechas especiales</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/finanzas">
          <Card className="card-metallic hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" /> Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono-data text-green-400">{fmtCurrency(totalIncome)}</p>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/finanzas">
          <Card className="card-metallic hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" /> Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono-data text-red-400">{fmtCurrency(totalExpense)}</p>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {todayTasks.length > 0 && (
        <Card className="card-metallic">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Agenda de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayTasks.slice(0, 6).map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  {t.completed
                    ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className={`text-sm flex-1 ${t.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</span>
                  <span className="text-xs font-mono-data text-muted-foreground">{t.startTime}–{t.endTime}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <NotificationSettings />
    </div>
  );
}
