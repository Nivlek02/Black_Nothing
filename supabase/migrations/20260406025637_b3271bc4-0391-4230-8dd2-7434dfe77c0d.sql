
-- Incomes table
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otro',
  description TEXT DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to incomes" ON public.incomes FOR ALL TO public USING (true) WITH CHECK (true);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otro',
  expense_type TEXT NOT NULL DEFAULT 'occasional',
  description TEXT DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL TO public USING (true) WITH CHECK (true);

-- ATM Withdrawals
CREATE TABLE public.atm_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'Cuenta principal',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.atm_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to atm_withdrawals" ON public.atm_withdrawals FOR ALL TO public USING (true) WITH CHECK (true);

-- Credit card transactions
CREATE TABLE public.credit_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'purchase',
  category TEXT NOT NULL DEFAULT 'Otro',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to credit_card_transactions" ON public.credit_card_transactions FOR ALL TO public USING (true) WITH CHECK (true);

-- Debts
CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  start_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to debts" ON public.debts FOR ALL TO public USING (true) WITH CHECK (true);

-- Debt payments
CREATE TABLE public.debt_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to debt_payments" ON public.debt_payments FOR ALL TO public USING (true) WITH CHECK (true);
