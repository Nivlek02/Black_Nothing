const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "http://localhost:8080";

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, financeContext } = await req.json();
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "messages requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY no configurada en Supabase. Agrega el secret en Edge Functions > marine-ii-chat > Secrets." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const financialSummary = financeContext ? `
DATOS FINANCIEROS DEL USUARIO:
- Ingresos totales: $${financeContext.totalIncome?.toLocaleString() ?? "N/A"}
- Gastos totales: $${financeContext.totalExpense?.toLocaleString() ?? "N/A"}
- Ahorros totales: $${financeContext.totalSavings?.toLocaleString() ?? "N/A"}
- Deudas totales: $${financeContext.totalDebts?.toLocaleString() ?? "N/A"}
- Saldo tarjeta de cr\u00e9dito: $${financeContext.ccBalance?.toLocaleString() ?? "N/A"}
- Dinero disponible: $${financeContext.disponible?.toLocaleString() ?? "N/A"}
- Total en cuentas: $${financeContext.totalAccountBalance?.toLocaleString() ?? "N/A"}
` : "";

    const systemPrompt = `Eres Marine II, una asistente financiera personal experta en finanzas personales para Colombia.

Tu rol:
- Ayudas al usuario a entender y mejorar sus finanzas personales.
- Respondes preguntas sobre ingresos, gastos, ahorros, deudas, tarjeta de cr\u00e9dito y presupuesto.
- Das consejos pr\u00e1cticos y personalizados basados en los datos financieros del usuario.
- Explicas conceptos financieros de forma clara y sencilla.
- Si el usuario pide recomendaciones, las das basadas en su situaci\u00f3n real.
- Usas lenguaje c\u00e1lido pero profesional, en espa\u00f1ol de Colombia.
- Cuando te pregunten algo que no puedes responder con los datos disponibles, lo dices honestamente.
- NO inventes datos financieros. Usa SOLO la informaci\u00f3n proporcionada.
- Si te preguntan por algo fuera del \u00e1mbito financiero, redirige amablemente al tema.

${financialSummary}`;

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "Error al consultar Groq", detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
