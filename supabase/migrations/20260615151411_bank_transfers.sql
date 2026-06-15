
-- Create bank_transfers table for transfers between bank accounts
CREATE TABLE public.bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transfers TO anon, authenticated;
GRANT ALL ON public.bank_transfers TO service_role;

ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bank_transfers" ON public.bank_transfers FOR ALL USING (true) WITH CHECK (true);
