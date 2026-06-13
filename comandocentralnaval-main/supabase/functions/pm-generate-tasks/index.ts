import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Subtask { title: string; description?: string }
interface Story { title: string; description?: string; subtasks?: Subtask[] }
interface Epic { title: string; description?: string; stories?: Story[] }
interface AIResult { epics: Epic[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { requirement } = await req.json();
    if (!requirement?.name) {
      return new Response(JSON.stringify({ error: 'requirement.name requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), { status: 500, headers: corsHeaders });

    const prompt = `Eres un Project Manager experto. A partir del siguiente requerimiento genera una estructura jerárquica de trabajo en JSON: épicas → historias de usuario → subtareas técnicas.

Requerimiento:
- Nombre: ${requirement.name}
- Cliente: ${requirement.client || 'N/A'}
- Prioridad: ${requirement.priority || 'media'}
- Descripción: ${requirement.description || ''}
- Objetivo de negocio: ${requirement.business_goal || ''}
- Complejidad: ${requirement.complexity || ''}
- Riesgos: ${requirement.risks || ''}
- Dependencias: ${requirement.dependencies || ''}
- Áreas: ${requirement.areas || ''}

Devuelve entre 1 y 3 épicas, cada una con 2 a 5 historias y cada historia con 2 a 6 subtareas técnicas concretas. Títulos cortos y accionables en español.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Responde SIEMPRE con JSON válido siguiendo el esquema solicitado, sin texto adicional.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_breakdown',
            description: 'Entrega el desglose en épicas, historias y subtareas.',
            parameters: {
              type: 'object',
              properties: {
                epics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      stories: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            title: { type: 'string' },
                            description: { type: 'string' },
                            subtasks: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  title: { type: 'string' },
                                  description: { type: 'string' },
                                },
                                required: ['title'],
                              },
                            },
                          },
                          required: ['title'],
                        },
                      },
                    },
                    required: ['title'],
                  },
                },
              },
              required: ['epics'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_breakdown' } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: AIResult = { epics: [] };
    if (args) {
      try { parsed = JSON.parse(args); } catch { /* ignore */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
