# 60 Watts of Clarity — Plan of Action

This plan addresses every gap identified in the codebase review. It is organized into
four phases, each building on the previous one. Within each phase, items are listed in
dependency order — complete them top-to-bottom.

---

## Phase 1: Foundation & Quick Fixes

Get the existing infrastructure into a reliable, documented state before building
new features. Everything here touches config or small code fixes — no new UI panels.

### 1.1 Environment & Documentation

| # | Task | Files | Notes |
|---|------|-------|-------|
| 1 | Add `NEXT_PUBLIC_DIRECTUS_URL` to `.env.example` | `.env.example` | Currently used by `src/lib/directus.ts` but missing from the template. |
| 2 | Add Docker / Directus setup instructions to `README.md` | `README.md` | Document: `docker compose up -d`, how to apply `directus-schema.json`, create admin account, set CORS origin. |
| 3 | Update `CLAUDE.md` to match reality | `CLAUDE.md` | Current description says AppInner is 2000+ lines with all features. Actual file is ~470 lines with workspace shell only. Update feature list, file sizes, and what is/isn't implemented. |

### 1.2 Security & Config Fixes

| # | Task | Files | Notes |
|---|------|-------|-------|
| 4 | Fix CSP `connect-src` to include Directus origin | `next.config.js` | Currently only allows `'self'` and `https://api.anthropic.com`. Directus on a different origin will be blocked. Use env var so it works in dev and prod. |
| 5 | Add auth verification to API routes | `src/app/api/chat/route.ts`, `research/route.ts`, `youtube/route.ts` | Forward the user's Directus auth token from the request cookie/header, verify it against Directus before proxying to Anthropic. Prevents unauthenticated API abuse. |
| 6 | Add input length limits to API routes | Same three route files | Cap `query` strings (e.g. 2000 chars) and `messages` array size (e.g. 50 messages). Return 400 on excess. |

### 1.3 Code Cleanup

| # | Task | Files | Notes |
|---|------|-------|-------|
| 7 | Remove duplicate `fileIcon` from `icons.tsx` | `src/lib/icons.tsx` | Identical function exists in `helpers.ts` and is the one exported by the barrel. Remove from icons to avoid confusion. |
| 8 | Reconcile type systems | `src/lib/types.ts`, `src/lib/directus.ts` | Decide: Directus-backed types are the source of truth. Update `types.ts` to either re-export Directus types or extend them for frontend-specific fields. Remove unused client-only shapes that will never be used. |
| 9 | Add loading/error states to workspace fetching | `src/components/AppInner.tsx` | Show a skeleton or spinner while workspaces load. Show an error card if Directus is unreachable instead of a silent empty grid. |

**Phase 1 outcome:** A clean, documented, secure foundation. The app works exactly as
it does today but with proper env docs, security on API routes, and no silent failures.

---

## Phase 2: Core Feature Build-Out

Build the three primary workspace tools. Each one is a self-contained panel inside
`AppInner.tsx` (or extracted to its own component file for manageability).

### 2.1 Canvas Block Editor

The Directus `canvas_blocks` collection is ready (heading, subheading, text, image,
youtube block types with sort_order). This phase wires it up.

| # | Task | Files | Notes |
|---|------|-------|-------|
| 10 | Create `CanvasEditor` component | `src/components/CanvasEditor.tsx` (new) | Block list with add/edit/delete/reorder. Each block type gets its own inline editor (contenteditable for text, URL input for image/youtube). Uses Directus SDK to CRUD `canvas_blocks` filtered by `workspace_id`. |
| 11 | Wire Canvas view in AppInner | `src/components/AppInner.tsx` | Replace the Canvas placeholder with `<CanvasEditor workspaceId={activeWs.id} />`. Guard with "select a workspace" prompt when no workspace is active. |
| 12 | Add block toolbar | Inside `CanvasEditor.tsx` | Toolbar with buttons to add each block type (heading, text, image, youtube). Use the existing `toolbarBtn()` style helper and `I` icons. |
| 13 | Add drag-to-reorder | `CanvasEditor.tsx` | HTML drag-and-drop to reorder blocks. On drop, update `sort_order` on affected blocks via Directus. |

