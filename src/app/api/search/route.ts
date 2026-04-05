import { NextRequest, NextResponse } from "next/server";
import { getDecryptedKey } from "@/lib/crypto";

const LL_URL = "https://api.launchlemonade.app/v1/chat";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const llKeys = await getDecryptedKey("launchlemonade");
    if (!llKeys?.key) {
      return NextResponse.json(
        { error: "LaunchLemonade API key not configured" },
        { status: 401 }
      );
    }

    const searchKeys = await getDecryptedKey("ll_search");
    if (!searchKeys?.extra) {
      return NextResponse.json(
        { error: "Search Agent ID not configured. Set it in Settings." },
        { status: 401 }
      );
    }

    const llRes = await fetch(LL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llKeys.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lemonade_id: searchKeys.extra,
        message: `Search for: ${query.trim()}. Return results as a JSON array of objects with fields: title (string), snippet (string), source_url (string), source_domain (string). Return ONLY the JSON array, no other text.`,
      }),
    });

    if (!llRes.ok) {
      const status = llRes.status;
      const label =
        status === 429
          ? "Rate limited"
          : status === 401
          ? "Invalid API key"
          : "Search failed";
      return NextResponse.json({ error: label }, { status });
    }

    const data = await llRes.json();
    const raw = data.response || "";

    let results: unknown[] = [];
    try {
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      results = JSON.parse(jsonStr);
    } catch {
      results = [];
    }

    const cards = (Array.isArray(results) ? results : [])
      .filter(
        (r: any) => r && typeof r.title === "string" && typeof r.source_url === "string"
      )
      .map((r: any, i: number) => ({
        id: `search-${Date.now()}-${i}`,
        title: r.title || "",
        snippet: r.snippet || "",
        source_url: r.source_url || "",
        source_domain: r.source_domain || new URL(r.source_url).hostname,
      }));

    return NextResponse.json({ results: cards });
  } catch (err) {
    console.error("[/api/search]", err);
    return NextResponse.json(
      { error: "Search failed — check your connection and API key" },
      { status: 500 }
    );
  }
}
