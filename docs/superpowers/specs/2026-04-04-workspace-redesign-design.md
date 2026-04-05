# 60 Watts of Clarity — Workspace Redesign

**Date:** 2026-04-04
**Author:** Jason Fernandez + Claude
**Status:** Draft

---

## 1. Overview

Redesign the 60 Watts workspace experience from a tab-based navigation model (Canvas / Prototype / KB as separate views) to a **unified surface** model where users enter a workspace and see their file list alongside an active work surface — no back-and-forth navigation. Introduce a four-agent AI team, a global Knowledge Base, and two build-toward features: Workspace Handoff and Proactive Context Memory.

### Goals

- **One screen, many functions.** Minimize navigation. Users should never need to "go back" to switch between files or tools.
- **Workspace isolation with global knowledge.** Each workspace is its own project instance, but the global KB is accessible from anywhere via Scholar.
- **Named AI team.** Four specialized agents with distinct roles, all powered by LaunchLemonade (one API key, four agent IDs).
- **Build toward Handoff and Proactive Context.** Design the architecture to support these features even if they ship later.

### Non-goals

- Collaborative/multi-user editing (future consideration)
- Mobile-specific layouts (future consideration)
- Migrating away from localStorage fallback (Directus remains primary, localStorage remains offline fallback)

---

## 2. Workspace Flow

### 2.1 Home Screen (Workspace Selection)

The home screen remains a grid of workspace cards. Each card shows:

- Workspace name and description
- Optional background image
- File count and last-edited date
- Edit button (pencil icon) to rename, change description, or change background image

Users can create a new workspace via the "+ Create Workspace" card.

**No changes from current implementation** except for the sidebar restructure (see Section 5).

### 2.2 Entering a Workspace (Unified Surface — Option B)

When a user clicks a workspace card or selects a workspace from the sidebar, the view switches to the **Unified Surface layout**:

```
┌──────────┬───────────────┬──────────────────────────────┐
│          │  File Panel   │       Work Surface           │
│ Sidebar  │  (collapsible)│                              │
│          │               │  [Design Studio | Document]  │
│          │  - File 1  ◄──┤                              │
│          │  - File 2     │  (active file rendered here) │
│          │  - File 3     │                              │
│          │               │                              │
│          │  [+ New]      │                              │
│          │               │                    [Profé ✨] │
└──────────┴───────────────┴──────────────────────────────┘
```

**File Panel (left side):**

- Lists all work saved in this workspace
- Each item shows: name, type badge (Design / Document), last-edited date
- Clicking a file opens it in the work surface instantly — no page change
- "+ New" button at the top opens a small dropdown: "Design Studio" or "Document"
- **Collapsible** — a toggle button collapses the file panel to give the work surface full width. Collapsed state shows only a thin rail with a button to expand. Collapse state persists per session via localStorage.
- Files sorted by last-edited (most recent first)
- Right-click or overflow menu on each file: Rename, Delete, Duplicate

**Work Surface (right side):**

- Shows the currently selected file
- Mode tabs at the top: **Design Studio** | **Document**
- Mode auto-switches based on the file type clicked, but can be manually overridden
- When no file is selected (empty workspace), shows a welcome state with "+ New" prompt

### 2.3 Creating New Work

When the user clicks "+ New":

1. A small dropdown appears with two options: **Design Studio** or **Document**
2. User selects one
3. A new untitled file is created in the workspace and appears at the top of the file panel
4. The file name is editable inline ("Untitled" — click to rename)
5. The work surface switches to the appropriate mode with a blank canvas
6. Auto-save begins immediately on any changes

### 2.4 Saving

All work saves automatically to the workspace. The save model mirrors the current Canvas approach:

- Debounced auto-save (1000ms after last change)
- Save indicator in the top bar ("Saving..." / "Saved")
- Data stored via Directus when available, localStorage fallback when offline
- Each file is scoped to its workspace via `workspace_id`

---

## 3. Tools

### 3.1 Design Studio

Combines the current Prototype (HTML/CSS rendering) with visual design capabilities into a single environment.

**Capabilities:**

- **HTML/CSS rendering** — Code editor + live preview pane. Users can write HTML/CSS or ask Profé/Forge to generate it. The rendered output appears in real-time.
- **Visual canvas** — Whiteboard-style surface for freeform design work: mockups, flyers, logos, QR codes.
- **AI image generation** — Generate images directly on the canvas via prompt. Powered by Profé (who delegates generation tasks to the appropriate agent — in Phase 4 this may become a dedicated fifth agent).
- **Sketch-to-design** — Draw a rough sketch, AI translates it into a polished design in real-time.

**Implementation note:** Design Studio is the most complex tool and will be built incrementally. Phase 1 focuses on the HTML/CSS rendering (which already exists as PrototypeView). Subsequent phases add canvas, AI image gen, and sketch-to-design.

