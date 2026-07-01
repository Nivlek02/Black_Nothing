import { supabase, withUserId, getCurrentUserId } from '@/integrations/supabase/client';

// Types
export interface BankAccount {
  id: string;
  name: string;
  initial_balance: number;
  notes: string;
  created_at: string;
}

export interface Income {
  id: string;
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  account_id: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  expense_type: 'fixed' | 'occasional';
  description: string;
  payment_method: string;
  account_id: string | null;
  created_at: string;
}

export interface ATMWithdrawal {
  id: string;
  amount: number;
  source?: string;
  description: string;
  account_id: string | null;
  created_at: string;
}

export interface CreditCardTransaction {
  id: string;
  amount: number;
  transaction_type: 'purchase' | 'payment';
  category: string;
  description: string;
  account_id: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  start_date: string;
  due_date: string;
  status: 'active' | 'paid' | 'overdue';
  notes: string;
  created_at: string;
}

export interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  is_paid: boolean;
  account_id: string | null;
  notes: string;
  frequency: 'once' | 'biweekly' | 'monthly';
  recurrence_end: string | null;
  created_at: string;
}

export interface Savings {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  notes: string;
  created_at: string;
}

export interface SavingsMovement {
  id: string;
  savings_id: string;
  amount: number;
  movement_type: 'deposit' | 'withdrawal';
  notes: string;
  created_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  notes: string;
  created_at: string;
}

export interface BankTransfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  created_at: string;
}

export type FinanceMovement = {
  id: string;
  type: 'income' | 'expense' | 'withdrawal' | 'cc_purchase' | 'cc_payment' | 'debt_payment' | 'transfer';
  category: string;
  amount: number;
  method: string;
  description: string;
  created_at: string;
};

