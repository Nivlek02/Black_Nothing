Deno.serve(async (req) => {
  const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || req.headers.get("origin") || "https://blacknothing.vercel.app";

  const corsHeaders = {
    "Access-Control-Allow-Origin": APP_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

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
      return new Response(JSON.stringify({ error: "GROQ_API_KEY no configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = financeContext;
    const fmt = (n: number) => "$" + (n?.toLocaleString() ?? "0");
    let fin = "";

    if (ctx) {
      fin = `\n══════════════════════════════════\nDATOS FINANCIEROS COMPLETOS\n══════════════════════════════════\n`;

      fin += `\n── RESUMEN ──\n`;
      fin += `Ingresos: ${fmt(ctx.totalIncome)} | Gastos: ${fmt(ctx.totalExpense)} | Ahorros: ${fmt(ctx.totalSavings)}\n`;
      fin += `Deudas: ${fmt(ctx.totalDebts)} | TC: ${fmt(ctx.ccBalance)} | Disponible: ${fmt(ctx.disponible)} | Cuentas: ${fmt(ctx.totalAccountBalance)}\n`;

      if (ctx.incomes?.length) {
        fin += `\n── INGRESOS (${ctx.incomes.length}) ──\n`;
        for (const i of ctx.incomes) fin += `  ${(i.created_at||"").slice(0,10)} | ${i.category} | ${fmt(i.amount)} | ${i.description||"-"}\n`;
      }
      if (ctx.expenses?.length) {
        fin += `\n── GASTOS (${ctx.expenses.length}) ──\n`;
        for (const e of ctx.expenses) fin += `  ${(e.created_at||"").slice(0,10)} | ${e.category} | ${fmt(e.amount)} | ${e.description||"-"}\n`;
      }
      if (ctx.ccTransactions?.length) {
        fin += `\n── TARJETA CREDITO (${ctx.ccTransactions.length}) ──\n`;
        for (const t of ctx.ccTransactions) {
          const tp = t.transaction_type === "purchase" ? "Compra" : "Pago";
          fin += `  ${(t.created_at||"").slice(0,10)} | ${tp} | ${t.category} | ${fmt(t.amount)} | ${t.description||"-"}\n`;
        }
      }
      if (ctx.debts?.length) {
        fin += `\n── DEUDAS (${ctx.debts.length}) ──\n`;
        for (const d of ctx.debts) fin += `  ${d.name} | Total: ${fmt(d.total_amount)} | Resta: ${fmt(d.remaining_amount)} | Vence: ${(d.due_date||"").slice(0,10)} | ${d.status}\n`;
      }
      if (ctx.savings?.length) {
        fin += `\n── AHORROS (${ctx.savings.length}) ──\n`;
        for (const s of ctx.savings) fin += `  ${s.name} | ${fmt(s.current_amount)} / ${fmt(s.target_amount)}\n`;
      }
      if (ctx.bankAccounts?.length) {
        fin += `\n── CUENTAS (${ctx.bankAccounts.length}) ──\n`;
        for (const a of ctx.bankAccounts) fin += `  ${a.name} | Inicial: ${fmt(a.initial_balance)}\n`;
      }
      if (ctx.upcomingPayments?.length) {
        fin += `\n── PROXIMOS PAGOS (${ctx.upcomingPayments.length}) ──\n`;
        for (const p of ctx.upcomingPayments) {
          fin += `  ${(p.due_date||"").slice(0,10)} | ${p.name} | ${fmt(p.amount)} | ${p.category} | ${p.is_paid ? "Pagado" : "Pendiente"}\n`;
        }
      }
    }

    const systemPrompt = `Eres Marine II, asistente financiera personal experta en finanzas para Colombia.

Tienes ACCESO TOTAL a todos los datos del usuario: ingresos, gastos, TC, deudas, ahorros, cuentas y pagos con fechas y montos especificos.

Puedes responder preguntas como:
- "Cuanto gaste el 30 de junio?"
- "Cuales fueron mis ingresos de julio?"
- "En que he gastado mas este mes?"
- "Cuanto debo en total?"
- "Cuando vence mi deuda X?"
- Recomendaciones personalizadas.

Usa SIEMPRE los datos que te doy. No inventes cifras. Usa español de Colombia, lenguaje cálido pero profesional.

DATOS DEL USUARIO:
${fin}`;

    console.log("Consultando Groq...");
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("Groq error:", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "Error Groq", detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    return new Response(JSON.stringify({ reply: data.choices?.[0]?.message?.content ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { "Access-Control-Allow-Origin": APP_ORIGIN, "Content-Type": "application/json" },
    });
  }
});
