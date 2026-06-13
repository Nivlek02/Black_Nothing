CREATE TABLE public.upcoming_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otro',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upcoming_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to upcoming_payments"
ON public.upcoming_payments
FOR ALL
USING (true)
WITH CHECK (true);