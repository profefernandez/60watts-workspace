import { NextRequest, NextResponse } from "next/server";

// ── Profé AI Chat Route ──
// Powered exclusively by LaunchLemonade

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agentId, threadId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LAUNCHLEMONADE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "LAUNCHLEMONADE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // LaunchLemonade expects the current message string, not the full array
    const latestMessage = messages[messages.length - 1]?.content || "";

    // LaunchLemonade integration
    const response = await fetch("https://api.launchlemonade.app/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        lemonade_id: agentId,
        message: latestMessage,
        conversation_id: threadId,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `LaunchLemonade API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.response || "";
    return NextResponse.json({ content: text });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
