import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto utilities
async function generatePushPayload(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
) {
  // Use web-push compatible approach via fetch to the push endpoint
  // For simplicity, we'll use the web-push npm package via esm.sh
  const webpush = await import("https://esm.sh/web-push@3.6.7");

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys_p256dh,
        auth: subscription.keys_auth,
      },
    },
    payload
  );
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

    // Get all subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get upcoming tasks within each subscription's reminder window
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: tasks, error: taskError } = await supabase
      .from("agenda_tasks")
      .select("*")
      .eq("date", today)
      .eq("completed", false);

    if (taskError || !tasks?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No upcoming tasks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const sub of subscriptions) {
      const reminderMs = (sub.reminder_minutes || 10) * 60 * 1000;

      for (const task of tasks) {
        const [hours, minutes] = task.start_time.split(":").map(Number);
        const taskTime = new Date(now);
        taskTime.setHours(hours, minutes, 0, 0);

        const diff = taskTime.getTime() - now.getTime();

        // Send notification if the task is within the reminder window
        // (between 0 and reminderMs milliseconds from now)
        if (diff > 0 && diff <= reminderMs) {
          try {
            const payload = JSON.stringify({
              title: `📅 ${task.title}`,
              body: `En ${Math.round(diff / 60000)} min — ${task.start_time} a ${task.end_time}${task.description ? ` · ${task.description}` : ""}`,
              tag: `task-${task.id}`,
              url: "/agenda",
            });

            await generatePushPayload(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
            sentCount++;
          } catch (err) {
            console.error(`Failed to send to ${sub.endpoint}:`, err.message);
            // Remove invalid subscriptions
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }
      }
    }

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
