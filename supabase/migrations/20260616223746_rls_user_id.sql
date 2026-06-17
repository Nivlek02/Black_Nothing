-- Migration: Add user_id to all tables + update RLS policies
-- This enables per-user data isolation via anonymous auth

-- ============================================================
-- Helper: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. Add user_id and updated_at columns + indexes
-- ============================================================

-- agenda_tasks
ALTER TABLE public.agenda_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agenda_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_agenda_tasks_user_id ON public.agenda_tasks(user_id);

-- special_dates
ALTER TABLE public.special_dates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.special_dates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_special_dates_user_id ON public.special_dates(user_id);

-- incomes
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);

-- expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- atm_withdrawals
ALTER TABLE public.atm_withdrawals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.atm_withdrawals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_atm_withdrawals_user_id ON public.atm_withdrawals(user_id);

-- credit_card_transactions
ALTER TABLE public.credit_card_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.credit_card_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_user_id ON public.credit_card_transactions(user_id);

-- debts
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);

-- debt_payments
ALTER TABLE public.debt_payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.debt_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id ON public.debt_payments(user_id);

-- upcoming_payments
ALTER TABLE public.upcoming_payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.upcoming_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_upcoming_payments_user_id ON public.upcoming_payments(user_id);

-- savings
ALTER TABLE public.savings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.savings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON public.savings(user_id);

-- savings_movements
ALTER TABLE public.savings_movements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.savings_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_savings_movements_user_id ON public.savings_movements(user_id);

-- bank_accounts
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);

-- bank_transfers
ALTER TABLE public.bank_transfers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bank_transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_bank_transfers_user_id ON public.bank_transfers(user_id);

-- projects (from ProjectManagement)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- requirements
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_requirements_user_id ON public.requirements(user_id);

-- tasks (project management)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

-- task_dependencies
ALTER TABLE public.task_dependencies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.task_dependencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_task_dependencies_user_id ON public.task_dependencies(user_id);

-- project_messages
ALTER TABLE public.project_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.project_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_project_messages_user_id ON public.project_messages(user_id);

-- ============================================================
-- 2. Enable Row Level Security on ALL tables
-- ============================================================
ALTER TABLE public.agenda_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atm_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Drop existing policies (if any) and recreate with user_id check
-- ============================================================

-- Helper macro: Create standard RLS policies for a given table
-- Policy names follow: table_operation

DO $$ BEGIN
-- agenda_tasks
DROP POLICY IF EXISTS "agenda_tasks_select" ON public.agenda_tasks;
DROP POLICY IF EXISTS "agenda_tasks_insert" ON public.agenda_tasks;
DROP POLICY IF EXISTS "agenda_tasks_update" ON public.agenda_tasks;
DROP POLICY IF EXISTS "agenda_tasks_delete" ON public.agenda_tasks;
END $$;

-- agenda_tasks
CREATE POLICY "agenda_tasks_select" ON public.agenda_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agenda_tasks_insert" ON public.agenda_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agenda_tasks_update" ON public.agenda_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agenda_tasks_delete" ON public.agenda_tasks FOR DELETE USING (auth.uid() = user_id);

-- special_dates
DROP POLICY IF EXISTS "special_dates_select" ON public.special_dates;
DROP POLICY IF EXISTS "special_dates_insert" ON public.special_dates;
DROP POLICY IF EXISTS "special_dates_update" ON public.special_dates;
DROP POLICY IF EXISTS "special_dates_delete" ON public.special_dates;
CREATE POLICY "special_dates_select" ON public.special_dates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "special_dates_insert" ON public.special_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "special_dates_update" ON public.special_dates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "special_dates_delete" ON public.special_dates FOR DELETE USING (auth.uid() = user_id);

-- incomes
DROP POLICY IF EXISTS "incomes_select" ON public.incomes;
DROP POLICY IF EXISTS "incomes_insert" ON public.incomes;
DROP POLICY IF EXISTS "incomes_update" ON public.incomes;
DROP POLICY IF EXISTS "incomes_delete" ON public.incomes;
CREATE POLICY "incomes_select" ON public.incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "incomes_insert" ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_update" ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "incomes_delete" ON public.incomes FOR DELETE USING (auth.uid() = user_id);

