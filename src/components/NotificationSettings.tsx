import { useState, useEffect } from 'react';
import { BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  isPushSupported,
  getNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  isCurrentlySubscribed,
  syncPushSubscription,
  REMINDER_OPTIONS,
} from '@/lib/pushNotifications';

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const sup = isPushSupported();
      setSupported(sup);

      const saved = localStorage.getItem('reminder_minutes');
      const initialReminder = saved ? parseInt(saved, 10) : 10;
      setReminderMinutes(initialReminder);
      setPermission(getNotificationPermission());

      if (sup) {
        await registerServiceWorker();
        const sub = await isCurrentlySubscribed();
        setSubscribed(sub);

        if (sub) {
          await syncPushSubscription(initialReminder);
        }
      }
    };
    init();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        const sub = await subscribeToPush(reminderMinutes);
        if (sub) {
          setSubscribed(true);
          setPermission('granted');
          toast({ title: '🔔 Notificaciones activadas', description: 'Recibirás recordatorios de tus eventos.' });
        } else {
          setPermission(getNotificationPermission());
          if (getNotificationPermission() === 'denied') {
            toast({ title: 'Permisos denegados', description: 'Activa las notificaciones desde la configuración de tu navegador.', variant: 'destructive' });
          }
        }
      } else {
        await unsubscribeFromPush();
        setSubscribed(false);
        toast({ title: '🔕 Notificaciones desactivadas' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudieron configurar las notificaciones.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleReminderChange = async (value: string) => {
    const mins = parseInt(value, 10);
    setReminderMinutes(mins);
    localStorage.setItem('reminder_minutes', value);

    if (subscribed) {
      await syncPushSubscription(mins);
    }
  };

  if (!supported) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tu navegador no soporta notificaciones push. En iOS, agrega la app a tu pantalla de inicio primero (Safari → Compartir → Agregar a pantalla de inicio).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="push-toggle" className="text-sm">
            Recordatorios de eventos
          </Label>
          <Switch
            id="push-toggle"
            checked={subscribed}
            onCheckedChange={handleToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <p className="text-xs text-destructive">
            Los permisos fueron denegados. Actívalos desde la configuración de tu navegador o dispositivo.
          </p>
        )}

        {subscribed && (
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">Anticipación del recordatorio</Label>
            <Select value={String(reminderMinutes)} onValueChange={handleReminderChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {subscribed && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={testLoading}
            onClick={handleTestNotification}
          >
            {testLoading ? 'Enviando...' : '🔔 Enviar notificación de prueba'}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          {subscribed
            ? '✅ Recibirás notificaciones antes de tus eventos agendados.'
            : 'Activa para recibir recordatorios automáticos de tus eventos.'}
        </p>
      </CardContent>
    </Card>
  );
}
