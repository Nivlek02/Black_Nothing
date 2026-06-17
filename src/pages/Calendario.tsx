import { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, Star, PartyPopper, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Festivos oficiales Colombia 2026 (días no laborales - Ley Emiliani)
const COLOMBIAN_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Año Nuevo' },
  { month: 1, day: 12, name: 'Día de los Reyes Magos' },
  { month: 3, day: 23, name: 'Día de San José' },
  { month: 4, day: 2, name: 'Jueves Santo' },
  { month: 4, day: 3, name: 'Viernes Santo' },
  { month: 5, day: 1, name: 'Día del Trabajo' },
  { month: 5, day: 18, name: 'Ascensión del Señor' },
  { month: 6, day: 8, name: 'Corpus Christi' },
  { month: 6, day: 15, name: 'Sagrado Corazón de Jesús' },
  { month: 6, day: 29, name: 'San Pedro y San Pablo' },
  { month: 7, day: 20, name: 'Independencia de Colombia' },
  { month: 8, day: 7, name: 'Batalla de Boyacá' },
  { month: 8, day: 17, name: 'Asunción de la Virgen' },
  { month: 10, day: 12, name: 'Día de la Diversidad Étnica y Cultural' },
  { month: 11, day: 2, name: 'Todos los Santos' },
  { month: 11, day: 16, name: 'Independencia de Cartagena' },
  { month: 12, day: 8, name: 'Inmaculada Concepción' },
  { month: 12, day: 25, name: 'Navidad' },
];

// Celebraciones locales (no son festivos, pero se celebran)
const LOCAL_CELEBRATIONS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 31, name: 'Día de la Publicidad' },
  { month: 2, day: 14, name: 'Día de San Valentín' },
  { month: 3, day: 8, name: 'Día Internacional de la Mujer' },
  { month: 3, day: 19, name: 'Día del Hombre' },
  { month: 4, day: 22, name: 'Día de la Tierra' },
  { month: 4, day: 23, name: 'Día del Idioma' },
  { month: 4, day: 26, name: 'Día del Niño' },
  { month: 5, day: 10, name: 'Día de la Madre' },
  { month: 5, day: 15, name: 'Día del Maestro' },
  { month: 6, day: 21, name: 'Día del Padre' },
  { month: 7, day: 4, name: 'Día del Médico' },
  { month: 8, day: 1, name: 'Día del Ejército Nacional' },
  { month: 9, day: 7, name: 'Día del Amor y la Amistad' },
  { month: 10, day: 31, name: 'Halloween' },
  { month: 11, day: 1, name: 'Día de los Angelitos' },
  { month: 12, day: 7, name: 'Día de las Velitas' },
  { month: 12, day: 24, name: 'Nochebuena' },
  { month: 12, day: 31, name: 'Nochevieja' },
];

interface SpecialDate {
  id: string;
  date: string;
  name: string;
  color: string;
}

const DATE_COLORS = [
  { label: 'Verde', value: 'primary' },
  { label: 'Azul', value: 'accent' },
  { label: 'Amarillo', value: 'warning' },
  { label: 'Rojo', value: 'destructive' },
  { label: 'Gris', value: 'muted' },
];

const dotColorMap: Record<string, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sunday
}

