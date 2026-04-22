import { NextRequest, NextResponse } from "next/server";

// ── Profé AI Chat Route ──
// Powered by LaunchLemonade — trained Profé agent

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message string is required" },
        { status: 400 }
      );
    }

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
      message,
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
