import { NextRequest, NextResponse } from "next/server";

// ── Research Panel API Route ──
// Uses the user's own API key (passed from client, stored in Directus user_api_keys)
// Currently supports Anthropic Claude with web_search tool

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, apiKey: userApiKey, provider } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query string is required" },
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
              content: `Research the following topic: ${query}\n\nProvide 4-6 key findings. Format your response as a JSON array: [{"title":"Finding Title","summary":"2-3 sentence summary","source":"source name or url"}]\n\nRespond with ONLY the JSON array.`,
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
        return NextResponse.json({
          results: [
            {
              title: "Error",
              summary: `Search returned status ${status}. Try again.`,
              source: "",
            },
          ],
        });
      }

      const data = await response.json();
      let txt = "";
      for (const block of data.content || []) {
        if (block.type === "text" && block.text) txt += block.text;
      }

      if (!txt.trim()) {
        return NextResponse.json({
          results: [
            {
              title: "No Results",
              summary: "Search did not return results. Try a different query.",
              source: "",
            },
          ],
        });
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
            ? parsed.map((item: Record<string, unknown>) => ({
                title: String(item.title || "Finding"),
                summary: String(item.summary || item.description || ""),
                source: String(item.source || item.url || ""),
              }))
            : [{ title: "Results", summary: cleaned, source: "" }];
          return NextResponse.json({ results });
        }
        return NextResponse.json({
          results: [
            {
              title: "Research Results",
              summary: cleaned.slice(0, 1500),
              source: "Web Search",
            },
          ],
        });
      } catch {
        return NextResponse.json({
          results: [
            {
              title: "Research Results",
              summary: txt.slice(0, 1500),
              source: "Web Search",
            },
          ],
        });
      }
    }

    return NextResponse.json(
      { error: `Unsupported research provider: ${selectedProvider}` },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
