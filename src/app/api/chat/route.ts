import { NextRequest, NextResponse } from "next/server";

// ── Profé AI Chat Route ──
// Primary provider: LaunchLemonade (trained agent)
// Fallback: Anthropic (direct Claude API)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, messages, system } = body;

    const provider = process.env.AI_PROVIDER || "launchlemonade";

    if (provider === "launchlemonade") {
      const apiKey = process.env.LAUNCHLEMONADE_API_KEY;
      const lemonadeId = process.env.LAUNCHLEMONADE_PROFE_ID;

      if (!apiKey) {
        return NextResponse.json(
          { error: "LAUNCHLEMONADE_API_KEY is not configured" },
          { status: 500 }
        );
      }
      if (!lemonadeId) {
        return NextResponse.json(
          { error: "LAUNCHLEMONADE_PROFE_ID is not configured" },
          { status: 500 }
        );
      }

      const payload: Record<string, unknown> = {
        lemonade_id: lemonadeId,
        message: message || messages?.[messages.length - 1]?.content || "",
      };
      if (conversationId) {
        payload.conversation_id = conversationId;
      }

      const response = await fetch("https://api.launchlemonade.app/v1/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return NextResponse.json(
            { error: "Rate limited — please wait and try again" },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: `LaunchLemonade API error: ${status}` },
          { status }
        );
      }

      const data = await response.json();
      return NextResponse.json({
        content: data.response || "",
        conversationId: data.conversation_id || null,
        tokensUsed: data.tokens_used || null,
      });
    }

    if (provider === "anthropic") {
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { error: "messages array is required for Anthropic provider" },
          { status: 400 }
        );
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY is not configured" },
          { status: 500 }
        );
      }

      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system:
            system ||
            "You are Profé, an AI assistant for the 60 Watts of Clarity workspace platform. Help users with writing, research, prototyping, and knowledge management.",
          messages,
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Anthropic API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text =
        data.content?.map((c: { text?: string }) => c.text || "").join("") ||
        "";
      return NextResponse.json({ content: text });
    }

    return NextResponse.json(
      { error: `Unknown AI_PROVIDER: ${provider}` },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
