# GEMINI.md

This file provides guidance to Gemini Code Assist when working with code in this repository.

## Project Overview

**60 Watts of Clarity** — a self-hosted AI workspace platform for non-technical professionals. Built by Jason Fernandez, MA, LMSW.
Features include Canvas (block editor), Prototype Studio (live code preview), Knowledge Base (file management), and Profé (floating AI chat assistant).

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
- `src/components/AppInner.tsx` — **The monolithic v6 prototype.** Contains the entire UI: sidebar nav, Canvas editor, Prototype Studio, Knowledge Base, Profé AI panel. This is considered the "loved" design — **do not refactor or restyle it** without explicit permission.
- `src/lib/` — Shared modules: `colors.ts`, `styles.ts`, `helpers.ts`, `icons.tsx`, `types.ts`, `auth.tsx`, and `directus.ts`.
- `src/app/api/` — API Routes (server-side) to securely handle AI proxies and external requests.

## Design System — NON-NEGOTIABLE

Spline-inspired 3D luxury tech aesthetic. Every surface uses glassmorphism. Dark obsidian backgrounds with rose gold accents and soft cream text.

### Critical Rules

- **Fonts:** Clash Display (headings), Satoshi (body/UI), JetBrains Mono (code only). **BANNED:** Inter, Roboto, Arial, system-ui, Helvetica, Open Sans, Lato, Montserrat, DM Sans.
- **Colors:** Use the `C` object from `src/lib/colors.ts`. Obsidian blacks (`#08090C`–`#2C303D`), Rose gold (`#E8A87C`), Cream text (`#FAF5EF`). **Never use white/light backgrounds.**
- **Glass:** All elevated surfaces use `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 16px`. Use the `glass()` helper.
- **Ambient orbs:** Three blurred gradient circles (rose gold, violet, amber) floating behind content. Not optional.
- **No component libraries:** (Material UI, Chakra, etc.) — all custom.

## Data & Integrations

- **Backend:** Directus SDK for database reads, authentication, and session management.
- **AI Provider:** Exclusively LaunchLemonade APIs.

## Development Phases

- **Phase 1 (NOW):** Single-workspace MVP — Canvas, Prototype Studio, KB, Profé + Claude
- **Phase 1 (NOW):** Single-workspace MVP — Canvas, Prototype Studio, KB, Profé + LaunchLemonade
- **Phase 3:** LaunchLemonade integration, per-workspace agents, session timeline, ethical guardrails
- **Phase 4:** Multi-user, sharing, subscriptions, mobile