const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "http://localhost:8080";

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, financeContext } = await req.json();
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'messages requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const financialSummary = financeContext ? `
DATOS FINANCIEROS DEL USUARIO:
- Ingresos totales: $${financeContext.totalIncome?.toLocaleString() ?? 'N/A'}
- Gastos totales: $${financeContext.totalExpense?.toLocaleString() ?? 'N/A'}
- Ahorros totales: $${financeContext.totalSavings?.toLocaleString() ?? 'N/A'}
- Deudas totales: $${financeContext.totalDebts?.toLocaleString() ?? 'N/A'}
- Saldo tarjeta de crédito: $${financeContext.ccBalance?.toLocaleString() ?? 'N/A'}
- Dinero disponible: $${financeContext.disponible?.toLocaleString() ?? 'N/A'}
- Total en cuentas: $${financeContext.totalAccountBalance?.toLocaleString() ?? 'N/A'}
` : '';

    const systemPrompt = `Eres Marine II, una asistente financiera personal experta en finanzas personales para Colombia.

Tu rol:
- Ayudas al usuario a entender y mejorar sus finanzas personales.
- Respondes preguntas sobre ingresos, gastos, ahorros, deudas, tarjeta de crédito y presupuesto.
- Das consejos prácticos y personalizados basados en los datos financieros del usuario.
- Explicas conceptos financieros de forma clara y sencilla.
- Si el usuario pide recomendaciones, las das basadas en su situación real.
- Usas lenguaje cálido pero profesional, en español de Colombia.
- Cuando te pregunten algo que no puedes responder con los datos disponibles, lo dices honestamente.
- NO inventes datos financieros. Usa SOLO la información proporcionada.
- Si te preguntan por algo fuera del ámbito financiero, redirige amablemente al tema.

${financialSummary}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
