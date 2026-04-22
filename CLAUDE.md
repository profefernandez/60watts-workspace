# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

60 Watts of Clarity — a self-hosted AI workspace platform for non-technical professionals. Built by Jason Fernandez, MA, LMSW. Target features: Canvas (block editor), Prototype Studio (live code preview), Knowledge Base (file management), Profé (floating AI chat assistant), and the **Context Engine** (hallmark feature — AI-powered contextual research that reads your document and automatically finds supporting material). See `PLAN.md` for the build-out roadmap.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking (tsc --noEmit)
```

## Infrastructure

```bash
docker compose up -d   # Start Directus + Postgres
```

Directus runs on `http://localhost:8055`. The schema is defined in `directus-schema.json`. The Next.js frontend connects via `NEXT_PUBLIC_DIRECTUS_URL`.

## Architecture

**Next.js 15 App Router** with React 18, TypeScript, Tailwind CSS 3. **Directus 11** as headless CMS / backend (Postgres, REST API, file storage, auth).

### Key Structure

- `src/app/page.tsx` — Entry point, wraps `AppInner` in `ErrorBoundary` → `AuthProvider` → `AuthGate`
- `src/components/AppInner.tsx` — Main workspace shell (~470 lines). Contains sidebar nav, top bar, workspace grid (Home view), and placeholder views for Canvas, Prototype, and Knowledge Base. Feature panels are being built out per `PLAN.md`.
- `src/components/LoginPage.tsx` — Email/password login form (Directus auth)
- `src/components/ErrorBoundary.tsx` — React error boundary with restart fallback
- `src/lib/` — Shared module barrel:
  - `auth.tsx` — `AuthProvider` context + `useAuth()` hook (Directus session management)
  - `directus.ts` — Directus SDK client + collection type definitions (`Workspace`, `KBFile`, `AgentConfig`, `UserApiKey`, `CanvasBlock`, `ContextSuggestion`)
  - `colors.ts` — `C` (raw palette), `DK` (dark theme), `LT` (light theme) objects
  - `styles.ts` — `glass()`, `glassBtn()`, `toolbarBtn()` style helper functions (return CSSProperties)
  - `helpers.ts` — `uid()`, `sanitize()`, `sanitizeUrl()`, `fileIcon()`, `fileCat()`, `fmtSz()`
  - `icons.tsx` — `I` object with SVG icon components via `Ic` helper
  - `types.ts` — Core interfaces: `Block`, `KBFile`, `AIMessage`, `ResearchResult`, `YouTubeResult`, `ThemeColors`, `Tab`, `PrototypeMode`
  - `index.ts` — Barrel re-export of all above

### Directus Collections

Defined in `directus-schema.json` and typed in `src/lib/directus.ts`:

- `workspaces` — User workspaces (name, description, user_id → directus_users)
- `canvas_blocks` — Block content per workspace (heading, subheading, text, image, youtube + sort_order)
- `kb_files` — Knowledge Base files per workspace (file → directus_files, category)
- `context_suggestions` — Context Engine output: material the AI found relevant but didn't auto-insert (source_type, content, relevance_note, status: pending/accepted/dismissed)
- `agent_configs` — AI agent configurations per workspace (provider, agent_id, display_name, is_active)
- `user_api_keys` — User-provided API keys (user_id → directus_users, provider, hashed api_key)

### API Routes (server-side, `/src/app/api/`)

- `chat/route.ts` — Profé AI chat. **LaunchLemonade only.** Calls the trained Profé agent via `POST https://api.launchlemonade.app/v1/chat`. Uses server-side `LAUNCHLEMONADE_API_KEY` + `LAUNCHLEMONADE_PROFE_ID`. **Not yet connected to frontend.**
- `research/route.ts` — Research panel. Uses **user-provided API key** (passed per-request from client, stored in Directus `user_api_keys`). Currently supports Anthropic Claude with `web_search` tool. **Not yet connected to frontend.**
- `youtube/route.ts` — YouTube search. Uses **user-provided API key** (same pattern as research). Currently supports Anthropic Claude + web_search. **Not yet connected to frontend.**
- `context/route.ts` — **(Planned)** Context Engine. **LaunchLemonade only.** Reads canvas + KB from Directus, sends to LaunchLemonade agent for analysis and contextual suggestions. See `PLAN.md` Phase 2.5.

### Current Implementation Status

| Feature | Backend | Frontend |
|---------|---------|----------|
| Auth (Directus login/logout) | Done | Done |
| Workspaces (list, create) | Done | Done |
| KB file counts on workspace cards | Done | Done |
| Canvas block editor | Directus collection ready | Placeholder only |
| Knowledge Base file UI | Directus collection ready | Placeholder only |
| Profé AI chat (LaunchLemonade) | API route ready | Not built |
| **Context Engine** (LaunchLemonade) | Schema + types ready | Not built |
| Research panel (user API key) | API route ready | Not built |
| YouTube panel (user API key) | API route ready | Not built |
| Prototype Studio | — | Not built |
| User API keys | Directus collection ready | Not built |
| Agent configs | Directus collection ready | Not built |
| CI/CD | — | Not built |

### Environment Variables (Server)

- `NEXT_PUBLIC_DIRECTUS_URL` — Directus URL (default: `http://localhost:8055`)
- `LAUNCHLEMONADE_API_KEY` — Required for Profé chat and Context Engine
- `LAUNCHLEMONADE_PROFE_ID` — The Profé agent's lemonade_id in LaunchLemonade
- `LAUNCHLEMONADE_CONTEXT_ID` — Optional separate Context Engine agent (falls back to Profé)

### User-Provided Keys (per-request, stored in Directus)

Research and YouTube use the user's own API keys. No server-side Anthropic/Perplexity keys are stored. Users add their keys in Settings; keys are stored hashed in Directus `user_api_keys` and passed per-request to the API routes.

## Design System — NON-NEGOTIABLE

Spline-inspired 3D luxury tech aesthetic. Every surface uses glassmorphism. Dark obsidian backgrounds with rose gold accents and soft cream text.

### Critical Rules

- **Fonts:** Clash Display (headings), Satoshi (body/UI), JetBrains Mono (code only). **BANNED:** Inter, Roboto, Arial, system-ui, Helvetica, Open Sans, Lato, Montserrat, DM Sans.
- **Colors:** Use the `C` object from `src/lib/colors.ts`. Obsidian blacks (#08090C–#2C303D), Rose gold (#E8A87C), Cream text (#FAF5EF). Never use white/light backgrounds.
- **Glass:** All elevated surfaces: `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 16px`. Use the `glass()` helper.
- **Ambient orbs:** Three blurred gradient circles (rose gold, violet, amber) floating behind content. Not optional.
- **Min font sizes:** Body 20px, nav 16px, labels 13px (sparingly), headings 26px. Nothing below 13px.
- **No component libraries** (Material UI, Chakra, etc.) — all custom.

## Security

- API keys never touch the frontend — all AI calls route through Next.js API routes
- CSP headers configured in `next.config.js`
- `sanitize()` and `sanitizeUrl()` in helpers for user input
- **Note:** API routes currently have no auth verification or rate limiting — see `PLAN.md` Phase 1.2

## Deployment

Scala Hosting VPS (Rocky Linux, SPanel). SSH port 6543. GitHub Actions workflow planned but not yet created — see `PLAN.md` Phase 4.1.
