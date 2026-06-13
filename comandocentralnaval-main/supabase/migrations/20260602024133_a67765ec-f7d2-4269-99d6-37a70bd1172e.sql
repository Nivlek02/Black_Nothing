
-- Reset all finance data
TRUNCATE TABLE public.savings_movements, public.savings, public.debt_payments, public.debts, public.upcoming_payments, public.credit_card_transactions, public.atm_withdrawals, public.expenses, public.incomes RESTART IDENTITY CASCADE;

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO anon, authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

-- Add account_id to financial movement tables (nullable for backward compat / cc purchases)
ALTER TABLE public.incomes ADD COLUMN account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.atm_withdrawals ADD COLUMN account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.credit_card_transactions ADD COLUMN account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
