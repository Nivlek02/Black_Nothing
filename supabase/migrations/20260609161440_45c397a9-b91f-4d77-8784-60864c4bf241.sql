
-- Enums
DO $$ BEGIN CREATE TYPE pm_priority AS ENUM ('alta','media','baja'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pm_status AS ENUM ('pendiente','en_analisis','listo_dev','en_desarrollo','en_qa','en_revision','aprobado','desplegado','cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pm_task_kind AS ENUM ('epic','story','task','subtask'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Requirements
CREATE TABLE public.pm_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text,
  priority pm_priority NOT NULL DEFAULT 'media',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  status pm_status NOT NULL DEFAULT 'pendiente',
  description text,
  business_goal text,
  observations text,
  complexity text,
  risks text,
  dependencies text,
  impact text,
  areas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_requirements TO anon, authenticated;
GRANT ALL ON public.pm_requirements TO service_role;
ALTER TABLE public.pm_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_req all" ON public.pm_requirements FOR ALL USING (true) WITH CHECK (true);

-- Tasks (jerárquicas)
CREATE TABLE public.pm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.pm_requirements(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  kind pm_task_kind NOT NULL,
  title text NOT NULL,
  description text,
  priority pm_priority NOT NULL DEFAULT 'media',
  status pm_status NOT NULL DEFAULT 'pendiente',
  assignee text,
  due_date date,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tasks TO anon, authenticated;
GRANT ALL ON public.pm_tasks TO service_role;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_tasks all" ON public.pm_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX pm_tasks_req_idx ON public.pm_tasks(requirement_id);
CREATE INDEX pm_tasks_parent_idx ON public.pm_tasks(parent_id);

-- Attachments
CREATE TABLE public.pm_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.pm_requirements(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes int,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_attachments TO anon, authenticated;
GRANT ALL ON public.pm_attachments TO service_role;
ALTER TABLE public.pm_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_att all" ON public.pm_attachments FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.pm_touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER pm_req_touch BEFORE UPDATE ON public.pm_requirements FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated();
CREATE TRIGGER pm_tasks_touch BEFORE UPDATE ON public.pm_tasks FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated();
