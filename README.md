# 60 Watts of Clarity

> The Operating System for Non-Technical Professionals Working with AI.

**60 Watts of Clarity** is a self-hosted AI workspace platform built around a "Workspace-as-brain" architecture. It scopes contextual knowledge (30-50 files) to allow AI to comprehend full context without relying on RAG/vector databases, providing a seamless, context-aware environment.

### Architecture: Three Layers
1. **Workspace (The Brain):** Holds all knowledge — files, writing, prototypes, history. Scoped to 30-50 files so AI comprehends full context.
2. **API Connectors (The Senses):** Plug-and-play connections (e.g., Perplexity, Google Scholar, YouTube, PubMed).
3. **Trained Agents (The Intelligence):** Specialized AI built via LaunchLemonade, attached to workspaces with ethical guardrails.

## Features

- **Canvas:** Block-based editor (H1/H2/text/image/YouTube) connected to the Knowledge Base pipeline.
- **Prototype Studio:** Live HTML/CSS/JS environment with Split, Code, and Preview modes.
- **Knowledge Base:** Workspace-scoped file management auto-categorized by type.
- **Profé AI:** LaunchLemonade-powered floating, draggable chat assistant.
- **Research & Integrations:** AI web search returning structured JSON results, plus direct YouTube video search/embed capabilities.

## Tech Stack

- **Framework:** Next.js 15 App Router (React 18, TypeScript)
- **Styling:** Tailwind CSS 3 (Custom design tokens, strictly no external component libraries)
- **AI Integration:** Exclusively powered by LaunchLemonade API
- **Backend/Auth:** Directus SDK for database reads, authentication, and session management

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- LaunchLemonade API Key
- An active, external Directus Instance (No local database required)
- SPanel hosting environment (for production)

### Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_DIRECTUS_URL=https://your-company-directus-url.com
LAUNCHLEMONADE_API_KEY=your_launchlemonade_api_key_here
```

### Installation & Scripts
```bash
npm install
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checking (tsc --noEmit)
```

## Project Structure
- `src/app/page.tsx` — Application entry point, wraps the UI in an ErrorBoundary.
- `src/components/AppInner.tsx` — **The monolithic v6 prototype.** Contains the core UI (sidebar nav, Canvas, Prototype Studio, Knowledge Base, Profé AI panel). *Crucial: This is the locked design—do not refactor or restyle without explicit permission.*
- `src/lib/` — Shared modules, raw palette (`colors.ts`), styling helpers (`styles.ts`), API instances (`directus.ts`), and SVG icons (`icons.tsx`).
- `src/app/api/` — Server-side API routes handling proxy requests to Anthropic and Research/YouTube endpoints to keep keys secure.

## Strict Design Guidelines
This project uses a Spline-inspired 3D luxury tech aesthetic. These constraints are non-negotiable:
- **Colors:** Obsidian blacks (`#08090C` to `#2C303D`), Rose gold accents (`#E8A87C`), and Soft cream text (`#FAF5EF`). **Never use white or light backgrounds.**
- **Typography:** Clash Display (Headings), Satoshi (Body/UI), JetBrains Mono (Code). **Banned:** System UI, Inter, Roboto, Arial, etc.
- **Glassmorphism:** Elevated surfaces must use specific backdrop blurs, slight borders, and `rgba(255,255,255,0.04)` backgrounds. Use the `glass()` helper function in `src/lib/styles.ts`.
- **Animations:** Subtle floating orbs and ambient gradients must remain intact.

## Development Phases
- **Phase 1 (Current):** Single-workspace MVP — Canvas, Prototype Studio, KB, Profé + Claude
- **Phase 2:** Multi-workspace, home screen, connector library, Perplexity-style search
- **Phase 3:** LaunchLemonade integration, per-workspace agents, session timeline, ethical guardrails
- **Phase 4:** Multi-user, sharing, subscriptions, mobile

## Deployment
The build is continuously deployed via GitHub Actions to a Scala Hosting VPS (Rocky Linux, SPanel) over SSH port 6543.

---
*Built by Jason Fernandez, MA, LMSW. Version 2.0 (March 2026).*