### 2.2 Knowledge Base File Manager

The `kb_files` collection links to `directus_files` for actual file storage. Directus
handles upload/download via its `/assets/` endpoint.

| # | Task | Files | Notes |
|---|------|-------|-------|
| 14 | Create `KnowledgeBase` component | `src/components/KnowledgeBase.tsx` (new) | List files for active workspace, grouped by category. Show name, size, date, type icon. |
| 15 | Add file upload | Inside `KnowledgeBase.tsx` | Upload via Directus files API (`POST /files`), then create `kb_files` record linking to workspace. Support drag-and-drop zone + file picker button. |
| 16 | Add file preview/download | Inside `KnowledgeBase.tsx` | Images: inline thumbnail via Directus `/assets/{id}?width=200`. PDFs: open in new tab. Other: download link. |
| 17 | Add file delete | Inside `KnowledgeBase.tsx` | Delete `kb_files` record and optionally the underlying `directus_files` entry. Confirmation modal before delete. |
| 18 | Wire KB view in AppInner | `src/components/AppInner.tsx` | Replace KB placeholder with `<KnowledgeBase workspaceId={activeWs.id} />`. |

### 2.3 Profé AI Chat Panel

Profé is powered by **LaunchLemonade** — a trained agent built in their no-code
platform, called via `POST https://api.launchlemonade.app/v1/chat`. The `/api/chat`
route is LaunchLemonade-only (no fallback provider).

LaunchLemonade maintains conversation context via `conversation_id`, so multi-turn
chat works natively. The Profé agent in LaunchLemonade can be trained with custom
knowledge, ethical guardrails, and brand voice without changing app code.

| # | Task | Files | Notes |
|---|------|-------|-------|
| 19 | Create `ProfeChat` component | `src/components/ProfeChat.tsx` (new) | Floating panel (bottom-right), toggleable via a FAB button. Message list + input. Calls `/api/chat` which routes to LaunchLemonade. Track `conversationId` in state for multi-turn context. Styled with the `ai*` color tokens from `ThemeColors`. |
| 20 | Add chat message rendering | Inside `ProfeChat.tsx` | User messages right-aligned, assistant messages left-aligned. LaunchLemonade returns markdown — support rendering code blocks, lists, bold. |
| 21 | Add KB context injection | `ProfeChat.tsx`, `/api/chat/route.ts` | Allow user to toggle "Use Knowledge Base" — when on, fetch text content of workspace KB files and prepend as context in the message. The LaunchLemonade agent's own training handles its personality and guardrails; KB context just adds workspace-specific documents. |
| 22 | Mount Profé in AppInner | `src/components/AppInner.tsx` | Render `<ProfeChat />` as a fixed-position overlay available on all views. Add the sparkle FAB button to toggle it. |

**Phase 2 outcome:** Users can create workspaces, build canvas documents with
blocks, upload/manage files in the Knowledge Base, and chat with Profé about their
work. The three core tools are functional and connected to Directus.

---

## Phase 2.5: Context Engine (Hallmark Feature)

The Context button is the platform's signature capability. When pressed, the AI reads
the user's current document, understands what they're writing about, then
automatically scans every available source — Knowledge Base files, web research,
YouTube videos, and previous searches — to find material that supports or elevates
the writing. Content that fits gets inserted directly into the document. Everything
else is saved as **suggestions** for the user to review later.

Profé can also trigger context searches from chat. The Context Engine is the shared
intelligence layer underneath both the button and the agent.

### Provider Architecture

The Context Engine is powered entirely by **LaunchLemonade**. A trained agent
(either the Profé agent or a dedicated Context agent) receives the canvas
snapshot and KB file contents, analyzes the document, and returns contextual
findings with relevance classifications.

The agent in LaunchLemonade can be trained with web search capabilities,
knowledge about the user's domain, and ethical guardrails — all configured
in the no-code builder without any code changes to this platform.

### How It Works (User Flow)

