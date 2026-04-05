import { NextRequest, NextResponse } from "next/server";
import { getDecryptedKey } from "@/lib/crypto";

const LL_URL = "https://api.launchlemonade.app/v1/chat";
const MAX_CONTEXT_CHARS = 4000;

function truncateContext(blocks: any[], kbFiles: any[]): string {
  const blockText = blocks
    .slice(-20)
    .map((b: any) => b.content || "")
    .join("\n");
  const kbText = kbFiles
    .slice(0, 5)
    .map((f: any) => `[${f.name}]: ${(f.textContent || "").slice(0, 500)}`)
    .join("\n");
  const combined = `CANVAS:\n${blockText}\n\nKB FILES:\n${kbText}`;
  return combined.slice(0, MAX_CONTEXT_CHARS);
}

export async function POST(req: NextRequest) {
  try {
    const { canvasBlocks = [], kbFiles = [] } = await req.json();

    if (canvasBlocks.length === 0 && kbFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nothing to analyze yet. Try adding some content first, or use Go to search manually.",
        },
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

    const chatKeys = await getDecryptedKey("launchlemonade");
    const searchKeys = await getDecryptedKey("ll_search");

    if (!chatKeys?.extra) {
      return NextResponse.json(
        { error: "Profé Agent ID not configured" },
        { status: 401 }
      );
    }
    if (!searchKeys?.extra) {
      return NextResponse.json(
        { error: "Search Agent ID not configured. Set it in Settings." },
        { status: 401 }
      );
    }

    const context = truncateContext(canvasBlocks, kbFiles);

    const analyzeRes = await fetch(LL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llKeys.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lemonade_id: chatKeys.extra,
        message: `You are a research assistant. Analyze the user's workspace content below and generate 2-3 targeted search queries that would find information directly relevant to what they're working on. Return ONLY a JSON array of query strings, nothing else.

WORKSPACE CONTENT:
${context}`,
      }),
    });

    if (!analyzeRes.ok) {
      return NextResponse.json(
        { error: "Context analysis failed" },
        { status: analyzeRes.status }
      );
    }

    const analyzeData = await analyzeRes.json();
    let queries: string[] = [];
    try {
      const raw = (analyzeData.response || "")
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      queries = JSON.parse(raw);
    } catch {
      queries = [];
    }

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: "Could not generate search queries from your content" },
        { status: 422 }
      );
    }

    const searchPromises = queries.slice(0, 3).map((q: string) =>
      fetch(LL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${llKeys.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lemonade_id: searchKeys.extra,
          message: `Search for: ${q}. Return results as a JSON array of objects with fields: title (string), snippet (string), source_url (string), source_domain (string). Return ONLY the JSON array, no other text.`,
        }),
      }).then((r) => r.json())
    );

    const searchResults = await Promise.all(searchPromises);

    const allResults: any[] = [];
    for (const sr of searchResults) {
      try {
        const raw = (sr.response || "")
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) allResults.push(...parsed);
      } catch {
        /* skip unparseable results */
      }
    }

    const rankRes = await fetch(LL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llKeys.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lemonade_id: chatKeys.extra,
        message: `You are a research assistant. Given the user's workspace content and these search results, rank the top 6 most relevant results. For each, explain WHY it's relevant and suggest WHERE in the document it should go.

WORKSPACE CONTENT:
${context}

SEARCH RESULTS:
${JSON.stringify(allResults.slice(0, 15))}

Return ONLY a JSON array of objects with fields: title (string), snippet (string), source_url (string), source_domain (string), relevance (string - why this matters), suggested_location (string - where to place it). No other text.`,
      }),
    });

    if (!rankRes.ok) {
      const cards = allResults
        .filter((r: any) => r?.title && r?.source_url)
        .slice(0, 8)
        .map((r: any, i: number) => ({
          id: `ctx-${Date.now()}-${i}`,
          title: r.title || "",
          snippet: r.snippet || "",
          source_url: r.source_url || "",
          source_domain: r.source_domain || "",
        }));
      return NextResponse.json({ results: cards });
    }

    const rankData = await rankRes.json();
    let ranked: any[] = [];
    try {
      const raw = (rankData.response || "")
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
      ranked = JSON.parse(raw);
    } catch {
      ranked = allResults.slice(0, 8);
    }

    const cards = (Array.isArray(ranked) ? ranked : [])
      .filter((r: any) => r?.title && r?.source_url)
      .slice(0, 8)
      .map((r: any, i: number) => ({
        id: `ctx-${Date.now()}-${i}`,
        title: r.title || "",
        snippet: r.snippet || "",
        source_url: r.source_url || "",
        source_domain:
          r.source_domain ||
          (() => {
            try {
              return new URL(r.source_url).hostname;
            } catch {
              return "";
            }
          })(),
        relevance: r.relevance || undefined,
        suggested_location: r.suggested_location || undefined,
      }));

    return NextResponse.json({ results: cards });
  } catch (err) {
    console.error("[/api/context-search]", err);
    return NextResponse.json(
      { error: "Search failed — check your connection and API key" },
      { status: 500 }
    );
  }
}
