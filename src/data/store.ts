import { loadSampleData } from './sampleData';
import { Report, Task, Platform, PaymentRecord, AppConfig, Subject, Activity } from './models';


export const KEYS = {
  reports: 'cdc-reports',
  platforms: 'cdc-platforms',
  payments: 'cdc-payments',
  config: 'cdc-config',
  subjects: 'cdc-subjects',
  activities: 'cdc-activities',
  initialized: 'cdc-init',
};

export const generateId = () => crypto.randomUUID();

function get<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch {
    return fallback;
  }
}

export function set<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Reports
export const getReports = (): Report[] => get(KEYS.reports, []);
export const getReport = (id: string): Report | undefined => getReports().find(r => r.id === id);
export const saveReport = (report: Report): void => {
  const all = getReports();
  const idx = all.findIndex(r => r.id === report.id);
  if (idx >= 0) all[idx] = report; else all.unshift(report);
  set(KEYS.reports, all);
};
export const deleteReport = (id: string): void => set(KEYS.reports, getReports().filter(r => r.id !== id));

// Platforms
export const getPlatforms = (): Platform[] => get(KEYS.platforms, []);
export const getPlatform = (id: string): Platform | undefined => getPlatforms().find(p => p.id === id);
export const savePlatform = (platform: Platform): void => {
  const all = getPlatforms();
  const idx = all.findIndex(p => p.id === platform.id);
  if (idx >= 0) all[idx] = platform; else all.unshift(platform);
  set(KEYS.platforms, all);
};
export const deletePlatform = (id: string): void => set(KEYS.platforms, getPlatforms().filter(p => p.id !== id));

// Payments
export const getPayments = (): PaymentRecord[] => get(KEYS.payments, []);
export const savePayment = (payment: PaymentRecord): void => {
  const all = getPayments();
  all.unshift(payment);
  set(KEYS.payments, all);
};
export const deletePayment = (id: string): void => set(KEYS.payments, getPayments().filter(p => p.id !== id));

// Config
export const getConfig = (): AppConfig => get(KEYS.config, { reminderDays: [7, 1] });
export const saveConfig = (config: AppConfig): void => set(KEYS.config, config);

// Subjects
export const getSubjects = (): Subject[] => get(KEYS.subjects, []);
export const getSubject = (id: string): Subject | undefined => getSubjects().find(s => s.id === id);
export const saveSubject = (subject: Subject): void => {
  const all = getSubjects();
  const idx = all.findIndex(s => s.id === subject.id);
  if (idx >= 0) all[idx] = subject; else all.unshift(subject);
  set(KEYS.subjects, all);
};
export const deleteSubject = (id: string): void => {
  set(KEYS.subjects, getSubjects().filter(s => s.id !== id));
  set(KEYS.activities, getActivities().filter(a => a.subjectId !== id));
};

// Activities
export const getActivities = (): Activity[] => get(KEYS.activities, []);
export const getActivitiesBySubject = (subjectId: string): Activity[] => getActivities().filter(a => a.subjectId === subjectId);
export const saveActivity = (activity: Activity): void => {
  const all = getActivities();
  const idx = all.findIndex(a => a.id === activity.id);
  if (idx >= 0) all[idx] = activity; else all.unshift(activity);
  set(KEYS.activities, all);
};
export const deleteActivity = (id: string): void => set(KEYS.activities, getActivities().filter(a => a.id !== id));

// Utils
export function calculateNextCharge(billingDay: number, frequency: 'monthly' | 'annual'): string {
  const now = new Date();
  const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const y = now.getFullYear(), m = now.getMonth();
  let next = new Date(y, m, Math.min(billingDay, dim(y, m)));
  if (next <= now) {
    if (frequency === 'monthly') {
      const nm = m + 1;
      next = new Date(y, nm, Math.min(billingDay, dim(y, nm)));
    } else {
      next = new Date(y + 1, m, Math.min(billingDay, dim(y + 1, m)));
    }
  }
  return next.toISOString().split('T')[0];
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

// Sample data initialization
export function initializeIfNeeded(): void {
  if (localStorage.getItem(KEYS.initialized)) return;
  loadSampleData();
}
