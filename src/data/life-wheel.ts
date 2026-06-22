/**
 * life-wheel.ts
 * Modelo de datos y funciones puras para "Rueda de la Vida"
 *
 * Idea central:
 *   Áreas → el usuario las califica (1-10) → define metas y hábitos
 *   por área → al completarlos sube la calificación del área →
 *   la rueda se actualiza sola.
 *
 * Todas las funciones son PURAS: reciben state, devuelven state | datos.
 * La persistencia se maneja en life-wheel-db.ts
 */

/* =========================================================================
 * TIPOS
 * ========================================================================= */
export interface Area {
  id: string;
  name: string;
  color: string;
  weight: number;
  order: number;
}

export interface Rating {
  id: string;
  areaId: string;
  score: number;       // 1..10
  date: string;        // ISO
  source: 'manual' | 'auto';
  note?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  areaId: string;
  title: string;
  status: 'active' | 'done' | 'archived';
  impact: number;
  targetDate?: string;
  createdAt: string;
  completedAt?: string;
  subtasks: Subtask[];
}

export interface Habit {
  id: string;
  areaId: string;
  title: string;
  cadence: 'daily' | 'weekly';
  targetPerWeek?: number;
  positive: boolean;
  createdAt: string;
  archived: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;   // "YYYY-MM-DD"
  done: boolean;
}

export interface WheelState {
  areas: Area[];
  ratings: Rating[];
  goals: Goal[];
  habits: Habit[];
  habitLogs: HabitLog[];
}

export interface WheelDataPoint {
  areaId: string;
  name: string;
  color: string;
  score: number;
  order: number;
}

export interface DashboardSummary {
  wheelAverage: number;
  balanceIndex: number;
  weakestArea: { name: string; score: number } | null;
  activeGoals: number;
  completedGoals: number;
  activeHabits: number;
}

/* =========================================================================
 * CONSTANTES
 * ========================================================================= */
export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

export const DEFAULT_AREAS: Area[] = [
  { id: 'salud',        name: 'Salud',        color: '#22c55e', weight: 1, order: 0 },
  { id: 'carrera',      name: 'Carrera',      color: '#3b82f6', weight: 1, order: 1 },
  { id: 'finanzas',     name: 'Finanzas',     color: '#eab308', weight: 1, order: 2 },
  { id: 'relaciones',   name: 'Relaciones',   color: '#ec4899', weight: 1, order: 3 },
  { id: 'crecimiento',  name: 'Crecimiento',  color: '#8b5cf6', weight: 1, order: 4 },
  { id: 'ocio',         name: 'Ocio',         color: '#f97316', weight: 1, order: 5 },
];

/* =========================================================================
 * UTILIDADES
 * ========================================================================= */
export const clampScore = (n: number): number =>
  Math.min(SCORE_MAX, Math.max(SCORE_MIN, n));

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10);

const toDateKey = (d: Date): string =>
  d.toISOString().slice(0, 10); // "YYYY-MM-DD"

const round1 = (n: number): number =>
  Math.round(n * 10) / 10;

const round2 = (n: number): number =>
  Math.round(n * 100) / 100;

/* =========================================================================
 * ESTADO INICIAL
 * ========================================================================= */
export function createInitialState(): WheelState {
  return {
    areas: DEFAULT_AREAS,
    ratings: [],
    goals: [],
    habits: [],
    habitLogs: [],
  };
}

/* =========================================================================
 * CALIFICACIONES
 * ========================================================================= */

