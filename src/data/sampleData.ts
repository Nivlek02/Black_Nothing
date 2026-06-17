import { set } from './store';

const KEYS = {
  reports: 'cdc-reports',
  platforms: 'cdc-platforms',
  payments: 'cdc-payments',
  config: 'cdc-config',
  subjects: 'cdc-subjects',
  activities: 'cdc-activities',
  initialized: 'cdc-init',
};

export function loadSampleData(): void {
  const now = '2026-02-10T10:00:00.000Z';

  const sampleReports = [
    {
      id: 'r1',
      title: 'Informe Quincenal - Feb 1-15, 2026',
      startDate: '2026-02-01',
      endDate: '2026-02-15',
      responsible: 'Carlos Méndez',
      status: 'draft',
      summary: 'Periodo de implementación de nuevas funcionalidades en el módulo de facturación.',
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
      summary: 'Se completó la fase 1 de migración de datos.',
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
      summary: 'Inicio de año con planificación estratégica Q1.',
      tasks: [
        { id: 't9', title: 'Planificación estratégica Q1', description: 'Definición de OKRs y roadmap del primer trimestre', project: 'Gestión', priority: 'high', status: 'done' },
        { id: 't10', title: 'Auditoría de seguridad', description: 'Revisión completa de políticas de acceso y permisos', project: 'Seguridad', priority: 'high', status: 'done' },
      ],
      createdAt: '2026-01-01T08:00:00.000Z',
      updatedAt: '2026-01-15T18:00:00.000Z',
    },
  ];

  const samplePlatforms = [
    { id: 'p1', name: 'Google Workspace', category: 'Productividad', cost: 14, currency: 'USD', frequency: 'monthly', billingDay: 15, nextCharge: '2026-02-15', paymentMethod: 'Tarjeta corporativa Visa', billingLink: 'https://admin.google.com/billing', status: 'active', createdAt: '2025-06-01T00:00:00Z' },
    { id: 'p2', name: 'HubSpot CRM', category: 'CRM', cost: 800000, currency: 'COP', frequency: 'monthly', billingDay: 1, nextCharge: '2026-03-01', paymentMethod: 'Transferencia bancaria', status: 'active', createdAt: '2025-03-01T00:00:00Z' },
    { id: 'p3', name: 'AWS (Amazon Web Services)', category: 'Hosting', cost: 347, currency: 'USD', frequency: 'monthly', billingDay: 5, nextCharge: '2026-02-15', paymentMethod: 'Tarjeta corporativa Visa', billingLink: 'https://console.aws.amazon.com/billing', status: 'active', createdAt: '2024-11-01T00:00:00Z' },
    { id: 'p4', name: 'Mailchimp', category: 'Email', cost: 99, currency: 'USD', frequency: 'monthly', billingDay: 20, nextCharge: '2026-02-20', status: 'active', createdAt: '2025-01-15T00:00:00Z' },
    { id: 'p5', name: 'Adobe Creative Cloud', category: 'Diseño', cost: 54.99, currency: 'USD', frequency: 'monthly', billingDay: 10, nextCharge: '2026-02-10', paymentMethod: 'PayPal', status: 'active', createdAt: '2025-02-01T00:00:00Z' },
    { id: 'p6', name: 'GoDaddy Dominio', category: 'Dominios', cost: 25, currency: 'USD', frequency: 'annual', billingDay: 15, nextCharge: '2026-03-15', status: 'active', notes: 'Dominio principal empresa.com', createdAt: '2024-03-15T00:00:00Z' },
    { id: 'p7', name: 'Slack Business+', category: 'Comunicación', cost: 120, currency: 'USD', frequency: 'monthly', billingDay: 8, nextCharge: '2026-02-08', status: 'active', createdAt: '2025-05-01T00:00:00Z' },
    { id: 'p8', name: 'Semrush', category: 'Ads', cost: 129, currency: 'USD', frequency: 'monthly', billingDay: 22, nextCharge: '2026-02-22', status: 'paused', notes: 'Pausado temporalmente hasta nueva campaña', createdAt: '2025-07-01T00:00:00Z' },
  ];

  const samplePayments = [
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
