// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, contextData, pageName } = await req.json()

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY environment variable')
    }

    const systemPrompt = `
      You are an expert Data Analyst for a Spa and Warehouse Business.
      You are analyzing the "${pageName}" dashboard.
      
      Here is the raw data currently visible on the user's screen (JSON format):
      ${JSON.stringify(contextData).slice(0, 8000)} 

      Your Job:
      1. Answer the user's question based strictly on this data.
      2. If the answer is not in the data, suggest they change the Date Filter or ask a relevant question.
      3. Be concise, professional, and insightful. Identify trends.
      4. Format your response with Markdown (bold for numbers).
    `

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://zen-warehouse.com", // Placeholder
        "X-Title": "WMS Dashboard",
      },
      body: JSON.stringify({
        "model": "deepseek/deepseek-chat",
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": message }
        ],
        "temperature": 0.3,
        "max_tokens": 1000
      })
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response."

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:0/functions/v1/ask-ai' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