-- expenses
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- atm_withdrawals
DROP POLICY IF EXISTS "atm_withdrawals_select" ON public.atm_withdrawals;
DROP POLICY IF EXISTS "atm_withdrawals_insert" ON public.atm_withdrawals;
DROP POLICY IF EXISTS "atm_withdrawals_update" ON public.atm_withdrawals;
DROP POLICY IF EXISTS "atm_withdrawals_delete" ON public.atm_withdrawals;
CREATE POLICY "atm_withdrawals_select" ON public.atm_withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "atm_withdrawals_insert" ON public.atm_withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "atm_withdrawals_update" ON public.atm_withdrawals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "atm_withdrawals_delete" ON public.atm_withdrawals FOR DELETE USING (auth.uid() = user_id);

-- credit_card_transactions
DROP POLICY IF EXISTS "credit_card_transactions_select" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "credit_card_transactions_insert" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "credit_card_transactions_update" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "credit_card_transactions_delete" ON public.credit_card_transactions;
CREATE POLICY "credit_card_transactions_select" ON public.credit_card_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_card_transactions_insert" ON public.credit_card_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_card_transactions_update" ON public.credit_card_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "credit_card_transactions_delete" ON public.credit_card_transactions FOR DELETE USING (auth.uid() = user_id);

-- debts
DROP POLICY IF EXISTS "debts_select" ON public.debts;
DROP POLICY IF EXISTS "debts_insert" ON public.debts;
DROP POLICY IF EXISTS "debts_update" ON public.debts;
DROP POLICY IF EXISTS "debts_delete" ON public.debts;
CREATE POLICY "debts_select" ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debts_insert" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debts_update" ON public.debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "debts_delete" ON public.debts FOR DELETE USING (auth.uid() = user_id);

-- debt_payments
DROP POLICY IF EXISTS "debt_payments_select" ON public.debt_payments;
DROP POLICY IF EXISTS "debt_payments_insert" ON public.debt_payments;
DROP POLICY IF EXISTS "debt_payments_update" ON public.debt_payments;
DROP POLICY IF EXISTS "debt_payments_delete" ON public.debt_payments;
CREATE POLICY "debt_payments_select" ON public.debt_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debt_payments_insert" ON public.debt_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debt_payments_update" ON public.debt_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "debt_payments_delete" ON public.debt_payments FOR DELETE USING (auth.uid() = user_id);

-- upcoming_payments
DROP POLICY IF EXISTS "upcoming_payments_select" ON public.upcoming_payments;
DROP POLICY IF EXISTS "upcoming_payments_insert" ON public.upcoming_payments;
DROP POLICY IF EXISTS "upcoming_payments_update" ON public.upcoming_payments;
DROP POLICY IF EXISTS "upcoming_payments_delete" ON public.upcoming_payments;
CREATE POLICY "upcoming_payments_select" ON public.upcoming_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "upcoming_payments_insert" ON public.upcoming_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upcoming_payments_update" ON public.upcoming_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "upcoming_payments_delete" ON public.upcoming_payments FOR DELETE USING (auth.uid() = user_id);

-- savings
DROP POLICY IF EXISTS "savings_select" ON public.savings;
DROP POLICY IF EXISTS "savings_insert" ON public.savings;
DROP POLICY IF EXISTS "savings_update" ON public.savings;
DROP POLICY IF EXISTS "savings_delete" ON public.savings;
CREATE POLICY "savings_select" ON public.savings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_insert" ON public.savings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_update" ON public.savings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "savings_delete" ON public.savings FOR DELETE USING (auth.uid() = user_id);

-- savings_movements
DROP POLICY IF EXISTS "savings_movements_select" ON public.savings_movements;
DROP POLICY IF EXISTS "savings_movements_insert" ON public.savings_movements;
DROP POLICY IF EXISTS "savings_movements_update" ON public.savings_movements;
DROP POLICY IF EXISTS "savings_movements_delete" ON public.savings_movements;
CREATE POLICY "savings_movements_select" ON public.savings_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_movements_insert" ON public.savings_movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_movements_update" ON public.savings_movements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "savings_movements_delete" ON public.savings_movements FOR DELETE USING (auth.uid() = user_id);

