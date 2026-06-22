/**
 * life-wheel-db.ts
 * Capa de persistencia en Supabase para la Rueda de la Vida.
 *
 * Sigue el mismo patrón que src/data/finance.ts:
 *   - Funciones asíncronas que leen/escriben en Supabase
 *   - withCurrentUserId() para RLS
 *   - Las funciones "load" reconstruyen el WheelState desde las tablas
 */

import { supabase, getCurrentUserId, withUserId } from '@/integrations/supabase/client';
import {
  DEFAULT_AREAS,
  clampScore,
  uid,
  type WheelState,
  type Area,
  type Rating,
  type Goal,
  type Subtask,
  type Habit,
  type HabitLog,
} from './life-wheel';

/* =========================================================================
 * Helper: user_id
 * ========================================================================= */
function withCurrentUserId<T extends Record<string, unknown>>(item: T): T & { user_id?: string } {
  return withUserId(item, getCurrentUserId());
}

/* =========================================================================
 * SERIALIZACIÓN (DB ↔ app model)
 * ========================================================================= */

/** Convierte fila DB de life_areas → Area del modelo */
function rowToArea(row: Record<string, unknown>): Area {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    weight: row.weight,
    order: row.order,
  };
}

/** Convierte fila DB de life_ratings → Rating del modelo */
function rowToRating(row: Record<string, unknown>): Rating {
  return {
    id: row.id,
    areaId: row.area_id,
    score: row.score,
    date: row.date,
    source: row.source,
    note: row.note ?? undefined,
  };
}

/** Convierte fila DB de life_goals → Goal del modelo */
function rowToGoal(row: Record<string, unknown>, subtasks: Subtask[]): Goal {
  return {
    id: row.id,
    areaId: row.area_id,
    title: row.title,
    status: row.status,
    impact: row.impact,
    targetDate: row.target_date ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    subtasks,
  };
}

/** Convierte fila DB de life_subtasks → Subtask del modelo */
function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
  };
}

/** Convierte fila DB de life_habits → Habit del modelo */
function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id,
    areaId: row.area_id,
    title: row.title,
    cadence: row.cadence,
    targetPerWeek: row.target_per_week ?? undefined,
    positive: row.positive,
    createdAt: row.created_at,
    archived: row.archived,
  };
}

/** Convierte fila DB de life_habit_logs → HabitLog del modelo */
function rowToHabitLog(row: Record<string, unknown>): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    done: row.done,
  };
}

/* =========================================================================
 * CARGA COMPLETA DEL ESTADO
 * ========================================================================= */

/**
 * Carga todo el WheelState desde Supabase para el usuario actual.
 * Las áreas por defecto se crean si no existen (primera vez).
 */
export async function loadWheelState(): Promise<WheelState> {
  const uid = getCurrentUserId();

  // Cargar áreas
  let { data: areaRows } = await supabase
    .from('life_areas')
    .select('*')
    .order('order', { ascending: true });

  // Si no hay áreas, crear las default
  if (!areaRows || areaRows.length === 0) {
    areaRows = await seedDefaultAreas();
  }

  const areas: Area[] = (areaRows ?? []).map(rowToArea);

  // Cargar ratings
  const { data: ratingRows } = await supabase
    .from('life_ratings')
    .select('*')
    .order('date', { ascending: false });

  const ratings: Rating[] = (ratingRows ?? []).map(rowToRating);

  // Cargar goals + subtasks
  const { data: goalRows } = await supabase
    .from('life_goals')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: subtaskRows } = await supabase
    .from('life_subtasks')
    .select('*')
    .order('created_at', { ascending: true });

  const subtasksByGoal: Record<string, Subtask[]> = {};
  for (const sr of subtaskRows ?? []) {
    if (!subtasksByGoal[sr.goal_id]) subtasksByGoal[sr.goal_id] = [];
    subtasksByGoal[sr.goal_id].push(rowToSubtask(sr));
  }

  const goals: Goal[] = (goalRows ?? []).map((gr) =>
    rowToGoal(gr, subtasksByGoal[gr.id] ?? [])
  );

  // Cargar hábitos
  const { data: habitRows } = await supabase
    .from('life_habits')
    .select('*')
    .order('created_at', { ascending: false });

  const habits: Habit[] = (habitRows ?? []).map(rowToHabit);

  // Cargar habit logs
  const { data: logRows } = await supabase
    .from('life_habit_logs')
    .select('*')
    .order('date', { ascending: false });

  const habitLogs: HabitLog[] = (logRows ?? []).map(rowToHabitLog);

  return { areas, ratings, goals, habits, habitLogs };
}