export default function CalendarioPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('primary');
  const [editingDate, setEditingDate] = useState<SpecialDate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpecialDate | null>(null);
  const { toast } = useToast();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const loadDates = useCallback(async () => {
    const { data, error } = await supabase.from('special_dates').select('*').order('date');
    if (error) { console.error('Error loading dates:', error); return; }
    if (data) {
      setSpecialDates(data.map(r => ({ id: r.id, date: r.date, name: r.name, color: r.color })));
    }
  }, []);

  useEffect(() => { loadDates(); }, [loadDates]);

  const holidayMap = useMemo(() => {
    const m = new Map<string, string>();
    COLOMBIAN_HOLIDAYS.forEach(h => {
      m.set(`${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`, h.name);
    });
    return m;
  }, []);

  const celebrationMap = useMemo(() => {
    const m = new Map<string, string>();
    LOCAL_CELEBRATIONS.forEach(c => {
      m.set(`${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`, c.name);
    });
    return m;
  }, []);

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
    setEditingDate(null);
    setSelectedDate(dateStr);
    setNewName('');
    setNewColor('primary');
    setDialogOpen(true);
  }

  function openEditDialog(sd: SpecialDate) {
    setEditingDate(sd);
    setSelectedDate(sd.date);
    setNewName(sd.name);
    setNewColor(sd.color);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!newName.trim()) return;
    if (editingDate) {
      const { error } = await supabase.from('special_dates').update({ name: newName.trim(), color: newColor }).eq('id', editingDate.id);
      if (error) { console.error('Error updating date:', error); toast({ title: 'Error al actualizar', variant: 'destructive' }); return; }
      toast({ title: 'Fecha actualizada' });
    } else {
      const { error } = await supabase.from('special_dates').insert({ date: selectedDate, name: newName.trim(), color: newColor });
      if (error) { console.error('Error inserting date:', error); toast({ title: 'Error al agregar', variant: 'destructive' }); return; }
      toast({ title: 'Fecha especial agregada' });
    }
    setDialogOpen(false);
    loadDates();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('special_dates').delete().eq('id', deleteTarget.id);
    if (error) { console.error('Error deleting date:', error); toast({ title: 'Error al eliminar', variant: 'destructive' }); return; }
    setDeleteTarget(null);
    toast({ title: 'Fecha eliminada' });
    loadDates();
  }

  function renderMonth(monthIdx: number) {
    const daysInMonth = getDaysInMonth(year, monthIdx);
    const firstDay = getFirstDayOfMonth(year, monthIdx);
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e-${i}`} className="h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mmdd = `${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = holidayMap.get(mmdd);
      const celebration = celebrationMap.get(mmdd);
      const specials = specialMap.get(dateStr) || [];
      const isToday = dateStr === todayStr;
      const dayOfWeek = (firstDay + day - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const titleParts: string[] = [];
      if (holiday) titleParts.push(`🚫 ${holiday}`);
      if (celebration) titleParts.push(`🎉 ${celebration}`);
      if (specials.length > 0) titleParts.push(...specials.map(s => s.name));

      cells.push(
        <div
          key={day}
          onClick={() => openAddDialog(dateStr)}
          className={`relative h-8 flex items-center justify-center rounded cursor-pointer text-xs font-medium transition-all duration-150
            ${isToday ? 'bg-primary text-primary-foreground font-bold ring-2 ring-primary/50' : ''}
            ${!isToday && holiday ? 'bg-destructive/15 text-destructive' : ''}
            ${!isToday && !holiday && celebration ? 'bg-accent/20 text-accent-foreground' : ''}
            ${!isToday && !holiday && !celebration && isWeekend ? 'text-muted-foreground/60' : ''}
            ${!isToday && !holiday && !celebration && !isWeekend ? 'text-foreground hover:bg-secondary' : ''}
            ${holiday ? 'hover:bg-destructive/25' : ''}
            ${!holiday && celebration ? 'hover:bg-accent/30' : ''}
          `}
          title={titleParts.length > 0 ? titleParts.join(' · ') : undefined}
        >
          {day}
          {(holiday || celebration || specials.length > 0) && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
              {holiday && <span className="w-1 h-1 rounded-full bg-destructive" />}
              {celebration && <span className="w-1 h-1 rounded-full bg-accent" />}
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
          <div className="grid grid-cols-7 gap-0.5">{cells}</div>
        </CardContent>
      </Card>
    );
  }

  const upcomingEvents = useMemo(() => {
    const events: { date: string; name: string; type: 'holiday' | 'celebration' | 'special'; color?: string; id?: string; sd?: SpecialDate }[] = [];
    COLOMBIAN_HOLIDAYS.forEach(h => {
      const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      events.push({ date: dateStr, name: h.name, type: 'holiday' });
    });
    LOCAL_CELEBRATIONS.forEach(c => {
      const dateStr = `${year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
      events.push({ date: dateStr, name: c.name, type: 'celebration' });
    });
    specialDates.filter(s => s.date.startsWith(`${year}-`)).forEach(s => {
      events.push({ date: s.date, name: s.name, type: 'special', color: s.color, id: s.id, sd: s });
    });
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }, [year, specialDates]);

  const filteredEvents = useMemo(() => {
    if (year === today.getFullYear()) {
      return upcomingEvents.filter(e => e.date >= todayStr).slice(0, 12);
    }
    return upcomingEvents.slice(0, 12);
  }, [upcomingEvents, year, todayStr, today]);

  return (
    <div className="space-y-4">
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
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
          </div>
        </div>

        <div className="lg:w-72 shrink-0 space-y-3">
          <Card className="card-metallic">
            <CardContent className="p-3">
              <h3 className="text-sm font-bold text-foreground mb-2">Leyenda</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Festivo (no laborable)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <span className="text-muted-foreground">Celebración</span>
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
                        <span className="text-[10px] font-mono-data text-muted-foreground mt-0.5 shrink-0 w-10">{d}/{m}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{ev.name}</p>
                        </div>
                        {ev.type === 'holiday' ? (
                          <PartyPopper className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                        ) : ev.type === 'celebration' ? (
                          <Star className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => ev.sd && openEditDialog(ev.sd)}>
                              <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => ev.sd && setDeleteTarget(ev.sd)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
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

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDate ? 'Editar fecha especial' : 'Agregar fecha especial'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Fecha: <span className="font-mono-data font-semibold text-foreground">{selectedDate}</span>
          </p>
          <div className="space-y-3">
            <Input placeholder="Nombre del evento" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button onClick={handleSave} disabled={!newName.trim()}>{editingDate ? 'Guardar' : 'Agregar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta fecha?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará "{deleteTarget?.name}"</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
