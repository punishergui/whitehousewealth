# WHW Agent API Reference

WHW exposes a dedicated REST API for external AI agents. The intended consumer is
a [Hermes](https://github.com/NousResearch/hermes) agent running alongside WHW on
the same TrueNAS box, connected via a shared Docker bridge network.

WHW itself does **no AI work** — it stores financial data and displays results written
by the agent.

---

## Architecture

```
┌─────────────────────┐        X-Agent-Key        ┌──────────────────────┐
│   Hermes Agent      │ ──── GET /api/agent/* ───► │   WHW API (FastAPI)  │
│  (separate compose) │ ◄─── POST /api/agent/* ─── │   + PostgreSQL       │
└─────────────────────┘                            └──────────────────────┘
        │                                                    │
        │  hermes_whw_bridge (Docker network)               │
        └───────────────────────────────────────────────────┘
```

---

## Network Setup

```bash
# Run once on the TrueNAS host before `docker compose up`
docker network create hermes_whw_bridge
```

Both `api` and `worker` services join `hermes_whw_bridge` in addition to the
default compose network. Add the same network to the Hermes agent's compose file:

```yaml
networks:
  hermes_whw_bridge:
    external: true
    name: hermes_whw_bridge
```

---

## Authentication

Every request must include the `X-Agent-Key` header:

```
X-Agent-Key: <AGENT_API_KEY>
```

Set `AGENT_API_KEY` in `.env`:

```bash
# Generate a strong key
openssl rand -hex 32
# Paste the output as AGENT_API_KEY in .env
```

Missing or invalid key → `401 Unauthorized`.

---

## Read Endpoints

### `GET /api/agent/snapshot`

Full financial context snapshot for agent reasoning.

```bash
curl -H "X-Agent-Key: $KEY" http://localhost:8000/api/agent/snapshot
```

Response:
```json
{
  "household": { "id": "...", "name": "White House", "created_at": "..." },
  "accounts": [ { "id": "...", "name": "Chase Checking", "type": "checking",
                  "balance": 14320.50, "institution": "", "is_active": true } ],
  "goals": [ { "id": "...", "name": "Emergency Fund", "type": "emergency_fund",
               "current_amount": 18000, "target_amount": 25000,
               "target_date": "2026-12-01", "priority": 1, "color": "#10b981" } ],
  "recent_transactions": [ { "id": "...", "date": "2026-05-24",
                              "description": "Walmart", "merchant_name": "Walmart",
                              "amount": -87.43, "category_name": "Groceries",
                              "account_name": "Chase Checking" } ],
  "debts": [ { "account_id": "...", "name": "Amazon Visa", "balance": -2100,
               "apr": 29.99, "min_payment": 35, "payoff_date": null } ],
  "this_month": { "income": 10400.00, "expense": 7823.14, "net": 2576.86 },
  "summary": { "net_worth": 142300.00, "safe_to_spend": 14320.50,
               "monthly_cash_flow": 2576.86, "emergency_fund_months": null }
}
```

Query param: `?household_id=<uuid>` — omit to use the first household.

---

### `GET /api/agent/uncategorized-transactions`

Transactions missing a category, useful for the categorize workflow.

```bash
curl -H "X-Agent-Key: $KEY" \
  "http://localhost:8000/api/agent/uncategorized-transactions?since=2026-05-01"
```

Query params:
- `since` — ISO date, default 30 days ago
- `household_id` — optional UUID

Response: `[ { "id", "date", "description", "merchant_name", "amount", "account_name" } ]`

---

### `GET /api/agent/categories`

All categories for the household.

```bash
curl -H "X-Agent-Key: $KEY" http://localhost:8000/api/agent/categories
```

Response: `[ { "id", "name", "type", "parent_id", "color" } ]`

---

### `GET /api/agent/jobs/pending`

Pending agent job queue — poll this to find work.

```bash
curl -H "X-Agent-Key: $KEY" http://localhost:8000/api/agent/jobs/pending
```

Response: `[ { "id", "task", "note", "created_at" } ]`

---

## Write Endpoints

### `POST /api/agent/categorize`

Assign categories to uncategorized transactions.

```bash
curl -X POST http://localhost:8000/api/agent/categorize \
  -H "X-Agent-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assignments": [
      {
        "transaction_id": "txn-uuid-here",
        "category_id": "cat-uuid-here",
        "confidence": 0.95,
        "reasoning": "Walmart purchase matches Groceries pattern"
      }
    ]
  }'
```

Response: `{ "updated": 1, "errors": [] }`

---

### `POST /api/agent/briefing`

Write a daily financial briefing (markdown supported).

```bash
curl -X POST http://localhost:8000/api/agent/briefing \
  -H "X-Agent-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Morning Briefing",
    "body": "Good morning! Your safe-to-spend is **$2,847**...",
    "for_date": "2026-05-25"
  }'
```

Response: `{ "id": "...", "for_date": "2026-05-25" }`

---

### `POST /api/agent/priorities`

Set this week's priorities (replaces existing list).

```bash
curl -X POST http://localhost:8000/api/agent/priorities \
  -H "X-Agent-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "title": "Pay Electric Bill",
        "subtitle": "$187 due May 28 — avoid late fee",
        "amount": 187,
        "deadline": "2026-05-28",
        "severity": "urgent"
      },
      {
        "title": "Amazon Promo Expires Dec 1",
        "subtitle": "Pay $2,100 before interest kicks in",
        "amount": 2100,
        "deadline": "2026-12-01",
        "severity": "warning"
      }
    ]
  }'
```

Severity values: `urgent` | `warning` | `info` | `positive`

Response: `{ "saved": 2 }`

---

### `POST /api/agent/anomalies`

Append spending anomalies.

```bash
curl -X POST http://localhost:8000/api/agent/anomalies \
  -H "X-Agent-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "description": "3x normal spend on dining this week",
        "severity": "medium",
        "category": "Dining",
        "amount": 340.00
      }
    ]
  }'
```

Response: `{ "saved": 1 }`

---

### `POST /api/agent/sync-request`

Create a pending job (used by the dashboard Sync AI button via user auth).
Agents can also call this to request work from a second agent.

```bash
curl -X POST http://localhost:8000/api/agent/sync-request \
  -H "X-Agent-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{ "task": "all", "note": "Triggered by schedule" }'
```

Task values: `categorize` | `briefing` | `priorities` | `anomalies` | `all`

Response: `{ "job_id": "..." }`

---

### `POST /api/agent/jobs/{job_id}/complete`

Mark a job done after the agent finishes its work.

```bash
curl -X POST "http://localhost:8000/api/agent/jobs/$JOB_ID/complete" \
  -H "X-Agent-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{ "result_summary": "Categorized 12 transactions, wrote briefing." }'
```

Response: `{ "ok": true }`

---

## Worked Example: Full Agent Cycle

This is the happy path for an agent processing a pending "all" job.

```bash
export KEY=your-agent-api-key
export BASE=http://whwos-api:8000  # inside hermes_whw_bridge network

# 1. Poll for pending work
JOBS=$(curl -s -H "X-Agent-Key: $KEY" $BASE/api/agent/jobs/pending)
JOB_ID=$(echo $JOBS | jq -r '.[0].id')

# 2. Fetch full snapshot for reasoning
SNAPSHOT=$(curl -s -H "X-Agent-Key: $KEY" $BASE/api/agent/snapshot)

# 3. Fetch uncategorized transactions
UNCATEGORIZED=$(curl -s -H "X-Agent-Key: $KEY" \
  "$BASE/api/agent/uncategorized-transactions")

# --- Agent reasons externally here ---

# 4. Post categorizations
curl -X POST $BASE/api/agent/categorize \
  -H "X-Agent-Key: $KEY" -H "Content-Type: application/json" \
  -d '{ "assignments": [{ "transaction_id": "...", "category_id": "...",
        "confidence": 0.92, "reasoning": "Matches Groceries" }] }'

# 5. Post briefing
curl -X POST $BASE/api/agent/briefing \
  -H "X-Agent-Key: $KEY" -H "Content-Type: application/json" \
  -d '{ "title": "Morning Briefing", "body": "...", "for_date": "2026-05-25" }'

# 6. Post priorities
curl -X POST $BASE/api/agent/priorities \
  -H "X-Agent-Key: $KEY" -H "Content-Type: application/json" \
  -d '{ "items": [{ "title": "Pay Electric Bill", "severity": "urgent",
        "amount": 187, "deadline": "2026-05-28" }] }'

# 7. Mark job complete
curl -X POST "$BASE/api/agent/jobs/$JOB_ID/complete" \
  -H "X-Agent-Key: $KEY" -H "Content-Type: application/json" \
  -d '{ "result_summary": "Processed 8 transactions, wrote briefing + 3 priorities." }'
```

The WHW dashboard auto-refreshes every 5 seconds for 60 seconds after Sync AI is
clicked, so results typically appear within one refresh cycle.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `agent_briefings` | Daily briefings written by the agent |
| `agent_priorities` | Weekly priority items (replaced on each write) |
| `agent_anomalies` | Spending anomalies (appended) |
| `agent_categorization_log` | Audit log of agent-assigned categories |
| `agent_jobs` | Job queue (pending / completed) |
