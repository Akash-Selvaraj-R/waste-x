# WASTEX — AI-Powered Waste Intelligence

**See waste. Understand risk. Orchestrate action. Verify impact.**

WASTEX is an AI-powered waste management platform concept designed to help cities identify waste hotspots, assess environmental risks, prioritize cleanup operations, and track outcomes for cleaner, more sustainable communities.

## ✨ Features

- 📊 **Intelligence Dashboard** — Waste management overview and key indicators.
- 🚨 **Incident Reporting** — Submit waste reports through an accessible intake form. Valid reports are validated by the API and persisted to PostgreSQL, and the incident register reads live records from the database.
- 🗺️ **Hotspot & Map Views** — Explore waste incidents and hotspot information.
- ⚙️ **Operations & Routes** — Explore cleanup coordination workflows.
- 📈 **Reports & Analytics** — Review waste intelligence and reporting views.
- 🤖 **AI Intelligence Workflow** — Observe → Understand → Assess → Predict → Plan → Act → Verify → Learn.

## 🛠️ Tech Stack

- Next.js (App Router) with React and TypeScript
- Tailwind CSS
- PostgreSQL with Drizzle ORM
- Zod request validation
- Vitest for unit and integration tests

## 🚀 Getting Started

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io), and a PostgreSQL 14+ server (Docker is the easiest way to run one).

```bash
git clone https://github.com/Akash-Selvaraj-R/waste-x.git
cd waste-x
pnpm install
```

### 1. Configure the environment

Copy the template and fill in your own values. Never commit `.env` (it is gitignored).

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection URL used by the app, migrations and seeds. |
| `TEST_DATABASE_URL` | no | Separate database used by the integration test suite. Leave unset to skip those tests. |

The template defaults to `postgresql://USER:PASSWORD@localhost:5432/wastex`. A local
PostgreSQL, a Docker container, Neon, Supabase, RDS or any other provider all work as long
as `DATABASE_URL` points at it. If you use the development container from this project's
local setup, it publishes PostgreSQL on port `5433`, so the URL must use `127.0.0.1:5433`.

### 2. Start PostgreSQL and apply migrations

```bash
# using your own server: create the database first
#   createdb wastex   (or any PostgreSQL client of your choice)

pnpm db:migrate     # applies the SQL in ./drizzle
pnpm db:seed        # optional: load the demo incidents
```

`pnpm db:generate` regenerates the SQL in `./drizzle` after changing `lib/db/schema.ts`.

### 3. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the development server. |
| `pnpm build` | Create a production build. |
| `pnpm start` | Serve the production build. |
| `pnpm typecheck` | TypeScript typecheck (`tsc --noEmit`). |
| `pnpm test` | Run the Vitest suite (integration tests run when `TEST_DATABASE_URL` is set). |
| `pnpm db:generate` | Generate migration SQL from the Drizzle schema. |
| `pnpm db:migrate` | Apply pending migrations to `DATABASE_URL`. |
| `pnpm db:seed` | Seed demo incidents (idempotent, never overwrites existing records). |

## 🔌 API

All error responses use the shape `{"error": {"code": "...", "message": "...", "details": [...]}}`.

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Service health. Returns `200` when the database answers, `503` when it is unreachable or unconfigured. |
| `GET /api/incidents` | List incidents. Query: `limit` (≤100), `offset`, `status`, `severity`, `category`. Returns `{incidents, meta}`. |
| `POST /api/incidents` | Create an incident. Body: `title`, `category`, `severity`, `location`, optional `description`, `latitude`, `longitude`. Returns `201` with the generated `WX-####` reference. |
| `GET /api/incidents/:ref` | Fetch one incident by reference (for example `WX-1042`). |

Status codes: `400` validation/malformed reference, `404` unknown reference, `409` reference
conflict, `413` payload too large, `500` unexpected failure, `503` database not configured or
unreachable.

## 🧪 Validation

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm test
```

## ⚠️ Current Status

WASTEX is under active development. **Phase 2 is complete:** the incident intake form
validates input through Zod, persists reports to PostgreSQL through the REST API, and the
incident register and detail pages read persisted records (including after a refresh).

Known limitations:

- AI vision, hotspots, operations, routes, verification, analytics and agent views render
  demo fixtures — they are not backed by live models or environmental feeds.
- Photos selected in the intake form stay in the browser; attachment storage is not implemented.
- There is no authentication, authorization or rate limiting on the API.
- The reports module exports the demo fixtures it displays; scheduled city reports are not implemented.
- Unknown top-level URLs render a generic workspace page; unmatched deep URLs render the custom
  not-found view with an HTTP 200 status.

## 🗺️ Roadmap

- AI-assisted waste classification and risk assessment
- Geospatial hotspot analysis
- Cleanup verification and impact tracking
- Authentication, multi-tenant operations and scheduled reporting

## 👨‍💻 Author

**Akash Selvaraj R**

- GitHub: [@Akash-Selvaraj-R](https://github.com/Akash-Selvaraj-R)

---

*Building toward smarter, more accountable urban waste management.*