```
User is writing an article in Canvas
         │
         ▼
    Presses Ctx ⚡ button (or Profé triggers it)
         │
         ▼
   ┌─────────────────────────────────────────┐
   │        Context Engine (server)          │
   │                                         │
   │  1. Read all canvas blocks + KB files   │
   │     from Directus (free, local data)    │
   │                                         │
   │  2. Send to LaunchLemonade agent:       │
   │     ├─ Canvas snapshot (topic, tone,    │
   │     │  structure, gaps)                 │
   │     ├─ KB file contents                 │
   │     └─ Optional search query            │
   │                                         │
   │  3. Agent analyzes & searches:          │
   │     The trained LaunchLemonade agent     │
   │     evaluates the document, uses its    │
   │     knowledge + search capabilities to  │
   │     find supporting material            │
   │                                         │
   │  4. Agent classifies each finding:      │
   │     ├─ HIGH relevance → insert into     │
   │     │  canvas as new block              │
   │     └─ MEDIUM relevance → save as       │
   │        suggestion for later review      │
   │     (LOW relevance → discard)           │
   │                                         │
   │  5. Return structured JSON to client    │
   └─────────────────────────────────────────┘
         │
         ▼
   Canvas gets new blocks inserted
   Suggestion Drawer gets new items
```

### API Design

One new API route: `POST /api/context`

**Request:**
```json
{
  "workspaceId": "uuid",
  "canvasContent": "concatenated text of all canvas blocks",
  "searchQuery": "optional — user's search bar text",
  "sources": ["canvas", "kb", "research", "youtube"]
}
```

**Response:**
```json
{
  "inserted": [
    {
      "blockId": "generated-uuid",
      "content": "Supporting paragraph from source...",
      "sourceType": "research",
      "sourceTitle": "Study on X (2024)"
    }
  ],
  "suggestions": [
    {
      "id": "generated-uuid",
      "sourceType": "kb",
      "sourceId": "file-uuid",
      "title": "Related KB Document",
      "content": "Excerpt from KB file...",
      "relevanceNote": "This discusses the same methodology in §3"
    }
  ]
}
```

The route reads KB files from Directus (free), combines them with canvas content,
and sends everything to the LaunchLemonade agent in a single API call. The agent's
training handles analysis, searching, and relevance sorting.

### API Cost Model

A single context press makes:

- **1 LaunchLemonade API call** — the agent analyzes the document, searches for
  supporting material, evaluates findings, and returns structured results. Cost:
  per your LaunchLemonade plan's token pricing.
- **0 cost** for KB and canvas reads — those are Directus queries (local data).

Only the platform's `LAUNCHLEMONADE_API_KEY` is needed. The Context Engine can
optionally use a separate LaunchLemonade agent (`LAUNCHLEMONADE_CONTEXT_ID`)
trained specifically for context evaluation, or reuse the Profé agent
(`LAUNCHLEMONADE_PROFE_ID`).

### Build Tasks

