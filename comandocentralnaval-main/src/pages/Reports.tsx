import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Report, ReportStatus, REPORT_STATUS_LABELS } from '@/data/models';
import { getReports, saveReport, deleteReport, generateId } from '@/data/store';
import { reportStatusStyle } from '@/lib/statusStyles';
import { useToast } from '@/hooks/use-toast';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function buildPeriodDates(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    q1Start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    q1End: `${year}-${String(month + 1).padStart(2, '0')}-15`,
    q2Start: `${year}-${String(month + 1).padStart(2, '0')}-16`,
    q2End: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`,
  };
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>(() => getReports());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create form
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());

  const filtered = useMemo(() => {
    const sorted = [...reports].sort((a, b) => b.startDate.localeCompare(a.startDate));
    return sorted.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reports, filterStatus, search]);

  const handleCreate = () => {
    const { q1Start, q2End } = buildPeriodDates(selYear, selMonth);
    const title = `Reporte SIS - ${MONTHS[selMonth]} ${selYear}`;

    // Check duplicate
    if (reports.some(r => r.title === title)) {
      toast({ title: 'Error', description: 'Ya existe un reporte para ese mes', variant: 'destructive' });
      return;
    }

    const nowISO = new Date().toISOString();
    const newReport: Report = {
      id: generateId(),
      title,
      startDate: q1Start,
      endDate: q2End,
      responsible: '',
      status: 'draft',
      summary: '',
      tasks: [],
      createdAt: nowISO,
      updatedAt: nowISO,
    };
    saveReport(newReport);
    setReports(getReports());
    setCreateOpen(false);
    toast({ title: 'Reporte creado', description: title });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteReport(deleteId);
    setReports(getReports());
    setDeleteId(null);
    toast({ title: 'Reporte eliminado' });
  };

  // Group by period label
  const getPeriodLabel = (r: Report) => {
    const d = new Date(r.startDate + 'T00:00:00');
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reporte SIS</h1>
          <p className="text-sm text-muted-foreground">{reports.length} reportes registrados</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Crear reporte mensual
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-metallic">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-secondary/50"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="review">En revisión</SelectItem>
                <SelectItem value="final">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-metallic overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Título</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Periodo</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="border-border hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/reports/${r.id}`)}>
                  <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono-data hidden md:table-cell">
                    {r.startDate} → {r.endDate}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${reportStatusStyle(r.status)}`}>
                      {REPORT_STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/reports/${r.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No se encontraron reportes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear Reporte SIS Mensual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Año</label>
              <Select value={String(selYear)} onValueChange={v => setSelYear(Number(v))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Mes</label>
              <Select value={String(selMonth)} onValueChange={v => setSelMonth(Number(v))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Se creará el reporte para <strong>{MONTHS[selMonth]} {selYear}</strong> dividido en dos quincenas (1-15 y 16-{new Date(selYear, selMonth + 1, 0).getDate()}).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear reporte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el reporte y todas sus tareas.</AlertDialogDescription>
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
