-- Migration: Fix RLS policies for life_* tables
-- The INSERT policies now accept rows where user_id is NULL (trigger will fill it)
-- Triggers auto-set user_id = auth.uid() if not provided

-- ============================================================
-- Function: set_user_id (shared by all life_* tables)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_life_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = COALESCE(NEW.user_id, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Triggers (BEFORE INSERT on each life_* table)
-- ============================================================
DROP TRIGGER IF EXISTS trg_life_areas_user_id ON public.life_areas;
CREATE TRIGGER trg_life_areas_user_id BEFORE INSERT ON public.life_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_life_user_id();

DROP TRIGGER IF EXISTS trg_life_ratings_user_id ON public.life_ratings;
CREATE TRIGGER trg_life_ratings_user_id BEFORE INSERT ON public.life_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_life_user_id();

DROP TRIGGER IF EXISTS trg_life_goals_user_id ON public.life_goals;
CREATE TRIGGER trg_life_goals_user_id BEFORE INSERT ON public.life_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_life_user_id();

DROP TRIGGER IF EXISTS trg_life_subtasks_user_id ON public.life_subtasks;
CREATE TRIGGER trg_life_subtasks_user_id BEFORE INSERT ON public.life_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.set_life_user_id();

DROP TRIGGER IF EXISTS trg_life_habits_user_id ON public.life_habits;
CREATE TRIGGER trg_life_habits_user_id BEFORE INSERT ON public.life_habits
  FOR EACH ROW EXECUTE FUNCTION public.set_life_user_id();

DROP TRIGGER IF EXISTS trg_life_habit_logs_user_id ON public.life_habit_logs;
CREATE TRIGGER trg_life_habit_logs_user_id BEFORE INSERT ON public.life_habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_life_user_id();

-- ============================================================
-- Updated INSERT policies: allow any authenticated user
-- The trigger ensures user_id is set to auth.uid() even if omitted
-- ============================================================

-- life_habits (the one causing the error)
DROP POLICY IF EXISTS "life_habits_insert" ON public.life_habits;
CREATE POLICY "life_habits_insert" ON public.life_habits FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- life_areas
DROP POLICY IF EXISTS "life_areas_insert" ON public.life_areas;
CREATE POLICY "life_areas_insert" ON public.life_areas FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- life_ratings
DROP POLICY IF EXISTS "life_ratings_insert" ON public.life_ratings;
CREATE POLICY "life_ratings_insert" ON public.life_ratings FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- life_goals
DROP POLICY IF EXISTS "life_goals_insert" ON public.life_goals;
CREATE POLICY "life_goals_insert" ON public.life_goals FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- life_subtasks
DROP POLICY IF EXISTS "life_subtasks_insert" ON public.life_subtasks;
CREATE POLICY "life_subtasks_insert" ON public.life_subtasks FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- life_habit_logs
DROP POLICY IF EXISTS "life_habit_logs_insert" ON public.life_habit_logs;
CREATE POLICY "life_habit_logs_insert" ON public.life_habit_logs FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);