### 3.2 Document

The current Canvas block editor, repositioned as a "Document" type within the workspace.

**Capabilities:**

- Block-based editing: headings, subheadings, body text, images, embeds
- Rich text formatting toolbar (bold, italic, underline, strikethrough)
- Search card integration (pin research results)
- ContentEditable-based with HTML sanitization (DOMPurify)

**No functional changes from the current CanvasView** — the change is how it's accessed (from the unified surface file panel, not as a separate sidebar tab).

### 3.3 Knowledge Base (Global + Workspace)

Two tiers of knowledge storage:

**Global KB:**

- Accessible from the sidebar under "Knowledge Base"
- Shared across all workspaces
- Upload documents, images, PDFs, any file type
- Organized by categories (Documents, Images, Videos, Audio, PDFs)
- Scholar manages organization and retrieval
- Any agent can read from the global KB

**Workspace KB:**

- Each workspace has its own file collection (the existing per-workspace KB)
- Accessible from within the workspace (via the file panel or Profé)
- Files uploaded here are scoped to the workspace

**Profé bridges access:** Users don't need to leave the workspace to access global KB content. They ask Profé: "Pull the brand guidelines" — Profé asks Scholar to search the global KB, and the result appears in chat.

**Data model change:** The current `kb_files` table gets a new nullable field: `workspace_id`. Files with `workspace_id = null` belong to the global KB. Files with a `workspace_id` belong to that workspace. This is a backward-compatible change — existing files retain their workspace scope.

### 3.4 Research

Evolves from a search modal to a **persistent research collection**.

- Accessible from the sidebar under "Research"
- Users can search for articles (existing Anthropic web_search integration)
- Search results can be **saved** to the research collection
- Saved articles persist across sessions
- Articles can be organized, tagged, deleted
- Profé and Scholar can reference saved research when answering questions

**Data model:** New `research_articles` table: `id`, `user_id`, `title`, `url`, `summary`, `source`, `tags`, `saved_at`.

### 3.5 Video Library

Replaces the YouTube search modal with a **persistent video collection**.

- Accessible from the sidebar under "Video Library"
- YouTube search capability (existing integration)
- Users can **save** videos to their library
- Saved videos persist across sessions
- Videos can be organized, tagged, deleted
- Embed saved videos into workspace documents or Design Studio

**Data model:** New `saved_videos` table: `id`, `user_id`, `title`, `url`, `thumbnail`, `source` (youtube/other), `tags`, `saved_at`.

---

## 4. AI Agent Team

Four specialized agents, each with a distinct role. All powered by LaunchLemonade — one API key, four different `lemonade_id` values.

### 4.1 Agent Roster

| Agent | Role | Behavior | API Route |
|-------|------|----------|-----------|
| **Profé** | Conversational AI | User-facing chat. Answers questions, delegates to other agents, surfaces Context alerts. | `/api/chat` |
| **Scholar** | KB Librarian | Manages the global KB. Finds documents, organizes content, provides context to other agents. | `/api/scholar` |
| **Context** | Proactive Watcher | Background agent. Monitors workspaces + global KB, detects conflicts, surfaces insights. | `/api/context` |
| **Ludo** | Handoff Specialist | Packages workspace content into living shareable deliverables/portfolios. | `/api/handoff` |

### 4.2 Agent Configuration (Settings)

The Settings page includes an "AI Team" section:

```
AI Team Configuration
─────────────────────────────────────
LaunchLemonade API Key:  [••••••••••••]  [Test] [Disconnect]

Agent Assignments:
  Profé (Chat)          →  Lemonade ID: [________________]  [●]
  Scholar (KB)           →  Lemonade ID: [________________]  [●]
  Context (Monitor)      →  Lemonade ID: [________________]  [●]
  Ludo (Handoff)         →  Lemonade ID: [________________]  [●]

[●] = health dot (green = connected, red = error, gray = not configured)
```

Each agent ID is stored in the existing `agent_configs` table:

- `workspace_id`: null (agents are global, not per-workspace)
- `provider`: "launchlemonade"
- `agent_id`: the `lemonade_id` value
- `display_name`: "profe" | "scholar" | "context" | "ludo"
- `is_active`: boolean

**Fallback:** If LaunchLemonade is not configured, Profé falls back to the Anthropic API route (existing behavior). Scholar, Context, and Ludo are unavailable without LaunchLemonade configuration.

### 4.3 Agent Communication Pattern

Agents communicate through Profé as the orchestrator:

```
User → Profé: "What does our brand guide say about logo usage?"
  Profé → Scholar: "Search global KB for brand guide, logo usage section"
  Scholar → Profé: "Found: Brand Guide v3, section 4.2, [content]"
Profé → User: "According to your brand guide (v3, section 4.2)..."
```

