export interface AgendaTask {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  color: string; // tailwind color token
  completed: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'cic_agenda_tasks';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function getAgendaTasks(): AgendaTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveAgendaTask(task: AgendaTask): void {
  const tasks = getAgendaTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) tasks[idx] = task;
  else tasks.push(task);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function deleteAgendaTask(id: string): void {
  const tasks = getAgendaTasks().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function createAgendaTask(data: Omit<AgendaTask, 'id' | 'createdAt' | 'completed'>): AgendaTask {
  return {
    ...data,
    id: generateId(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

export function getTasksForDate(date: string): AgendaTask[] {
  return getAgendaTasks()
    .filter(t => t.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export const TASK_COLORS = [
  { label: 'Verde', value: 'primary' },
  { label: 'Azul', value: 'accent' },
  { label: 'Amarillo', value: 'warning' },
  { label: 'Rojo', value: 'destructive' },
  { label: 'Gris', value: 'muted' },
];

// Generate hours for the day view
export function getDayHours(): string[] {
  const hours: string[] = [];
  for (let h = 6; h <= 23; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return hours;
}

// Sample data initialization
export function initializeAgendaSampleData(): void {
  if (localStorage.getItem(STORAGE_KEY)) return;
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const samples: AgendaTask[] = [
    { id: generateId(), title: 'Revisión de proyecto web', description: 'Revisar avances del sitio con el equipo', date: fmt(today), startTime: '09:00', endTime: '10:00', color: 'primary', completed: false, createdAt: today.toISOString() },
    { id: generateId(), title: 'Llamada con cliente', description: 'Presentar propuesta de rediseño', date: fmt(today), startTime: '11:00', endTime: '12:00', color: 'accent', completed: false, createdAt: today.toISOString() },
    { id: generateId(), title: 'Actualizar documentación', description: 'Documentar cambios en la API', date: fmt(today), startTime: '14:00', endTime: '15:30', color: 'warning', completed: true, createdAt: today.toISOString() },
    { id: generateId(), title: 'Deploy a producción', description: 'Subir cambios al servidor', date: fmt(today), startTime: '16:00', endTime: '17:00', color: 'destructive', completed: false, createdAt: today.toISOString() },
    { id: generateId(), title: 'Planificación semanal', description: 'Definir tareas de la semana', date: fmt(tomorrow), startTime: '08:00', endTime: '09:00', color: 'primary', completed: false, createdAt: today.toISOString() },
    { id: generateId(), title: 'Reunión de equipo', description: 'Stand-up diario', date: fmt(tomorrow), startTime: '10:00', endTime: '10:30', color: 'accent', completed: false, createdAt: today.toISOString() },
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
}
