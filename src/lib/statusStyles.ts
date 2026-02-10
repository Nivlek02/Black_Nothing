export function reportStatusStyle(status: string): string {
  switch (status) {
    case 'draft': return 'bg-muted text-muted-foreground border-border';
    case 'review': return 'bg-warning/15 text-warning border-warning/20';
    case 'final': return 'bg-success/15 text-success border-success/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function taskStatusStyle(status: string): string {
  switch (status) {
    case 'pending': return 'bg-muted text-muted-foreground border-border';
    case 'in-progress': return 'bg-info/15 text-info border-info/20';
    case 'blocked': return 'bg-destructive/15 text-destructive border-destructive/20';
    case 'done': return 'bg-success/15 text-success border-success/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function priorityStyle(priority: string): string {
  switch (priority) {
    case 'low': return 'bg-muted text-muted-foreground border-border';
    case 'medium': return 'bg-warning/15 text-warning border-warning/20';
    case 'high': return 'bg-destructive/15 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function platformStatusStyle(status: string): string {
  switch (status) {
    case 'active': return 'bg-success/15 text-success border-success/20';
    case 'paused': return 'bg-warning/15 text-warning border-warning/20';
    case 'cancelled': return 'bg-destructive/15 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function chargeAlertStyle(days: number): { label: string; style: string } {
  if (days < 0) return { label: 'Vencida', style: 'bg-destructive/15 text-destructive border-destructive/20' };
  if (days === 0) return { label: 'Vence hoy', style: 'bg-destructive/15 text-destructive border-destructive/20 animate-radar-pulse' };
  if (days <= 7) return { label: `Vence en ${days}d`, style: 'bg-warning/15 text-warning border-warning/20' };
  return { label: `En ${days}d`, style: 'bg-muted text-muted-foreground' };
}
