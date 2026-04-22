# 60 Watts of Clarity

The operating system for non-technical professionals working with AI. Workspace-as-brain architecture with Profé AI, Canvas, Prototype Studio, and Knowledge Base.

Built by Jason Fernandez, MA, LMSW.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### 1. Start the backend

```bash
docker compose up -d
```

This starts Directus (headless CMS) on `http://localhost:8055` and Postgres.

Default admin: `jason@60watts.com` / `changeme` (change `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` or `docker-compose.yml`).

### 2. Apply the schema

Open Directus Admin (`http://localhost:8055`), log in, then import the schema:

```
Settings → Data Model → Import Schema → select directus-schema.json
```

Or via the Directus CLI if available.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
LAUNCHLEMONADE_API_KEY=your-key
LAUNCHLEMONADE_PROFE_ID=your-profe-agent-id
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### 5. Set CORS (if Directus is on a different origin)

In `docker-compose.yml`, set `CORS_ORIGIN` to your frontend URL:

```yaml
CORS_ORIGIN: http://localhost:3000
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking
```

## Architecture

- **Next.js 15** App Router + React 18 + TypeScript + Tailwind CSS 3
- **Directus 11** headless CMS (Postgres, REST API, auth, file storage)
- **LaunchLemonade** AI agent platform (Profé chat, Context Engine)

See `CLAUDE.md` for detailed architecture docs and `PLAN.md` for the build-out roadmap.

## License

Proprietary. All rights reserved.
