import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BK-DOBfC4q1PwRPSlfvc-ChGBwGCmdgUkmjUAEFnVG7ginW58Ca3E2gyOY_YygG-exgdlXA657i9yzEEAsviIGI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    if (window.self !== window.top) return null;
  } catch {
    return null;
  }

  if (window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com')) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

export async function syncPushSubscription(reminderMinutes = 10): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    await supabase.functions.invoke('push-subscribe', {
      body: {
        subscription: subscription.toJSON(),
        reminderMinutes,
        timezone: getDeviceTimezone(),
      },
    });
  } catch (err) {
    console.error('Push subscription sync failed:', err);
  }
}

export async function subscribeToPush(reminderMinutes = 10): Promise<PushSubscription | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    await supabase.functions.invoke('push-subscribe', {
      body: {
        subscription: subscription.toJSON(),
        reminderMinutes,
        timezone: getDeviceTimezone(),
      },
    });

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const subJson = subscription.toJSON();
      await subscription.unsubscribe();
      await supabase.functions.invoke('push-subscribe', {
        body: { subscription: subJson, unsubscribe: true },
      });
    }
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}

export async function isCurrentlySubscribed(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
] as const;
