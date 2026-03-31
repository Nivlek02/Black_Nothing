
-- Agenda tasks table
CREATE TABLE public.agenda_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Special dates table
CREATE TABLE public.special_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agenda_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_dates ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required)
CREATE POLICY "Allow all access to agenda_tasks" ON public.agenda_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to special_dates" ON public.special_dates FOR ALL USING (true) WITH CHECK (true);
