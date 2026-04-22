import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// ── YouTube Search API Route ──
// Uses the user's own API key (passed from client, stored in Directus user_api_keys)
// Currently supports Anthropic Claude with web_search tool

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`youtube:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests — please wait a moment" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
      );
    }

    const body = await request.json();
    const { query, apiKey: userApiKey, provider } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query string is required" },
        { status: 400 }
      );
    }

    if (query.length > 2000) {
      return NextResponse.json(
        { error: "Query too long (max 2,000 characters)" },
        { status: 400 }
      );
    }

    if (!userApiKey || typeof userApiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required — add your key in Settings" },
        { status: 400 }
      );
    }

    const selectedProvider = provider || "anthropic";

    if (selectedProvider === "anthropic") {
      const model = body.model || "claude-sonnet-4-20250514";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": userApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Search YouTube for videos about: "${query}"\n\nReturn exactly 6 results as a JSON array: [{"title":"Video Title","channelName":"Channel","videoId":"the_youtube_video_id","description":"brief description"}]\n\nUse real, valid YouTube video IDs. Respond with ONLY the JSON array.`,
            },
          ],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401) {
          return NextResponse.json(
            { error: "Invalid API key — check your key in Settings" },
            { status: 401 }
          );
        }
        return NextResponse.json({ results: [] });
      }

      const data = await response.json();
      let txt = "";
      for (const block of data.content || []) {
        if (block.type === "text" && block.text) txt += block.text;
      }

      try {
        const cleaned = txt
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const results = Array.isArray(parsed)
            ? parsed.filter(
                (v: Record<string, unknown>) => v.videoId && v.title
              )
            : [];
          return NextResponse.json({ results });
        }
        return NextResponse.json({ results: [] });
      } catch {
        return NextResponse.json({ results: [] });
      }
    }

    return NextResponse.json(
      { error: `Unsupported YouTube provider: ${selectedProvider}` },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
