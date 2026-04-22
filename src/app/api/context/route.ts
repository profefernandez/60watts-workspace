import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// ── Context Engine API Route ──
// Powered by LaunchLemonade — reads canvas + KB, returns inserts and suggestions

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`context:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests — please wait a moment" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
      );
    }

    const body = await request.json();
    const { canvasContent, kbContent, searchQuery } = body;

    if (!canvasContent || typeof canvasContent !== "string") {
      return NextResponse.json(
        { error: "canvasContent string is required" },
        { status: 400 }
      );
    }

    if (canvasContent.length > 50000) {
      return NextResponse.json(
        { error: "Canvas content too long (max 50,000 characters)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LAUNCHLEMONADE_API_KEY;
    const lemonadeId =
      process.env.LAUNCHLEMONADE_CONTEXT_ID ||
      process.env.LAUNCHLEMONADE_PROFE_ID;

    if (!apiKey) {
      return NextResponse.json(
        { error: "LAUNCHLEMONADE_API_KEY is not configured" },
        { status: 500 }
      );
    }
    if (!lemonadeId) {
      return NextResponse.json(
        { error: "No LaunchLemonade agent configured for Context Engine" },
        { status: 500 }
      );
    }

    let message = `CONTEXT ENGINE REQUEST\n\n`;
    message += `=== DOCUMENT (Canvas) ===\n${canvasContent}\n\n`;

    if (kbContent && typeof kbContent === "string" && kbContent.trim()) {
      message += `=== KNOWLEDGE BASE FILES ===\n${kbContent.slice(0, 20000)}\n\n`;
    }

    if (searchQuery && typeof searchQuery === "string") {
      message += `=== USER SEARCH QUERY ===\n${searchQuery}\n\n`;
    }

    message += `=== INSTRUCTIONS ===
Analyze the document above. Find material that supports, elevates, or fills gaps in the writing.

Sources to consider:
- The Knowledge Base files provided above
- Your own training knowledge
- Any relevant facts, studies, or references

For each finding, classify it:
- INSERT: High relevance — directly supports a specific point in the document
- SUGGEST: Medium relevance — tangentially useful, the user might want it later
- Skip anything with low relevance.

Respond with ONLY a JSON object in this exact format:
{
  "inserted": [
    { "content": "paragraph to insert into the document", "sourceType": "kb", "sourceTitle": "Source name" }
  ],
  "suggestions": [
    { "sourceType": "research", "sourceId": "", "title": "Finding title", "content": "excerpt or summary", "relevanceNote": "Why this might be useful" }
  ]
}

If no relevant material is found, return: { "inserted": [], "suggestions": [] }
Respond with ONLY the JSON, no other text.`;

    const payload: Record<string, unknown> = {
      lemonade_id: lemonadeId,
      message,
    };

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
    const text = data.response || "";

    try {
      const cleaned = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          inserted: Array.isArray(parsed.inserted) ? parsed.inserted : [],
          suggestions: Array.isArray(parsed.suggestions)
            ? parsed.suggestions
            : [],
        });
      }
    } catch {
      // JSON parse failed — return the raw text as a suggestion
    }

    if (text.trim()) {
      return NextResponse.json({
        inserted: [],
        suggestions: [
          {
            sourceType: "web",
            sourceId: "",
            title: "Context Analysis",
            content: text.slice(0, 2000),
            relevanceNote: "AI analysis of your document",
          },
        ],
      });
    }

    return NextResponse.json({ inserted: [], suggestions: [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
