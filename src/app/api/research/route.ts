import { NextRequest, NextResponse } from "next/server";

// ── Research Panel API Route ──
// AI web search with cited JSON results
// Placeholder for Perplexity / custom search integration

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

    // Placeholder response — integrate with Perplexity API in Phase 2
    return NextResponse.json({
      query,
      results: [],
      message: "Research API placeholder — Perplexity integration coming in Phase 2",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
