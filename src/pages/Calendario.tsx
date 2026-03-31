import { useState, useMemo } from 'react';
import { Calendar, Plus, Trash2, Star, PartyPopper } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// Colombian holidays (fixed & moveable for 2025/2026 — approximate)
const COLOMBIAN_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Año Nuevo' },
  { month: 1, day: 6, name: 'Día de los Reyes Magos' },
  { month: 3, day: 24, name: 'Día de San José' },
  { month: 4, day: 17, name: 'Jueves Santo' },
  { month: 4, day: 18, name: 'Viernes Santo' },
  { month: 5, day: 1, name: 'Día del Trabajo' },
  { month: 6, day: 2, name: 'Ascensión del Señor' },
  { month: 6, day: 23, name: 'Corpus Christi' },
  { month: 6, day: 30, name: 'Sagrado Corazón' },
  { month: 7, day: 20, name: 'Día de la Independencia' },
  { month: 8, day: 7, name: 'Batalla de Boyacá' },
  { month: 8, day: 18, name: 'Asunción de la Virgen' },
  { month: 10, day: 13, name: 'Día de la Raza' },
  { month: 11, day: 3, name: 'Todos los Santos' },
  { month: 11, day: 17, name: 'Independencia de Cartagena' },
  { month: 12, day: 8, name: 'Inmaculada Concepción' },
  { month: 12, day: 25, name: 'Navidad' },
];

interface SpecialDate {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  color: string;
}

const STORAGE_KEY = 'cic_special_dates';
const DATE_COLORS = [
  { label: 'Verde', value: 'primary' },
  { label: 'Azul', value: 'accent' },
  { label: 'Amarillo', value: 'warning' },
  { label: 'Rojo', value: 'destructive' },
  { label: 'Gris', value: 'muted' },
];

const colorMap: Record<string, string> = {
  primary: 'bg-primary/20 text-primary border-primary/30',
  accent: 'bg-accent/20 text-accent border-accent/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  destructive: 'bg-destructive/20 text-destructive border-destructive/30',
  muted: 'bg-muted text-muted-foreground border-border',
};

const dotColorMap: Record<string, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