/** Crea las áreas por defecto en Supabase (primera vez) */
async function seedDefaultAreas(): Promise<Record<string, unknown>[]> {
  const userId = getCurrentUserId();

  const inserts = DEFAULT_AREAS.map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    weight: a.weight,
    order: a.order,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from('life_areas')
    .insert(inserts)
    .select()
    .order('order', { ascending: true });

  if (error) {
    console.error('Error al crear áreas por defecto:', error);
    // Intentar lectura de respaldo
    const { data: fallback } = await supabase
      .from('life_areas')
      .select('*')
      .order('order', { ascending: true });
    return fallback ?? [];
  }

  return data ?? [];
}

/* =========================================================================
 * RATINGS
 * ========================================================================= */

/** Guarda una calificación manual en Supabase */
export async function saveRating(
  areaId: string,
  score: number,
  note?: string
): Promise<void> {
  const id = uid();

  const { error } = await supabase.from('life_ratings').insert(
    withCurrentUserId({
      id,
      area_id: areaId,
      score,
      date: new Date().toISOString(),
      source: 'manual',
      note: note ?? null,
    })
  );

  if (error) {
    console.error('Error al guardar calificación:', error);
    throw error;
  }
}

/* =========================================================================
 * GOALS
 * ========================================================================= */

/** Crea una nueva meta en Supabase */
export async function createGoal(
  areaId: string,
  title: string,
  impact = 0.5,
  targetDate?: string
): Promise<string> {
  const id = uid();

  const { error } = await supabase.from('life_goals').insert(
    withCurrentUserId({
      id,
      area_id: areaId,
      title,
      status: 'active',
      impact,
      target_date: targetDate ?? null,
      completed_at: null,
    })
  );

  if (error) throw error;
  return id;
}

/** Agrega una subtarea a una meta */
export async function addSubtask(goalId: string, title: string): Promise<string> {
  const id = uid();

  const { error } = await supabase.from('life_subtasks').insert(
    withCurrentUserId({
      id,
      goal_id: goalId,
      title,
      done: false,
    })
  );

  if (error) throw error;
  return id;
}

/** Marca/desmarca una subtarea */
export async function toggleSubtask(subtaskId: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('life_subtasks')
    .update({ done })
    .eq('id', subtaskId);

  if (error) throw error;
}

/** Marca meta como completada y registra el auto-rating */
export async function completeGoalAndRating(
  goalId: string,
  areaId: string,
  currentScore: number,
  impact: number,
  title: string
): Promise<void> {
  // 1. Marcar goal como done
  const { error: goalErr } = await supabase
    .from('life_goals')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
    })
    .eq('id', goalId);

  if (goalErr) throw goalErr;

  // 2. Crear rating automático
  const newScore = clampScore(currentScore + impact);
  const { error: ratingErr } = await supabase.from('life_ratings').insert(
    withCurrentUserId({
      id: uid(),
      area_id: areaId,
      score: newScore,
      date: new Date().toISOString(),
      source: 'auto',
      note: `Meta completada: ${title}`,
    })
  );

  if (ratingErr) throw ratingErr;
}

/** Elimina una meta */
export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('life_goals')
    .delete()
    .eq('id', goalId);
  if (error) throw error;
}

/* =========================================================================
 * HABITS
 * ========================================================================= */

/** Crea un nuevo hábito */
export async function createHabit(
  areaId: string,
  title: string,
  cadence: 'daily' | 'weekly' = 'daily',
  positive = true,
  targetPerWeek?: number
): Promise<string> {
  const id = uid();

  const { error } = await supabase.from('life_habits').insert(
    withCurrentUserId({
      id,
      area_id: areaId,
      title,
      cadence,
      positive,
      target_per_week: targetPerWeek ?? null,
      archived: false,
    })
  );

  if (error) throw error;
  return id;
}

/** Registra un log de hábito (hecho/no hecho). Idempotente por habitId+date */
export async function logHabitDb(
  habitId: string,
  date: string,
  done = true
): Promise<void> {
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('life_habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('life_habit_logs')
      .update({ done })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('life_habit_logs').insert(
      withCurrentUserId({
        id: uid(),
        habit_id: habitId,
        date,
        done,
      })
    );
    if (error) throw error;
  }
}

/** Archiva/desarchiva un hábito */
export async function archiveHabit(habitId: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('life_habits')
    .update({ archived })
    .eq('id', habitId);
  if (error) throw error;
}

/** Elimina un hábito */
export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('life_habits')
    .delete()
    .eq('id', habitId);
  if (error) throw error;
}
