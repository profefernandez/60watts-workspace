import { NextRequest, NextResponse } from "next/server";

// ── Research Panel API Route ──
// Uses LaunchLemonade for search and synthesis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query string is required" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.LAUNCHLEMONADE_TOP_SEARCH_API_KEY ||
      process.env.LAUNCHLEMONADE_CONTEXTUAL_SEARCH_API_KEY ||
      process.env.LAUNCHLEMONADE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "LAUNCHLEMONADE_TOP_SEARCH_API_KEY (or fallback LaunchLemonade key) is not configured",
        },
        { status: 500 }
      );
    }

    const apiUrl =
      process.env.LAUNCHLEMONADE_API_URL ||
      "https://api.launchlemonade.com/v1/messages";
    const model =
      process.env.LAUNCHLEMONADE_TOP_SEARCH_MODEL ||
      process.env.LAUNCHLEMONADE_CONTEXTUAL_SEARCH_MODEL ||
      process.env.LAUNCHLEMONADE_MODEL ||
      "launchlemonade-search-default";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Research the following topic: ${query}\n\nProvide 4-6 key findings. Format your response as a JSON array: [{"title":"Finding Title","summary":"2-3 sentence summary","source":"source name or url"}]\n\nRespond with ONLY the JSON array.`,
          },
        ],
        tools: [{ type: "web_search", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { results: [{ title: "Error", summary: `Search returned status ${response.status}. Try again.`, source: "" }] }
      );
    }

    const data = await response.json();
    let txt = "";
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) txt += block.text;
    }

    if (!txt.trim()) {
      return NextResponse.json({
        results: [{ title: "No Results", summary: "Search did not return results. Try a different query.", source: "" }],
      });
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
      return NextResponse.json({
        results: [{ title: "Research Results", summary: cleaned.slice(0, 1500), source: "Web Search" }],
      });
    } catch {
      return NextResponse.json({
        results: [{ title: "Research Results", summary: txt.slice(0, 1500), source: "Web Search" }],
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