```
Context (background): "Workspace 'Marketing Q2' references pricing from
  March, but KB doc 'Q2 Pricing Update' was uploaded April 1 with new rates"
  Context → Profé notification queue
Profé → User (notification): "Context noticed your Marketing Q2 workspace
  uses outdated pricing. Want me to show you what changed?"
```

**Implementation:** Profé's system prompt includes instructions to delegate to other agents by calling their API routes internally. The `/api/chat` route handles orchestration — when Profé decides to consult Scholar, it makes a server-side call to `/api/scholar`, gets the response, and incorporates it into its reply.

### 4.4 Contextual Appearance

Agents appear where they work — no sidebar slot:

- **Profé** — Floating chat panel (existing ProfePanel, bottom-right)
- **Scholar** — Appears in KB views as an assistant, and is referenced by name when Profé cites KB sources
- **Context** — Appears as notification cards/badges. A small notification indicator near Profé's panel shows when Context has insights.
- **Ludo** — Appears in a Handoff modal/panel when the user requests a workspace export

Each agent has its own visual identity (the characters from the AI Faculty Lounge designs).

---

## 5. Sidebar Restructure

The sidebar changes from the current navigation (Home / Canvas / Prototype / KB + Tools) to:

```
┌─────────────────────┐
│  💡 60 Watts         │
├─────────────────────┤
│  WORKSPACES          │
│  ● Marketing Q2      │
│  ● Product Launch     │
│  ● Client Onboarding  │
│  + New Workspace      │
├─────────────────────┤
│  GLOBAL               │
│  📚 Knowledge Base    │
│  🔍 Research          │
│  🎬 Video Library     │
├─────────────────────┤
│                       │
│  (spacer)             │
│                       │
├─────────────────────┤
│  👤 Jason Fernandez   │
│     Settings          │
└─────────────────────┘
```

**Changes from current:**

