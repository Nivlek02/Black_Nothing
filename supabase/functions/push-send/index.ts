import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildPkcs8FromRaw(rawKey: Uint8Array): ArrayBuffer {
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string,
  expSeconds = 12 * 60 * 60
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expSeconds,
    sub: subject,
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const rawKey = base64UrlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8FromRaw(rawKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      enc.encode(unsignedToken)
    )
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
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
    date: `${parts.year}-${parts.month}-${parts.day}`,
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

function naiveTimestampFromLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, second, 0);
}

function getCandidateDates(now: Date) {
  return [-2, -1, 0, 1, 2].map((offset) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  });
}

async function sendWebPush(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);

  return await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      TTL: "86400",
      Urgency: "high",
      "Content-Type": "application/json",
    },
    body: payload,
  });
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

    const vapidPublicKey = "BK-DOBfC4q1PwRPSlfvc-ChGBwGCmdgUkmjUAEFnVG7ginW58Ca3E2gyOY_YygG-exgdlXA657i9yzEEAsviIGI";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = "mailto:admin@comandocentral.app";

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
          const response = await sendWebPush(
            sub,
            JSON.stringify({
              title: "🔔 Notificación de prueba",
              body: "La prueba de notificaciones se envió correctamente.",
              tag: "test-notification",
              url: "/agenda",
            }),
            vapidPublicKey,
            vapidPrivateKey,
            vapidSubject
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw Object.assign(new Error(errorText || `HTTP ${response.status}`), { statusCode: response.status });
          }

          await response.text();
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
        const taskTimestamp = naiveTimestampFromLocalDateTime(task.date, `${task.start_time}:00`);
        const diff = taskTimestamp - nowLocalTimestamp;

        if (diff > 0 && diff <= reminderMs) {
          try {
            const response = await sendWebPush(
              sub,
              JSON.stringify({
                title: `📅 ${task.title}`,
                body: `En ${Math.max(1, Math.round(diff / 60000))} min — ${task.start_time} a ${task.end_time}${task.description ? ` · ${task.description}` : ""}`,
                tag: `task-${task.id}`,
                url: "/agenda",
              }),
              vapidPublicKey,
              vapidPrivateKey,
              vapidSubject
            );

            if (!response.ok) {
              const errorText = await response.text();
              throw Object.assign(new Error(errorText || `HTTP ${response.status}`), { statusCode: response.status });
            }

            await response.text();
            sentCount++;
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
