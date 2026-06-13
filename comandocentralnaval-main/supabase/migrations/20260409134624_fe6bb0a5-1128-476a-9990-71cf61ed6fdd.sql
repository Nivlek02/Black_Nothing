
-- Add recurrence fields to upcoming_payments
ALTER TABLE public.upcoming_payments
ADD COLUMN frequency TEXT NOT NULL DEFAULT 'once',
ADD COLUMN recurrence_end TEXT;

-- Create savings table
CREATE TABLE public.savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to savings"
ON public.savings
FOR ALL
USING (true)
WITH CHECK (true);

-- Savings deposits/withdrawals log
CREATE TABLE public.savings_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_id UUID NOT NULL REFERENCES public.savings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'deposit',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to savings_movements"
ON public.savings_movements
FOR ALL
USING (true)
WITH CHECK (true);