- "Home" nav item removed — clicking the 60 Watts logo or a workspace name is the entry point
- "Canvas", "Prototype", "KB" nav items removed — these are now accessed from within the workspace unified surface
- Workspaces listed directly in the sidebar (currently they're only on the home grid)
- Global tools section: KB, Research, Video Library
- Settings moves to the bottom with user profile info
- Active workspace highlighted with rose gold indicator
- Sidebar remains collapsible (existing toggle)

**Clicking a workspace** in the sidebar opens the unified surface for that workspace.

**Clicking "Knowledge Base"** opens the global KB view in the main content area.

**Clicking "Research"** opens the persistent research collection.

**Clicking "Video Library"** opens the persistent video library.

---

## 6. Data Model Changes

### 6.1 Modified Tables

**`kb_files`** — Make `workspace_id` nullable:

- `workspace_id: null` → global KB file
- `workspace_id: "abc"` → workspace-scoped file

**`agent_configs`** — Allow global (non-workspace) agent entries:

- `workspace_id: null` for the four team agents
- Add constraint: `display_name` must be unique when `workspace_id` is null

### 6.2 New Tables

**`workspace_files`** — Tracks all work items within a workspace:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key |
| `workspace_id` | string | FK to workspaces |
| `name` | string | User-visible file name |
| `type` | string | "design" or "document" |
| `content` | text | Type-dependent format. Documents: JSON array of blocks (same schema as current `canvas_blocks`). Design: raw HTML/CSS source string. |
| `thumbnail` | text | Optional base64 thumbnail for file panel preview |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `sort_order` | number | For manual reordering |

**`research_articles`** — Persistent research collection:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key |
| `user_id` | string | FK to users |
| `title` | string | Article title |
| `url` | string | Source URL |
| `summary` | text | AI-generated or user-edited summary |
| `source` | string | Domain/source name |
| `tags` | string | Comma-separated tags |
| `saved_at` | datetime | |

**`saved_videos`** — Persistent video library:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key |
| `user_id` | string | FK to users |
| `title` | string | Video title |
| `url` | string | Video URL |
| `thumbnail` | string | Thumbnail URL |
| `source` | string | "youtube" or other |
| `tags` | string | Comma-separated tags |
| `saved_at` | datetime | |

**`context_alerts`** — Queue for Context agent insights:

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key |
| `user_id` | string | FK to users |
| `workspace_id` | string | Nullable — which workspace is affected |
| `message` | text | The insight/alert text |
| `severity` | string | "info", "warning", "conflict" |
| `is_read` | boolean | Has the user seen it |
| `created_at` | datetime | |

---

## 7. API Routes

### 7.1 Modified Routes

**`/api/chat`** (Profé) — Existing route. Add orchestration logic: when Profé's response indicates a delegation (e.g., "ask Scholar"), the route makes a server-side call to the appropriate agent route and feeds the result back into Profé's context.

### 7.2 New Routes

**`/api/scholar`** — Scholar agent endpoint.

- Receives queries from Profé (server-side) about KB content
- Searches global KB + workspace KB
- Returns structured results (file references, content excerpts)

**`/api/context`** — Context agent endpoint.

- Called on a schedule (or triggered by workspace/KB changes)
- Scans workspace content against global KB
- Writes alerts to `context_alerts` table
- Profé checks this table and surfaces unread alerts

**`/api/handoff`** — Ludo handoff endpoint.

- Receives a workspace ID
- Reads all workspace files, KB references, conversation history
- Generates a self-contained HTML package (the living deliverable)
- Returns a downloadable/shareable URL

**`/api/research`** — Research collection CRUD.

- `GET /api/research` — list saved articles
- `POST /api/research` — save an article
- `DELETE /api/research/[id]` — remove an article
- Existing search functionality (Anthropic web_search) remains

**`/api/videos`** — Video library CRUD.

- `GET /api/videos` — list saved videos
- `POST /api/videos` — save a video
- `DELETE /api/videos/[id]` — remove a video
- Existing YouTube search functionality remains

---

## 8. Build-Toward Features

These features are designed into the architecture now but ship in later phases.

### 8.1 Workspace Handoff (Ludo)

**Vision:** User clicks "Share Workspace" → Ludo packages the workspace into a **living, interactive deliverable**. The recipient opens a link and sees the designs, documents, and can ask questions — Ludo answers using the workspace's context.

**Phase 1 (architecture only):**
- Ludo agent ID configurable in Settings
- `/api/handoff` route exists but returns a static HTML export (designs + documents bundled)
- No interactive AI for recipients yet

**Phase 2 (living deliverable):**
- Handoff generates a hosted page with read-only workspace content
- Recipient can ask Ludo questions about the work
- Ludo has access to the workspace context that was snapshotted at handoff time

### 8.2 Proactive Context Memory (Context)

**Vision:** Context agent continuously monitors all workspaces and the global KB. When it detects conflicts, outdated references, or useful connections, it pushes alerts that Profé surfaces to the user.

**Phase 1 (architecture only):**
- Context agent ID configurable in Settings
- `context_alerts` table exists
- `/api/context` route exists but is only called manually (no scheduler yet)
- Profé checks for unread alerts on each chat interaction

**Phase 2 (automated):**
- Context runs on a schedule (configurable: hourly, daily)
- Triggered by KB uploads or workspace saves
- Notification badge near Profé panel shows unread alert count
- Alert cards can be dismissed or acted on ("Show me the conflict", "Update it for me")

---

## 9. Migration Path

The redesign touches most of the UI but can be built incrementally without breaking existing functionality.

### Phase 1: Sidebar + Unified Surface

1. Restructure sidebar (workspaces listed directly, global tools, profile at bottom)
2. Build the unified surface layout (collapsible file panel + work surface)
3. Create `workspace_files` table and migrate existing canvas blocks into it
4. Document mode = current CanvasView, repositioned
5. Design Studio mode = current PrototypeView, repositioned
6. Remove old tab-based navigation (Home/Canvas/Prototype/KB tabs)

### Phase 2: Global KB + Agent Team

1. Make `kb_files.workspace_id` nullable for global KB
2. Build global KB view (accessible from sidebar)
3. Add agent configuration UI in Settings (4 lemonade IDs)
4. Build `/api/scholar` route
5. Wire Profé → Scholar delegation for KB queries
6. Create `context_alerts` table and `/api/context` route (manual trigger only)

### Phase 3: Research + Video Library

1. Build `research_articles` table and `/api/research` CRUD
2. Convert Research modal into persistent Research collection view
3. Build `saved_videos` table and `/api/videos` CRUD
4. Convert YouTube modal into persistent Video Library view

### Phase 4: Design Studio Enhancement

1. Visual canvas capabilities (freeform drawing, object placement)
2. AI image generation integration (via Forge agent)
3. Sketch-to-design translation

### Phase 5: Handoff + Proactive Context

1. Build Ludo handoff — static HTML export first
2. Build Context scheduler — automated monitoring
3. Notification system for Context alerts
4. Living deliverable (interactive handoff with AI)

---

## 10. Open Questions

1. **Design Studio canvas library** — What rendering library for the visual canvas? Options: Fabric.js, Konva, or Excalidraw-based. Needs evaluation.
2. **Context scheduling** — How often should Context run? Per-workspace or global sweep? Cost implications with LaunchLemonade tokens.
3. **Handoff hosting** — Where do living deliverables get hosted? Self-hosted on the VPS, or a separate service?
4. **Agent character assets** — The AI Faculty Lounge character designs need to be integrated. What format are they in? SVG, PNG, Lottie?
5. **Research article storage** — Do we store full article content or just metadata + URL? Full content enables better AI context but increases storage.