-- bank_accounts
DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_accounts_update" ON public.bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- bank_transfers
DROP POLICY IF EXISTS "bank_transfers_select" ON public.bank_transfers;
DROP POLICY IF EXISTS "bank_transfers_insert" ON public.bank_transfers;
DROP POLICY IF EXISTS "bank_transfers_update" ON public.bank_transfers;
DROP POLICY IF EXISTS "bank_transfers_delete" ON public.bank_transfers;
CREATE POLICY "bank_transfers_select" ON public.bank_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bank_transfers_insert" ON public.bank_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_transfers_update" ON public.bank_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bank_transfers_delete" ON public.bank_transfers FOR DELETE USING (auth.uid() = user_id);

-- projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- requirements
DROP POLICY IF EXISTS "requirements_select" ON public.requirements;
DROP POLICY IF EXISTS "requirements_insert" ON public.requirements;
DROP POLICY IF EXISTS "requirements_update" ON public.requirements;
DROP POLICY IF EXISTS "requirements_delete" ON public.requirements;
CREATE POLICY "requirements_select" ON public.requirements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "requirements_insert" ON public.requirements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "requirements_update" ON public.requirements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "requirements_delete" ON public.requirements FOR DELETE USING (auth.uid() = user_id);

-- tasks (project management)
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- task_dependencies
DROP POLICY IF EXISTS "task_dependencies_select" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_update" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete" ON public.task_dependencies;
CREATE POLICY "task_dependencies_select" ON public.task_dependencies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "task_dependencies_insert" ON public.task_dependencies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "task_dependencies_update" ON public.task_dependencies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "task_dependencies_delete" ON public.task_dependencies FOR DELETE USING (auth.uid() = user_id);

-- project_messages
DROP POLICY IF EXISTS "project_messages_select" ON public.project_messages;
DROP POLICY IF EXISTS "project_messages_insert" ON public.project_messages;
DROP POLICY IF EXISTS "project_messages_update" ON public.project_messages;
DROP POLICY IF EXISTS "project_messages_delete" ON public.project_messages;
CREATE POLICY "project_messages_select" ON public.project_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_messages_insert" ON public.project_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_messages_update" ON public.project_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "project_messages_delete" ON public.project_messages FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. Storage policies for pm-attachments bucket
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pm-attachments') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "pm_attachments_select" ON storage.objects;
    DROP POLICY IF EXISTS "pm_attachments_insert" ON storage.objects;
    DROP POLICY IF EXISTS "pm_attachments_update" ON storage.objects;
    DROP POLICY IF EXISTS "pm_attachments_delete" ON storage.objects;
    
    -- Recreate with auth check
    CREATE POLICY "pm_attachments_select" ON storage.objects 
      FOR SELECT USING (bucket_id = 'pm-attachments' AND auth.role() = 'authenticated');
    CREATE POLICY "pm_attachments_insert" ON storage.objects 
      FOR INSERT WITH CHECK (bucket_id = 'pm-attachments' AND auth.role() = 'authenticated');
    CREATE POLICY "pm_attachments_update" ON storage.objects 
      FOR UPDATE USING (bucket_id = 'pm-attachments' AND auth.role() = 'authenticated');
    CREATE POLICY "pm_attachments_delete" ON storage.objects 
      FOR DELETE USING (bucket_id = 'pm-attachments' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- 5. Add updated_at triggers to all tables that have updated_at
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name = 'updated_at' AND table_name IN (
      'agenda_tasks', 'special_dates', 'incomes', 'expenses', 'atm_withdrawals',
      'credit_card_transactions', 'debts', 'debt_payments', 'upcoming_payments',
      'savings', 'savings_movements', 'bank_accounts', 'bank_transfers',
      'projects', 'requirements', 'tasks', 'task_dependencies', 'project_messages'
    )
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl
    );
  END LOOP;
END $$;

-- Note: After running this migration, existing rows will have NULL user_id.
-- Run the following query to backfill user_id for authenticated users:
-- UPDATE public.agenda_tasks SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
-- (Repeat for each table)
