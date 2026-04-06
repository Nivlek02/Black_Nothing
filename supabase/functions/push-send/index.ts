import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { buildPushHTTPRequest } from "npm:@pushforge/builder@2.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BDDcejjFtPB-BrGNlRmOo8SgU5LOmGZQkMz0y0uwb4HwaP8piJWwj3C_QSyM2ef6IKcYCvzQkF-8J4b4FTSoXiU";
const VAPID_SUBJECT = "mailto:admin@comandocentral.app";

function base64UrlToBytes(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function vapidJwkFromKeys(publicKeyB64: string, privateKeyB64: string) {
  const pubBytes = base64UrlToBytes(publicKeyB64);
  const x = bytesToBase64Url(pubBytes.slice(1, 33));
  const y = bytesToBase64Url(pubBytes.slice(33, 65));
  return { kty: "EC", crv: "P-256", x, y, d: privateKeyB64 };
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
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
  };
}

function localTimestamp(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}

function getCandidateDates(now: Date) {
  return [-1, 0, 1].map((offset) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  });
}

async function sendPush(
  vapidPrivateKey: string,
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: { title: string; body: string; tag: string; url: string }
) {
  const jwk = vapidJwkFromKeys(VAPID_PUBLIC_KEY, vapidPrivateKey);
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: jwk,
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys_p256dh, auth: subscription.keys_auth },
    },
    message: { payload, adminContact: VAPID_SUBJECT, ttl: 60, urgency: "high" },
  });

  const response = await fetch(endpoint, { method: "POST", headers, body });
  const text = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error(text || `HTTP ${response.status}`), { statusCode: response.status });
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

    const now = new Date();
    const candidateDates = getCandidateDates(now);

    // Get tasks that have a reminder set, are not completed, and haven't been notified yet
    const { data: tasks, error: taskError } = await supabase
      .from("agenda_tasks")
      .select("*")
      .in("date", candidateDates)
      .eq("completed", false)
      .eq("notified", false)
      .gt("reminder_minutes", 0);

    if (taskError || !tasks?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No pending tasks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const notifiedTaskIds: string[] = [];

    for (const sub of subscriptions) {
      const tz = normalizeTimeZone(sub.timezone);
      const nowLocal = getTimeZoneParts(now, tz);
      const nowLocalTs = Date.UTC(
        nowLocal.year, nowLocal.month - 1, nowLocal.day,
        nowLocal.hour, nowLocal.minute, nowLocal.second, 0
      );

      for (const task of tasks) {
        // Use the task's own reminder_minutes
        const reminderMs = (task.reminder_minutes || 10) * 60 * 1000;
        const taskTs = localTimestamp(task.date, task.start_time);
        const diff = taskTs - nowLocalTs;

        if (diff > 0 && diff <= reminderMs) {
          try {
            await sendPush(vapidPrivateKey, sub, {
              title: `📅 ${task.title}`,
              body: `En ${Math.max(1, Math.round(diff / 60000))} min — ${task.start_time} a ${task.end_time}${task.description ? ` · ${task.description}` : ""}`,
              tag: `task-${task.id}`,
              url: "/agenda",
            });
            sentCount++;
            if (!notifiedTaskIds.includes(task.id)) {
              notifiedTaskIds.push(task.id);
            }
          } catch (err) {
            console.error(`Failed ${sub.id}:`, err.message);
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }
      }
    }

    // Mark tasks as notified so they don't get re-sent
    if (notifiedTaskIds.length > 0) {
      await supabase
        .from("agenda_tasks")
        .update({ notified: true })
        .in("id", notifiedTaskIds);
    }

    console.log(`${tasks.length} tasks checked, ${sentCount} sent, ${notifiedTaskIds.length} marked notified`);
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
