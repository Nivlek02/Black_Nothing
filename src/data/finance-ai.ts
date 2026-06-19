import type { Income, Expense, ATMWithdrawal, CreditCardTransaction, Debt, UpcomingPayment, Savings, BankAccount, BankTransfer } from './finance';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FinanceAdvice {
  id: string;
  type: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  /** Higher = more important, shown first */
  priority: number;
}

interface MonthlySummaryItem {
  key: string;
  label: string;
  income: number;
  expense: number;
  scheduled: number;
  paid: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00'); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getPrevMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextQuincena(): Date {
  const today = new Date();
  const day = today.getDate();
  if (day <= 15) return new Date(today.getFullYear(), today.getMonth(), 15);
  return new Date(today.getFullYear(), today.getMonth() + 1, 0);
}

// ─── Analysis functions ─────────────────────────────────────────────────────

function analyzeQuincena(
  accounts: BankAccount[],
  incomes: Income[],
  expenses: Expense[],
  withdrawals: ATMWithdrawal[],
  ccTx: CreditCardTransaction[],
  transfers: BankTransfer[],
  upcomingPayments: UpcomingPayment[],
): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  // Compute total balance across all accounts
  const totalBalance = accounts.reduce((sum, acc) => {
    const inc = incomes.filter(i => i.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    const exp = expenses.filter(e => e.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    const wd = withdrawals.filter(w => w.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    const cc = ccTx.filter(t => t.transaction_type === 'payment' && t.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    let transferNet = 0;
    if (transfers) {
      const transferOut = transfers.filter(t => t.from_account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      const transferIn = transfers.filter(t => t.to_account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      transferNet = transferIn - transferOut;
    }
    return sum + Number(acc.initial_balance) + inc - exp - wd - cc + transferNet;
  }, 0);

  // CC balance
  const ccPurchases = ccTx.filter(t => t.transaction_type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
  const ccPayments = ccTx.filter(t => t.transaction_type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
  const ccBalance = ccPurchases - ccPayments;

  // Quincena payments
  const nextQ = getNextQuincena();
  const quincenaDateStr = `${nextQ.getFullYear()}-${String(nextQ.getMonth() + 1).padStart(2, '0')}-${String(nextQ.getDate()).padStart(2, '0')}`;
  const pendingPayments = upcomingPayments.filter(p => !p.is_paid);
  const todayStr = new Date().toISOString().split('T')[0];
  const quincenaPayments = pendingPayments.filter(p => p.due_date >= todayStr && p.due_date <= quincenaDateStr);
  const quincenaTotal = quincenaPayments.reduce((s, p) => s + Number(p.amount), 0);

  const disponible = totalBalance - ccBalance - quincenaTotal;

  // Advice 1: Quincena outlook
  const qDay = nextQ.getDate();
  const qMonth = nextQ.toLocaleDateString('es-CO', { month: 'long' });
  const daysToQuincena = daysUntil(quincenaDateStr);

  if (quincenaTotal > 0) {
    result.push({
      id: 'quincena-outlook',
      type: disponible >= 0 ? 'info' : 'danger',
      title: `💰 Corte de quincena (${qDay} de ${qMonth})`,
      message: `Tienes **${fmt(quincenaTotal)}** en pagos programados hasta el ${qDay}. ` +
        (disponible >= 0
          ? `Tu saldo disponible después de pagos sería **${fmt(disponible)}**.`
          : `⚠️ Tu saldo disponible sería **${fmt(Math.abs(disponible))}** negativo. Necesitas generar al menos **${fmt(quincenaTotal - totalBalance + ccBalance)}** extras para cubrir todo.`
        ),
      priority: disponible >= 0 ? 70 : 100,
    });
  } else {
    result.push({
      id: 'quincena-clear',
      type: 'success',
      title: '✅ Sin pagos pendientes',
      message: `No tienes pagos programados hasta el ${qDay} de ${qMonth}. Tu disponible es **${fmt(disponible)}**.`,
      priority: 30,
    });
  }

  // Advice 2: Minimum income needed
  if (quincenaTotal > 0) {
    const minIncome = quincenaTotal - (totalBalance - ccBalance);
    if (minIncome > 0) {
      result.push({
        id: 'min-income',
        type: 'warning',
        title: '🎯 Ingreso mínimo recomendado',
        message: `Para cubrir los gastos de esta quincena sin quedar en negativo, necesitas generar al menos **${fmt(minIncome)}** en ingresos antes del ${qDay}.`,
        priority: 90,
      });
    } else {
      result.push({
        id: 'min-income-covered',
        type: 'success',
        title: '💰 Gastos cubiertos',
        message: `Tienes suficiente saldo para cubrir todos los pagos de la quincena. Te quedarían **${fmt(Math.abs(minIncome))}** libres.`,
        priority: 40,
      });
    }
  }

  return result;
}

function analyzeCategorySpending(
  expenses: Expense[],
  ccTx: CreditCardTransaction[],
): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  // Analyze regular expenses by category
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Otro';
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
  });

  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  if (sorted.length > 0) {
    const [topCat, topAmount] = sorted[0];
    const totalExp = sorted.reduce((s, [, v]) => s + v, 0);
    const pct = totalExp > 0 ? Math.round((topAmount / totalExp) * 100) : 0;

    result.push({
      id: 'top-category',
      type: 'info',
      title: `📊 Mayor gasto: ${topCat}`,
      message: `Has gastado **${fmt(topAmount)}** en ${topCat.toLowerCase()} (${pct}% de tus gastos). ` +
        (pct > 40
          ? 'Este rubro representa una porción muy alta. Revisa si puedes reducir este gasto.'
          : 'Se mantiene dentro de un rango razonable.'),
      priority: 60,
    });
  }

  // Fixed vs occasional ratio
  const fixedExpenses = expenses.filter(e => e.expense_type === 'fixed').reduce((s, e) => s + Number(e.amount), 0);
  const occExpenses = expenses.filter(e => e.expense_type === 'occasional').reduce((s, e) => s + Number(e.amount), 0);
  const totalGasto = fixedExpenses + occExpenses;
  if (totalGasto > 0) {
    const fixedPct = Math.round((fixedExpenses / totalGasto) * 100);
    const occPct = 100 - fixedPct;
    result.push({
      id: 'fixed-vs-occasional',
      type: occPct > 50 ? 'warning' : 'info',
      title: '📋 Gastos fijos vs. ocasionales',
      message: `${fixedPct}% de tus gastos son fijos (${fmt(fixedExpenses)}) y ${occPct}% son ocasionales (${fmt(occExpenses)}). ` +
        (occPct > 50
          ? 'Tus gastos variables son altos. Identificar patrones aquí puede ayudarte a ahorrar.'
          : 'Tus gastos fijos son la base principal. Buen control de gastos variables.'),
      priority: 50,
    });
  }

  // CC purchase concentration
  const ccPurchasesByCat: Record<string, number> = {};
  ccTx.filter(t => t.transaction_type === 'purchase').forEach(t => {
    const cat = t.category || 'Otro';
    ccPurchasesByCat[cat] = (ccPurchasesByCat[cat] || 0) + Number(t.amount);
  });
  const topCcCat = Object.entries(ccPurchasesByCat).sort(([, a], [, b]) => b - a);
  if (topCcCat.length > 0 && topCcCat[0][1] > 0) {
    result.push({
      id: 'cc-top-category',
      type: 'info',
      title: `💳 Mayor consumo TC: ${topCcCat[0][0]}`,
      message: `Tus compras en TC se concentran en **${topCcCat[0][0]}** con **${fmt(topCcCat[0][1])}**.`,
      priority: 45,
    });
  }

  return result;
}

function analyzeDebts(debts: Debt[]): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'overdue');
  if (activeDebts.length === 0) {
    result.push({
      id: 'debt-free',
      type: 'success',
      title: '🎉 Sin deudas activas',
      message: 'No tienes deudas pendientes. Sigue así y mantén tus finanzas saludables.',
      priority: 25,
    });
    return result;
  }

  const totalRemaining = activeDebts.reduce((s, d) => s + Number(d.remaining_amount), 0);
  const overdue = activeDebts.filter(d => d.status === 'overdue');
  const totalOverdue = overdue.reduce((s, d) => s + Number(d.remaining_amount), 0);

  if (overdue.length > 0) {
    result.push({
      id: 'debt-overdue',
      type: 'danger',
      title: '🚨 Deudas vencidas',
      message: `Tienes **${overdue.length}** deuda(s) vencida(s) por **${fmt(totalOverdue)}**. Prioriza su pago para evitar intereses o reportes negativos.`,
      priority: 100,
    });
  }

  // Payment plan suggestion for each debt
  for (const debt of activeDebts) {
    const remaining = Number(debt.remaining_amount);
    if (remaining <= 0) continue;

    const dueDate = new Date(debt.due_date + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthsLeft = Math.max(1, Math.ceil((dueDate.getTime() - today.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const paymentPerMonth = Math.ceil(remaining / monthsLeft);

    result.push({
      id: `debt-plan-${debt.id}`,
      type: dueDate < today ? 'danger' : 'warning',
      title: `📝 Plan de pago: ${debt.name}`,
      message: `Te falta pagar **${fmt(remaining)}**. ${dueDate < today ? '⚠️ La fecha límite ya venció.' : `Para terminarla antes del **${debt.due_date}** (${monthsLeft} meses), debes abonar ~**${fmt(paymentPerMonth)}** por mes.`}`,
      priority: dueDate < today ? 95 : 80,
    });
  }

  return result;
}

function analyzeSavings(
  incomes: Income[],
  savings: Savings[],
  totalIncome: number,
): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  if (savings.length === 0) {
    result.push({
      id: 'no-savings',
      type: 'info',
      title: '🏦 Sin metas de ahorro',
      message: 'No tienes metas de ahorro creadas. Una buena práctica es ahorrar al menos el 10-20% de tus ingresos.',
      priority: 35,
    });
    return result;
  }

  // Overall savings analysis
  const totalSaved = savings.reduce((s, sv) => s + Number(sv.current_amount), 0);
  const totalTarget = savings.reduce((s, sv) => s + Number(sv.target_amount), 0);

  if (totalTarget > 0) {
    const pct = Math.min(100, Math.round((totalSaved / totalTarget) * 100));
    result.push({
      id: 'savings-progress',
      type: pct >= 75 ? 'success' : pct >= 50 ? 'info' : 'warning',
      title: '🎯 Progreso de ahorros',
      message: `Has completado el **${pct}%** de tus metas de ahorro (${fmt(totalSaved)} de ${fmt(totalTarget)}). ` +
        (pct >= 75
          ? '¡Casi llegas! Sigue así.'
          : pct >= 50
            ? 'Vas bien, sigue aportando.'
            : 'Estás empezando. Revisa si puedes destinar más a tus ahorros.'),
      priority: 55,
    });
  } else {
    result.push({
      id: 'savings-no-target',
      type: 'info',
      title: '🏦 Total ahorrado',
      message: `Llevas ahorrado **${fmt(totalSaved)}**. Establecer metas específicas te ayudará a mantener el hábito.`,
      priority: 30,
    });
  }

  // Individual savings goals needing attention
  for (const sv of savings) {
    const current = Number(sv.current_amount);
    const target = Number(sv.target_amount);
    if (target > 0 && current < target) {
      const needed = target - current;
      if (needed > 0 && totalIncome > 0) {
        const suggestedMonthly = Math.ceil(needed / 6); // Suggest to complete in 6 months
        result.push({
          id: `savings-goal-${sv.id}`,
          type: 'info',
          title: `⭐ Meta: ${sv.name}`,
          message: `Te faltan **${fmt(needed)}** para alcanzar tu meta. Ahorrando **${fmt(suggestedMonthly)}** mensuales la completarías en ~6 meses.`,
          priority: 40,
        });
      }
    }
  }

  // Savings rate
  if (totalIncome > 0) {
    const savingsRate = Math.round((totalSaved / totalIncome) * 100);
    result.push({
      id: 'savings-rate',
      type: savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'info' : 'warning',
      title: '📈 Tasa de ahorro',
      message: `Tus ahorros representan el **${savingsRate}%** de tus ingresos totales. ` +
        (savingsRate >= 20
          ? '¡Excelente tasa de ahorro!'
          : savingsRate >= 10
            ? 'Estás en el rango recomendado (10-20%).'
            : 'Intenta aumentar tu ahorro al 10-20% de tus ingresos para mayor seguridad financiera.'),
      priority: 50,
    });
  }

  return result;
}

function analyzeMonthlyTrend(monthlySummary: MonthlySummaryItem[]): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  if (monthlySummary.length < 2) return result;

  const currentMonth = monthlySummary[monthlySummary.length - 1];
  const prevMonth = monthlySummary[monthlySummary.length - 2];

  if (!currentMonth || !prevMonth) return result;

  const incomeDiff = currentMonth.income - prevMonth.income;
  const expenseDiff = currentMonth.expense - prevMonth.expense;

  if (incomeDiff !== 0) {
    const pct = prevMonth.income > 0 ? Math.round((incomeDiff / prevMonth.income) * 100) : 0;
    result.push({
      id: 'income-trend',
      type: incomeDiff > 0 ? 'success' : 'danger',
      title: incomeDiff > 0 ? '📈 Ingresos al alza' : '📉 Ingresos a la baja',
      message: `Tus ingresos ${incomeDiff > 0 ? 'subieron' : 'bajaron'} **${fmt(Math.abs(incomeDiff))}** (${Math.abs(pct)}%) vs el mes anterior.`,
      priority: incomeDiff < 0 ? 75 : 45,
    });
  }

  if (expenseDiff !== 0) {
    const pct = prevMonth.expense > 0 ? Math.round((expenseDiff / prevMonth.expense) * 100) : 0;
    result.push({
      id: 'expense-trend',
      type: expenseDiff > 0 ? 'warning' : 'success',
      title: expenseDiff > 0 ? '📊 Gastos al alza' : '📉 Gastos reducidos',
      message: `Tus gastos ${expenseDiff > 0 ? 'aumentaron' : 'disminuyeron'} **${fmt(Math.abs(expenseDiff))}** (${Math.abs(pct)}%) vs el mes anterior.` +
        (expenseDiff > 0 && pct > 20 ? ' Revisa si este aumento es necesario o puntual.' : ''),
      priority: expenseDiff > 0 ? 70 : 40,
    });
  }

  // Net balance trend
  const currentNet = currentMonth.income - currentMonth.expense;
  const prevNet = prevMonth.income - prevMonth.expense;
  if (currentNet < 0) {
    result.push({
      id: 'negative-month',
      type: 'danger',
      title: '⚠️ Mes en rojo',
      message: `Este mes tus gastos (${fmt(currentMonth.expense)}) superan tus ingresos (${fmt(currentMonth.income)}) por **${fmt(Math.abs(currentNet))}**. Busca reducir gastos o generar ingresos extras.`,
      priority: 85,
    });
  }

  return result;
}

function analyzeCCHealth(
  ccTx: CreditCardTransaction[],
  totalIncome: number,
): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  const ccPurchases = ccTx.filter(t => t.transaction_type === 'purchase').reduce((s, t) => s + Number(t.amount), 0);
  const ccPayments = ccTx.filter(t => t.transaction_type === 'payment').reduce((s, t) => s + Number(t.amount), 0);
  const ccBalance = ccPurchases - ccPayments;

  if (ccBalance === 0) {
    result.push({
      id: 'cc-clear',
      type: 'success',
      title: '✅ TC al día',
      message: 'No tienes saldo pendiente en tu tarjeta de crédito. Excelente gestión.',
      priority: 20,
    });
    return result;
  }

  if (totalIncome > 0) {
    const usagePct = Math.round((ccBalance / totalIncome) * 100);
    result.push({
      id: 'cc-usage',
      type: usagePct > 50 ? 'danger' : usagePct > 30 ? 'warning' : 'info',
      title: '💳 Salud de la TC',
      message: `Tu saldo TC de **${fmt(ccBalance)}** equivale al **${usagePct}%** de tus ingresos totales. ` +
        (usagePct > 50
          ? '⚠️ Estás usando más del 50% de tu límite en relación a tus ingresos. Idealmente debería ser menor al 30%.'
          : usagePct > 30
            ? 'Estás en un rango moderado. Trata de mantenerlo por debajo del 30%.'
            : 'Estás usando tu TC responsablemente.'),
      priority: usagePct > 50 ? 90 : usagePct > 30 ? 65 : 35,
    });
  }

  return result;
}

function analyzeCashAvailability(
  accounts: BankAccount[],
  incomes: Income[],
  expenses: Expense[],
  withdrawals: ATMWithdrawal[],
  ccTx: CreditCardTransaction[],
  transfers: BankTransfer[],
): FinanceAdvice[] {
  const result: FinanceAdvice[] = [];

  // Separate bank vs cash accounts
  const bankAccs = accounts.filter(a => !a.notes?.startsWith('##TYPE:cash##'));
  const cashAccs = accounts.filter(a => a.notes?.startsWith('##TYPE:cash##'));

  const getBalance = (acc: BankAccount) => {
    const inc = incomes.filter(i => i.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    const exp = expenses.filter(e => e.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    const wd = withdrawals.filter(w => w.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    const cc = ccTx.filter(t => t.transaction_type === 'payment' && t.account_id === acc.id).reduce((s, r) => s + Number(r.amount), 0);
    let transferNet = 0;
    if (transfers) {
      const transferOut = transfers.filter(t => t.from_account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      const transferIn = transfers.filter(t => t.to_account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      transferNet = transferIn - transferOut;
    }
    return Number(acc.initial_balance) + inc - exp - wd - cc + transferNet;
  };

  const totalBank = bankAccs.reduce((s, a) => s + getBalance(a), 0);
  const totalCash = cashAccs.reduce((s, a) => s + getBalance(a), 0);

  if (totalCash > 0 && totalCash > totalBank && totalBank > 0) {
    result.push({
      id: 'cash-heavy',
      type: 'info',
      title: '💵 Mucho efectivo disponible',
      message: `Tienes **${fmt(totalCash)}** en efectivo vs **${fmt(totalBank)}** en banco. Considera consignar parte del efectivo al banco para mantenerlo más seguro y generar intereses.`,
      priority: 30,
    });
  }

  if (totalBank > 0 && totalCash === 0) {
    result.push({
      id: 'no-cash',
      type: 'info',
      title: '💳 Sin efectivo registrado',
      message: 'Todo tu dinero está en cuentas bancarias. Si usas efectivo frecuentemente, crea una cuenta de tipo Efectivo para llevar el control.',
      priority: 20,
    });
  }

  return result;
}

// ─── Main generator ─────────────────────────────────────────────────────────

export interface FinanceData {
  accounts: BankAccount[];
  incomes: Income[];
  expenses: Expense[];
  withdrawals: ATMWithdrawal[];
  ccTx: CreditCardTransaction[];
  debts: Debt[];
  upcomingPayments: UpcomingPayment[];
  savings: Savings[];
  transfers: BankTransfer[];
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  totalDebts: number;
  ccBalance: number;
  totalAccountBalance: number;
  disponible: number;
  monthlySummary: MonthlySummaryItem[];
}

/**
 * Generates a prioritized list of financial advice based on current data.
 * Pure function — no API calls, no side effects.
 */
export function generateAdvices(data: FinanceData): FinanceAdvice[] {
  const advices: FinanceAdvice[] = [
    ...analyzeQuincena(
      data.accounts, data.incomes, data.expenses,
      data.withdrawals, data.ccTx, data.transfers,
      data.upcomingPayments,
    ),
    ...analyzeCategorySpending(data.expenses, data.ccTx),
    ...analyzeDebts(data.debts),
    ...analyzeSavings(data.incomes, data.savings, data.totalIncome),
    ...analyzeMonthlyTrend(data.monthlySummary),
    ...analyzeCCHealth(data.ccTx, data.totalIncome),
    ...analyzeCashAvailability(
      data.accounts, data.incomes, data.expenses,
      data.withdrawals, data.ccTx, data.transfers,
    ),
  ];

  // Sort by priority descending, then shuffle same-priority items slightly for variety
  return advices.sort((a, b) => b.priority - a.priority);
}

export function getDefaultAdvice(): FinanceAdvice {
  return {
    id: 'welcome',
    type: 'info',
    title: '🤖 Asistente Financiero',
    message: 'Registra ingresos y gastos para recibir consejos personalizados sobre tus finanzas.',
    priority: 0,
  };
}
