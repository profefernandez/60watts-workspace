import { NextRequest, NextResponse } from "next/server";

// ── Profé AI Chat Route ──
// Pluggable AI connector — supports Anthropic now, LaunchLemonade later
// Set AI_PROVIDER env var to switch providers

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, system } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const provider = process.env.AI_PROVIDER || "anthropic";

    if (provider === "anthropic") {
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

    // LaunchLemonade placeholder — add provider branch here when API docs available
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
