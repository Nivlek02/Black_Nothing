import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Copy, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export default function ReportsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>(() => getReports());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState<string>('none');

  // Create form
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [responsible, setResponsible] = useState('');
  const [summary, setSummary] = useState('');

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.responsible.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reports, filterStatus, search]);

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setResponsible('');
    setSummary('');
    setDuplicateFrom('none');
  };

  const handleCreate = () => {
    if (!title.trim() || !startDate || !endDate || !responsible.trim()) {
      toast({ title: 'Error', description: 'Completa los campos obligatorios', variant: 'destructive' });
      return;
    }

    const dupReport = duplicateFrom !== 'none' ? reports.find(r => r.id === duplicateFrom) : null;
    const now = new Date().toISOString();
    const newReport: Report = {
      id: generateId(),
      title: title.trim(),
      startDate,
      endDate,
      responsible: responsible.trim(),
      status: 'draft',
      summary: summary.trim(),
      tasks: dupReport ? dupReport.tasks.map(t => ({ ...t, id: generateId(), status: 'pending' as const })) : [],
      createdAt: now,
      updatedAt: now,
    };
    saveReport(newReport);
    setReports(getReports());
    setCreateOpen(false);
    resetForm();
    toast({ title: 'Informe creado', description: dupReport ? `Se duplicaron ${newReport.tasks.length} tareas` : 'Informe quincenal creado correctamente' });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteReport(deleteId);
    setReports(getReports());
    setDeleteId(null);
    toast({ title: 'Informe eliminado' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Informes Quincenales</h1>
          <p className="text-sm text-muted-foreground">{reports.length} informes registrados</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Crear informe
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-metallic">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Buscar por título o responsable..."
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
                <TableHead className="text-muted-foreground hidden sm:table-cell">Responsable</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-center hidden sm:table-cell">Tareas</TableHead>
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
                  <TableCell className="text-muted-foreground hidden sm:table-cell">{r.responsible}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${reportStatusStyle(r.status)}`}>
                      {REPORT_STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono-data hidden sm:table-cell">{r.tasks.length}</TableCell>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron informes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Informe Quincenal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Informe Quincenal - Feb 16-28, 2026" className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fecha inicio *</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fecha fin *</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-secondary/50" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Responsable *</label>
              <Input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nombre del responsable" className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Resumen ejecutivo</label>
              <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Resumen del periodo..." className="bg-secondary/50 min-h-[80px]" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-2">
                <Copy className="h-3.5 w-3.5" /> Duplicar tareas de informe anterior
              </label>
              <Select value={duplicateFrom} onValueChange={setDuplicateFrom}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No duplicar</SelectItem>
                  {reports.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear informe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar informe?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el informe y todas sus tareas.</AlertDialogDescription>
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
