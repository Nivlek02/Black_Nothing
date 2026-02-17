import { Report, Task, Platform, PaymentRecord, AppConfig } from './models';

const KEYS = {
  reports: 'cdc-reports',
  platforms: 'cdc-platforms',
  payments: 'cdc-payments',
  config: 'cdc-config',
  initialized: 'cdc-init',
};

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

function get<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, data: T): void {
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

  const now = '2026-02-10T10:00:00.000Z';

  const sampleReports: Report[] = [
    {
      id: 'r1',
      title: 'Informe Quincenal - Feb 1-15, 2026',
      startDate: '2026-02-01',
      endDate: '2026-02-15',
      responsible: 'Carlos Méndez',
      status: 'draft',
      summary: 'Periodo de implementación de nuevas funcionalidades en el módulo de facturación. Se avanzó en la migración de servidores y se inició la capacitación del equipo comercial.',
      tasks: [
        { id: 't1', title: 'Migración de servidores a nueva infraestructura', description: 'Transferir servicios principales al nuevo proveedor cloud', project: 'Infraestructura', priority: 'high', status: 'in-progress', startDate: '2026-02-01', endDate: '2026-02-10' },
        { id: 't2', title: 'Implementación módulo de facturación v2', description: 'Desarrollo del nuevo módulo con soporte multi-moneda', project: 'Desarrollo', priority: 'high', status: 'in-progress', startDate: '2026-02-03' },
        { id: 't3', title: 'Capacitación equipo de ventas', description: 'Sesiones de entrenamiento sobre nuevo CRM', project: 'Comercial', priority: 'medium', status: 'pending', startDate: '2026-02-10', endDate: '2026-02-14' },
        { id: 't4', title: 'Revisión de contratos proveedores', description: 'Auditoría de contratos vigentes con proveedores de tecnología', project: 'Legal', priority: 'low', status: 'pending' },
      ],
      createdAt: '2026-02-01T08:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'r2',
      title: 'Informe Quincenal - Ene 16-31, 2026',
      startDate: '2026-01-16',
      endDate: '2026-01-31',
      responsible: 'Carlos Méndez',
      status: 'final',
      summary: 'Se completó la fase 1 de migración de datos. El equipo de diseño entregó los mockups del rediseño web. Se resolvieron 12 tickets de soporte críticos.',
      tasks: [
        { id: 't5', title: 'Migración de datos fase 1', description: 'Exportación y validación de datos históricos', project: 'Infraestructura', priority: 'high', status: 'done', startDate: '2026-01-16', endDate: '2026-01-25' },
        { id: 't6', title: 'Diseño rediseño web', description: 'Entrega de mockups para la nueva landing page', project: 'Diseño', priority: 'medium', status: 'done', startDate: '2026-01-16', endDate: '2026-01-28' },
        { id: 't7', title: 'Resolución tickets soporte', description: 'Atención de 12 tickets críticos del cliente principal', project: 'Soporte', priority: 'high', status: 'done', evidence: 'https://jira.example.com/board/123' },
        { id: 't8', title: 'Optimización base de datos', description: 'Indexación y limpieza de tablas principales', project: 'Infraestructura', priority: 'medium', status: 'done' },
      ],
      createdAt: '2026-01-16T08:00:00.000Z',
      updatedAt: '2026-01-31T18:00:00.000Z',
    },
    {
      id: 'r3',
      title: 'Informe Quincenal - Ene 1-15, 2026',
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      responsible: 'Ana Rodríguez',
      status: 'final',
      summary: 'Inicio de año con planificación estratégica Q1. Se definieron prioridades y asignaron recursos para los proyectos principales del trimestre.',
      tasks: [
        { id: 't9', title: 'Planificación estratégica Q1', description: 'Definición de OKRs y roadmap del primer trimestre', project: 'Gestión', priority: 'high', status: 'done' },
        { id: 't10', title: 'Auditoría de seguridad', description: 'Revisión completa de políticas de acceso y permisos', project: 'Seguridad', priority: 'high', status: 'done' },
      ],
      createdAt: '2026-01-01T08:00:00.000Z',
      updatedAt: '2026-01-15T18:00:00.000Z',
    },
  ];

  const samplePlatforms: Platform[] = [
    { id: 'p1', name: 'Google Workspace', category: 'Productividad', cost: 14, currency: 'USD', frequency: 'monthly', billingDay: 15, nextCharge: '2026-02-15', paymentMethod: 'Tarjeta corporativa Visa', billingLink: 'https://admin.google.com/billing', status: 'active', createdAt: '2025-06-01T00:00:00Z' },
    { id: 'p2', name: 'HubSpot CRM', category: 'CRM', cost: 800000, currency: 'COP', frequency: 'monthly', billingDay: 1, nextCharge: '2026-03-01', paymentMethod: 'Transferencia bancaria', status: 'active', createdAt: '2025-03-01T00:00:00Z' },
    { id: 'p3', name: 'AWS (Amazon Web Services)', category: 'Hosting', cost: 347, currency: 'USD', frequency: 'monthly', billingDay: 5, nextCharge: '2026-02-15', paymentMethod: 'Tarjeta corporativa Visa', billingLink: 'https://console.aws.amazon.com/billing', status: 'active', createdAt: '2024-11-01T00:00:00Z' },
    { id: 'p4', name: 'Mailchimp', category: 'Email', cost: 99, currency: 'USD', frequency: 'monthly', billingDay: 20, nextCharge: '2026-02-20', status: 'active', createdAt: '2025-01-15T00:00:00Z' },
    { id: 'p5', name: 'Adobe Creative Cloud', category: 'Diseño', cost: 54.99, currency: 'USD', frequency: 'monthly', billingDay: 10, nextCharge: '2026-02-10', paymentMethod: 'PayPal', status: 'active', createdAt: '2025-02-01T00:00:00Z' },
    { id: 'p6', name: 'GoDaddy Dominio', category: 'Dominios', cost: 25, currency: 'USD', frequency: 'annual', billingDay: 15, nextCharge: '2026-03-15', status: 'active', notes: 'Dominio principal empresa.com', createdAt: '2024-03-15T00:00:00Z' },
    { id: 'p7', name: 'Slack Business+', category: 'Comunicación', cost: 120, currency: 'USD', frequency: 'monthly', billingDay: 8, nextCharge: '2026-02-08', status: 'active', createdAt: '2025-05-01T00:00:00Z' },
    { id: 'p8', name: 'Semrush', category: 'Ads', cost: 129, currency: 'USD', frequency: 'monthly', billingDay: 22, nextCharge: '2026-02-22', status: 'paused', notes: 'Pausado temporalmente hasta nueva campaña', createdAt: '2025-07-01T00:00:00Z' },
  ];

  const samplePayments: PaymentRecord[] = [
    { id: 'pay1', platformId: 'p1', platformName: 'Google Workspace', paymentDate: '2026-02-01', periodCovered: 'Febrero 2026', amount: 14, currency: 'USD' },
    { id: 'pay2', platformId: 'p7', platformName: 'Slack Business+', paymentDate: '2026-02-08', periodCovered: 'Febrero 2026', amount: 120, currency: 'USD' },
    { id: 'pay3', platformId: 'p3', platformName: 'AWS', paymentDate: '2026-01-05', periodCovered: 'Enero 2026', amount: 312, currency: 'USD' },
    { id: 'pay4', platformId: 'p2', platformName: 'HubSpot CRM', paymentDate: '2026-01-01', periodCovered: 'Enero 2026', amount: 800000, currency: 'COP' },
    { id: 'pay5', platformId: 'p4', platformName: 'Mailchimp', paymentDate: '2026-01-20', periodCovered: 'Enero 2026', amount: 99, currency: 'USD' },
    { id: 'pay6', platformId: 'p5', platformName: 'Adobe Creative Cloud', paymentDate: '2026-01-10', periodCovered: 'Enero 2026', amount: 54.99, currency: 'USD' },
    { id: 'pay7', platformId: 'p1', platformName: 'Google Workspace', paymentDate: '2026-01-15', periodCovered: 'Enero 2026', amount: 14, currency: 'USD' },
  ];

  set(KEYS.reports, sampleReports);
  set(KEYS.platforms, samplePlatforms);
  set(KEYS.payments, samplePayments);
  set(KEYS.config, { reminderDays: [7, 1] });
  localStorage.setItem(KEYS.initialized, '1');
}
