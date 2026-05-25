# WHITE HOUSE WEALTH OS

> A self-hosted, AI-powered personal finance operating system built for serious wealth tracking, budgeting, and financial intelligence.

![Screenshot placeholder](docs/screenshot-placeholder.png)

---

## Features

- **Net Worth Dashboard** — Real-time snapshot of assets, liabilities, and net worth trend over time
- **Transaction Intelligence** — AI-categorized transactions with smart deduplication and tagging
- **Budget Engine** — Envelope-style budgets with rollover support and spending alerts
- **Investment Tracker** — Portfolio positions, cost basis, unrealized gain/loss, and dividend tracking
- **Cash Flow Forecasting** — AI-generated 30/60/90-day cash flow projections based on historical patterns
- **Firefly III Sync** — Bidirectional sync with a self-hosted Firefly III instance
- **AI Financial Advisor** — Ask questions about your finances in plain English (Anthropic Claude, OpenAI GPT-4, or local Ollama)
- **Goal Tracking** — SMART financial goals with milestone progress and automated contributions
- **Reports & Exports** — Monthly/annual reports, CSV/PDF exports, and tax-ready summaries
- **Multi-Currency** — Full multi-currency support with live exchange rates
- **Role-Based Access** — Household mode with per-user permissions (owner, viewer, partner)

---

## Quick Start

Get the full stack running in five steps.

**Prerequisites:** Docker 24+ and Docker Compose v2 installed.

```bash
# 1. Clone the repository
git clone https://github.com/your-org/whitehousewealth.git
cd whitehousewealth

# 2. Copy and configure environment variables
cp .env.example .env
#    Open .env and set at minimum:
#      SECRET_KEY  (generate with: openssl rand -hex 32)
#      ANTHROPIC_API_KEY or OPENAI_API_KEY

# 3. Build the images
make build

# 4. Start all services
make up

# 5. (Optional) Load demo data
make seed
```

The app will be available at:

| Service  | URL                      |
|----------|--------------------------|
| Frontend | http://localhost:3000    |
| API docs | http://localhost:8000/docs |
| API      | http://localhost:8000    |

---

## Docker Compose Setup

The `docker-compose.yml` defines five services:

| Service    | Image / Context   | Port  | Purpose                              |
|------------|-------------------|-------|--------------------------------------|
| `postgres` | postgres:16-alpine | 5432 | Primary relational database          |
| `redis`    | redis:7-alpine     | 6379 | Task queue broker + response cache   |
| `api`      | ./backend          | 8000 | FastAPI application server           |
| `worker`   | ./backend          | —    | Celery async worker (background jobs)|
| `frontend` | ./frontend         | 3000 | Next.js frontend                     |

### Useful Makefile commands

```bash
make up              # Start all services (detached)
make down            # Stop all services
make build           # Rebuild Docker images
make logs            # Stream logs from all services
make logs-api        # Stream API logs only
make logs-frontend   # Stream frontend logs only
make shell-api       # Open a bash shell in the API container
make shell-frontend  # Open a shell in the frontend container
make migrate         # Run pending Alembic database migrations
make migration name="add_goal_table"  # Generate a new migration
make reset           # Tear down + delete volumes, then restart fresh
make seed            # Load demo data into a running stack
make test-api        # Run Python test suite
make test-frontend   # Run Next.js test suite
make lint-api        # Run ruff + mypy on backend
make lint-frontend   # Run ESLint on frontend
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values before starting.

### Database

| Variable            | Default              | Description                        |
|---------------------|----------------------|------------------------------------|
| `POSTGRES_PASSWORD` | `whwos_dev_password` | PostgreSQL password for the `whwos` user |

### Security

| Variable     | Required | Description                                           |
|--------------|----------|-------------------------------------------------------|
| `SECRET_KEY` | Yes      | 32+ character random string used for JWT signing. Generate with `openssl rand -hex 32` |

### Firefly III Integration

| Variable           | Default | Description                                   |
|--------------------|---------|-----------------------------------------------|
| `FIREFLY_BASE_URL` | —       | Base URL of your Firefly III instance, e.g. `http://firefly.home:8080` |
| `FIREFLY_PAT`      | —       | Personal Access Token from Firefly III profile settings |

Leave both blank to disable Firefly III sync entirely.

### AI Configuration

| Variable           | Default      | Description                                      |
|--------------------|--------------|--------------------------------------------------|
| `AI_PROVIDER`      | `anthropic`  | Active AI backend: `anthropic`, `openai`, or `ollama` |
| `ANTHROPIC_API_KEY`| —            | API key from console.anthropic.com               |
| `OPENAI_API_KEY`   | —            | API key from platform.openai.com                 |
| `OLLAMA_BASE_URL`  | —            | Base URL of a running Ollama instance, e.g. `http://ollama:11434` |

Only the key for the selected `AI_PROVIDER` is required.

### Frontend