// Constants
export const INCOME_CATEGORIES = ['Salario', 'Freelance', 'Ventas', 'Transferencia', 'Otro'];
export const EXPENSE_CATEGORIES = ['Alimentación', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Ropa', 'Hogar', 'Otro'];
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'TC Débito','TC Crédito', 'Otro'];
export const ATM_SOURCES = ['Cuenta principal', 'Cuenta ahorros', 'Nequi', 'Daviplata', 'Otro'];
export const PAYMENT_FREQUENCIES = [
  { value: 'once', label: 'Una vez' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
] as const;

/** Helper to attach current user_id to any object for RLS */
function withCurrentUserId<T extends Record<string, unknown>>(item: T): T & { user_id?: string } {
  return withUserId(item, getCurrentUserId());
}

const NOTES_TYPE_PREFIX = '##TYPE:';

export function getAccountTypeFromNotes(notes: string | null): 'bank' | 'cash' {
  if (!notes) return 'bank';
  if (notes.startsWith(`${NOTES_TYPE_PREFIX}bank##`)) return 'bank';
  if (notes.startsWith(`${NOTES_TYPE_PREFIX}cash##`)) return 'cash';
  return 'bank';
}

export function encodeNotesWithType(notes: string, type: 'bank' | 'cash'): string {
  return `${NOTES_TYPE_PREFIX}${type}##${notes}`;
}

export function stripNotesType(notes: string | null): string {
  if (!notes) return '';
  return notes.replace(/^##TYPE:(bank|cash)##/, '');
}

// ===== Bank Accounts =====
export async function getBankAccounts() {
  const { data } = await supabase.from('bank_accounts').select('*').order('created_at', { ascending: true });
  return (data ?? []) as BankAccount[];
}
export async function addBankAccount(a: Omit<BankAccount, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('bank_accounts').insert(withCurrentUserId({ ...a })).select().single();
  if (error) throw error;
  return data as BankAccount;
}
export async function updateBankAccount(id: string, updates: Partial<BankAccount>) {
  const { error } = await supabase.from('bank_accounts').update(updates).eq('id', id);
  if (error) throw error;
}
export async function deleteBankAccount(id: string) {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Computes the current balance for an account:
 * initial_balance + incomes - expenses - withdrawals - cc_payments - transfers_out + transfers_in
 */
export function computeAccountBalance(
  account: BankAccount,
  incomes: Income[],
  expenses: Expense[],
  withdrawals: ATMWithdrawal[],
  ccTx: CreditCardTransaction[],
  transfers?: BankTransfer[],
): number {
  const inc = incomes.filter(i => i.account_id === account.id).reduce((s, r) => s + Number(r.amount), 0);
  const exp = expenses.filter(e => e.account_id === account.id).reduce((s, r) => s + Number(r.amount), 0);
  const wd = withdrawals.filter(w => w.account_id === account.id).reduce((s, r) => s + Number(r.amount), 0);
  const cc = ccTx.filter(t => t.transaction_type === 'payment' && t.account_id === account.id).reduce((s, r) => s + Number(r.amount), 0);
  
  let transferNet = 0;
  if (transfers) {
    const transferOut = transfers.filter(t => t.from_account_id === account.id).reduce((s, t) => s + Number(t.amount), 0);
    const transferIn = transfers.filter(t => t.to_account_id === account.id).reduce((s, t) => s + Number(t.amount), 0);
    transferNet = transferIn - transferOut;
  }
  
  return Number(account.initial_balance) + inc - exp - wd - cc + transferNet;
}

// ===== Bank Transfers =====
export async function getBankTransfers() {
  const { data } = await supabase.from('bank_transfers').select('*').order('created_at', { ascending: false });
  return (data ?? []) as BankTransfer[];
}

export async function addBankTransfer(t: Omit<BankTransfer, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('bank_transfers').insert(withCurrentUserId({ ...t })).select().single();
  if (error) throw error;
  return data as BankTransfer;
}

export async function deleteBankTransfer(id: string) {
  const { error } = await supabase.from('bank_transfers').delete().eq('id', id);
  if (error) throw error;
}

// CRUD Functions
export async function getIncomes() {
  const { data } = await supabase.from('incomes').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Income[];
}
export async function addIncome(income: Omit<Income, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('incomes').insert(withCurrentUserId({ ...income })).select().single();
  if (error) throw error;
  return data as Income;
}
export async function deleteIncome(id: string) {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
}

export async function getExpenses() {
  const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Expense[];
}
export async function addExpense(expense: Omit<Expense, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('expenses').insert(withCurrentUserId({ ...expense })).select().single();
  if (error) throw error;
  return data as Expense;
}
export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function getWithdrawals() {
  const { data } = await supabase.from('atm_withdrawals').select('*').order('created_at', { ascending: false });
  return (data ?? []) as ATMWithdrawal[];
}
export async function addWithdrawal(w: Omit<ATMWithdrawal, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('atm_withdrawals').insert(withCurrentUserId({ ...w })).select().single();
  if (error) throw error;
  return data as ATMWithdrawal;
}
export async function deleteWithdrawal(id: string) {
  const { error } = await supabase.from('atm_withdrawals').delete().eq('id', id);
  if (error) throw error;
}

export async function getCCTransactions() {
  const { data } = await supabase.from('credit_card_transactions').select('*').order('created_at', { ascending: false });
  return (data ?? []) as CreditCardTransaction[];
}
export async function addCCTransaction(t: Omit<CreditCardTransaction, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('credit_card_transactions').insert(withCurrentUserId({ ...t })).select().single();
  if (error) throw error;
  return data as CreditCardTransaction;
}
export async function deleteCCTransaction(id: string) {
  const { error } = await supabase.from('credit_card_transactions').delete().eq('id', id);
  if (error) throw error;
}
export async function updateCCTransaction(id: string, updates: Partial<CreditCardTransaction>) {
  const { error } = await supabase.from('credit_card_transactions').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getDebts() {
  const { data } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Debt[];
}
export async function addDebt(d: Omit<Debt, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('debts').insert(withCurrentUserId({ ...d })).select().single();
  if (error) throw error;
  return data as Debt;
}
export async function updateDebt(id: string, updates: Partial<Debt>) {
  const { error } = await supabase.from('debts').update(updates).eq('id', id);
  if (error) throw error;
}
export async function deleteDebt(id: string) {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;
}

export async function getDebtPayments(debtId: string) {
  const { data } = await supabase.from('debt_payments').select('*').eq('debt_id', debtId).order('created_at', { ascending: false });
  return (data ?? []) as DebtPayment[];
}
export async function getAllDebtPaymentsTotal(): Promise<number> {
  const { data } = await supabase.from('debt_payments').select('amount');
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}
export async function addDebtPayment(p: Omit<DebtPayment, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('debt_payments').insert(withCurrentUserId({ ...p })).select().single();
  if (error) throw error;
  const { data: debt, error: fetchErr } = await supabase
    .from('debts')
    .select('remaining_amount, due_date')
    .eq('id', p.debt_id)
    .single();
  if (fetchErr) throw fetchErr;
  if (debt) {
    const newRemaining = Math.max(0, Number(debt.remaining_amount) - p.amount);
    let status: 'paid' | 'active' | 'overdue' = 'active';
    if (newRemaining <= 0) {
      status = 'paid';
    } else if (debt.due_date && new Date(debt.due_date) < new Date()) {
      status = 'overdue';
    }
    const { error: updateErr } = await supabase.from('debts').update({
      remaining_amount: newRemaining,
      status,
    }).eq('id', p.debt_id);
    if (updateErr) throw updateErr;
  }
  return data as DebtPayment;
}

// Aggregate helpers
export async function getTotalPaidUpcomingPayments(): Promise<number> {
  const { data } = await supabase.from('upcoming_payments').select('amount').eq('is_paid', true);
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}
export async function getTotalSavingsDeposits(): Promise<number> {
  const { data } = await supabase.from('savings_movements').select('amount').eq('movement_type', 'deposit');
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}
export async function getTotalIncomes(): Promise<number> {
  const { data } = await supabase.from('incomes').select('amount');
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}
export async function getTotalExpenses(): Promise<number> {
  const [expenses, ccPayments, debtPayments] = await Promise.all([
    supabase.from('expenses').select('amount'),
    supabase.from('credit_card_transactions').select('amount').eq('transaction_type', 'payment'),
    supabase.from('debt_payments').select('amount'),
  ]);
  const sumExp = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const sumCC = (ccPayments.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const sumDebt = (debtPayments.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  return sumExp + sumCC + sumDebt;
}

// Build unified history
export async function getMovementHistory(): Promise<FinanceMovement[]> {
  const [incomes, expenses, withdrawals, ccTx, transfers] = await Promise.all([
    getIncomes(), getExpenses(), getWithdrawals(), getCCTransactions(), getBankTransfers(),
  ]);
  const movements: FinanceMovement[] = [
    ...incomes.map(i => ({ id: i.id, type: 'income' as const, category: i.category, amount: i.amount, method: i.payment_method, description: i.description, created_at: i.created_at })),
    ...expenses.map(e => ({ id: e.id, type: 'expense' as const, category: e.category, amount: e.amount, method: e.payment_method, description: e.description, created_at: e.created_at })),
    ...withdrawals.map(w => ({ id: w.id, type: 'withdrawal' as const, category: 'Retiro', amount: w.amount, method: w.source, description: w.description, created_at: w.created_at })),
    ...ccTx.map(t => ({ id: t.id, type: t.transaction_type === 'purchase' ? 'cc_purchase' as const : 'cc_payment' as const, category: t.category, amount: t.amount, method: 'Tarjeta de crédito', description: t.description, created_at: t.created_at })),
    ...transfers.map(t => ({ id: t.id, type: 'transfer' as const, category: 'Transferencia', amount: t.amount, method: 'Transferencia bancaria', description: t.description, created_at: t.created_at })),
  ];
  movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return movements;
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  withdrawal: 'Retiro',
  cc_purchase: 'Compra TC',
  cc_payment: 'Pago TC',
  debt_payment: 'Abono deuda',
  transfer: 'Transferencia',
};

// Upcoming Payments CRUD
export async function getUpcomingPayments() {
  const { data } = await supabase.from('upcoming_payments').select('*').order('due_date', { ascending: true });
  return (data ?? []) as UpcomingPayment[];
}
export async function addUpcomingPayment(p: Omit<UpcomingPayment, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('upcoming_payments').insert(withCurrentUserId({ ...p })).select().single();
  if (error) throw error;
  return data as UpcomingPayment;
}
export async function updateUpcomingPayment(id: string, updates: Partial<UpcomingPayment>) {
  const { error } = await supabase.from('upcoming_payments').update(updates).eq('id', id);
  if (error) throw error;
}
export async function deleteUpcomingPayment(id: string) {
  const { error } = await supabase.from('upcoming_payments').delete().eq('id', id);
  if (error) throw error;
}

export const UPCOMING_PAYMENT_CATEGORIES = ['Servicios', 'Ahorros', 'Crédito', 'Alimentación', 'Educación', 'Transporte','Otro'];

// Generate recurring payment instances
export function generateRecurringInstances(payments: UpcomingPayment[]): UpcomingPayment[] {
  const result: UpcomingPayment[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of payments) {
    if (p.frequency === 'once') {
      result.push(p);
      continue;
    }

    const endDate = p.recurrence_end ? new Date(p.recurrence_end + 'T12:00:00') : new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    let current = new Date(p.due_date + 'T12:00:00');

    let idx = 0;
    while (current <= endDate) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      result.push({
        ...p,
        id: idx === 0 ? p.id : `${p.id}_r${idx}`,
        due_date: dateStr,
        is_paid: idx === 0 ? p.is_paid : false,
      });
      idx++;
      if (p.frequency === 'monthly') {
        current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      } else {
        current = new Date(current.getTime() + 15 * 24 * 60 * 60 * 1000);
      }
    }
  }

  result.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return result;
}

// Get next quincena date (15 or 30/end-of-month)
export function getNextQuincena(): Date {
  const today = new Date();
  const day = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (day <= 15) {
    return new Date(year, month, 15);
  } else {
    return new Date(year, month + 1, 0);
  }
}

// Savings CRUD
export async function getSavings() {
  const { data } = await supabase.from('savings').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Savings[];
}
export async function addSavings(s: Omit<Savings, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('savings').insert(withCurrentUserId({ ...s })).select().single();
  if (error) throw error;
  return data as Savings;
}
export async function updateSavings(id: string, updates: Partial<Savings>) {
  const { error } = await supabase.from('savings').update(updates).eq('id', id);
  if (error) throw error;
}
export async function deleteSavings(id: string) {
  const { error } = await supabase.from('savings').delete().eq('id', id);
  if (error) throw error;
}

export async function getSavingsMovements(savingsId: string) {
  const { data } = await supabase.from('savings_movements').select('*').eq('savings_id', savingsId).order('created_at', { ascending: false });
  return (data ?? []) as SavingsMovement[];
}
export async function addSavingsMovement(m: Omit<SavingsMovement, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('savings_movements').insert(withCurrentUserId({ ...m })).select().single();
  if (error) throw error;
  const { data: saving, error: fetchErr } = await supabase.from('savings').select('current_amount').eq('id', m.savings_id).single();
  if (fetchErr) throw fetchErr;
  if (saving) {
    const delta = m.movement_type === 'deposit' ? m.amount : -m.amount;
    const newAmount = Math.max(0, Number(saving.current_amount) + delta);
    await supabase.from('savings').update({ current_amount: newAmount }).eq('id', m.savings_id);
  }
  return data as SavingsMovement;
}
