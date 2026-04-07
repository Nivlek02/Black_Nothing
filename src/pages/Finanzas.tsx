import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Landmark, PiggyBank, Plus,
  Trash2, ArrowUpCircle, ArrowDownCircle, Banknote, Receipt, HandCoins, History,
  Calendar as CalIcon
} from 'lucide-react';
import {
  Income, Expense, ATMWithdrawal, CreditCardTransaction, Debt, DebtPayment, FinanceMovement,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, ATM_SOURCES, MOVEMENT_TYPE_LABELS,
  getIncomes, addIncome, deleteIncome,
  getExpenses, addExpense, deleteExpense,
  getWithdrawals, addWithdrawal, deleteWithdrawal,
  getCCTransactions, addCCTransaction, deleteCCTransaction,
  getDebts, addDebt, updateDebt, deleteDebt,
  getDebtPayments, addDebtPayment,
  getMovementHistory,
} from '@/data/finance';

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FinanzasPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');

  // Data
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [withdrawals, setWithdrawals] = useState<ATMWithdrawal[]>([]);
  const [ccTx, setCcTx] = useState<CreditCardTransaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [history, setHistory] = useState<FinanceMovement[]>([]);

  // Dialogs
  const [dialog, setDialog] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  // Debt payments dialog
  const [debtPaymentsDialog, setDebtPaymentsDialog] = useState<string | null>(null);
  const [debtPaymentsList, setDebtPaymentsList] = useState<DebtPayment[]>([]);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMethod, setFormMethod] = useState('Efectivo');
  const [formExpenseType, setFormExpenseType] = useState('occasional');
  const [formSource, setFormSource] = useState('Cuenta principal');
  const [formCcType, setFormCcType] = useState('purchase');
  // Debt form
  const [formDebtName, setFormDebtName] = useState('');
  const [formDebtTotal, setFormDebtTotal] = useState('');
  const [formDebtStart, setFormDebtStart] = useState(new Date().toISOString().split('T')[0]);
  const [formDebtDue, setFormDebtDue] = useState('');
  const [formDebtNotes, setFormDebtNotes] = useState('');
  // Debt payment form
  const [formDebtPayAmount, setFormDebtPayAmount] = useState('');
  const [formDebtPayNotes, setFormDebtPayNotes] = useState('');
  const [formDebtPayId, setFormDebtPayId] = useState('');

  // History filters
  const [filterType, setFilterType] = useState('all');

  const loadAll = useCallback(async () => {
    try {
      const [i, e, w, c, d, h] = await Promise.all([
        getIncomes(), getExpenses(), getWithdrawals(), getCCTransactions(), getDebts(), getMovementHistory(),
      ]);
      setIncomes(i); setExpenses(e); setWithdrawals(w); setCcTx(c); setDebts(d); setHistory(h);
    } catch (err) {
      console.error('Error loading finance data:', err);
      toast({ title: 'Error al cargar datos financieros', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const totalIncome = useMemo(() => incomes.reduce((s, r) => s + Number(r.amount), 0), [incomes]);
  const totalExpense = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount), 0), [expenses]);
  const totalWithdrawals = useMemo(() => withdrawals.reduce((s, r) => s + Number(r.amount), 0), [withdrawals]);

  // Credit card
  const ccPurchases = useMemo(() => ccTx.filter(t => t.transaction_type === 'purchase').reduce((s, t) => s + Number(t.amount), 0), [ccTx]);
  const ccPayments = useMemo(() => ccTx.filter(t => t.transaction_type === 'payment').reduce((s, t) => s + Number(t.amount), 0), [ccTx]);
  const ccBalance = ccPurchases - ccPayments;
  const now = new Date();
  const ccCutDay = 15; // día de corte configurable
  const nextPayDate = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > ccCutDay ? 1 : 0), ccCutDay);

  const resetForm = () => {
    setFormAmount(''); setFormCategory(''); setFormDescription(''); setFormMethod('Efectivo');
    setFormExpenseType('occasional'); setFormSource('Cuenta principal'); setFormCcType('purchase');
    setFormDebtName(''); setFormDebtTotal(''); setFormDebtStart(new Date().toISOString().split('T')[0]);
    setFormDebtDue(''); setFormDebtNotes('');
    setFormDebtPayAmount(''); setFormDebtPayNotes(''); setFormDebtPayId('');
  };
  const openDialog = (type: string) => { resetForm(); setDialog(type); };

  // Handlers
  const handleSaveIncome = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    try {
      await addIncome({ amount: Number(formAmount), category: formCategory || 'Otro', description: formDescription, payment_method: formMethod });
      toast({ title: 'Ingreso registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar ingreso', variant: 'destructive' }); }
  };
  const handleSaveExpense = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    try {
      await addExpense({ amount: Number(formAmount), category: formCategory || 'Otro', expense_type: formExpenseType as 'fixed' | 'occasional', description: formDescription, payment_method: formMethod });
      toast({ title: 'Gasto registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar gasto', variant: 'destructive' }); }
  };
  const handleSaveWithdrawal = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    try {
      await addWithdrawal({ amount: Number(formAmount), source: formSource, description: formDescription });
      toast({ title: 'Retiro registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar retiro', variant: 'destructive' }); }
  };
  const handleSaveCCTx = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    try {
      await addCCTransaction({ amount: Number(formAmount), transaction_type: formCcType as 'purchase' | 'payment', category: formCategory || 'Otro', description: formDescription });
      toast({ title: formCcType === 'purchase' ? 'Compra TC registrada' : 'Pago TC registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar movimiento TC', variant: 'destructive' }); }
  };
  const handleSaveDebt = async () => {
    if (!formDebtName || !formDebtTotal || Number(formDebtTotal) <= 0) return;
    try {
      await addDebt({ name: formDebtName, total_amount: Number(formDebtTotal), remaining_amount: Number(formDebtTotal), start_date: formDebtStart, due_date: formDebtDue || formDebtStart, status: 'active', notes: formDebtNotes });
      toast({ title: 'Deuda registrada' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar deuda', variant: 'destructive' }); }
  };
  const handleSaveDebtPayment = async () => {
    if (!formDebtPayAmount || Number(formDebtPayAmount) <= 0 || !formDebtPayId) return;
    try {
      await addDebtPayment({ debt_id: formDebtPayId, amount: Number(formDebtPayAmount), notes: formDebtPayNotes });
      toast({ title: 'Abono registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar abono', variant: 'destructive' }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { type, id } = deleteTarget;
      if (type === 'income') await deleteIncome(id);
      else if (type === 'expense') await deleteExpense(id);
      else if (type === 'withdrawal') await deleteWithdrawal(id);
      else if (type === 'cc') await deleteCCTransaction(id);
      else if (type === 'debt') await deleteDebt(id);
      toast({ title: 'Eliminado correctamente' });
      setDeleteTarget(null); loadAll();
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }); }
  };

  const openDebtPayments = async (debtId: string) => {
    setDebtPaymentsDialog(debtId);
    const payments = await getDebtPayments(debtId);
    setDebtPaymentsList(payments);
  };

  const filteredHistory = useMemo(() => {
    if (filterType === 'all') return history;
    return history.filter(m => m.type === filterType);
  }, [history, filterType]);

  // Quick actions
  const quickActions = [
    { label: 'Ingreso', icon: ArrowUpCircle, color: 'text-green-400', action: () => openDialog('income') },
    { label: 'Gasto', icon: ArrowDownCircle, color: 'text-red-400', action: () => openDialog('expense') },
    { label: 'Retiro', icon: Banknote, color: 'text-yellow-400', action: () => openDialog('withdrawal') },
    { label: 'Compra TC', icon: CreditCard, color: 'text-accent', action: () => { setFormCcType('purchase'); openDialog('cc'); } },
    { label: 'Pago TC', icon: Receipt, color: 'text-primary', action: () => { setFormCcType('payment'); openDialog('cc'); } },
    { label: 'Deuda', icon: PiggyBank, color: 'text-orange-400', action: () => openDialog('debt') },
    { label: 'Abono', icon: HandCoins, color: 'text-emerald-400', action: () => openDialog('debtpayment') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finanzas Personales</h1>
        <p className="text-sm text-muted-foreground">Gestión de ingresos, gastos, tarjeta de crédito y deudas</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {quickActions.map(qa => (
          <Button key={qa.label} variant="outline" className="flex flex-col gap-1 h-auto py-3 px-2" onClick={qa.action}>
            <qa.icon className={`h-5 w-5 ${qa.color}`} />
            <span className="text-xs">{qa.label}</span>
          </Button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="incomes">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="cc">Tarjeta</TabsTrigger>
          <TabsTrigger value="debts">Deudas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-400" /> Ingresos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono-data text-green-400">{fmt(totalIncome)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-400" /> Gastos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono-data text-red-400">{fmt(totalExpense)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4 text-yellow-400" /> Retiros</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono-data text-yellow-400">{fmt(totalWithdrawals)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /> Saldo TC</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold font-mono-data text-accent">{fmt(ccBalance)}</p></CardContent>
            </Card>
          </div>
          <Card className="card-metallic">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Balance Neto</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold font-mono-data ${totalIncome - totalExpense - totalWithdrawals >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {fmt(totalIncome - totalExpense - totalWithdrawals)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ingresos − Gastos − Retiros</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INCOMES */}
        <TabsContent value="incomes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Ingresos</h2>
            <Button size="sm" onClick={() => openDialog('income')}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
          </div>
          <Card className="card-metallic">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Categoría</TableHead><TableHead>Método</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {incomes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin ingresos registrados</TableCell></TableRow>}
                  {incomes.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono-data text-xs">{fmtDate(i.created_at)}</TableCell>
                      <TableCell><Badge variant="secondary">{i.category}</Badge></TableCell>
                      <TableCell className="text-sm">{i.payment_method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.description}</TableCell>
                      <TableCell className="text-right font-mono-data text-green-400">{fmt(Number(i.amount))}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'income', id: i.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Gastos</h2>
            <Button size="sm" onClick={() => openDialog('expense')}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
          </div>
          <Card className="card-metallic">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Categoría</TableHead><TableHead>Método</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {expenses.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin gastos registrados</TableCell></TableRow>}
                  {expenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono-data text-xs">{fmtDate(e.created_at)}</TableCell>
                      <TableCell><Badge variant={e.expense_type === 'fixed' ? 'default' : 'secondary'}>{e.expense_type === 'fixed' ? 'Fijo' : 'Ocasional'}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                      <TableCell className="text-sm">{e.payment_method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.description}</TableCell>
                      <TableCell className="text-right font-mono-data text-red-400">{fmt(Number(e.amount))}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'expense', id: e.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREDIT CARD */}
        <TabsContent value="cc" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Consumos</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono-data text-red-400">{fmt(ccPurchases)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pagos</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono-data text-green-400">{fmt(ccPayments)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendiente</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-xl font-bold font-mono-data ${ccBalance > 0 ? 'text-warning' : 'text-primary'}`}>{fmt(ccBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CalIcon className="h-3 w-3" /> Pago: {nextPayDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Movimientos Tarjeta</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setFormCcType('payment'); openDialog('cc'); }}>Registrar Pago</Button>
              <Button size="sm" onClick={() => { setFormCcType('purchase'); openDialog('cc'); }}><Plus className="h-4 w-4 mr-1" /> Compra</Button>
            </div>
          </div>
          <Card className="card-metallic">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Categoría</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {ccTx.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>}
                  {ccTx.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono-data text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell><Badge variant={t.transaction_type === 'purchase' ? 'destructive' : 'default'}>{t.transaction_type === 'purchase' ? 'Compra' : 'Pago'}</Badge></TableCell>
                      <TableCell className="text-sm">{t.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.description}</TableCell>
                      <TableCell className={`text-right font-mono-data ${t.transaction_type === 'purchase' ? 'text-red-400' : 'text-green-400'}`}>{fmt(Number(t.amount))}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'cc', id: t.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEBTS */}
        <TabsContent value="debts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Deudas</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openDialog('debtpayment')}><HandCoins className="h-4 w-4 mr-1" /> Abono</Button>
              <Button size="sm" onClick={() => openDialog('debt')}><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
            </div>
          </div>
          {debts.length === 0 && <Card className="card-metallic"><CardContent className="py-8 text-center text-muted-foreground">Sin deudas registradas</CardContent></Card>}
          <div className="grid gap-4">
            {debts.map(d => {
              const pct = d.total_amount > 0 ? Math.round(((d.total_amount - d.remaining_amount) / d.total_amount) * 100) : 0;
              return (
                <Card key={d.id} className="card-metallic">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.start_date} → {d.due_date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={d.status === 'paid' ? 'default' : d.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {d.status === 'paid' ? 'Pagada' : d.status === 'overdue' ? 'Vencida' : 'Activa'}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'debt', id: d.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Total: <span className="font-mono-data text-foreground">{fmt(d.total_amount)}</span></span>
                      <span className="text-muted-foreground">Pendiente: <span className="font-mono-data text-warning">{fmt(d.remaining_amount)}</span></span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{pct}% pagado</span>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => openDebtPayments(d.id)}>
                        <History className="h-3 w-3 mr-1" /> Ver abonos
                      </Button>
                    </div>
                    {d.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">{d.notes}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground">Historial de Movimientos</h2>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Gastos</SelectItem>
                <SelectItem value="withdrawal">Retiros</SelectItem>
                <SelectItem value="cc_purchase">Compras TC</SelectItem>
                <SelectItem value="cc_payment">Pagos TC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="card-metallic">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Categoría</TableHead><TableHead>Método</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>}
                  {filteredHistory.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono-data text-xs">{fmtDate(m.created_at)}</TableCell>
                      <TableCell><Badge variant={m.type === 'income' ? 'default' : m.type === 'expense' ? 'destructive' : 'secondary'}>{MOVEMENT_TYPE_LABELS[m.type]}</Badge></TableCell>
                      <TableCell className="text-sm">{m.category}</TableCell>
                      <TableCell className="text-sm">{m.method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.description}</TableCell>
                      <TableCell className={`text-right font-mono-data ${m.type === 'income' || m.type === 'cc_payment' ? 'text-green-400' : 'text-red-400'}`}>{fmt(m.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

      {/* Income Dialog */}
      <Dialog open={dialog === 'income'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Ingreso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
            <div><Label>Categoría</Label>
              <Select value={formCategory} onValueChange={setFormCategory}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{INCOME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Método</Label>
              <Select value={formMethod} onValueChange={setFormMethod}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveIncome}>Guardar Ingreso</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={dialog === 'expense'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Gasto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
            <div><Label>Tipo</Label>
              <Select value={formExpenseType} onValueChange={setFormExpenseType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fixed">Fijo</SelectItem><SelectItem value="occasional">Ocasional</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Categoría</Label>
              <Select value={formCategory} onValueChange={setFormCategory}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Método de pago</Label>
              <Select value={formMethod} onValueChange={setFormMethod}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveExpense}>Guardar Gasto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={dialog === 'withdrawal'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Retiro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
            <div><Label>Cuenta / Fuente</Label>
              <Select value={formSource} onValueChange={setFormSource}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ATM_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveWithdrawal}>Guardar Retiro</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Card Dialog */}
      <Dialog open={dialog === 'cc'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{formCcType === 'purchase' ? 'Registrar Compra con TC' : 'Registrar Pago de TC'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="number" placeholder="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
            {formCcType === 'purchase' && (
              <div><Label>Categoría</Label>
                <Select value={formCategory} onValueChange={setFormCategory}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveCCTx}>{formCcType === 'purchase' ? 'Guardar Compra' : 'Guardar Pago'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Dialog */}
      <Dialog open={dialog === 'debt'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Deuda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre / Concepto *</Label><Input value={formDebtName} onChange={e => setFormDebtName(e.target.value)} placeholder="Ej: Préstamo personal" /></div>
            <div><Label>Monto total *</Label><Input type="number" placeholder="0" value={formDebtTotal} onChange={e => setFormDebtTotal(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Fecha inicio</Label><Input type="date" value={formDebtStart} onChange={e => setFormDebtStart(e.target.value)} /></div>
              <div><Label>Fecha límite</Label><Input type="date" value={formDebtDue} onChange={e => setFormDebtDue(e.target.value)} /></div>
            </div>
            <div><Label>Notas</Label><Textarea value={formDebtNotes} onChange={e => setFormDebtNotes(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveDebt}>Guardar Deuda</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Payment Dialog */}
      <Dialog open={dialog === 'debtpayment'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Abono a Deuda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Deuda *</Label>
              <Select value={formDebtPayId} onValueChange={setFormDebtPayId}><SelectTrigger><SelectValue placeholder="Seleccionar deuda" /></SelectTrigger>
                <SelectContent>{debts.filter(d => d.status === 'active').map(d => <SelectItem key={d.id} value={d.id}>{d.name} — {fmt(d.remaining_amount)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Monto del abono *</Label><Input type="number" placeholder="0" value={formDebtPayAmount} onChange={e => setFormDebtPayAmount(e.target.value)} /></div>
            <div><Label>Notas</Label><Input value={formDebtPayNotes} onChange={e => setFormDebtPayNotes(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveDebtPayment}>Guardar Abono</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Payments List Dialog */}
      <Dialog open={!!debtPaymentsDialog} onOpenChange={o => !o && setDebtPaymentsDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historial de Abonos</DialogTitle></DialogHeader>
          {debtPaymentsList.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Sin abonos registrados</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {debtPaymentsList.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <div>
                    <p className="text-sm font-mono-data text-primary">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</p>
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
