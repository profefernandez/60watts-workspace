import { NextRequest, NextResponse } from "next/server";

// ── Profé AI Chat Route ──
// Uses LaunchLemonade for Profé conversations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, system }: { messages: unknown; system?: string } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.LAUNCHLEMONADE_PROFE_API_KEY ||
      process.env.LAUNCHLEMONADE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "LAUNCHLEMONADE_PROFE_API_KEY (or LAUNCHLEMONADE_API_KEY) is not configured",
        },
        { status: 500 }
      );
    }

    const apiUrl =
      process.env.LAUNCHLEMONADE_API_URL ||
      "https://api.launchlemonade.com/v1/messages";
    const model =
      process.env.LAUNCHLEMONADE_PROFE_MODEL ||
      process.env.LAUNCHLEMONADE_MODEL ||
      "launchlemonade-profe-default";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
        { error: `LaunchLemonade API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text =
      data.content?.map((c: { text?: string }) => c.text || "").join("") ||
      data.text ||
      "";
    return NextResponse.json({ content: text });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
