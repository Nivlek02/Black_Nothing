import { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getConfig, saveConfig } from '@/data/store';
import { AppConfig } from '@/data/models';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig>(() => getConfig());
  const [daysInput, setDaysInput] = useState(config.reminderDays.join(', '));

  const handleSave = () => {
    const days = daysInput
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => b - a);

    if (days.length === 0) {
      toast({ title: 'Error', description: 'Ingresa al menos un número de días válido', variant: 'destructive' });
      return;
    }

    const updated = { ...config, reminderDays: days };
    setConfig(updated);
    saveConfig(updated);
    setDaysInput(days.join(', '));
    toast({ title: 'Configuración guardada' });
  };

  const handleReset = () => {
    localStorage.clear();
    toast({ title: 'Datos restablecidos', description: 'Recarga la página para ver los datos de ejemplo' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
      </div>

      <Card className="card-metallic">
        <CardHeader>
          <CardTitle className="text-base">Recordatorios de Facturación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Días antes del cobro para alertar (separados por coma)
            </label>
            <Input
              value={daysInput}
              onChange={e => setDaysInput(e.target.value)}
              placeholder="Ej: 7, 3, 1"
              className="bg-secondary/50 max-w-xs"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Actualmente: alertas a {config.reminderDays.join(' y ')} días antes del cobro
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Guardar configuración
          </Button>
        </CardContent>
      </Card>

      <Card className="card-metallic border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona de peligro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Restablecer todos los datos a los valores de ejemplo. Esta acción eliminará todos tus datos guardados.
          </p>
          <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleReset}>
            Restablecer datos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