| # | Task | Files | Notes |
|---|------|-------|-------|
| C1 | Create `/api/context` route | `src/app/api/context/route.ts` (new) | POST handler. Accepts `workspaceId`, `canvasContent`, optional `searchQuery`, and `sources` array. Reads KB files from Directus, combines with canvas content, sends to LaunchLemonade agent for analysis. Parses response into `inserted` and `suggestions` arrays. |
| C2 | Build Context Engine message | Inside `/api/context/route.ts` | Constructs a message for the LaunchLemonade agent containing: (1) the full canvas snapshot, (2) KB file contents, (3) optional search query. The agent is trained in LaunchLemonade's no-code builder to analyze documents, find supporting material, and classify findings as INSERT / SUGGEST / DISCARD. Returns structured JSON. |
| C3 | Add Ctx button to Canvas toolbar | `src/components/CanvasEditor.tsx` | The `I.ctx` icon already exists. Button triggers context fetch, shows a loading shimmer across the canvas while working. |
| C4 | Build insert logic | `src/components/CanvasEditor.tsx` | On context response, create new `canvas_blocks` in Directus for each `inserted` item. Place them at contextually appropriate positions (after the block they relate to, determined by AI). |
| C5 | Build Suggestion Drawer | `src/components/SuggestionDrawer.tsx` (new) | Slide-out panel showing all `context_suggestions` for the workspace. Each card shows title, excerpt, source type icon, and relevance note. Actions: "Insert" (moves to canvas), "Dismiss" (marks dismissed), "Open Source" (links to original). Badge count on the drawer toggle. |
| C6 | Save suggestions to Directus | `SuggestionDrawer.tsx` + `/api/context/route.ts` | `context_suggestions` collection persists suggestions across sessions. User can return days later and still see unused material. |
| C7 | Wire Ctx to Profé | `src/components/ProfeChat.tsx` | Add a `/context` slash command or "Search Context" button in chat. Profé can trigger a context scan and discuss the results conversationally. |
| C8 | Add search bar context trigger | `src/components/CanvasEditor.tsx` | When user types a search query and presses the Ctx button, the query is sent as `searchQuery` to `/api/context`. The AI uses it as a focused search lens on top of the document analysis. |
| C9 | KB file text extraction | `/api/context/route.ts` | For KB files that are PDFs or documents, extract text content via Directus file download + text parsing. For images, skip (or describe via AI vision in a future phase). |

### Directus Schema

New collection: `context_suggestions`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key |
| `workspace_id` | uuid → workspaces | Which workspace this belongs to |
| `source_type` | string | `research`, `kb`, `youtube`, `web` |
| `source_id` | string | URL, file ID, or video ID of the original source |
| `title` | string | Human-readable title |
| `content` | text | The actual content/excerpt |
| `relevance_note` | text | AI-generated explanation of why this might be useful |
| `status` | string | `pending`, `accepted`, `dismissed` |
| `created_at` | timestamp | Auto-set |
| `applied_at` | timestamp | Set when user inserts into canvas |

This collection and its types have already been added to `directus-schema.json`,
`src/lib/directus.ts`, and `src/lib/types.ts` as part of this plan.

### How Profé and Context Engine Interact

Both are powered by **LaunchLemonade agents** — they may be the same agent or
separate agents trained for different purposes. They are **complementary**:

- **Context Engine** is automatic and document-focused. It reads the canvas
  and KB files, sends everything to the LaunchLemonade agent, and gets back
  findings classified by relevance. It answers: "What would make this document
  better?"

- **Profé** is conversational and user-directed. The user asks questions, gets
  explanations, requests rewrites. It answers: "What does the user want to know?"
  Profé's personality, guardrails, and knowledge are configured in LaunchLemonade's
  no-code builder — no code changes needed to adjust its behavior.

- **Together:** Profé can trigger context scans ("Let me find some sources for
  your argument in paragraph 3") and can discuss the suggestions the Context
  Engine found ("I found 4 relevant studies — want me to summarize them?").
  Both share the same LaunchLemonade `conversation_id` so context carries over.

### API Keys Summary

| Key | What it powers | Required |
|-----|---------------|----------|
| `LAUNCHLEMONADE_API_KEY` | Auth for all LaunchLemonade API calls (Profé + Context) | Yes (server) |
| `LAUNCHLEMONADE_PROFE_ID` | The Profé chat agent (lemonade_id) | Yes (server) |
| `LAUNCHLEMONADE_CONTEXT_ID` | Optional separate Context Engine agent | No (falls back to Profé) |
| User's own API key | Research and YouTube search (e.g. Anthropic, Perplexity) | Yes (per-user, stored in Directus) |

**Note:** The platform does NOT store any Anthropic/Perplexity API keys as
server environment variables. Users provide their own keys in Settings, which
are stored (hashed) in the `user_api_keys` Directus collection and passed
per-request to the research/YouTube API routes.

**Phase 2.5 outcome:** The Context button is functional. Users press it while
writing and get relevant material auto-inserted plus a drawer of suggestions.
Profé can trigger context scans from chat. Unused material persists in Directus
for later review.

---

## Phase 3: Research, Media & Prototype Studio

Add the remaining workspace panels and connect the existing API routes.

### 3.1 Research Panel

Research uses the **user's own API key** (stored in Directus `user_api_keys`,
passed per-request). The `/api/research` route acts as a proxy — the user's key
never touches the browser, only the Next.js server.

