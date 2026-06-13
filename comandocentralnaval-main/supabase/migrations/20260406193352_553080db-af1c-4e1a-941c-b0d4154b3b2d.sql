ALTER TABLE public.agenda_tasks 
  ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS notified boolean NOT NULL DEFAULT false;