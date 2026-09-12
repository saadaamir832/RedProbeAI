// AI Proxy Edge Function
// Proxies chat-completion requests to external AI APIs (OpenAI, Anthropic, custom)
// so the browser never hits CORS restrictions. The API key is passed at runtime
// from the UI and is never stored server-side.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProxyRequest {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  provider?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ProxyRequest;

    // Validate required fields
    if (!body.endpoint || typeof body.endpoint !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.apiKey || typeof body.apiKey !== "string") {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Security: only allow HTTPS endpoints
    if (!body.endpoint.startsWith("https://")) {
      return new Response(JSON.stringify({ error: "Only HTTPS endpoints are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the request to the target API
    const provider = body.provider || "openai";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Anthropic uses a different header scheme
    if (provider === "anthropic") {
      headers["x-api-key"] = body.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["Authorization"] = `Bearer ${body.apiKey}`;
    }

    const payload: Record<string, unknown> = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
    };

    // Anthropic uses a different field name for max tokens
    if (provider === "anthropic") {
      payload.max_tokens = 1024;
    }

    const upstream = await fetch(body.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await upstream.text();

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: `Upstream API returned ${upstream.status}`,
          detail: responseText.slice(0, 500),
        }),
        {
          status: upstream.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse and normalize the response to extract the text content
    let content = "";
    try {
      const data = JSON.parse(responseText);
      content =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.content?.[0]?.text ??
        data?.output ??
        data?.response ??
        "";
      if (!content) content = JSON.stringify(data);
    } catch {
      content = responseText;
    }

    return new Response(
      JSON.stringify({ content: String(content) }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal proxy error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
