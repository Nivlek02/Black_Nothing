import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { buildPushHTTPRequest } from "npm:@pushforge/builder@2.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BK-DOBfC4q1PwRPSlfvc-ChGBwGCmdgUkmjUAEFnVG7ginW58Ca3E2gyOY_YygG-exgdlXA657i9yzEEAsviIGI";
const VAPID_SUBJECT = "mailto:admin@comandocentral.app";

function base64UrlToBytes(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

function vapidJwkFromKeys(publicKey: string, privateKey: string) {
  const publicBytes = base64UrlToBytes(publicKey);
  const privateBytes = base64UrlToBytes(privateKey);

  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error("Invalid VAPID public key format");
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: publicKey.slice(0, 43),
    y: publicKey.slice(43),
    d: privateKey,
  };
}

function normalizeTimeZone(timeZone?: string) {
  const candidate = timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function localTimestamp(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}

function getCandidateDates(now: Date) {
  return [-2, -1, 0, 1, 2].map((offset) => {
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + offset);
    return next.toISOString().slice(0, 10);
  });
}

async function sendPush(
  vapidPrivateKey: string,
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: { title: string; body: string; tag: string; url: string }
) {
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: vapidJwkFromKeys(VAPID_PUBLIC_KEY, vapidPrivateKey),
    subscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys_p256dh,
        auth: subscription.keys_auth,
      },
    },
    message: {
      payload,
      adminContact: VAPID_SUBJECT,
      ttl: 60,
      urgency: "high",
    },
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw Object.assign(new Error(responseText || `HTTP ${response.status}`), {
      statusCode: response.status,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    let isTest = false;
    try {
      const body = await req.json();
      isTest = body?.test === true;
    } catch {
      isTest = false;
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isTest) {
      let sentCount = 0;

      for (const sub of subscriptions) {
        try {
          await sendPush(vapidPrivateKey, sub, {
            title: "🔔 Notificación de prueba",
            body: "La prueba de notificaciones se envió correctamente.",
            tag: `test-${sub.id}`,
            url: "/agenda",
          });
          sentCount++;
        } catch (err) {
          console.error(`Test send failed for ${sub.id}:`, err.message);
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      return new Response(JSON.stringify({ sent: sentCount, test: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const candidateDates = getCandidateDates(now);

    const { data: tasks, error: taskError } = await supabase
      .from("agenda_tasks")
      .select("*")
      .in("date", candidateDates)
      .eq("completed", false);

    if (taskError || !tasks?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No upcoming tasks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const sub of subscriptions) {
      const timeZone = normalizeTimeZone(sub.timezone);
      const reminderMs = (sub.reminder_minutes || 10) * 60 * 1000;
      const nowLocal = getTimeZoneParts(now, timeZone);
      const nowLocalTimestamp = Date.UTC(
        nowLocal.year,
        nowLocal.month - 1,
        nowLocal.day,
        nowLocal.hour,
        nowLocal.minute,
        nowLocal.second,
        0
      );

      for (const task of tasks) {
        const taskTimestamp = localTimestamp(task.date, task.start_time);
        const diff = taskTimestamp - nowLocalTimestamp;

        if (diff > 0 && diff <= reminderMs) {
          try {
            await sendPush(vapidPrivateKey, sub, {
              title: `📅 ${task.title}`,
              body: `En ${Math.max(1, Math.round(diff / 60000))} min — ${task.start_time} a ${task.end_time}${task.description ? ` · ${task.description}` : ""}`,
              tag: `task-${task.id}`,
              url: "/agenda",
            });
            sentCount++;
            console.log(`Sent reminder for ${task.id} with timezone ${timeZone}`);
          } catch (err) {
            console.error(`Failed to send to subscription ${sub.id}:`, err.message);
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }
      }
    }

    console.log(`Checked ${tasks.length} tasks across timezones, sent ${sentCount} notifications`);
    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push send error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