| # | Task | Files | Notes |
|---|------|-------|-------|
| 23 | Create `ResearchPanel` component | `src/components/ResearchPanel.tsx` (new) | Search input, calls `/api/research` with user's API key from Directus. Displays results as cards (title, summary, source link). Shows "Add API key in Settings" prompt if no key configured. |
| 24 | Add "Insert to Canvas" action | `ResearchPanel.tsx` | Button on each result card that creates a new `canvas_blocks` text block with the finding's content. |
| 25 | Add Research tab to nav | `src/components/AppInner.tsx` | Add `research` to `ViewTab`, add nav item, wire the component. |

### 3.2 YouTube Panel

YouTube also uses the **user's own API key** (same pattern as Research).

| # | Task | Files | Notes |
|---|------|-------|-------|
| 26 | Create `YouTubePanel` component | `src/components/YouTubePanel.tsx` (new) | Search input, calls `/api/youtube` with user's API key. Displays video cards with thumbnails (`img.youtube.com/vi/{videoId}/mqdefault.jpg`). Shows key prompt if unconfigured. |
| 27 | Add "Insert to Canvas" action | `YouTubePanel.tsx` | Button that creates a `canvas_blocks` youtube block with the video ID. |
| 28 | Add YouTube tab to nav | `src/components/AppInner.tsx` | Add `youtube` to `ViewTab`, add nav item, wire the component. |

### 3.3 Prototype Studio

| # | Task | Files | Notes |
|---|------|-------|-------|
| 29 | Create `PrototypeStudio` component | `src/components/PrototypeStudio.tsx` (new) | Three-mode layout: `code` (editor only), `preview` (iframe only), `split` (side-by-side). User writes HTML/CSS/JS, sees live preview in a sandboxed iframe. |
| 30 | Add code editor | Inside `PrototypeStudio.tsx` | Textarea or basic code editor with monospace font (JetBrains Mono). Syntax highlighting is nice-to-have but not required for v1 — a `<textarea>` with proper styling works. |
| 31 | Add live preview | Inside `PrototypeStudio.tsx` | Render user code in a sandboxed `<iframe srcDoc={...}>`. Update on typing with a short debounce. |
| 32 | Wire Prototype view in AppInner | `src/components/AppInner.tsx` | Replace prototype placeholder. |

**Phase 3 outcome:** All six views from the `Tab` type are functional: home, canvas,
prototype, kb, research, youtube. Users have a complete workspace toolkit.

---

## Phase 4: Platform Hardening & Deployment

Production readiness: CI/CD, rate limiting, observability, and user self-service.

### 4.1 CI/CD Pipeline

| # | Task | Files | Notes |
|---|------|-------|-------|
| 33 | Create GitHub Actions CI workflow | `.github/workflows/ci.yml` (new) | On push/PR: `npm ci`, `npm run lint`, `npm run type-check`, `npm run build`. Fail on any error. |
| 34 | Create GitHub Actions deploy workflow | `.github/workflows/deploy.yml` (new) | On push to `main`: build, SSH to Scala Hosting VPS (port 6543), pull, install, build, restart. Use GitHub secrets for SSH key and host. |

### 4.2 Rate Limiting & Observability

| # | Task | Files | Notes |
|---|------|-------|-------|
| 35 | Add rate limiting middleware | `src/app/api/` routes or a shared middleware | Simple in-memory rate limiter (e.g. 20 requests/minute per IP for AI routes). Consider `next-rate-limit` or a small custom Map-based solution. |
| 36 | Add structured request logging | API routes | Log timestamp, user ID (from auth), endpoint, query length, response time, status. Useful for cost tracking and debugging. |

### 4.3 User Self-Service

