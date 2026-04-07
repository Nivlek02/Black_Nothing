import { supabase } from '@/integrations/supabase/client';

// Types
export interface Income {
  id: string;
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  created_at: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  expense_type: 'fixed' | 'occasional';
  description: string;
  payment_method: string;
  created_at: string;
}

export interface ATMWithdrawal {
  id: string;
  amount: number;
  source: string;
  description: string;
  created_at: string;
}

export interface CreditCardTransaction {
  id: string;
  amount: number;
  transaction_type: 'purchase' | 'payment';
  category: string;
  description: string;
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

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  notes: string;
  created_at: string;
}

export type FinanceMovement = {
  id: string;
  type: 'income' | 'expense' | 'withdrawal' | 'cc_purchase' | 'cc_payment' | 'debt_payment';
  category: string;
  amount: number;
  method: string;
  description: string;
  created_at: string;
};

// Constants
export const INCOME_CATEGORIES = ['Salario', 'Freelance', 'Ventas', 'Transferencia', 'Otro'];
export const EXPENSE_CATEGORIES = ['Alimentación', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Ropa', 'Hogar', 'Otro'];
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Débito', 'Otro'];
export const ATM_SOURCES = ['Cuenta principal', 'Cuenta ahorros', 'Nequi', 'Daviplata', 'Otro'];

// CRUD Functions
export async function getIncomes() {
  const { data } = await supabase.from('incomes').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Income[];
}
export async function addIncome(income: Omit<Income, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('incomes').insert(income).select().single();
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
  const { data, error } = await supabase.from('expenses').insert(expense).select().single();
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
  const { data, error } = await supabase.from('atm_withdrawals').insert(w).select().single();
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
  const { data, error } = await supabase.from('credit_card_transactions').insert(t).select().single();
  if (error) throw error;
  return data as CreditCardTransaction;
}
export async function deleteCCTransaction(id: string) {
  const { error } = await supabase.from('credit_card_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function getDebts() {
  const { data } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
  return (data ?? []) as Debt[];
}
export async function addDebt(d: Omit<Debt, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('debts').insert(d).select().single();
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
export async function addDebtPayment(p: Omit<DebtPayment, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('debt_payments').insert(p).select().single();
  if (error) throw error;
  // Update remaining amount on debt — fetch fresh data and update atomically
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
export async function getTotalIncomes(): Promise<number> {
  const { data } = await supabase.from('incomes').select('amount');
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}
export async function getTotalExpenses(): Promise<number> {
  const { data } = await supabase.from('expenses').select('amount');
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}

// Build unified history
export async function getMovementHistory(): Promise<FinanceMovement[]> {
  const [incomes, expenses, withdrawals, ccTx] = await Promise.all([
    getIncomes(), getExpenses(), getWithdrawals(), getCCTransactions(),
  ]);
  const movements: FinanceMovement[] = [
    ...incomes.map(i => ({ id: i.id, type: 'income' as const, category: i.category, amount: i.amount, method: i.payment_method, description: i.description, created_at: i.created_at })),
    ...expenses.map(e => ({ id: e.id, type: 'expense' as const, category: e.category, amount: e.amount, method: e.payment_method, description: e.description, created_at: e.created_at })),
    ...withdrawals.map(w => ({ id: w.id, type: 'withdrawal' as const, category: 'Retiro', amount: w.amount, method: w.source, description: w.description, created_at: w.created_at })),
    ...ccTx.map(t => ({ id: t.id, type: t.transaction_type === 'purchase' ? 'cc_purchase' as const : 'cc_payment' as const, category: t.category, amount: t.amount, method: 'Tarjeta de crédito', description: t.description, created_at: t.created_at })),
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
};