function loadSpecialDates(): SpecialDate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSpecialDates(dates: SpecialDate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

export default function CalendarioPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>(loadSpecialDates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('primary');
  const { toast } = useToast();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Index holidays by "MM-DD"
  const holidayMap = useMemo(() => {
    const m = new Map<string, string>();
    COLOMBIAN_HOLIDAYS.forEach(h => {
      m.set(`${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`, h.name);
    });
    return m;
  }, []);

  // Index special dates by date string
  const specialMap = useMemo(() => {
    const m = new Map<string, SpecialDate[]>();
    specialDates.forEach(sd => {
      const arr = m.get(sd.date) || [];
      arr.push(sd);
      m.set(sd.date, arr);
    });
    return m;
  }, [specialDates]);

  function openAddDialog(dateStr: string) {
    setSelectedDate(dateStr);
    setNewName('');
    setNewColor('primary');
    setDialogOpen(true);
  }

  function handleAdd() {
    if (!newName.trim()) return;
    const nd: SpecialDate = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      date: selectedDate,
      name: newName.trim(),
      color: newColor,
    };
    const updated = [...specialDates, nd];
    setSpecialDates(updated);
    saveSpecialDates(updated);
    setDialogOpen(false);
    toast({ title: 'Fecha especial agregada' });
  }

  function handleDelete(id: string) {
    const updated = specialDates.filter(s => s.id !== id);
    setSpecialDates(updated);
    saveSpecialDates(updated);
    toast({ title: 'Fecha eliminada' });
  }

  function renderMonth(monthIdx: number) {
    const daysInMonth = getDaysInMonth(year, monthIdx);
    const firstDay = getFirstDayOfMonth(year, monthIdx);
    const cells: React.ReactNode[] = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e-${i}`} className="h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mmdd = `${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = holidayMap.get(mmdd);
      const specials = specialMap.get(dateStr) || [];
      const isToday = dateStr === todayStr;
      const isWeekend = (firstDay + day - 1) % 7 >= 5;

      cells.push(
        <div
          key={day}
          onClick={() => openAddDialog(dateStr)}
          className={`relative h-8 flex items-center justify-center rounded cursor-pointer text-xs font-medium transition-all duration-150
            ${isToday ? 'bg-primary text-primary-foreground font-bold ring-2 ring-primary/50' : ''}
            ${!isToday && holiday ? 'bg-destructive/15 text-destructive' : ''}
            ${!isToday && !holiday && isWeekend ? 'text-muted-foreground/60' : ''}
            ${!isToday && !holiday && !isWeekend ? 'text-foreground hover:bg-secondary' : ''}
            ${holiday ? 'hover:bg-destructive/25' : ''}
          `}
          title={holiday ? `🎉 ${holiday}` : specials.length > 0 ? specials.map(s => s.name).join(', ') : undefined}
        >
          {day}
          {/* Dots for events */}
          {(holiday || specials.length > 0) && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
              {holiday && <span className="w-1 h-1 rounded-full bg-destructive" />}
              {specials.slice(0, 2).map(s => (
                <span key={s.id} className={`w-1 h-1 rounded-full ${dotColorMap[s.color] || 'bg-primary'}`} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Card key={monthIdx} className="card-metallic">
        <CardContent className="p-3">
          <h3 className="text-sm font-bold text-foreground mb-2">{MONTH_NAMES[monthIdx]}</h3>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Upcoming events list
  const upcomingEvents = useMemo(() => {
    const events: { date: string; name: string; type: 'holiday' | 'special'; color?: string; id?: string }[] = [];

    // Add holidays for this year
    COLOMBIAN_HOLIDAYS.forEach(h => {
      const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      events.push({ date: dateStr, name: h.name, type: 'holiday' });
    });

    // Add special dates for this year
    specialDates.filter(s => s.date.startsWith(`${year}-`)).forEach(s => {
      events.push({ date: s.date, name: s.name, type: 'special', color: s.color, id: s.id });
    });

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [year, specialDates]);

  // Filter to show upcoming from today or all for selected year
  const filteredEvents = useMemo(() => {
    if (year === today.getFullYear()) {
      return upcomingEvents.filter(e => e.date >= todayStr).slice(0, 12);
    }
    return upcomingEvents.slice(0, 12);
  }, [upcomingEvents, year, todayStr, today]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendario Anual</h1>
            <p className="text-sm text-muted-foreground">Festivos colombianos y fechas especiales</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>&larr;</Button>
          <span className="text-lg font-bold font-mono-data text-foreground min-w-[60px] text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)}>&rarr;</Button>
          <Button variant="outline" size="sm" onClick={() => setYear(today.getFullYear())}>Hoy</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
          </div>
        </div>

        {/* Sidebar: upcoming events */}
        <div className="lg:w-72 shrink-0 space-y-3">
          {/* Legend */}
          <Card className="card-metallic">
            <CardContent className="p-3">
              <h3 className="text-sm font-bold text-foreground mb-2">Leyenda</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Festivo colombiano</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Fecha especial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/50" />
                  <span className="text-muted-foreground">Hoy</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="card-metallic">
            <CardContent className="p-3">
              <h3 className="text-sm font-bold text-foreground mb-2">
                {year === today.getFullYear() ? 'Próximos eventos' : `Eventos ${year}`}
              </h3>
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay eventos próximos</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredEvents.map((ev, i) => {
                    const [, m, d] = ev.date.split('-');
                    return (
                      <div key={`${ev.date}-${i}`} className="flex items-start gap-2 group">
                        <span className="text-[10px] font-mono-data text-muted-foreground mt-0.5 shrink-0 w-10">
                          {d}/{m}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{ev.name}</p>
                        </div>
                        {ev.type === 'holiday' ? (
                          <PartyPopper className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="h-3 w-3 text-primary mt-0.5" />
                            {ev.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar esta fecha?</AlertDialogTitle>
                                    <AlertDialogDescription>Se eliminará "{ev.name}"</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(ev.id!)}>Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add special date dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar fecha especial</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Fecha: <span className="font-mono-data font-semibold text-foreground">{selectedDate}</span>
          </p>
          <div className="space-y-3">
            <Input
              placeholder="Nombre del evento"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_COLORS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColorMap[c.value]}`} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!newName.trim()}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
