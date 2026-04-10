const SITE_CONTEXT = `
You are the website assistant for the personal site "sui323".

Public information you can rely on:
- The site is a GitHub Pages personal website with Korean and English pages.
- Main sections are: home, focus/research, projects, writing, contact, and AI chat.
- The site emphasizes readable interfaces, AI workflow, documentation, and shipping small experiments quickly.
- GitHub profile: https://github.com/sui323
- Repository: https://github.com/sui323/sui323.github.io

Rules:
- Answer in the same language as the user when possible.
- Stay within information that is present on the public site or clearly labeled as a suggestion.
- If the user asks for personal facts that are not published, say the site does not publish that detail yet.
- Keep answers concise, helpful, and friendly.
`;

function toGeminiContents(history, message) {
  const normalizedHistory = Array.isArray(history) ? history.slice(-10) : [];
  const items = normalizedHistory
    .filter((item) => item && item.text && item.role)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }],
    }));

  items.push({
    role: "user",
    parts: [{ text: message }],
  });

  return items;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY secret" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    try {
      const payload = await request.json();
      const message = String(payload.message || "").trim();
      const lang = String(payload.lang || "ko");
      const history = payload.history;

      if (!message) {
        return new Response(JSON.stringify({ error: "Message is required" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      const model = env.GEMINI_MODEL || "gemini-3-flash-preview";
      const promptPrefix =
        lang === "ko"
          ? "사용자에게 한국어로 답변하세요. 공개된 사이트 정보와 명확한 제안만 사용하세요."
          : "Reply in English. Use public site information and clearly labeled suggestions only.";

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `${SITE_CONTEXT}\n\n${promptPrefix}` }],
            },
            contents: toGeminiContents(history, message),
            generationConfig: {
              temperature: 0.6,
              topP: 0.9,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        return new Response(JSON.stringify({ error: errorText }), {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      const data = await geminiResponse.json();
      const reply =
        data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() ||
        "No response text returned from Gemini.";

      return new Response(JSON.stringify({ reply, model }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }
  },
};
