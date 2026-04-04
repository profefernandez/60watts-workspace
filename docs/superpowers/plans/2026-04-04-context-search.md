# Context Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add contextual web search to 60 Watts — a search bar in the top nav that lets users search via Perplexity (through LaunchLemonade), view results as draggable cards, pin them onto the canvas, extract content with Profé's help, and view source pages in a sandboxed embedded browser.

**Architecture:** Two new API routes (`/api/search` for manual Go queries, `/api/context-search` for Profé-driven contextual queries) both calling a Perplexity-backed LaunchLemonade search agent. Results render as cards in a floating draggable panel with a cool navy color scheme. Cards can be dragged to the canvas as `search_card` blocks, then extracted into document content via the existing `/api/chat` route. A sandboxed iframe source browser lets users read full articles without leaving the workspace.

**Tech Stack:** React 18, TypeScript, Next.js 15, LaunchLemonade API (existing), existing `useDrag` hook, existing `sanitizeUrl` helper. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-04-context-search-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/api/search/route.ts` | Go mode — forwards user query to LaunchLemonade search agent, returns SearchCard[] |
| `src/app/api/context-search/route.ts` | Context Search — sends workspace context to Profé, gets targeted queries, returns filtered SearchCard[] |
| `src/components/SearchBar.tsx` | Centered nav search input with Go + Context Search buttons |
| `src/components/SearchResultsPanel.tsx` | Floating, draggable, minimizable results panel with navy color scheme |
| `src/components/SearchCard.tsx` | Individual result card — used in panel and as pinned canvas block |
| `src/components/SourceBrowser.tsx` | Sandboxed iframe viewer with toolbar, security controls, fallback handling |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `SearchCardData` interface and `"search_card"` to Block type union |
| `src/components/AppInner.tsx` | Add SearchBar to nav, search state management, SourceBrowser view, search_card block rendering in canvas |
| `src/components/SettingsView.tsx` | Add Search Agent ID field, Extraction Style toggle, Source Browser preference |
| `next.config.js` | Update CSP `frame-src` to allow `https:` sources, add `frame-ancestors 'none'` |

---

## Task 1: Add SearchCardData Type and Extend Block Type

**Files:**
- Modify: `src/lib/types.ts:3-15` (Block interface and type)

- [ ] **Step 1: Read current types file**

Read `src/lib/types.ts` to confirm exact current Block interface shape.

- [ ] **Step 2: Add SearchCardData interface**

Add to `src/lib/types.ts` after the existing interfaces:

```typescript
export interface SearchCardData {
  id: string;
  title: string;
  snippet: string;
  source_url: string;
  source_domain: string;
  relevance?: string;
  suggested_location?: string;
}
```

- [ ] **Step 3: Add `"search_card"` to Block type**

Update the `Block` interface's `type` field to include `"search_card"`:

```typescript
type: "heading" | "text" | "image" | "youtube" | "search_card";
```

Add an optional `searchData` field to Block:

```typescript
searchData?: SearchCardData;
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors (existing errors may be present).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add SearchCardData type and search_card block type"
```

---

## Task 2: Update CSP Headers for Iframe Embedding

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Read current next.config.js**

Read `next.config.js` to find the existing CSP header definition.

- [ ] **Step 2: Update frame-src directive**

In the CSP string, replace:
```
frame-src 'self' https://www.youtube.com;
```
with:
```
frame-src 'self' https://www.youtube.com https:;
frame-ancestors 'none';
```

This allows embedding any HTTPS site in the source browser while preventing 60 Watts itself from being iframed.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```

Expected: 200

- [ ] **Step 4: Commit**

```bash
git add next.config.js
git commit -m "feat: update CSP headers for embedded source browser"
```

---

## Task 3: Create `/api/search` Route (Go Mode)

**Files:**
- Create: `src/app/api/search/route.ts`

- [ ] **Step 1: Create the search route**

Create `src/app/api/search/route.ts`. Follow the pattern from `/api/chat/route.ts` — use `getDecryptedKey`, call LaunchLemonade, handle errors:

