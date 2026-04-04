import { supabase } from '@/integrations/supabase/client';

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
}

export const TASK_COLORS = [
  { label: 'Verde', value: 'primary' },
  { label: 'Azul', value: 'accent' },
  { label: 'Amarillo', value: 'warning' },
  { label: 'Rojo', value: 'destructive' },
  { label: 'Gris', value: 'muted' },
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
  };
}

export async function getAgendaTasks(): Promise<AgendaTask[]> {
  const { data, error } = await supabase
    .from('agenda_tasks')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) { console.error(error); return []; }
  return (data || []).map(mapRow);
}

export async function getTasksForDate(date: string): Promise<AgendaTask[]> {
  const { data, error } = await supabase
    .from('agenda_tasks')
    .select('*')
    .eq('date', date)
    .order('start_time', { ascending: true });
  if (error) { console.error(error); return []; }
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
  if (error) { console.error(error); return []; }
  return (data || []).map(mapRow);
}

export async function saveAgendaTask(task: AgendaTask): Promise<void> {
  const { error } = await supabase
    .from('agenda_tasks')
    .upsert({
      id: task.id,
      title: task.title,
      description: task.description,
      date: task.date,
      start_time: task.startTime,
      end_time: task.endTime,
      color: task.color,
      completed: task.completed,
    });
  if (error) console.error(error);
}

export async function deleteAgendaTask(id: string): Promise<void> {
  const { error } = await supabase.from('agenda_tasks').delete().eq('id', id);
  if (error) console.error(error);
}

export async function createAgendaTask(data: Omit<AgendaTask, 'id' | 'createdAt' | 'completed'>): Promise<AgendaTask> {
  const { data: rows, error } = await supabase
    .from('agenda_tasks')
    .insert({
      title: data.title,
      description: data.description,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      color: data.color,
      completed: false,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(rows);
}
