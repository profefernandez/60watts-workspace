# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

60 Watts of Clarity — a self-hosted AI workspace platform for non-technical professionals. Built by Jason Fernandez, MA, LMSW. Features Canvas (block editor), Prototype Studio (live code preview), Knowledge Base (file management), and Profé (floating AI chat assistant).

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking (tsc --noEmit)
```

## Architecture

**Next.js 15 App Router** with React 18, TypeScript, Tailwind CSS 3.

### Key Structure

- `src/app/page.tsx` — Entry point, wraps `AppInner` in `ErrorBoundary`
- `src/components/AppInner.tsx` — **The monolithic v6 prototype.** Contains the entire UI: sidebar nav, Canvas editor, Prototype Studio, Knowledge Base, Profé AI panel, Research modal, YouTube modal. This file is ~2000+ lines and is considered the "loved" design — **do not refactor or restyle it** without explicit permission.
- `src/lib/` — Shared module barrel:
  - `colors.ts` — `C` (raw palette), `DK` (dark theme), `LT` (light theme) objects
  - `styles.ts` — `glass()`, `glassBtn()`, `toolbarBtn()` style helper functions (return CSSProperties)
  - `helpers.ts` — `uid()`, `sanitize()`, `sanitizeUrl()`, `fileIcon()`, `fileCat()`, `fmtSz()`
  - `icons.tsx` — `I` object with SVG icon components via `Ic` helper
  - `types.ts` — Core interfaces: `Block`, `KBFile`, `AIMessage`, `ResearchResult`, `YouTubeResult`, `ThemeColors`, `Tab`, `PrototypeMode`
  - `index.ts` — Barrel re-export of all above

### API Routes (server-side, `/src/app/api/`)

- `chat/route.ts` — Profé AI proxy via LaunchLemonade API endpoint.
- `research/route.ts` — Research panel. Uses Claude with `web_search` tool to return structured JSON results.
- `youtube/route.ts` — YouTube search endpoint.

### Environment Variables

- `LAUNCHLEMONADE_API_URL` — Optional, defaults to `https://api.launchlemonade.com/v1/messages`
- `LAUNCHLEMONADE_API_KEY` — Optional shared fallback key
- `LAUNCHLEMONADE_PROFE_API_KEY` — Required for Profé chat
- `LAUNCHLEMONADE_TOP_SEARCH_API_KEY` — Required for top search queries
- `LAUNCHLEMONADE_CONTEXTUAL_SEARCH_API_KEY` — Required for contextual search queries
- `LAUNCHLEMONADE_KB_SCAN_API_KEY` — Required for knowledge-base scan queries
- `LAUNCHLEMONADE_MODEL` — Optional shared fallback model

## Design System — NON-NEGOTIABLE

Spline-inspired 3D luxury tech aesthetic. Every surface uses glassmorphism. Dark obsidian backgrounds with rose gold accents and soft cream text.

### Critical Rules

- **Fonts:** Clash Display (headings), Satoshi (body/UI), JetBrains Mono (code only). **BANNED:** Inter, Roboto, Arial, system-ui, Helvetica, Open Sans, Lato, Montserrat, DM Sans.
- **Colors:** Use the `C` object from `src/lib/colors.ts`. Obsidian blacks (#08090C–#2C303D), Rose gold (#E8A87C), Cream text (#FAF5EF). Never use white/light backgrounds.
- **Glass:** All elevated surfaces: `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 16px`. Use the `glass()` helper.
- **Ambient orbs:** Three blurred gradient circles (rose gold, violet, amber) floating behind content. Not optional.
- **Min font sizes:** Body 20px, nav 16px, labels 13px (sparingly), headings 26px. Nothing below 13px.
- **No component libraries** (Material UI, Chakra, etc.) — all custom.

### Note on `AppInner.tsx`

AppInner has its own inline copy of `C`, `uid`, icons, etc. The `src/lib/` modules are the canonical extracted versions. The duplication exists because AppInner is the original v6 prototype preserved as-is.

## Security

- API keys never touch the frontend — all AI calls route through Next.js API routes
- CSP headers configured in `next.config.js`
- `sanitize()` and `sanitizeUrl()` in helpers for user input

## Deployment

Scala Hosting VPS (Rocky Linux, SPanel). SSH port 6543. GitHub Actions deploys the build.
