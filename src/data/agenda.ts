import { supabase, withUserId, getCurrentUserId } from '@/integrations/supabase/client';

export interface AgendaTask {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  color: string;
  completed: boolean;
  createdAt: string;
  reminderMinutes: number;
  notified: boolean;
}

export const TASK_COLORS = [
  { label: 'Verde', value: 'primary' },
  { label: 'Azul', value: 'accent' },
  { label: 'Amarillo', value: 'warning' },
  { label: 'Rojo', value: 'destructive' },
  { label: 'Gris', value: 'muted' },
];

export const REMINDER_OPTIONS = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
];

export function getDayHours(): string[] {
  const hours: string[] = [];
  for (let h = 6; h <= 23; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return hours;
}

// --- Supabase CRUD ---

function mapRow(row: any): AgendaTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    color: row.color,
    completed: row.completed,
    createdAt: row.created_at,
    reminderMinutes: row.reminder_minutes ?? 10,
    notified: row.notified ?? false,
  };
}

export async function getAgendaTasks(): Promise<AgendaTask[]> {
  const { data, error } = await supabase
    .from('agenda_tasks')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function getTasksForDate(date: string): Promise<AgendaTask[]> {
  const { data, error } = await supabase
    .from('agenda_tasks')
    .select('*')
    .eq('date', date)
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function getTasksForDateRange(startDate: string, endDate: string): Promise<AgendaTask[]> {
  const { data, error } = await supabase
    .from('agenda_tasks')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function getOverdueTasks(beforeDate: string): Promise<AgendaTask[]> {
  const { data, error } = await supabase
    .from('agenda_tasks')
    .select('*')
    .lt('date', beforeDate)
    .eq('completed', false)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function saveAgendaTask(task: AgendaTask): Promise<void> {
  const { error } = await supabase
    .from('agenda_tasks')
    .upsert(withUserId({
      id: task.id,
      title: task.title,
      description: task.description,
      date: task.date,
      start_time: task.startTime,
      end_time: task.endTime,
      color: task.color,
      completed: task.completed,
      reminder_minutes: task.reminderMinutes,
      notified: task.notified,
    }, getCurrentUserId()));
  if (error) throw error;
}

export async function deleteAgendaTask(id: string): Promise<void> {
  const { error } = await supabase.from('agenda_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function createAgendaTask(data: Omit<AgendaTask, 'id' | 'createdAt' | 'completed' | 'notified'>): Promise<AgendaTask> {
  const { data: rows, error } = await supabase
    .from('agenda_tasks')
    .insert(withUserId({
      title: data.title,
      description: data.description,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      color: data.color,
      completed: false,
      reminder_minutes: data.reminderMinutes,
    }, getCurrentUserId()))
    .select()
    .single();
  if (error) throw error;
  return mapRow(rows);
}