| Variable               | Default                   | Description                              |
|------------------------|---------------------------|------------------------------------------|
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8000`   | Public URL the browser uses to reach the API |

---

## Firefly III Integration

WHITE HOUSE WEALTH OS can sync with a self-hosted [Firefly III](https://www.firefly-iii.org/) instance.

### Setup

1. In your Firefly III instance, go to **Profile > OAuth > Personal Access Tokens** and create a new token.
2. Set `FIREFLY_BASE_URL` and `FIREFLY_PAT` in your `.env` file.
3. Restart the stack: `make down && make up`
4. Navigate to **Settings > Integrations > Firefly III** in the app and trigger an initial sync.

### What syncs

- Accounts (checking, savings, credit, investment)
- Transactions (with categories and tags preserved)
- Budgets and budget limits
- Bills and recurring transactions
- Piggy banks (mapped to Goals)

Sync runs automatically every 15 minutes via the Celery worker, or can be triggered manually from the UI.

---

## AI Configuration

The AI advisor answers questions like:

- "How much did I spend on restaurants last quarter?"
- "Am I on track to hit my emergency fund goal by December?"
- "What subscriptions have I not used in the past 60 days?"
- "Show me my top 5 spending categories as a percentage of income."

### Anthropic Claude (recommended)

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

Uses `claude-sonnet-4-6` by default. Claude has strong financial reasoning and safe, grounded responses.

### OpenAI GPT-4

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Uses `gpt-4o` by default.

### Ollama (local / offline)

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

Pull a model first: `ollama pull llama3`. Financial reasoning quality varies by model size.

---

## Development Mode

Run the backend and frontend locally without Docker for a faster hot-reload cycle.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start a local postgres and redis (or use docker-compose for just those):
docker compose up -d postgres redis

export DATABASE_URL="postgresql+asyncpg://whwos:whwos_dev_password@localhost:5432/whwos"
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="local-dev-secret-key-32-chars-ok"

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Or use the Makefile shortcuts:

```bash
make dev-api       # starts uvicorn with --reload
make dev-frontend  # starts next dev
```

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │              Browser / Client            │
                        └───────────────────┬─────────────────────┘
                                            │ HTTP / WebSocket
                        ┌───────────────────▼─────────────────────┐
                        │         Next.js Frontend  :3000          │
                        │   (React, Tailwind, Recharts, shadcn)    │
                        └───────────────────┬─────────────────────┘
                                            │ REST / JSON
                        ┌───────────────────▼─────────────────────┐
                        │         FastAPI Backend  :8000           │
                        │   (Python, SQLAlchemy, Alembic, Pydantic)│
                        └──────┬──────────────────┬───────────────┘
                               │                  │
              ┌────────────────▼──┐    ┌──────────▼────────────────┐
              │  PostgreSQL :5432  │    │     Redis  :6379           │
              │  (primary store)   │    │  (task broker + cache)     │
              └────────────────────┘    └──────────┬────────────────┘
                                                   │
                                       ┌───────────▼───────────────┐
                                       │    Celery Worker           │
                                       │  (background jobs, sync,  │
                                       │   AI inference tasks)      │
                                       └───────────┬───────────────┘
                                                   │
                          ┌────────────────────────┼──────────────────────────┐
                          │                        │                          │
              ┌───────────▼──────┐    ┌────────────▼────────┐   ┌────────────▼────────┐
              │  Firefly III API  │    │  AI Provider API     │   │  Exchange Rate API   │
              │  (optional sync)  │    │  (Claude / GPT / LLM)│   │  (currency rates)    │
              └───────────────────┘    └─────────────────────┘   └─────────────────────┘
```

---

## Module Descriptions

### `backend/`

| Path                        | Description                                                       |
|-----------------------------|-------------------------------------------------------------------|
| `app/main.py`               | FastAPI application factory, middleware, and router registration  |
| `app/api/`                  | Route handlers organized by domain (accounts, transactions, AI…) |
| `app/models/`               | SQLAlchemy ORM models                                             |
| `app/schemas/`              | Pydantic request/response schemas                                 |
| `app/services/`             | Business logic layer (isolated from HTTP and DB concerns)         |
| `app/services/ai/`          | AI provider abstraction (Anthropic, OpenAI, Ollama adapters)      |
| `app/services/firefly/`     | Firefly III REST client and sync logic                            |
| `app/workers/`              | Celery app, task definitions, and scheduled jobs                  |
| `app/db/`                   | Database session factory and base model                           |
| `alembic/`                  | Database migration scripts                                        |
| `seed/`                     | Demo data seeder scripts                                          |

### `frontend/`

| Path                        | Description                                                       |
|-----------------------------|-------------------------------------------------------------------|
| `app/`                      | Next.js App Router pages and layouts                              |
| `app/(dashboard)/`          | Authenticated dashboard routes                                    |
| `components/`               | Reusable React components (charts, cards, forms, tables)          |
| `components/ai/`            | AI advisor chat interface                                         |
| `lib/api/`                  | Typed API client (wraps fetch, handles auth headers)              |
| `lib/hooks/`                | Custom React hooks (useAccounts, useTransactions, useAI…)         |
| `lib/stores/`               | Zustand global state stores                                       |
| `public/`                   | Static assets                                                     |

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Run `make lint-api` and `make lint-frontend` before opening a PR.
3. Add tests for any new business logic in `backend/tests/`.
4. Open a pull request with a clear description of changes.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