| # | Task | Files | Notes |
|---|------|-------|-------|
| 37 | Build Settings page | `src/components/Settings.tsx` (new) | User profile info, theme toggle (dark/light — `DK`/`LT` are already defined), and API key management. |
| 38 | Wire `user_api_keys` collection | Settings page + API routes | Let users store their own API keys for research/YouTube providers (Anthropic, Perplexity, etc.). Keys stored hashed in Directus. Frontend retrieves and passes per-request to `/api/research` and `/api/youtube`. |
| 39 | Wire `agent_configs` collection | Settings page or workspace settings | Let users configure LaunchLemonade agents per workspace (lemonade_id, display name, active toggle). Different workspaces can use different trained agents. |

### 4.4 Content Safety & Sanitization

| # | Task | Files | Notes |
|---|------|-------|-------|
| 40 | Add DOMPurify for HTML rendering | `package.json`, components that render user/AI content | The current `sanitize()` function explicitly warns it's insufficient. Install `dompurify` and use it wherever user or AI-generated HTML is rendered. |
| 41 | Add workspace delete with cascade | `AppInner.tsx` or workspace settings | Currently you can create workspaces but not delete them. Add delete with confirmation, cascade to canvas_blocks and kb_files. |

**Phase 4 outcome:** Production-grade platform with CI/CD, cost controls, logging,
and user self-service for API keys and settings.

---

## Dependency Graph

```
Phase 1 (foundation)
  ├─ 1.1 Env & docs         ── no deps
  ├─ 1.2 Security fixes     ── no deps
  └─ 1.3 Code cleanup       ── no deps

Phase 2 (core features)     ── depends on Phase 1
  ├─ 2.1 Canvas editor      ── needs type reconciliation (1.3 #8)
  ├─ 2.2 Knowledge Base     ── needs CSP fix (1.2 #4) for Directus assets
  └─ 2.3 Profé chat         ── needs auth on API routes (1.2 #5)

Phase 2.5 (Context Engine)  ── depends on Phase 2 (Canvas + KB + Profé)
  ├─ C1–C2 API route        ── needs Canvas (2.1) for document reading
  ├─ C3–C4 Ctx button       ── needs Canvas toolbar (2.1 #12)
  ├─ C5–C6 Suggestions      ── needs Directus context_suggestions collection
  ├─ C7 Profé integration   ── needs Profé chat (2.3)
  ├─ C8 Search bar trigger  ── needs Canvas + Ctx API
  └─ C9 KB text extraction  ── needs KB file access (2.2)

Phase 3 (extended features)  ── depends on Phase 2, parallel with 2.5
  ├─ 3.1 Research panel      ── needs Profé pattern (2.3) + Canvas (2.1) for insert
  ├─ 3.2 YouTube panel       ── same as Research
  └─ 3.3 Prototype Studio    ── independent of other Phase 3 items

Phase 4 (hardening)          ── depends on Phase 2, parallel with Phase 3
  ├─ 4.1 CI/CD              ── no feature deps
  ├─ 4.2 Rate limiting      ── needs auth middleware (1.2 #5)
  ├─ 4.3 User self-service  ── needs Settings UI + Directus collections
  └─ 4.4 Safety             ── needs DOMPurify + working feature UIs
```

## File Impact Summary

| Area | Files created | Files modified |
|------|--------------|----------------|
| Phase 1 | 0 | `.env.example`, `README.md`, `CLAUDE.md`, `next.config.js`, 3 API routes, `types.ts`, `directus.ts`, `icons.tsx`, `AppInner.tsx` |
| Phase 2 | 3 (`CanvasEditor`, `KnowledgeBase`, `ProfeChat`) | `AppInner.tsx`, `/api/chat/route.ts` |
| Phase 2.5 | 2 (`/api/context/route.ts`, `SuggestionDrawer.tsx`) | `CanvasEditor.tsx`, `ProfeChat.tsx` |
| Phase 3 | 3 (`ResearchPanel`, `YouTubePanel`, `PrototypeStudio`) | `AppInner.tsx` |
| Phase 4 | 3 (`ci.yml`, `deploy.yml`, `Settings.tsx`) | API routes, `package.json`, `AppInner.tsx` |
