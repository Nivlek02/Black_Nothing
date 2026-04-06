import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Native Web Push implementation for Deno ---

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

async function importECDSAKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(base64Key);
  // VAPID private key is 32 bytes raw
  return crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8FromRaw(raw),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

function buildPkcs8FromRaw(rawKey: Uint8Array): ArrayBuffer {
  // Wrap a 32-byte raw EC private key in PKCS#8 DER format for P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // We don't include the public key part - just the private key
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

async function createVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKeyBase64: string,
  expSeconds = 86400
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

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // Parse DER
    rawSig = derToRaw(sigBytes);
  }

  return `${unsignedToken}.${base64UrlEncode(rawSig)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 <len>
  // R
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  // S
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

// Encrypt payload using WebPush (RFC 8291 / aes128gcm)
async function encryptPayload(
  p256dhKey: string,
  authSecret: string,
  payload: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payload);

  // Generate local ECDH keypair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    base64UrlDecode(p256dhKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  const authSecretBytes = base64UrlDecode(authSecret);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM
  const authInfo = enc.encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + 65 + 65);
  authInfoFull.set(authInfo);
  authInfoFull.set(base64UrlDecode(p256dhKey), authInfo.length);
  authInfoFull.set(localPublicKeyRaw, authInfo.length + 65);

  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, { name: "HKDF" }, false, ["deriveBits"]);
  const prk = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: authSecretBytes, info: authInfoFull },
      ikmKey,
      256
    )
  );

  // Derive CEK and nonce
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HKDF" }, false, ["deriveBits"]);
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
      prkKey,
      128
    )
  );

  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
      prkKey,
      96
    )
  );

  // Pad the payload (add delimiter byte 0x02 + optional padding)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // Encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = 65;
  header.set(localPublicKeyRaw, 21);

  const encrypted = new Uint8Array(header.length + ciphertext.length);
  encrypted.set(header);
  encrypted.set(ciphertext, header.length);

  return { encrypted, salt, localPublicKey: localPublicKeyRaw };
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

  const jwt = await createVapidJwt(audience, vapidSubject, vapidPublicKey, vapidPrivateKey);
  const { encrypted } = await encryptPayload(
    subscription.keys_p256dh,
    subscription.keys_auth,
    payload
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "high",
    },
    body: encrypted,
  });

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(new Error(`Push failed: ${response.status} ${text}`), {
      statusCode: response.status,
    });
  }

  return response;
}

// --- Main handler ---

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

    // Check if this is a test request
    let isTest = false;
    try {
      const body = await req.json();
      isTest = body?.test === true;
    } catch { /* no body = cron call */ }

    // Get all subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError || !subscriptions?.length) {
      console.log("No subscriptions found");
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If test mode, send a test notification to all subscribers
    if (isTest) {
      let sentCount = 0;
      for (const sub of subscriptions) {
        try {
          const payload = JSON.stringify({
            title: "🔔 Notificación de prueba",
            body: "¡Las notificaciones están funcionando correctamente!",
            tag: "test",
            url: "/agenda",
          });
          await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
          sentCount++;
          console.log(`Test notification sent to ${sub.endpoint.slice(0, 50)}...`);
        } catch (err) {
          console.error(`Test send failed:`, err.message);
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            console.log(`Removed expired subscription ${sub.id}`);
          }
        }
      }
      return new Response(JSON.stringify({ sent: sentCount, test: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get upcoming tasks for today
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: tasks, error: taskError } = await supabase
      .from("agenda_tasks")
      .select("*")
      .eq("date", today)
      .eq("completed", false);

    if (taskError || !tasks?.length) {
      console.log(`No tasks for ${today}`);
      return new Response(JSON.stringify({ sent: 0, message: "No upcoming tasks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const nowMs = now.getTime();

    for (const sub of subscriptions) {
      const reminderMs = (sub.reminder_minutes || 10) * 60 * 1000;

      for (const task of tasks) {
        const [hours, minutes] = task.start_time.split(":").map(Number);
        const taskTime = new Date(now);
        taskTime.setHours(hours, minutes, 0, 0);

        const diff = taskTime.getTime() - nowMs;

        // Send if task is within reminder window (future, within reminderMs)
        if (diff > 0 && diff <= reminderMs) {
          try {
            const payload = JSON.stringify({
              title: `📅 ${task.title}`,
              body: `En ${Math.round(diff / 60000)} min — ${task.start_time} a ${task.end_time}${task.description ? ` · ${task.description}` : ""}`,
              tag: `task-${task.id}`,
              url: "/agenda",
            });

            await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
            sentCount++;
            console.log(`Sent reminder for "${task.title}" to sub ${sub.id}`);
          } catch (err) {
            console.error(`Failed to send to ${sub.endpoint.slice(0, 50)}:`, err.message);
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }
      }
    }

    console.log(`Checked ${tasks.length} tasks, sent ${sentCount} notifications`);
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
