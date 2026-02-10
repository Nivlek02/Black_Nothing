import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Platform, PlatformStatus, Frequency, PLATFORM_STATUS_LABELS, FREQUENCY_LABELS, CATEGORIES, CURRENCIES } from '@/data/models';
import { getPlatforms, savePlatform, deletePlatform, savePayment, calculateNextCharge, daysUntil, formatCurrency, generateId, getConfig } from '@/data/store';
import { platformStatusStyle, chargeAlertStyle } from '@/lib/statusStyles';
import { useToast } from '@/hooks/use-toast';

const emptyPlatform = {
  name: '', category: 'Otro', cost: 0, currency: 'USD', frequency: 'monthly' as Frequency,
  billingDay: 1, paymentMethod: '', billingLink: '', status: 'active' as PlatformStatus, notes: '',
};

export default function BillingPage() {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>(() => getPlatforms());
  const config = useMemo(() => getConfig(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [form, setForm] = useState(emptyPlatform);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState<Platform | null>(null);
  const [payComment, setPayComment] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    platforms.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())),
    [platforms, search]
  );

  const upcomingCharges = useMemo(() =>
    platforms
      .filter(p => p.status === 'active')
      .map(p => ({ ...p, daysLeft: daysUntil(p.nextCharge) }))
      .filter(p => p.daysLeft <= Math.max(...config.reminderDays, 7))
      .sort((a, b) => a.daysLeft - b.daysLeft),
    [platforms, config]
  );

  const openForm = (p?: Platform) => {
    if (p) {
      setEditing(p);
      setForm({ name: p.name, category: p.category, cost: p.cost, currency: p.currency, frequency: p.frequency, billingDay: p.billingDay, paymentMethod: p.paymentMethod || '', billingLink: p.billingLink || '', status: p.status, notes: p.notes || '' });
    } else {
      setEditing(null);
      setForm({ ...emptyPlatform });
    }
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.cost < 0) {
      toast({ title: 'Error', description: 'Nombre y costo válido son obligatorios', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    const nextCharge = calculateNextCharge(form.billingDay, form.frequency);
    const platform: Platform = {
      id: editing?.id || generateId(),
      ...form,
      name: form.name.trim(),
      nextCharge,
      createdAt: editing?.createdAt || now,
    };
    savePlatform(platform);
    setPlatforms(getPlatforms());
    setFormOpen(false);
    toast({ title: editing ? 'Plataforma actualizada' : 'Plataforma agregada' });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deletePlatform(deleteId);
    setPlatforms(getPlatforms());
    setDeleteId(null);
    toast({ title: 'Plataforma eliminada' });
  };

  const handlePay = () => {
    if (!payOpen || !payPeriod.trim()) {
      toast({ title: 'Error', description: 'Ingresa el periodo cubierto', variant: 'destructive' });
      return;
    }
    savePayment({
      id: generateId(),
      platformId: payOpen.id,
      platformName: payOpen.name,
      paymentDate: new Date().toISOString().split('T')[0],
      periodCovered: payPeriod.trim(),
      amount: payOpen.cost,
      currency: payOpen.currency,
      comment: payComment.trim() || undefined,
    });
    // Update next charge
    const nextCharge = calculateNextCharge(payOpen.billingDay, payOpen.frequency);
    savePlatform({ ...payOpen, nextCharge });
    setPlatforms(getPlatforms());
    setPayOpen(null);
    setPayComment('');
    setPayPeriod('');
    toast({ title: 'Pago registrado', description: `${payOpen.name} marcada como pagada` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturación de Plataformas</h1>
          <p className="text-sm text-muted-foreground">{platforms.length} plataformas registradas</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar plataforma
        </Button>
      </div>

      {/* Upcoming charges */}
      {upcomingCharges.length > 0 && (
        <Card className="card-metallic border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" /> Próximos Cobros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingCharges.map(p => {
                const alert = chargeAlertStyle(p.daysLeft);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="min-w-0 mr-2">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono-data">{formatCurrency(p.cost, p.currency)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${alert.style}`}>{alert.label}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                        onClick={() => { setPayOpen(p); setPayPeriod(''); setPayComment(''); }}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Input placeholder="Buscar por nombre o categoría..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm bg-secondary/50" />

      {/* Table */}
      <Card className="card-metallic overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Plataforma</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Categoría</TableHead>
                <TableHead className="text-muted-foreground">Costo</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Frecuencia</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Próximo cobro</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const days = daysUntil(p.nextCharge);
                const alert = chargeAlertStyle(days);
                return (
                  <TableRow key={p.id} className="border-border hover:bg-secondary/30">
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs bg-secondary/50">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="font-mono-data">{formatCurrency(p.cost, p.currency)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{FREQUENCY_LABELS[p.frequency]}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono-data text-muted-foreground">{p.nextCharge}</span>
                        {p.status === 'active' && <Badge variant="outline" className={`text-xs ${alert.style}`}>{alert.label}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${platformStatusStyle(p.status)}`}>
                        {PLATFORM_STATUS_LABELS[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'active' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => { setPayOpen(p); setPayPeriod(''); setPayComment(''); }}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openForm(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron plataformas</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Platform Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Plataforma' : 'Nueva Plataforma'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nombre *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Categoría</label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
                <Select value={form.status} onValueChange={(v: PlatformStatus) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Costo *</label>
                <Input type="number" min={0} step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className="bg-secondary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Frecuencia</label>
                <Select value={form.frequency} onValueChange={(v: Frequency) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Día de facturación (1-31)</label>
              <Input type="number" min={1} max={31} value={form.billingDay} onChange={e => setForm({ ...form, billingDay: parseInt(e.target.value) || 1 })} className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Método de pago</label>
              <Input value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} placeholder="Ej: Tarjeta Visa, PayPal..." className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Link panel de billing</label>
              <Input value={form.billingLink} onChange={e => setForm({ ...form, billingLink: e.target.value })} placeholder="https://..." className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notas</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Actualizar' : 'Agregar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago - {payOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Monto: <span className="font-mono-data text-foreground">{payOpen && formatCurrency(payOpen.cost, payOpen.currency)}</span></p>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Periodo cubierto *</label>
              <Input value={payPeriod} onChange={e => setPayPeriod(e.target.value)} placeholder="Ej: Febrero 2026" className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Comentario</label>
              <Input value={payComment} onChange={e => setPayComment(e.target.value)} className="bg-secondary/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancelar</Button>
            <Button onClick={handlePay} className="gap-1"><CheckCircle className="h-4 w-4" /> Registrar pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plataforma?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
