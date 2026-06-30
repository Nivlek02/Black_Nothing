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

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY no configurada en Supabase. Agrégala en Edge Functions > marine-ii-chat > Environment variables.' }), {
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

    // Convertir mensajes al formato de Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const m of messages) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'Error al consultar Gemini', detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
