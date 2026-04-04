import { NextRequest, NextResponse } from "next/server";
import { getDecryptedKey } from "@/lib/crypto";
import { scanInput, checkRateLimit, logInjectionEvent } from "@/lib/ai-guard";
import { recordSuccess, recordFailure, getAvailableProvider, FALLBACK_CHAINS } from "@/lib/api-health";

function getUserId(): string {
  return process.env.DEFAULT_USER_ID || "00000000-0000-0000-0000-000000000001";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query string is required" }, { status: 400 });
    }

    const userId = getUserId();
    const rateResult = checkRateLimit(userId);
    if (!rateResult.allowed) {
      return NextResponse.json({ results: [] }, { status: 429 });
    }

    const scan = scanInput(query, []);
    if (scan.action === "block") {
      checkRateLimit(userId, true);
      logInjectionEvent({ severity: "hard", provider: "youtube", patternsMatched: scan.patternsMatched, userId, actionTaken: "blocked" });
      return NextResponse.json({ results: [] });
    }
    if (scan.action === "flag") {
      checkRateLimit(userId, true);
      logInjectionEvent({ severity: "soft", provider: "youtube", patternsMatched: scan.patternsMatched, userId, actionTaken: "flagged" });
    }

    const provider = getAvailableProvider(FALLBACK_CHAINS.youtube);
    if (!provider) {
      return NextResponse.json({ results: [] });
    }

    const keys = await getDecryptedKey("anthropic");
    const apiKey = keys?.key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }

    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model, max_tokens: 1000,
        messages: [{ role: "user", content: `Search YouTube for videos about: "${query}"\n\nReturn exactly 6 results as a JSON array: [{"title":"Video Title","channelName":"Channel","videoId":"the_youtube_video_id","description":"brief description"}]\n\nUse real, valid YouTube video IDs. Respond with ONLY the JSON array.` }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) recordFailure("anthropic", "rate_limit");
      else if (status === 401) recordFailure("anthropic", "auth_error");
      else recordFailure("anthropic", "server_error");
      return NextResponse.json({ results: [] });
    }

    recordSuccess("anthropic");
    const data = await response.json();
    let txt = "";
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) txt += block.text;
    }

    try {
      const cleaned = txt.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const results = Array.isArray(parsed)
          ? parsed.filter((v: Record<string, unknown>) => v.videoId && v.title)
          : [];
        return NextResponse.json({ results });
      }
      return NextResponse.json({ results: [] });
    } catch {
      return NextResponse.json({ results: [] });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
