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
      return NextResponse.json({ results: [{ title: "Rate Limited", summary: rateResult.reason, source: "" }] }, { status: 429 });
    }

    const scan = scanInput(query, []);
    if (scan.action === "block") {
      checkRateLimit(userId, true);
      logInjectionEvent({ severity: "hard", provider: "anthropic", patternsMatched: scan.patternsMatched, userId, actionTaken: "blocked" });
      return NextResponse.json({ results: [{ title: "Request Blocked", summary: "I can't process that request. Please rephrase your query.", source: "" }] });
    }
    if (scan.action === "flag") {
      checkRateLimit(userId, true);
      logInjectionEvent({ severity: "soft", provider: "anthropic", patternsMatched: scan.patternsMatched, userId, actionTaken: "flagged" });
    }

    const provider = getAvailableProvider(FALLBACK_CHAINS.research);
    if (!provider) {
      return NextResponse.json({ results: [{ title: "Service Unavailable", summary: "Research services are currently unreachable.", source: "" }] });
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
        messages: [{ role: "user", content: `Research the following topic: ${query}\n\nProvide 4-6 key findings. Format your response as a JSON array: [{"title":"Finding Title","summary":"2-3 sentence summary","source":"source name or url"}]\n\nRespond with ONLY the JSON array.` }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) recordFailure("anthropic", "rate_limit");
      else if (status === 401) recordFailure("anthropic", "auth_error");
      else recordFailure("anthropic", "server_error");
      return NextResponse.json({ results: [{ title: "Error", summary: `Search returned status ${status}. Try again.`, source: "" }] });
    }

    recordSuccess("anthropic");
    const data = await response.json();
    let txt = "";
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) txt += block.text;
    }

    if (!txt.trim()) {
      return NextResponse.json({ results: [{ title: "No Results", summary: "Search did not return results. Try a different query.", source: "" }] });
    }

    try {
      const cleaned = txt.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const results = Array.isArray(parsed)
          ? parsed.map((item: Record<string, unknown>) => ({
              title: String(item.title || "Finding"),
              summary: String(item.summary || item.description || ""),
              source: String(item.source || item.url || ""),
            }))
          : [{ title: "Results", summary: cleaned, source: "" }];
        return NextResponse.json({ results });
      }
      return NextResponse.json({ results: [{ title: "Research Results", summary: cleaned.slice(0, 1500), source: "Web Search" }] });
    } catch {
      return NextResponse.json({ results: [{ title: "Research Results", summary: txt.slice(0, 1500), source: "Web Search" }] });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
