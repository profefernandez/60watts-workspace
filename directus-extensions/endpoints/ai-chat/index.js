// ── 60 Watts of Clarity — Directus AI Chat Endpoint ──
// Route: POST /workspace/ai/chat
// Proxies chat requests to Anthropic or LaunchLemonade

"use strict";

module.exports = function registerEndpoint(router, { services, database, getSchema }) {
  const { ItemsService } = services;

  router.post("/", async (req, res) => {
    try {
      const { message, history = [], context = {}, provider = "anthropic" } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      // ── Resolve user & fetch API key ──
      const accountability = req.accountability;
      if (!accountability || !accountability.user) {
        return res.status(401).json({ error: "Authentication required." });
      }

      const schema = await getSchema();
      const keysService = new ItemsService("user_api_keys", {
        knex: database,
        schema,
        accountability: { admin: true },
      });

      const keys = await keysService.readByQuery({
        filter: {
          user_id: { _eq: accountability.user },
          provider: { _eq: provider },
        },
        limit: 1,
      });

      if (!keys || keys.length === 0) {
        return res.status(400).json({
          error: `No API key found for provider "${provider}". Add one in Settings.`,
        });
      }

      const apiKey = keys[0].api_key;

      // ── System prompt ──
      const systemPrompt = [
        "You are Profé, a warm and clear AI assistant for non-technical professionals.",
        "You work inside 60 Watts of Clarity, a workspace platform for learning, writing, and prototyping.",
        "Be encouraging, concise, and jargon-free. Use simple language.",
        "When asked to build something, provide clean HTML/CSS prototypes wrapped in CODE_START and CODE_END markers.",
        "When the user asks for images, describe what you would create but note that image generation happens client-side.",
        context.canvas_blocks
          ? `The user's canvas currently has these blocks: ${context.canvas_blocks}`
          : "",
        context.kb_files
          ? `Files in their knowledge base: ${context.kb_files}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      // ── Provider dispatch ──
      if (provider === "anthropic") {
        const response = await handleAnthropic(apiKey, systemPrompt, message, history);
        return res.json({ response });
      }

      if (provider === "launchlemonade") {
        const response = await handleLaunchLemonade(apiKey, message, history, context);
        return res.json({ response });
      }

      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    } catch (err) {
      console.error("[ai-chat] Error:", err);
      return res.status(500).json({
        error: "AI request failed. Please try again.",
      });
    }
  });
};

// ── Anthropic Messages API ──
async function handleAnthropic(apiKey, systemPrompt, message, history) {
  const messages = [];

  // Map history into Anthropic format
  for (const msg of history) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: "user", content: message });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Extract text from content blocks
  const text = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return text;
}

// ── LaunchLemonade (poll-based) ──
async function handleLaunchLemonade(apiKey, message, history, context) {
  const BASE = "https://api.launchlemonade.com/v1";

  // Start the run
  const runRes = await fetch(`${BASE}/run_assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      message,
      history,
      context,
    }),
  });

  if (!runRes.ok) {
    const errText = await runRes.text();
    throw new Error(`LaunchLemonade run_assistant error ${runRes.status}: ${errText}`);
  }

  const runData = await runRes.json();
  const runId = runData.run_id;

  // Poll for completion — up to 6 times, every 10 seconds
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(10000);

    const pollRes = await fetch(`${BASE}/get_run_assistant?run_id=${runId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();

    if (pollData.status === "completed" && pollData.response) {
      return pollData.response;
    }

    if (pollData.status === "failed") {
      throw new Error("LaunchLemonade assistant run failed.");
    }
  }

  throw new Error("LaunchLemonade response timed out after 60 seconds.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