```typescript
import { NextRequest, NextResponse } from "next/server";

/* ─── helpers (same pattern as chat/route.ts) ─── */
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

    /* ── Get LaunchLemonade keys ── */
    const llKeys = await getDecryptedKey("launchlemonade");
    if (!llKeys?.key) {
      return NextResponse.json(
        { error: "LaunchLemonade API key not configured" },
        { status: 401 }
      );
    }

    /* ── Get search agent ID ── */
    const searchKeys = await getDecryptedKey("ll_search");
    if (!searchKeys?.extra) {
      return NextResponse.json(
        { error: "Search Agent ID not configured. Set it in Settings." },
        { status: 401 }
      );
    }

    /* ── Call LaunchLemonade search agent ── */
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

    /* ── Parse results ── */
    let results: unknown[] = [];
    try {
      // Handle response wrapped in markdown code block
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      results = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return empty results
      results = [];
    }

    // Validate and normalize each result
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
```

- [ ] **Step 2: Verify route compiles**

```bash
npx tsc --noEmit 2>&1 | grep "api/search" | head -10
```

Expected: No errors for this file (or only pre-existing project errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "feat: add /api/search route for Go mode"
```

---

## Task 4: Create `/api/context-search` Route

**Files:**
- Create: `src/app/api/context-search/route.ts`

- [ ] **Step 1: Create the context-search route**

Create `src/app/api/context-search/route.ts`. This route receives workspace context, sends it to Profé (chat agent), which analyzes the content and generates search queries, then calls the search agent:

```typescript
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

    /* ── Get keys ── */
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

    /* ── Step 1: Ask Profé to analyze context and generate search queries ── */
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

    /* ── Step 2: Search for each query ── */
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

    /* ── Step 3: Collect all results ── */
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

    /* ── Step 4: Ask Profé to rank and annotate results ── */
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
      // Fall back to unranked results
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
```

- [ ] **Step 2: Verify route compiles**

```bash
npx tsc --noEmit 2>&1 | grep "context-search" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/context-search/route.ts
git commit -m "feat: add /api/context-search route for Profé-driven contextual search"
```

---

## Task 5: Add Search Agent ID to Settings

**Files:**
- Modify: `src/components/SettingsView.tsx`

- [ ] **Step 1: Read current SettingsView.tsx**

Read `src/components/SettingsView.tsx` to understand the existing provider card pattern and where to add the new search agent config.

- [ ] **Step 2: Add `ll_search` provider config**

The existing settings use a provider-based key system. Add a new provider entry for `ll_search` that stores the search agent ID. Follow the exact same pattern as the existing LaunchLemonade provider card but for the search agent:

- Provider name: `ll_search`
- Display name: "Context Search (Perplexity)"
- Description: "Search Agent ID for Perplexity-powered web search"
- Only needs the `extra` field (agent ID), not the `key` field — reuses the same LaunchLemonade API key
- Show masked hint like existing fields

Also add two local preference fields below the provider cards:
- **Extraction Style:** Toggle between "Light Touch" and "Full Rewrite" — store in localStorage as `60w_extraction_style`
- **Source Browser:** Toggle between "Embedded" and "External" — store in localStorage as `60w_source_browser`

- [ ] **Step 3: Verify settings page renders**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsView.tsx
git commit -m "feat: add Context Search settings — search agent ID, extraction style, source browser pref"
```

---

## Task 6: Create SearchBar Component

**Files:**
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar component**

Create `src/components/SearchBar.tsx`. The search bar is a controlled input centered in the top nav with Go and Context Search buttons:

```typescript
import React, { useState, useCallback } from "react";
import { glass, glassBtn } from "@/lib";
import type { SearchCardData } from "@/lib/types";

interface SearchBarProps {
  onResults: (results: SearchCardData[], isContext: boolean) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
  canvasBlocks: any[];
  kbFiles: any[];
  disabled?: boolean;
}

export default function SearchBar({
  onResults,
  onLoading,
  onError,
  canvasBlocks,
  kbFiles,
  disabled,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleGo = useCallback(async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    onLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Search failed");
        return;
      }
      onResults(data.results || [], false);
    } catch {
      onError("Search failed — check your connection");
    } finally {
      setSearching(false);
      onLoading(false);
    }
  }, [query, searching, onResults, onLoading, onError]);

  const handleContextSearch = useCallback(async () => {
    if (searching) return;
    setSearching(true);
    onLoading(true);
    try {
      const res = await fetch("/api/context-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasBlocks, kbFiles }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Context search failed");
        return;
      }
      onResults(data.results || [], true);
    } catch {
      onError("Context search failed — check your connection");
    } finally {
      setSearching(false);
      onLoading(false);
    }
  }, [searching, canvasBlocks, kbFiles, onResults, onLoading, onError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGo();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: 1,
        maxWidth: 560,
        margin: "0 24px",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "8px 14px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(250,245,239,0.4)"
          strokeWidth="2"
          style={{ marginRight: 8, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search the web..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || searching}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#FAF5EF",
            fontSize: 13,
            fontFamily: "Satoshi, sans-serif",
          }}
        />
      </div>
      <button
        onClick={handleGo}
        disabled={disabled || searching || !query.trim()}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          border: "1px solid rgba(232,168,124,0.3)",
          background: "rgba(232,168,124,0.15)",
          color: "#E8A87C",
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled || searching ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          opacity: disabled || searching || !query.trim() ? 0.5 : 1,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {searching ? "..." : "Go"}
      </button>
      <button
        onClick={handleContextSearch}
        disabled={disabled || searching}
        style={{
          padding: "8px 16px",
          borderRadius: 10,
          border: "1px solid rgba(199,125,186,0.3)",
          background: "rgba(199,125,186,0.12)",
          color: "#C77DBA",
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled || searching ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          opacity: disabled || searching ? 0.5 : 1,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {searching ? "Analyzing..." : "Context Search"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

```bash
npx tsc --noEmit 2>&1 | grep "SearchBar" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchBar.tsx
git commit -m "feat: add SearchBar component with Go and Context Search buttons"
```

---

## Task 7: Create SearchCard Component

**Files:**
- Create: `src/components/SearchCard.tsx`

- [ ] **Step 1: Create SearchCard component**

Create `src/components/SearchCard.tsx`. This component renders in two modes: **panel mode** (inside the results panel) and **pinned mode** (on the canvas as a block). The cool navy color scheme distinguishes it from the main app:

```typescript
import React from "react";
import type { SearchCardData } from "@/lib/types";

/* ─── Search panel color palette (cool navy) ─── */
const SC = {
  bg: "rgba(18,22,35,0.9)",
  bgHover: "rgba(100,120,200,0.06)",
  border: "rgba(100,120,200,0.1)",
  borderProfe: "rgba(199,125,186,0.15)",
  accent: "#7B93DB",
  accentBg: "rgba(123,147,219,0.12)",
  text: "#B8C8F0",
  textMuted: "rgba(184,200,240,0.5)",
  textDim: "rgba(184,200,240,0.45)",
  profe: "#C77DBA",
  profeBg: "rgba(199,125,186,0.08)",
  profeMuted: "rgba(199,125,186,0.6)",
  profeBtnBg: "rgba(199,125,186,0.15)",
};

interface SearchCardProps {
  card: SearchCardData;
  mode: "panel" | "pinned";
  onVisitSource: (url: string) => void;
  onDragToCanvas?: (card: SearchCardData) => void;
  onExtract?: (card: SearchCardData) => void;
  onRemove?: (cardId: string) => void;
}

export default function SearchCard({
  card,
  mode,
  onVisitSource,
  onDragToCanvas,
  onExtract,
  onRemove,
}: SearchCardProps) {
  const isProfe = Boolean(card.relevance || card.suggested_location);
  const borderColor = isProfe ? SC.borderProfe : SC.border;

  const btnStyle = (color: string, bg: string): React.CSSProperties => ({
    padding: "3px 8px",
    borderRadius: 5,
    background: bg,
    color,
    fontSize: 10,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontFamily: "Satoshi, sans-serif",
  });

  return (
    <div
      style={{
        background: SC.bgHover,
        border: `1px solid ${borderColor}`,
        borderRadius: mode === "pinned" ? 12 : 10,
        padding: 12,
        cursor: mode === "panel" ? "grab" : "default",
        boxShadow: mode === "pinned" ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
      }}
      draggable={mode === "panel"}
      onDragStart={(e) => {
        if (mode === "panel") {
          e.dataTransfer.setData(
            "application/x-search-card",
            JSON.stringify(card)
          );
        }
      }}
    >
      {/* Profé indicator */}
      {isProfe && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: mode === "pinned" ? 8 : 4,
          }}
        >
          <div
            style={{
              width: mode === "pinned" ? 7 : 6,
              height: mode === "pinned" ? 7 : 6,
              borderRadius: "50%",
              background: SC.profe,
              boxShadow: `0 0 6px rgba(199,125,186,0.4)`,
            }}
          />
          <span
            style={{
              color: SC.profeMuted,
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {mode === "pinned" ? "Profé Suggestion" : "Profé suggestion"}
          </span>
        </div>
      )}

      {/* Non-Profé pinned indicator */}
      {!isProfe && mode === "pinned" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: SC.accent,
              boxShadow: `0 0 6px rgba(123,147,219,0.4)`,
            }}
          />
          <span
            style={{
              color: `rgba(184,200,240,0.4)`,
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Search Card
          </span>
        </div>
      )}

      {/* Title */}
      <div
        style={{
          color: SC.text,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {card.title}
      </div>

      {/* Snippet */}
      <div
        style={{
          color: SC.textDim,
          fontSize: 11,
          lineHeight: 1.5,
          marginBottom: card.relevance ? 6 : 8,
          fontFamily: "Satoshi, sans-serif",
        }}
      >
        {card.snippet}
      </div>

      {/* Profé suggestion (relevance + location) */}
      {card.relevance && (
        <div
          style={{
            background: SC.profeBg,
            borderRadius: 6,
            padding: "5px 8px",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: SC.profeMuted,
              fontSize: 10,
              lineHeight: 1.4,
              fontFamily: "Satoshi, sans-serif",
            }}
          >
            → {card.relevance}
            {card.suggested_location && ` — ${card.suggested_location}`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: "rgba(123,147,219,0.5)",
            fontSize: 10,
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          {card.source_domain}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {mode === "panel" && onDragToCanvas && (
            <button
              style={btnStyle(SC.accent, SC.accentBg)}
              onClick={() => onDragToCanvas(card)}
            >
              Add to Canvas
            </button>
          )}
          {mode === "pinned" && onExtract && (
            <button
              style={btnStyle(
                isProfe ? SC.profe : SC.accent,
                isProfe ? SC.profeBtnBg : SC.accentBg
              )}
              onClick={() => onExtract(card)}
            >
              Extract
            </button>
          )}
          <button
            style={btnStyle("rgba(184,200,240,0.4)", "rgba(255,255,255,0.04)")}
            onClick={() => onVisitSource(card.source_url)}
          >
            Visit Source
          </button>
          {mode === "pinned" && onRemove && (
            <button
              style={btnStyle(
                "rgba(184,200,240,0.4)",
                "rgba(255,255,255,0.04)"
              )}
              onClick={() => onRemove(card.id)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

```bash
npx tsc --noEmit 2>&1 | grep "SearchCard" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchCard.tsx
git commit -m "feat: add SearchCard component with panel and pinned canvas modes"
```

---

## Task 8: Create SearchResultsPanel Component

**Files:**
- Create: `src/components/SearchResultsPanel.tsx`

- [ ] **Step 1: Create SearchResultsPanel component**

Create `src/components/SearchResultsPanel.tsx`. A floating, draggable, minimizable panel with the cool navy color scheme. Uses the existing `useDrag` hook from `src/components/canvas/useDrag.ts`:

```typescript
import React, { useState } from "react";
import { useDrag } from "@/components/canvas/useDrag";
import SearchCard from "./SearchCard";
import type { SearchCardData } from "@/lib/types";

interface SearchResultsPanelProps {
  results: SearchCardData[];
  error?: string;
  onClose: () => void;
  onVisitSource: (url: string) => void;
  onAddToCanvas: (card: SearchCardData) => void;
}

export default function SearchResultsPanel({
  results,
  error,
  onClose,
  onVisitSource,
  onAddToCanvas,
}: SearchResultsPanelProps) {
  const [pos, setPos] = useState({ x: window.innerWidth - 380, y: 80 });
  const [minimized, setMinimized] = useState(false);

  const { onPointerDown } = useDrag({
    getInitial: () => pos,
    onDrag: (x, y) => setPos({ x, y }),
  });

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 340,
        background:
          "linear-gradient(165deg, rgba(18,22,35,0.97), rgba(12,14,24,0.98))",
        border: "1px solid rgba(100,120,200,0.15)",
        borderRadius: 14,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,120,200,0.08)",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        zIndex: 1000,
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      {/* Header — drag handle + separate button area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: minimized
            ? "none"
            : "1px solid rgba(100,120,200,0.1)",
          userSelect: "none",
        }}
      >
        {/* Drag handle — only this area initiates drag */}
        <div
          onPointerDown={onPointerDown}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "grab", flex: 1 }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#7B93DB",
              boxShadow: "0 0 8px rgba(123,147,219,0.4)",
            }}
          />
          <span
            style={{ color: "#B8C8F0", fontSize: 13, fontWeight: 600 }}
          >
            Search Results
          </span>
          <span
            style={{ color: "rgba(184,200,240,0.4)", fontSize: 11 }}
          >
            · {results.length} result{results.length !== 1 ? "s" : ""}
          </span>
        </div>
        {/* Buttons — outside drag handle so clicks work */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setMinimized(!minimized)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(100,120,200,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              color: "rgba(184,200,240,0.5)",
              fontSize: 14,
            }}
          >
            {minimized ? "+" : "−"}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(100,120,200,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              color: "rgba(184,200,240,0.5)",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div
          style={{
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {error && (
            <div
              style={{
                color: "#E85D5D",
                fontSize: 12,
                padding: "8px 12px",
                background: "rgba(232,93,93,0.1)",
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}
          {results.map((card) => (
            <SearchCard
              key={card.id}
              card={card}
              mode="panel"
              onVisitSource={onVisitSource}
              onDragToCanvas={onAddToCanvas}
            />
          ))}
          {results.length === 0 && !error && (
            <div
              style={{
                color: "rgba(184,200,240,0.4)",
                fontSize: 12,
                textAlign: "center",
                padding: 20,
              }}
            >
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

```bash
npx tsc --noEmit 2>&1 | grep "SearchResultsPanel" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchResultsPanel.tsx
git commit -m "feat: add SearchResultsPanel — floating, draggable results with navy color scheme"
```

---

## Task 9: Create SourceBrowser Component

**Files:**
- Create: `src/components/SourceBrowser.tsx`

- [ ] **Step 1: Create SourceBrowser component**

Create `src/components/SourceBrowser.tsx`. A full-view sandboxed iframe browser with toolbar, security controls, and fallback handling:

```typescript
import React, { useState, useEffect, useRef, useCallback } from "react";
import { sanitizeUrl } from "@/lib";

interface SourceBrowserProps {
  url: string;
  onBack: () => void;
}

const LOAD_TIMEOUT_MS = 10000;

export default function SourceBrowser({ url, onBack }: SourceBrowserProps) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const safeUrl = sanitizeUrl(url);
  const isHttps = safeUrl.startsWith("https://");
  const displayUrl = safeUrl || url;
  const hostname = (() => {
    try {
      return new URL(displayUrl).hostname;
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    if (!isHttps) {
      setBlocked(true);
      setLoading(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setBlocked(true);
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHttps]);

  const handleLoad = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setBlocked(true);
    setLoading(false);
  }, []);

  const openExternal = () => window.open(displayUrl, "_blank", "noopener,noreferrer");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "rgba(8,9,12,0.95)",
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "rgba(18,22,35,0.95)",
          borderBottom: "1px solid rgba(100,120,200,0.12)",
          flexShrink: 0,
        }}
      >
        {/* URL bar */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(100,120,200,0.1)",
            borderRadius: 8,
            padding: "6px 12px",
            overflow: "hidden",
          }}
        >
          {isHttps && (
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "rgba(100,200,120,0.3)",
                marginRight: 8,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              color: "rgba(184,200,240,0.5)",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayUrl}
          </span>
        </div>

        {/* Security badge */}
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: isHttps
              ? "rgba(100,200,120,0.1)"
              : "rgba(232,93,93,0.1)",
            border: `1px solid ${
              isHttps
                ? "rgba(100,200,120,0.15)"
                : "rgba(232,93,93,0.15)"
            }`,
          }}
        >
          <span
            style={{
              color: isHttps
                ? "rgba(100,200,120,0.7)"
                : "rgba(232,93,93,0.7)",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {isHttps ? "Sandboxed" : "Not Secure"}
          </span>
        </div>

        {/* Open external */}
        <button
          onClick={openExternal}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(100,120,200,0.1)",
            border: "1px solid rgba(100,120,200,0.15)",
            color: "#7B93DB",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          Open External
        </button>

        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            background: "rgba(232,168,124,0.15)",
            border: "1px solid rgba(232,168,124,0.25)",
            color: "#E8A87C",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "Satoshi, sans-serif",
          }}
        >
          ← Back to Canvas
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(8,9,12,0.9)",
              zIndex: 1,
            }}
          >
            <span style={{ color: "rgba(184,200,240,0.4)", fontSize: 13 }}>
              Loading {hostname}...
            </span>
          </div>
        )}

        {blocked ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 16,
            }}
          >
            <span style={{ color: "#B8C8F0", fontSize: 14, fontWeight: 600 }}>
              This site can't be embedded
            </span>
            <span
              style={{
                color: "rgba(184,200,240,0.4)",
                fontSize: 12,
                maxWidth: 400,
                textAlign: "center",
              }}
            >
              {hostname} blocks embedding for security reasons.
              {!isHttps && " Only HTTPS sites can be embedded."}
            </span>
            <button
              onClick={openExternal}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                background: "rgba(123,147,219,0.15)",
                border: "1px solid rgba(123,147,219,0.25)",
                color: "#7B93DB",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Satoshi, sans-serif",
              }}
            >
              Open in New Tab
            </button>
          </div>
        ) : (
          isHttps && (
            <iframe
              ref={iframeRef}
              src={safeUrl}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

```bash
npx tsc --noEmit 2>&1 | grep "SourceBrowser" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SourceBrowser.tsx
git commit -m "feat: add SourceBrowser — sandboxed iframe viewer with security guardrails"
```

---

## Task 10: Integrate into AppInner — Search Bar in Nav

**Files:**
- Modify: `src/components/AppInner.tsx:391-433` (top bar section)

- [ ] **Step 1: Read the top bar section of AppInner.tsx**

Read `src/components/AppInner.tsx` lines 380-450 to understand the current top bar layout.

- [ ] **Step 2: Add search state and imports**

At the top of AppInner.tsx, add imports:

```typescript
import SearchBar from "./SearchBar";
import SearchResultsPanel from "./SearchResultsPanel";
import SearchCard from "./SearchCard";
import SourceBrowser from "./SourceBrowser";
import type { SearchCardData } from "@/lib/types";
```

Add state variables near the other state declarations:

```typescript
const [searchResults, setSearchResults] = useState<SearchCardData[]>([]);
const [searchError, setSearchError] = useState("");
const [searchLoading, setSearchLoading] = useState(false);
const [showSearchResults, setShowSearchResults] = useState(false);
const [sourceBrowserUrl, setSourceBrowserUrl] = useState<string | null>(null);
```

- [ ] **Step 3: Add SearchBar to top bar**

Insert the SearchBar component in the top bar between the view label and the right-side controls:

```tsx
<SearchBar
  onResults={(results, isContext) => {
    setSearchResults(results);
    setSearchError("");
    setShowSearchResults(true);
  }}
  onLoading={setSearchLoading}
  onError={(err) => {
    setSearchError(err);
    setShowSearchResults(true);
  }}
  canvasBlocks={blocks}
  kbFiles={kbFiles}
/>
```

- [ ] **Step 4: Add SearchResultsPanel overlay**

Below the main content area, add the results panel (renders when `showSearchResults` is true):

```tsx
{showSearchResults && (
  <SearchResultsPanel
    results={searchResults}
    error={searchError}
    onClose={() => setShowSearchResults(false)}
    onVisitSource={(url) => {
      const pref = localStorage.getItem("60w_source_browser") || "embedded";
      if (pref === "external") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setSourceBrowserUrl(url);
      }
    }}
    onAddToCanvas={(card) => {
      // Add as search_card block to canvas
      const newBlock = {
        id: card.id,
        type: "search_card" as const,
        content: card.title,
        searchData: card,
      };
      setBlocks((prev) => [...prev, newBlock]);
    }}
  />
)}
```

- [ ] **Step 5: Verify it renders**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add src/components/AppInner.tsx
git commit -m "feat: integrate SearchBar and SearchResultsPanel into AppInner nav"
```

---

## Task 11: Integrate into AppInner — Source Browser View

**Files:**
- Modify: `src/components/AppInner.tsx`

- [ ] **Step 1: Add SourceBrowser as a navigation view**

When `sourceBrowserUrl` is set, render the SourceBrowser in place of the main canvas content area. This follows the spec's "navigation view" pattern — it replaces the canvas temporarily:

```tsx
{sourceBrowserUrl ? (
  <SourceBrowser
    url={sourceBrowserUrl}
    onBack={() => setSourceBrowserUrl(null)}
  />
) : (
  /* existing canvas/view content */
)}
```

Wrap the existing main content area with this conditional.

- [ ] **Step 2: Verify navigation works**

Start dev server and manually test: the SourceBrowser should replace the canvas view, and "Back to Canvas" should return to the previous view.

- [ ] **Step 3: Commit**

```bash
git add src/components/AppInner.tsx
git commit -m "feat: add SourceBrowser navigation view to AppInner"
```

---

## Task 12: Integrate into AppInner — search_card Block Rendering

**Files:**
- Modify: `src/components/AppInner.tsx` or `src/components/CanvasView.tsx` (whichever renders block types)

- [ ] **Step 1: Read the block rendering logic**

Read the canvas block rendering section in `src/components/CanvasView.tsx` (around lines 93-336, the BlockEditor component) to understand how different block types are rendered.

- [ ] **Step 2: Verify chat route response format**

Check that `/api/chat/route.ts` returns `{ content: string }` — the extract handler depends on `data.content`. The existing route uses `NextResponse.json({ content: text })` on line 125 of `src/app/api/chat/route.ts`.

- [ ] **Step 3: Add search_card rendering branch**

In the block rendering logic, add a case for `type === "search_card"`:

```tsx
if (block.type === "search_card" && block.searchData) {
  return (
    <SearchCard
      key={block.id}
      card={block.searchData}
      mode="pinned"
      onVisitSource={(url) => {
        const pref = localStorage.getItem("60w_source_browser") || "embedded";
        if (pref === "external") {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          setSourceBrowserUrl(url);
        }
      }}
      onExtract={async (card) => {
        // Send to Profé for extraction
        const style = localStorage.getItem("60w_extraction_style") || "light";
        const surroundingBlocks = blocks
          .filter((b) => b.type !== "search_card")
          .slice(-10)
          .map((b) => b.content)
          .join("\n");

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Extract and integrate this search result into my document. Style: ${style === "full" ? "Full rewrite — rewrite in my voice to blend seamlessly" : "Light touch — clean up and format to match my document style"}.

SEARCH RESULT:
Title: ${card.title}
Content: ${card.snippet}
Source: ${card.source_url}

SURROUNDING DOCUMENT CONTEXT:
${surroundingBlocks}

Return ONLY the extracted text content, ready to be inserted. No meta-commentary.`,
              },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Replace search_card block with a text block containing extracted content
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === card.id
                ? { ...b, type: "text" as const, content: data.content, searchData: undefined }
                : b
            )
          );
        }
      }}
      onRemove={(cardId) => {
        setBlocks((prev) => prev.filter((b) => b.id !== cardId));
      }}
    />
  );
}
```

- [ ] **Step 4: Verify search_card blocks render on canvas**

Start dev server, manually test adding a search card to the canvas.

- [ ] **Step 5: Commit**

```bash
git add src/components/CanvasView.tsx src/components/AppInner.tsx
git commit -m "feat: render search_card blocks on canvas with Extract/Remove/Visit actions"
```

---

## Task 13: Final Integration Test and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Verify the build succeeds.

- [ ] **Step 4: Manual smoke test**

Start `npm run dev` and verify:
1. Search bar appears centered in top nav
2. Go button sends query and results appear in floating panel
3. Context Search button reads workspace and returns contextual results
4. Results panel is draggable, minimizable, closable
5. "Add to Canvas" places a search_card block on the canvas
6. "Visit Source" opens the embedded SourceBrowser
7. "Back to Canvas" returns to the canvas view
8. Blocked sites show fallback message
9. "Extract" on a pinned card calls Profé and replaces the card with text
10. "Remove" deletes the pinned card
11. Settings page shows Search Agent ID field and preference toggles

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration issues from smoke test"
```

- [ ] **Step 6: Final commit — feature complete**

```bash
git add -A
git commit -m "feat: Context Search — complete feature with search bar, floating results, source browser, and canvas card integration"
```
