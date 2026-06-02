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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Landmark, PiggyBank, Plus,
  Trash2, ArrowUpCircle, ArrowDownCircle, Banknote, Receipt, HandCoins, History,
  Calendar as CalIcon, CheckCircle2, Clock, Wallet, Target, ArrowDown, ArrowUp
} from 'lucide-react';
import {
  Income, Expense, ATMWithdrawal, CreditCardTransaction, Debt, DebtPayment, FinanceMovement, UpcomingPayment, Savings, SavingsMovement, BankAccount,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, ATM_SOURCES, MOVEMENT_TYPE_LABELS, UPCOMING_PAYMENT_CATEGORIES, PAYMENT_FREQUENCIES,
  getIncomes, addIncome, deleteIncome,
  getExpenses, addExpense, deleteExpense,
  getWithdrawals, addWithdrawal, deleteWithdrawal,
  getCCTransactions, addCCTransaction, deleteCCTransaction,
  getDebts, addDebt, updateDebt, deleteDebt,
  getDebtPayments, addDebtPayment, getAllDebtPaymentsTotal, getTotalPaidUpcomingPayments, getTotalSavingsDeposits,
  getMovementHistory,
  getUpcomingPayments, addUpcomingPayment, updateUpcomingPayment, deleteUpcomingPayment,
  generateRecurringInstances, getNextQuincena,
  getSavings, addSavings, updateSavings, deleteSavings,
  getSavingsMovements, addSavingsMovement,
  getBankAccounts, addBankAccount, deleteBankAccount, computeAccountBalance,
} from '@/data/finance';

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