/** Última calificación de un área (o null si nunca se calificó). */
export function getCurrentScore(state: WheelState, areaId: string): number | null {
  const ratings = state.ratings
    .filter((r) => r.areaId === areaId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return ratings.length ? ratings[0].score : null;
}

/** Datos listos para dibujar la rueda: cada área con su nota actual. */
export function getWheelData(state: WheelState): WheelDataPoint[] {
  return state.areas
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((area) => ({
      areaId: area.id,
      name: area.name,
      color: area.color,
      score: getCurrentScore(state, area.id) ?? 0,
      order: area.order,
    }));
}

/** Registra calificación manual. Devuelve nuevo state. */
export function setScore(
  state: WheelState,
  areaId: string,
  score: number,
  note?: string
): WheelState {
  const rating: Rating = {
    id: uid(),
    areaId,
    score: clampScore(score),
    date: new Date().toISOString(),
    source: 'manual',
    note,
  };
  return { ...state, ratings: [...state.ratings, rating] };
}

/* =========================================================================
 * EQUILIBRIO DE LA RUEDA
 * ========================================================================= */

/** Promedio ponderado de toda la rueda (0..10). */
export function getWheelAverage(state: WheelState): number {
  const data = getWheelData(state).filter((d) => d.score > 0);
  if (!data.length) return 0;
  const areasById = Object.fromEntries(state.areas.map((a) => [a.id, a]));
  let sum = 0, weightSum = 0;
  for (const d of data) {
    const w = areasById[d.areaId]?.weight ?? 1;
    sum += d.score * w;
    weightSum += w;
  }
  return round1(sum / weightSum);
}

/** Índice de equilibrio (0..1). 1 = rueda perfectamente pareja. */
export function getBalanceIndex(state: WheelState): number {
  const scores = getWheelData(state).map((d) => d.score).filter((s) => s > 0);
  if (scores.length < 2) return 1;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  return round2(Math.max(0, 1 - std / 4.5));
}

/** El área con menor score. */
export function getWeakestArea(state: WheelState): WheelDataPoint | null {
  const data = getWheelData(state).filter((d) => d.score > 0);
  if (!data.length) return null;
  return data.reduce((min, d) => (d.score < min.score ? d : min));
}

/* =========================================================================
 * METAS
 * ========================================================================= */

/** Progreso de una meta según subtareas (0..1). */
export function getGoalProgress(goal: Goal): number {
  if (!goal.subtasks?.length) return goal.status === 'done' ? 1 : 0;
  const done = goal.subtasks.filter((s) => s.done).length;
  return round2(done / goal.subtasks.length);
}

/** Metas activas de un área. */
export function getActiveGoals(state: WheelState, areaId: string): Goal[] {
  return state.goals.filter(
    (g) => g.areaId === areaId && g.status === 'active'
  );
}

/** Marca meta como completada y sube score del área automáticamente. */
export function completeGoal(state: WheelState, goalId: string): WheelState {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || goal.status === 'done') return state;

  const goals = state.goals.map((g) =>
    g.id === goalId
      ? { ...g, status: 'done' as const, completedAt: new Date().toISOString() }
      : g
  );

  const current = getCurrentScore(state, goal.areaId) ?? 5;
  const autoRating: Rating = {
    id: uid(),
    areaId: goal.areaId,
    score: clampScore(current + goal.impact),
    date: new Date().toISOString(),
    source: 'auto',
    note: `Meta completada: ${goal.title}`,
  };

  return { ...state, goals, ratings: [...state.ratings, autoRating] };
}

/* =========================================================================
 * HÁBITOS
 * ========================================================================= */

/** Racha actual (días consecutivos hasta hoy). */
export function getHabitStreak(state: WheelState, habitId: string): number {
  const logs = state.habitLogs
    .filter((l) => l.habitId === habitId && l.done)
    .map((l) => l.date)
    .sort()
    .reverse();

  if (!logs.length) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const logSet = new Set(logs);

  while (logSet.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** % de cumplimiento últimos N días (0..1). */
export function getHabitConsistency(
  state: WheelState,
  habitId: string,
  days = 30
): number {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const done = state.habitLogs.filter(
    (l) => l.habitId === habitId && l.done && new Date(l.date) >= start
  ).length;

  return round2(done / days);
}

/** Marca un hábito como hecho/no hecho. Devuelve nuevo state. */
export function logHabit(
  state: WheelState,
  habitId: string,
  date?: string,
  done = true
): WheelState {
  const key = date || toDateKey(new Date());
  const existing = state.habitLogs.find(
    (l) => l.habitId === habitId && l.date === key
  );

  let habitLogs: HabitLog[];
  if (existing) {
    habitLogs = state.habitLogs.map((l) =>
      l === existing ? { ...l, done } : l
    );
  } else {
    habitLogs = [
      ...state.habitLogs,
      { id: uid(), habitId, date: key, done },
    ];
  }

  return { ...state, habitLogs };
}

/* =========================================================================
 * RESUMEN GLOBAL
 * ========================================================================= */
export function getDashboardSummary(state: WheelState): DashboardSummary {
  const weakest = getWeakestArea(state);
  return {
    wheelAverage: getWheelAverage(state),
    balanceIndex: getBalanceIndex(state),
    weakestArea: weakest
      ? { name: weakest.name, score: weakest.score }
      : null,
    activeGoals: state.goals.filter((g) => g.status === 'active').length,
    completedGoals: state.goals.filter((g) => g.status === 'done').length,
    activeHabits: state.habits.filter((h) => !h.archived).length,
  };
}
