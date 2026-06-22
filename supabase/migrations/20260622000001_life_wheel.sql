-- Migration: Life Wheel tables (areas, ratings, goals, habits)
-- Rueda de la Vida module

-- ============================================================
-- life_areas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.life_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  weight NUMERIC NOT NULL DEFAULT 1,
  "order" INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_areas_user_id ON public.life_areas(user_id);

-- ============================================================
-- life_ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.life_ratings (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES public.life_areas(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 1 AND score <= 10),
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_ratings_area_id ON public.life_ratings(area_id);
CREATE INDEX IF NOT EXISTS idx_life_ratings_user_id ON public.life_ratings(user_id);

-- ============================================================
-- life_goals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.life_goals (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES public.life_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'archived')),
  impact NUMERIC NOT NULL DEFAULT 0.5,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_goals_area_id ON public.life_goals(area_id);
CREATE INDEX IF NOT EXISTS idx_life_goals_user_id ON public.life_goals(user_id);

-- ============================================================
-- life_subtasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.life_subtasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES public.life_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_life_subtasks_goal_id ON public.life_subtasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_life_subtasks_user_id ON public.life_subtasks(user_id);

-- ============================================================
-- life_habits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.life_habits (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES public.life_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily', 'weekly')),
  target_per_week INTEGER,
  positive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_habits_area_id ON public.life_habits(area_id);
CREATE INDEX IF NOT EXISTS idx_life_habits_user_id ON public.life_habits(user_id);

-- ============================================================
-- life_habit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.life_habit_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES public.life_habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  done BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_life_habit_logs_habit_id ON public.life_habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_life_habit_logs_user_id ON public.life_habit_logs(user_id);

-- ============================================================
-- RLS Policies (same pattern as existing migration)
-- ============================================================
ALTER TABLE public.life_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_habit_logs ENABLE ROW LEVEL SECURITY;

-- life_areas
DROP POLICY IF EXISTS "life_areas_select" ON public.life_areas;
DROP POLICY IF EXISTS "life_areas_insert" ON public.life_areas;
DROP POLICY IF EXISTS "life_areas_update" ON public.life_areas;
DROP POLICY IF EXISTS "life_areas_delete" ON public.life_areas;
CREATE POLICY "life_areas_select" ON public.life_areas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_areas_insert" ON public.life_areas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_areas_update" ON public.life_areas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_areas_delete" ON public.life_areas FOR DELETE USING (auth.uid() = user_id);

-- life_ratings
DROP POLICY IF EXISTS "life_ratings_select" ON public.life_ratings;
DROP POLICY IF EXISTS "life_ratings_insert" ON public.life_ratings;
DROP POLICY IF EXISTS "life_ratings_update" ON public.life_ratings;
DROP POLICY IF EXISTS "life_ratings_delete" ON public.life_ratings;
CREATE POLICY "life_ratings_select" ON public.life_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_ratings_insert" ON public.life_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_ratings_update" ON public.life_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_ratings_delete" ON public.life_ratings FOR DELETE USING (auth.uid() = user_id);

-- life_goals
DROP POLICY IF EXISTS "life_goals_select" ON public.life_goals;
DROP POLICY IF EXISTS "life_goals_insert" ON public.life_goals;
DROP POLICY IF EXISTS "life_goals_update" ON public.life_goals;
DROP POLICY IF EXISTS "life_goals_delete" ON public.life_goals;
CREATE POLICY "life_goals_select" ON public.life_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_goals_insert" ON public.life_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_goals_update" ON public.life_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_goals_delete" ON public.life_goals FOR DELETE USING (auth.uid() = user_id);

-- life_subtasks
DROP POLICY IF EXISTS "life_subtasks_select" ON public.life_subtasks;
DROP POLICY IF EXISTS "life_subtasks_insert" ON public.life_subtasks;
DROP POLICY IF EXISTS "life_subtasks_update" ON public.life_subtasks;
DROP POLICY IF EXISTS "life_subtasks_delete" ON public.life_subtasks;
CREATE POLICY "life_subtasks_select" ON public.life_subtasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_subtasks_insert" ON public.life_subtasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_subtasks_update" ON public.life_subtasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_subtasks_delete" ON public.life_subtasks FOR DELETE USING (auth.uid() = user_id);

-- life_habits
DROP POLICY IF EXISTS "life_habits_select" ON public.life_habits;
DROP POLICY IF EXISTS "life_habits_insert" ON public.life_habits;
DROP POLICY IF EXISTS "life_habits_update" ON public.life_habits;
DROP POLICY IF EXISTS "life_habits_delete" ON public.life_habits;
CREATE POLICY "life_habits_select" ON public.life_habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_habits_insert" ON public.life_habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_habits_update" ON public.life_habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_habits_delete" ON public.life_habits FOR DELETE USING (auth.uid() = user_id);

-- life_habit_logs
DROP POLICY IF EXISTS "life_habit_logs_select" ON public.life_habit_logs;
DROP POLICY IF EXISTS "life_habit_logs_insert" ON public.life_habit_logs;
DROP POLICY IF EXISTS "life_habit_logs_update" ON public.life_habit_logs;
DROP POLICY IF EXISTS "life_habit_logs_delete" ON public.life_habit_logs;
CREATE POLICY "life_habit_logs_select" ON public.life_habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_habit_logs_insert" ON public.life_habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_habit_logs_update" ON public.life_habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_habit_logs_delete" ON public.life_habit_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.life_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.life_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.life_habits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed default areas
-- ============================================================
-- Note: Default areas are inserted via app (createInitialState logic)
-- to ensure they're associated with the correct user_id.
