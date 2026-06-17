import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "http://localhost:8080";

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscription, unsubscribe, reminderMinutes, timezone } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: "Missing subscription data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (unsubscribe) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeReminderMinutes = Number.isFinite(reminderMinutes) ? Number(reminderMinutes) : 10;
    const safeTimezone = typeof timezone === "string" && timezone.trim() ? timezone.trim() : "UTC";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys?.p256dh || "",
        keys_auth: subscription.keys?.auth || "",
        reminder_minutes: safeReminderMinutes,
        timezone: safeTimezone,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
