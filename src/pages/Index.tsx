import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, CreditCard, AlertTriangle, Anchor, ArrowRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getReports, getPlatforms, getPayments, daysUntil, formatCurrency } from '@/data/store';
import { REPORT_STATUS_LABELS } from '@/data/models';
import { reportStatusStyle, chargeAlertStyle } from '@/lib/statusStyles';

export default function HomePage() {
  const reports = useMemo(() => getReports(), []);
  const platforms = useMemo(() => getPlatforms(), []);
  const payments = useMemo(() => getPayments(), []);

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

  const latestReport = reports[0];

  // Timeline: merge recent events
  const timeline = useMemo(() => {
    const events: { id: string; date: string; icon: 'report' | 'payment' | 'alert'; text: string }[] = [];
    reports.slice(0, 3).forEach(r => {
      events.push({ id: `r-${r.id}`, date: r.updatedAt, icon: 'report', text: `Informe "${r.title}" - ${REPORT_STATUS_LABELS[r.status]}` });
    });
    payments.slice(0, 5).forEach(p => {
      events.push({ id: `p-${p.id}`, date: p.paymentDate, icon: 'payment', text: `Pago ${p.platformName}: ${formatCurrency(p.amount, p.currency)}` });
    });
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [reports, payments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Anchor className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Mando</h1>
          <p className="text-sm text-muted-foreground">Bienvenido al Centro de Comando</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Informes */}
        <Card className="card-metallic">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informes</CardTitle>
            <ClipboardList className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-data text-foreground">{reports.length}</div>
            {latestReport && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">Último: {latestReport.title}</p>
                <Badge variant="outline" className={`text-xs ${reportStatusStyle(latestReport.status)}`}>
                  {REPORT_STATUS_LABELS[latestReport.status]}
                </Badge>
              </div>
            )}
            <Link to="/reports">
              <Button variant="ghost" size="sm" className="mt-3 w-full text-primary hover:text-primary hover:bg-primary/10">
                Ver informes <ArrowRight className="ml-2 h-4 w-4" />
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

      {/* Timeline - Bitácora */}
      <Card className="card-metallic">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Bitácora de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {timeline.map((event) => (
                <div key={event.id} className="relative flex items-start gap-4 pl-10">
                  <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-primary bg-background" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{event.text}</p>
                    <p className="text-xs text-muted-foreground font-mono-data mt-0.5">
                      {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {event.icon === 'report' && <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  {event.icon === 'payment' && <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />}
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-muted-foreground pl-10">Sin actividad reciente</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