// Format number with dots as thousands separator (no decimals)
function fmtInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('es-CO');
}
function parseInput(value: string): string {
  return value.replace(/\D/g, '');
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtShortDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function MobileTable({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="min-w-[600px]">{children}</div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
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
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totalDebtPayments, setTotalDebtPayments] = useState(0);
  const [totalPaidPayments, setTotalPaidPayments] = useState(0);
  const [totalSavingsDeposits, setTotalSavingsDeposits] = useState(0);

  // Dialogs
  const [dialog, setDialog] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  // Debt payments dialog
  const [debtPaymentsDialog, setDebtPaymentsDialog] = useState<string | null>(null);
  const [debtPaymentsList, setDebtPaymentsList] = useState<DebtPayment[]>([]);

  // Savings movements dialog
  const [savingsMovDialog, setSavingsMovDialog] = useState<string | null>(null);
  const [savingsMovList, setSavingsMovList] = useState<SavingsMovement[]>([]);

  // Form states
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMethod, setFormMethod] = useState('Efectivo');
  const [formExpenseType, setFormExpenseType] = useState('occasional');
  const [formSource, setFormSource] = useState('Cuenta principal');
  const [formCcType, setFormCcType] = useState('purchase');
  const [formCcPayMode, setFormCcPayMode] = useState<'total' | 'single'>('total');
  const [formCcPayTarget, setFormCcPayTarget] = useState('');
  const [formAccountId, setFormAccountId] = useState<string>('');
  // Bank account form
  const [formAccName, setFormAccName] = useState('');
  const [formAccBalance, setFormAccBalance] = useState('');
  const [formAccNotes, setFormAccNotes] = useState('');
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
  // Upcoming payment form
  const [formUpName, setFormUpName] = useState('');
  const [formUpAmount, setFormUpAmount] = useState('');
  const [formUpDate, setFormUpDate] = useState('');
  const [formUpCategory, setFormUpCategory] = useState('Otro');
  const [formUpNotes, setFormUpNotes] = useState('');
  const [formUpFrequency, setFormUpFrequency] = useState('once');
  const [formUpEndDate, setFormUpEndDate] = useState('');
  // Savings form
  const [formSavName, setFormSavName] = useState('');
  const [formSavTarget, setFormSavTarget] = useState('');
  const [formSavNotes, setFormSavNotes] = useState('');
  // Savings movement form
  const [formSavMovId, setFormSavMovId] = useState('');
  const [formSavMovAmount, setFormSavMovAmount] = useState('');
  const [formSavMovType, setFormSavMovType] = useState('deposit');
  const [formSavMovNotes, setFormSavMovNotes] = useState('');

  // History filters
  const [filterType, setFilterType] = useState('all');

  const loadAll = useCallback(async () => {
    try {
      const [i, e, w, c, d, h, up, sv, ba, dpTotal, paidPay, savDep] = await Promise.all([
        getIncomes(), getExpenses(), getWithdrawals(), getCCTransactions(), getDebts(), getMovementHistory(), getUpcomingPayments(), getSavings(), getBankAccounts(), getAllDebtPaymentsTotal(), getTotalPaidUpcomingPayments(), getTotalSavingsDeposits(),
      ]);
      setIncomes(i); setExpenses(e); setWithdrawals(w); setCcTx(c); setDebts(d); setHistory(h); setUpcomingPayments(up); setSavings(sv); setAccounts(ba); setTotalDebtPayments(dpTotal); setTotalPaidPayments(paidPay); setTotalSavingsDeposits(savDep);
    } catch (err) {
      console.error('Error loading finance data:', err);
      toast({ title: 'Error al cargar datos financieros', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const totalIncome = useMemo(() => incomes.reduce((s, r) => s + Number(r.amount), 0), [incomes]);
  const totalExpenseBase = useMemo(() => expenses.reduce((s, r) => s + Number(r.amount), 0), [expenses]);
  const totalWithdrawals = useMemo(() => withdrawals.reduce((s, r) => s + Number(r.amount), 0), [withdrawals]);
  const totalSavings = useMemo(() => savings.reduce((s, r) => s + Number(r.current_amount), 0), [savings]);
  const totalDebts = useMemo(() => debts.filter(d => d.status === 'active').reduce((s, d) => s + Number(d.remaining_amount), 0), [debts]);

  // Credit card
  const ccPurchases = useMemo(() => ccTx.filter(t => t.transaction_type === 'purchase').reduce((s, t) => s + Number(t.amount), 0), [ccTx]);
  const ccPayments = useMemo(() => ccTx.filter(t => t.transaction_type === 'payment').reduce((s, t) => s + Number(t.amount), 0), [ccTx]);
  const ccBalance = ccPurchases - ccPayments;
  // Total gastos incluye gastos directos + pagos TC + abonos deudas + pagos pendientes pagados + depósitos ahorro
  const totalExpense = totalExpenseBase + ccPayments + totalDebtPayments + totalPaidPayments + totalSavingsDeposits;
  const now = new Date();
  const ccCutDay = 15;
  const nextPayDate = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > ccCutDay ? 1 : 0), ccCutDay);

  // Generate all recurring instances for display
  const allPaymentInstances = useMemo(() => generateRecurringInstances(upcomingPayments), [upcomingPayments]);
  const pendingPayments = useMemo(() => allPaymentInstances.filter(p => !p.is_paid), [allPaymentInstances]);

  // Quincena summary: payments pending until next 15 or 30/end-of-month
  const nextQuincena = useMemo(() => getNextQuincena(), []);
  const quincenaDateStr = `${nextQuincena.getFullYear()}-${String(nextQuincena.getMonth() + 1).padStart(2, '0')}-${String(nextQuincena.getDate()).padStart(2, '0')}`;
  const quincenaPayments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return pendingPayments.filter(p => p.due_date >= todayStr && p.due_date <= quincenaDateStr);
  }, [pendingPayments, quincenaDateStr]);
  const quincenaTotal = useMemo(() => quincenaPayments.reduce((s, p) => s + Number(p.amount), 0), [quincenaPayments]);

  // Monthly summary grouped by month
  const monthlySummary = useMemo(() => {
    const months: Record<string, { income: number; expense: number; scheduled: number; paid: number }> = {};
    const getKey = (dateStr: string) => {
      const d = new Date(dateStr + 'T12:00:00');
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const getKeyTs = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const ensure = (key: string) => {
      if (!months[key]) months[key] = { income: 0, expense: 0, scheduled: 0, paid: 0 };
    };
    incomes.forEach(i => { const k = getKeyTs(i.created_at); ensure(k); months[k].income += Number(i.amount); });
    expenses.forEach(e => { const k = getKeyTs(e.created_at); ensure(k); months[k].expense += Number(e.amount); });
    ccTx.filter(t => t.transaction_type === 'payment').forEach(t => { const k = getKeyTs(t.created_at); ensure(k); months[k].expense += Number(t.amount); });
    allPaymentInstances.forEach(p => {
      const k = getKey(p.due_date);
      ensure(k);
      if (p.is_paid) {
        months[k].paid += Number(p.amount);
        months[k].expense += Number(p.amount);
      } else {
        months[k].scheduled += Number(p.amount);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        key,
        label: new Date(key + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
        ...data,
      }));
  }, [incomes, expenses, ccTx, allPaymentInstances]);


  const resetForm = () => {
    setFormAmount(''); setFormCategory(''); setFormDescription(''); setFormMethod('Efectivo');
    setFormExpenseType('occasional'); setFormSource('Cuenta principal'); setFormCcType('purchase'); setFormCcPayMode('total'); setFormCcPayTarget('');
    setFormAccountId(accounts[0]?.id ?? '');
    setFormAccName(''); setFormAccBalance(''); setFormAccNotes('');
    setFormDebtName(''); setFormDebtTotal(''); setFormDebtStart(new Date().toISOString().split('T')[0]);
    setFormDebtDue(''); setFormDebtNotes('');
    setFormDebtPayAmount(''); setFormDebtPayNotes(''); setFormDebtPayId('');
    setFormUpName(''); setFormUpAmount(''); setFormUpDate(''); setFormUpCategory('Otro'); setFormUpNotes('');
    setFormUpFrequency('once'); setFormUpEndDate('');
    setFormSavName(''); setFormSavTarget(''); setFormSavNotes('');
    setFormSavMovId(''); setFormSavMovAmount(''); setFormSavMovType('deposit'); setFormSavMovNotes('');
  };
  const openDialog = (type: string, ccType?: string, savingsId?: string) => { resetForm(); if (ccType) setFormCcType(ccType); if (savingsId) { setFormSavMovId(savingsId); setFormSavMovType('deposit'); } setDialog(type); };

  // Balance computation per account
  const getAccountBalance = (accountId: string): number => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return 0;
    return computeAccountBalance(acc, incomes, expenses, withdrawals, ccTx);
  };
  const checkSufficient = (accountId: string, amount: number): boolean => {
    if (!accountId) return true; // no account selected -> skip check
    const balance = getAccountBalance(accountId);
    if (amount > balance) {
      const acc = accounts.find(a => a.id === accountId);
      toast({
        title: 'Saldo insuficiente',
        description: `${acc?.name ?? 'Cuenta'}: saldo ${fmt(balance)}, intentas usar ${fmt(amount)}.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // Handlers
  const handleSaveAccount = async () => {
    if (!formAccName) return;
    try {
      await addBankAccount({ name: formAccName, initial_balance: Number(formAccBalance) || 0, notes: formAccNotes });
      toast({ title: 'Cuenta creada' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al crear cuenta', variant: 'destructive' }); }
  };
  const handleSaveIncome = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    if (accounts.length > 0 && !formAccountId) { toast({ title: 'Selecciona una cuenta', variant: 'destructive' }); return; }
    try {
      await addIncome({ amount: Number(formAmount), category: formCategory || 'Otro', description: formDescription, payment_method: formMethod, account_id: formAccountId || null });
      toast({ title: 'Ingreso registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar ingreso', variant: 'destructive' }); }
  };
  const handleSaveExpense = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    if (accounts.length > 0 && !formAccountId) { toast({ title: 'Selecciona una cuenta', variant: 'destructive' }); return; }
    if (!checkSufficient(formAccountId, Number(formAmount))) return;
    try {
      await addExpense({ amount: Number(formAmount), category: formCategory || 'Otro', expense_type: formExpenseType as 'fixed' | 'occasional', description: formDescription, payment_method: formMethod, account_id: formAccountId || null });
      toast({ title: 'Gasto registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar gasto', variant: 'destructive' }); }
  };
  const handleSaveWithdrawal = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    if (accounts.length > 0 && !formAccountId) { toast({ title: 'Selecciona una cuenta', variant: 'destructive' }); return; }
    if (!checkSufficient(formAccountId, Number(formAmount))) return;
    try {
      await addWithdrawal({ amount: Number(formAmount), source: formSource, description: formDescription, account_id: formAccountId || null });
      toast({ title: 'Retiro registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar retiro', variant: 'destructive' }); }
  };
  const handleSaveCCTx = async () => {
    if (formCcType === 'purchase' && (!formAmount || Number(formAmount) <= 0)) return;
    try {
      const payAmount = formCcType === 'payment' && formCcPayMode === 'total'
        ? ccBalance
        : formCcType === 'payment' && formCcPayMode === 'single' && formCcPayTarget
          ? Number(ccTx.find(t => t.id === formCcPayTarget)?.amount ?? 0)
          : Number(formAmount);
      if (formCcType === 'payment' && formCcPayMode !== 'total' && formCcPayMode !== 'single') return;
      const finalAmount = formCcType === 'payment' && (formCcPayMode === 'total' || formCcPayMode === 'single') ? payAmount : Number(formAmount);
      if (finalAmount <= 0) return;
      // Account is required only for payments (charged to bank account). Purchases don't deduct from a bank account.
      if (formCcType === 'payment') {
        if (accounts.length > 0 && !formAccountId) { toast({ title: 'Selecciona una cuenta', variant: 'destructive' }); return; }
        if (!checkSufficient(formAccountId, finalAmount)) return;
      }
      const desc = formCcType === 'payment' && formCcPayMode === 'single' && formCcPayTarget
        ? `Pago compra: ${ccTx.find(t => t.id === formCcPayTarget)?.description || ccTx.find(t => t.id === formCcPayTarget)?.category || ''}`
        : formCcType === 'payment' && formCcPayMode === 'total'
          ? 'Pago total TC'
          : formDescription;
      await addCCTransaction({ amount: finalAmount, transaction_type: formCcType as 'purchase' | 'payment', category: formCategory || 'Otro', description: desc, account_id: formCcType === 'payment' ? (formAccountId || null) : null });
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
  const handleSaveUpcomingPayment = async () => {
    if (!formUpName || !formUpAmount || !formUpDate || Number(formUpAmount) <= 0) return;
    try {
      await addUpcomingPayment({
        name: formUpName, amount: Number(formUpAmount), due_date: formUpDate,
        category: formUpCategory, is_paid: false, notes: formUpNotes,
        frequency: formUpFrequency as 'once' | 'biweekly' | 'monthly',
        recurrence_end: formUpFrequency !== 'once' && formUpEndDate ? formUpEndDate : null,
      });
      toast({ title: 'Pago programado registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar pago', variant: 'destructive' }); }
  };
  const handleTogglePaid = async (p: UpcomingPayment) => {
    try {
      await updateUpcomingPayment(p.id, { is_paid: !p.is_paid });
      toast({ title: p.is_paid ? 'Marcado como pendiente' : 'Marcado como pagado' });
      loadAll();
    } catch { toast({ title: 'Error al actualizar', variant: 'destructive' }); }
  };
  const handleSaveSavings = async () => {
    if (!formSavName) return;
    try {
      await addSavings({ name: formSavName, target_amount: Number(formSavTarget) || 0, current_amount: 0, notes: formSavNotes });
      toast({ title: 'Ahorro creado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al crear ahorro', variant: 'destructive' }); }
  };
  const handleSaveSavingsMovement = async () => {
    if (!formSavMovId || !formSavMovAmount || Number(formSavMovAmount) <= 0) return;
    try {
      await addSavingsMovement({ savings_id: formSavMovId, amount: Number(formSavMovAmount), movement_type: formSavMovType as 'deposit' | 'withdrawal', notes: formSavMovNotes });
      toast({ title: formSavMovType === 'deposit' ? 'Depósito registrado' : 'Retiro registrado' });
      setDialog(null); loadAll();
    } catch { toast({ title: 'Error al registrar movimiento', variant: 'destructive' }); }
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
      else if (type === 'upcoming') await deleteUpcomingPayment(id);
      else if (type === 'savings') await deleteSavings(id);
      else if (type === 'account') await deleteBankAccount(id);
      toast({ title: 'Eliminado correctamente' });
      setDeleteTarget(null); loadAll();
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }); }
  };

  const openDebtPayments = async (debtId: string) => {
    setDebtPaymentsDialog(debtId);
    const payments = await getDebtPayments(debtId);
    setDebtPaymentsList(payments);
  };
  const openSavingsMovements = async (savingsId: string) => {
    setSavingsMovDialog(savingsId);
    const movs = await getSavingsMovements(savingsId);
    setSavingsMovList(movs);
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
    { label: 'TC', icon: CreditCard, color: 'text-accent', action: () => openDialog('cc', 'purchase') },
    { label: 'Pago TC', icon: Receipt, color: 'text-primary', action: () => openDialog('cc', 'payment') },
    { label: 'Deuda', icon: PiggyBank, color: 'text-orange-400', action: () => openDialog('debt') },
    { label: 'Abono', icon: HandCoins, color: 'text-emerald-400', action: () => openDialog('debtpayment') },
  ];

  const freqLabel = (f: string) => PAYMENT_FREQUENCIES.find(pf => pf.value === f)?.label || f;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Finanzas Personales</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Gestión de ingresos, gastos, tarjeta de crédito y deudas</p>
      </div>

      {/* Quick Actions */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {quickActions.map(qa => (
            <Button key={qa.label} variant="outline" className="flex flex-col gap-1 h-auto py-2.5 px-3 min-w-[70px] shrink-0" onClick={qa.action}>
              <qa.icon className={`h-4 w-4 ${qa.color}`} />
              <span className="text-[10px] sm:text-xs">{qa.label}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Tabs value={tab} onValueChange={setTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-9 sm:w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Resumen</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm">Cuentas</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">Pagos</TabsTrigger>
            <TabsTrigger value="savings" className="text-xs sm:text-sm">Ahorros</TabsTrigger>
            <TabsTrigger value="incomes" className="text-xs sm:text-sm">Ingresos</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Gastos</TabsTrigger>
            <TabsTrigger value="cc" className="text-xs sm:text-sm">Tarjeta</TabsTrigger>
            <TabsTrigger value="debts" className="text-xs sm:text-sm">Deudas</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Historial</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2"><TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" /> Ingresos</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-lg sm:text-2xl font-bold font-mono-data text-green-400">{fmt(totalIncome)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2"><TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" /> Gastos</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-lg sm:text-2xl font-bold font-mono-data text-red-400">{fmt(totalExpense)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2"><Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" /> Ahorros</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-lg sm:text-2xl font-bold font-mono-data text-emerald-400">{fmt(totalSavings)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2"><CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-accent" /> Saldo TC</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-lg sm:text-2xl font-bold font-mono-data text-accent">{fmt(ccBalance)}</p></CardContent>
            </Card>
            <Card className="card-metallic col-span-2 lg:col-span-1">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2"><HandCoins className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" /> Deudas</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-lg sm:text-2xl font-bold font-mono-data text-orange-400">{fmt(totalDebts)}</p></CardContent>
            </Card>
          </div>

          <Card className="card-metallic">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Balance Neto</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-2xl sm:text-3xl font-bold font-mono-data ${totalIncome - totalExpense - totalWithdrawals >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {fmt(totalIncome - totalExpense - totalWithdrawals)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ingresos − Gastos − Retiros (incluye abonos, pagos TC, pagos pendientes y depósitos ahorro)</p>
            </CardContent>
          </Card>

          {/* Quincena Summary */}
          <Card className="card-metallic border-warning/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CalIcon className="h-4 w-4 text-warning" /> Pagos hasta el {nextQuincena.getDate()} de {nextQuincena.toLocaleDateString('es-CO', { month: 'long' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quincenaPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pagos pendientes en esta quincena 🎉</p>
              ) : (
                <>
                  {quincenaPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={daysUntil(p.due_date) <= 3 ? 'destructive' : daysUntil(p.due_date) <= 7 ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                          {daysUntil(p.due_date) <= 0 ? 'Hoy' : daysUntil(p.due_date) === 1 ? 'Mañana' : `${daysUntil(p.due_date)}d`}
                        </Badge>
                        <span className="text-sm truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtShortDate(p.due_date)}</span>
                      </div>
                      <span className="font-mono-data text-sm text-warning shrink-0 ml-2">{fmt(p.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total quincena</span>
                    <span className="font-mono-data text-lg font-bold text-warning">{fmt(quincenaTotal)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming payments preview */}
          {pendingPayments.length > 0 && pendingPayments.length !== quincenaPayments.length && (
            <Card className="card-metallic">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Todos los pagos pendientes ({pendingPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingPayments.slice(0, 5).map(p => {
                  const days = daysUntil(p.due_date);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={days <= 3 ? 'destructive' : days <= 7 ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                          {days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days}d`}
                        </Badge>
                        <span className="text-sm truncate">{p.name}</span>
                      </div>
                      <span className="font-mono-data text-sm text-warning shrink-0 ml-2">{fmt(p.amount)}</span>
                    </div>
                  );
                })}
                {pendingPayments.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setTab('upcoming')}>
                    Ver todos ({pendingPayments.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Monthly Summary */}
          {monthlySummary.length > 0 && (
            <Card className="card-metallic">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalIcon className="h-4 w-4 text-primary" /> Resumen Mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MobileTable>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mes</TableHead>
                        <TableHead className="text-xs text-right">Ingresos</TableHead>
                        <TableHead className="text-xs text-right">Gastos</TableHead>
                        <TableHead className="text-xs text-right">Programados</TableHead>
                        <TableHead className="text-xs text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySummary.map(m => (
                        <TableRow key={m.key}>
                          <TableCell className="text-xs capitalize">{m.label}</TableCell>
                          <TableCell className="text-xs text-right font-mono-data text-green-400">{fmt(m.income)}</TableCell>
                          <TableCell className="text-xs text-right font-mono-data text-red-400">{fmt(m.expense)}</TableCell>
                          <TableCell className="text-xs text-right font-mono-data text-warning">{fmt(m.scheduled)}</TableCell>
                          <TableCell className={`text-xs text-right font-mono-data ${m.income - m.expense - m.scheduled >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {fmt(m.income - m.expense - m.scheduled)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </MobileTable>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ACCOUNTS */}
        <TabsContent value="accounts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Cuentas Bancarias</h2>
            <Button size="sm" onClick={() => openDialog('account')}><Plus className="h-4 w-4 mr-1" /> Nueva cuenta</Button>
          </div>
          {accounts.length === 0 && (
            <Card className="card-metallic"><CardContent className="py-8 text-center text-muted-foreground">Sin cuentas registradas. Crea tu primera cuenta para comenzar a registrar movimientos.</CardContent></Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map(a => {
              const balance = computeAccountBalance(a, incomes, expenses, withdrawals, ccTx);
              return (
                <Card key={a.id} className="card-metallic">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" />{a.name}</p>
                        {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'account', id: a.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">Saldo disponible</p>
                      <p className={`text-2xl font-bold font-mono-data ${balance < 0 ? 'text-destructive' : 'text-primary'}`}>{fmt(balance)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Inicial: {fmt(Number(a.initial_balance))}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* UPCOMING PAYMENTS */}
        <TabsContent value="upcoming" className="space-y-4 mt-4">

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Próximos Pagos</h2>
            <Button size="sm" onClick={() => openDialog('upcoming')}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
          </div>
          {upcomingPayments.length === 0 && (
            <Card className="card-metallic"><CardContent className="py-8 text-center text-muted-foreground">Sin pagos programados</CardContent></Card>
          )}
          <div className="grid gap-3">
            {upcomingPayments.map(p => {
              const days = daysUntil(p.due_date);
              return (
                <Card key={p.id} className={`card-metallic ${p.is_paid ? 'opacity-60' : ''}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-foreground ${p.is_paid ? 'line-through' : ''}`}>{p.name}</p>
                          <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                          {p.frequency !== 'once' && (
                            <Badge className="text-[10px] bg-purple-600/20 text-purple-400 border-purple-500/30">{freqLabel(p.frequency)}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <CalIcon className="h-3 w-3" />
                          <span>{fmtShortDate(p.due_date)}</span>
                          {p.recurrence_end && <span className="text-[10px]">→ {fmtShortDate(p.recurrence_end)}</span>}
                          {!p.is_paid && (
                            <Badge variant={days <= 0 ? 'destructive' : days <= 3 ? 'destructive' : days <= 7 ? 'secondary' : 'outline'} className="text-[10px]">
                              {days < 0 ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
                            </Badge>
                          )}
                          {p.is_paid && <Badge className="text-[10px] bg-green-600">Pagado</Badge>}
                        </div>
                        {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <p className="font-mono-data text-sm font-semibold text-warning">{fmt(p.amount)}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTogglePaid(p)}>
                          <CheckCircle2 className={`h-4 w-4 ${p.is_paid ? 'text-green-400' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: 'upcoming', id: p.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* SAVINGS */}
        <TabsContent value="savings" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Ahorros</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openDialog('savingsmovement')}><ArrowDown className="h-4 w-4 mr-1" /> Agregar / Retirar</Button>
              <Button size="sm" onClick={() => openDialog('savings')}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
            </div>
          </div>

          {/* Total savings card */}
          <Card className="card-metallic">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-400" /> Total Ahorrado</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold font-mono-data text-emerald-400">{fmt(totalSavings)}</p>
            </CardContent>
          </Card>

          {savings.length === 0 && (
            <Card className="card-metallic"><CardContent className="py-8 text-center text-muted-foreground">Sin ahorros registrados</CardContent></Card>
          )}
          <div className="grid gap-4">
            {savings.map(s => {
              const pct = s.target_amount > 0 ? Math.min(100, Math.round((Number(s.current_amount) / Number(s.target_amount)) * 100)) : 0;
              return (
                <Card key={s.id} className="card-metallic">
                  <CardContent className="p-3 sm:p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{s.name}</p>
                        {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => openDialog('savingsmovement', undefined, s.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Agregar
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'savings', id: s.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
                      <span className="text-muted-foreground">Actual: <span className="font-mono-data text-emerald-400">{fmt(Number(s.current_amount))}</span></span>
                      {Number(s.target_amount) > 0 && (
                        <span className="text-muted-foreground">Meta: <span className="font-mono-data text-foreground">{fmt(Number(s.target_amount))}</span></span>
                      )}
                    </div>
                    {Number(s.target_amount) > 0 && (
                      <>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{pct}% alcanzado</span>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openSavingsMovements(s.id)}>
                            <History className="h-3 w-3 mr-1" /> Ver movimientos
                          </Button>
                        </div>
                      </>
                    )}
                    {Number(s.target_amount) === 0 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => openSavingsMovements(s.id)}>
                        <History className="h-3 w-3 mr-1" /> Ver movimientos
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* INCOMES */}
        <TabsContent value="incomes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Ingresos</h2>
            <Button size="sm" onClick={() => openDialog('income')}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
          </div>
          <Card className="card-metallic">
            <CardContent className="p-0">
              <MobileTable>
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
              </MobileTable>
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
              <MobileTable>
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
              </MobileTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREDIT CARD */}
        <TabsContent value="cc" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Consumos</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-base sm:text-xl font-bold font-mono-data text-red-400">{fmt(ccPurchases)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Pagos</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0"><p className="text-base sm:text-xl font-bold font-mono-data text-green-400">{fmt(ccPayments)}</p></CardContent>
            </Card>
            <Card className="card-metallic">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Pendiente</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <p className={`text-base sm:text-xl font-bold font-mono-data ${ccBalance > 0 ? 'text-warning' : 'text-primary'}`}>{fmt(ccBalance)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1"><CalIcon className="h-3 w-3" /> {nextPayDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-between items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Movimientos TC</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs sm:text-sm" onClick={() => openDialog('cc', 'payment')}>Pago</Button>
              <Button size="sm" className="text-xs sm:text-sm" onClick={() => openDialog('cc', 'purchase')}><Plus className="h-4 w-4 mr-1" /> Compra</Button>
            </div>
          </div>
          <Card className="card-metallic">
            <CardContent className="p-0">
              <MobileTable>
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
              </MobileTable>
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
                  <CardContent className="p-3 sm:p-4 space-y-3">
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
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
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
            <h2 className="text-lg font-semibold text-foreground">Historial</h2>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 sm:w-40"><SelectValue /></SelectTrigger>
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
              <MobileTable>
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
              </MobileTable>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}
      {/* Reusable account selector rendered inline below in each dialog */}

      {/* Income Dialog */}
      <Dialog open={dialog === 'income'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Ingreso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formAmount)} onChange={e => setFormAmount(parseInput(e.target.value))} /></div>
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
            <div><Label>Cuenta *</Label>
              {accounts.length === 0 ? (
                <p className="text-xs text-warning">Primero crea una cuenta en la pestaña Cuentas.</p>
              ) : (
                <Select value={formAccountId} onValueChange={setFormAccountId}><SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {fmt(computeAccountBalance(a, incomes, expenses, withdrawals, ccTx))}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveIncome} disabled={accounts.length === 0}>Guardar Ingreso</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={dialog === 'expense'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Gasto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formAmount)} onChange={e => setFormAmount(parseInput(e.target.value))} /></div>
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
            <div><Label>Cuenta *</Label>
              {accounts.length === 0 ? (
                <p className="text-xs text-warning">Primero crea una cuenta en la pestaña Cuentas.</p>
              ) : (
                <Select value={formAccountId} onValueChange={setFormAccountId}><SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {fmt(computeAccountBalance(a, incomes, expenses, withdrawals, ccTx))}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveExpense} disabled={accounts.length === 0}>Guardar Gasto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={dialog === 'withdrawal'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Retiro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Monto *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formAmount)} onChange={e => setFormAmount(parseInput(e.target.value))} /></div>
            <div><Label>Cuenta *</Label>
              {accounts.length === 0 ? (
                <p className="text-xs text-warning">Primero crea una cuenta en la pestaña Cuentas.</p>
              ) : (
                <Select value={formAccountId} onValueChange={setFormAccountId}><SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {fmt(computeAccountBalance(a, incomes, expenses, withdrawals, ccTx))}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div><Label>Fuente (cajero / canal)</Label>
              <Select value={formSource} onValueChange={setFormSource}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ATM_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveWithdrawal} disabled={accounts.length === 0}>Guardar Retiro</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Card Dialog */}
      <Dialog open={dialog === 'cc'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{formCcType === 'purchase' ? 'Registrar Compra con TC' : 'Registrar Pago de TC'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {formCcType === 'purchase' && (
              <>
                <div><Label>Monto *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formAmount)} onChange={e => setFormAmount(parseInput(e.target.value))} /></div>
                <div><Label>Categoría</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descripción</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Opcional" /></div>
              </>
            )}
            {formCcType === 'payment' && (
              <>
                <div><Label>Modo de pago</Label>
                  <Select value={formCcPayMode} onValueChange={v => { setFormCcPayMode(v as 'total' | 'single'); setFormCcPayTarget(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Pagar total ({fmt(ccBalance)})</SelectItem>
                      <SelectItem value="single">Pagar 1 compra específica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formCcPayMode === 'single' && (
                  <div><Label>Seleccionar compra</Label>
                    <Select value={formCcPayTarget} onValueChange={setFormCcPayTarget}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar compra" /></SelectTrigger>
                      <SelectContent>
                        {ccTx.filter(t => t.transaction_type === 'purchase').map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.description || t.category} — {fmt(Number(t.amount))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formCcPayMode === 'single' && formCcPayTarget && (
                  <p className="text-sm text-muted-foreground">Monto: <span className="font-bold text-foreground">{fmt(Number(ccTx.find(t => t.id === formCcPayTarget)?.amount ?? 0))}</span></p>
                )}
                {formCcPayMode === 'total' && (
                  <p className="text-sm text-muted-foreground">Se pagará el saldo total: <span className="font-bold text-foreground">{fmt(ccBalance)}</span></p>
                )}
                <div><Label>Pagar desde cuenta *</Label>
                  {accounts.length === 0 ? (
                    <p className="text-xs text-warning">Primero crea una cuenta en la pestaña Cuentas.</p>
                  ) : (
                    <Select value={formAccountId} onValueChange={setFormAccountId}><SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {fmt(computeAccountBalance(a, incomes, expenses, withdrawals, ccTx))}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
            <Button className="w-full" onClick={handleSaveCCTx} disabled={
              (formCcType === 'payment' && formCcPayMode === 'single' && !formCcPayTarget) ||
              (formCcType === 'payment' && accounts.length === 0)
            }>
              {formCcType === 'purchase' ? 'Guardar Compra' : 'Guardar Pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Account Dialog */}
      <Dialog open={dialog === 'account'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva Cuenta Bancaria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={formAccName} onChange={e => setFormAccName(e.target.value)} placeholder="Ej: Bancolombia, Nequi" /></div>
            <div><Label>Saldo inicial</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formAccBalance)} onChange={e => setFormAccBalance(parseInput(e.target.value))} /></div>
            <div><Label>Notas</Label><Input value={formAccNotes} onChange={e => setFormAccNotes(e.target.value)} placeholder="Opcional" /></div>
            <p className="text-xs text-muted-foreground">El saldo se calcula como: inicial + ingresos − gastos − retiros − pagos de TC.</p>
            <Button className="w-full" onClick={handleSaveAccount}>Crear Cuenta</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Dialog */}
      <Dialog open={dialog === 'debt'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Deuda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre / Concepto *</Label><Input value={formDebtName} onChange={e => setFormDebtName(e.target.value)} placeholder="Ej: Préstamo personal" /></div>
            <div><Label>Monto total *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formDebtTotal)} onChange={e => setFormDebtTotal(parseInput(e.target.value))} /></div>
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Abono a Deuda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Deuda *</Label>
              <Select value={formDebtPayId} onValueChange={setFormDebtPayId}><SelectTrigger><SelectValue placeholder="Seleccionar deuda" /></SelectTrigger>
                <SelectContent>{debts.filter(d => d.status !== 'paid').map(d => <SelectItem key={d.id} value={d.id}>{d.name} — {fmt(d.remaining_amount)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Monto del abono *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formDebtPayAmount)} onChange={e => setFormDebtPayAmount(parseInput(e.target.value))} /></div>
            <div><Label>Notas</Label><Input value={formDebtPayNotes} onChange={e => setFormDebtPayNotes(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveDebtPayment}>Guardar Abono</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upcoming Payment Dialog */}
      <Dialog open={dialog === 'upcoming'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Programar Pago</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={formUpName} onChange={e => setFormUpName(e.target.value)} placeholder="Ej: Internet, Arriendo" /></div>
            <div><Label>Monto *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formUpAmount)} onChange={e => setFormUpAmount(parseInput(e.target.value))} /></div>
            <div><Label>Fecha de pago *</Label><Input type="date" value={formUpDate} onChange={e => setFormUpDate(e.target.value)} /></div>
            <div><Label>Categoría</Label>
              <Select value={formUpCategory} onValueChange={setFormUpCategory}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UPCOMING_PAYMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frecuencia</Label>
              <Select value={formUpFrequency} onValueChange={setFormUpFrequency}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formUpFrequency !== 'once' && (
              <div><Label>Repetir hasta (opcional)</Label><Input type="date" value={formUpEndDate} onChange={e => setFormUpEndDate(e.target.value)} /></div>
            )}
            <div><Label>Notas</Label><Input value={formUpNotes} onChange={e => setFormUpNotes(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveUpcomingPayment}>Guardar Pago</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Savings Dialog */}
      <Dialog open={dialog === 'savings'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Ahorro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={formSavName} onChange={e => setFormSavName(e.target.value)} placeholder="Ej: Viaje, Emergencia" /></div>
            <div><Label>Meta (opcional)</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formSavTarget)} onChange={e => setFormSavTarget(parseInput(e.target.value))} /></div>
            <div><Label>Notas</Label><Input value={formSavNotes} onChange={e => setFormSavNotes(e.target.value)} placeholder="Opcional" /></div>
            <Button className="w-full" onClick={handleSaveSavings}>Crear Ahorro</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Savings Movement Dialog */}
      <Dialog open={dialog === 'savingsmovement'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mover Fondos de Ahorro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Ahorro *</Label>
              <Select value={formSavMovId} onValueChange={setFormSavMovId}><SelectTrigger><SelectValue placeholder="Seleccionar ahorro" /></SelectTrigger>
                <SelectContent>{savings.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {fmt(Number(s.current_amount))}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={formSavMovType} onValueChange={setFormSavMovType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Depósito</SelectItem>
                  <SelectItem value="withdrawal">Retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Monto *</Label><Input type="text" inputMode="numeric" placeholder="0" value={fmtInput(formSavMovAmount)} onChange={e => setFormSavMovAmount(parseInput(e.target.value))} /></div>
            <div><Label>Notas</Label><Input value={formSavMovNotes} onChange={e => setFormSavMovNotes(e.target.value)} placeholder="Opcional" /></div>
            {formSavMovType === 'deposit' && (
              <p className="text-xs text-muted-foreground">💡 Los depósitos se descuentan de tus ingresos como gasto.</p>
            )}
            <Button className="w-full" onClick={handleSaveSavingsMovement}>
              {formSavMovType === 'deposit' ? 'Depositar' : 'Retirar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Payments List Dialog */}
      <Dialog open={!!debtPaymentsDialog} onOpenChange={o => !o && setDebtPaymentsDialog(null)}>
        <DialogContent className="max-w-sm">
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

      {/* Savings Movements List Dialog */}
      <Dialog open={!!savingsMovDialog} onOpenChange={o => !o && setSavingsMovDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Movimientos de Ahorro</DialogTitle></DialogHeader>
          {savingsMovList.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savingsMovList.map(m => (
                <div key={m.id} className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    {m.movement_type === 'deposit' ? <ArrowDown className="h-3 w-3 text-emerald-400" /> : <ArrowUp className="h-3 w-3 text-red-400" />}
                    <div>
                      <p className={`text-sm font-mono-data ${m.movement_type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.movement_type === 'deposit' ? '+' : '-'}{fmt(m.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
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
