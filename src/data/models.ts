export interface Report {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  responsible: string;
  status: ReportStatus;
  summary: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  endDate?: string;
  evidence?: string;
  notes?: string;
}

export interface Platform {
  id: string;
  name: string;
  category: string;
  cost: number;
  currency: string;
  frequency: Frequency;
  billingDay: number;
  nextCharge: string;
  paymentMethod?: string;
  billingLink?: string;
  status: PlatformStatus;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  platformId: string;
  platformName: string;
  paymentDate: string;
  periodCovered: string;
  amount: number;
  currency: string;
  comment?: string;
}

export interface AppConfig {
  reminderDays: number[];
}

export type ReportStatus = 'draft' | 'review' | 'final';
export type TaskStatus = 'pending' | 'in-progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type PlatformStatus = 'active' | 'paused' | 'cancelled';
export type Frequency = 'monthly' | 'annual';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Borrador',
  review: 'En revisión',
  final: 'Finalizado',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  'in-progress': 'En progreso',
  blocked: 'Bloqueada',
  done: 'Hecha',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export const PLATFORM_STATUS_LABELS: Record<PlatformStatus, string> = {
  active: 'Activa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: 'Mensual',
  annual: 'Anual',
};

export const CATEGORIES = ['CRM', 'Email', 'Hosting', 'Ads', 'Productividad', 'Diseño', 'Dominios', 'Comunicación', 'Almacenamiento', 'Otro'];
export const CURRENCIES = ['USD', 'COP', 'EUR', 'MXN'];

// UNAD Models
export interface Subject {
  id: string;
  name: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  subjectId: string;
  name: string;
  startDate: string;
  dueDate: string;
  status: ActivityStatus;
  notes: string;
  checklist: ChecklistItem[];
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type ActivityStatus = 'pending' | 'in-progress' | 'completed';

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pending: 'Pendiente',
  'in-progress': 'En progreso',
  completed: 'Completada',
};
