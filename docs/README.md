# AI Conversion OS

An AI voice sales rep, embedded on a business's own website: a visitor
clicks an ad, lands on the business's *real* site, browses normally for a
bit — and once they've shown genuine interest, an embedded AI widget
proactively offers to help, holds a real voice conversation like a
dedicated sales rep, and hands a structured lead to a live dashboard.

This is the **investor-demo MVP**: one seeded business (a study-abroad
consultancy), no auth/multi-tenancy/billing, no external CRM or calendar
integration, no vector DB. Every module is built production-quality and
cleanly seamed (see **Architecture** below) so the full product spec can
grow out of this without a rewrite.

## Demo flow

1. Open `/demo` — a simulated Meta ad card.
2. Click **Learn More** → lands on the business's own (simulated) website
   (`/site/study-abroad-meta`) — plain, light-themed marketing content,
   nothing like our product's branding, exactly as a real advertiser's site
   would look.
3. Browse it like a real visitor would — scroll, read. A small floating
   widget bubble sits in the corner the whole time, unobtrusive.
4. After the visitor shows genuine engagement (dwell time + scroll depth —
   see `useEngagementTracker`), the widget proactively surfaces a prompt:
   *"Have a few questions? I'm happy to help — want to chat?"* — or the
   visitor can click the bubble directly at any time to start immediately.
5. Accepting expands the widget into a full voice conversation: the AI
   greets you within ~2 seconds (no LLM call on the first turn — see
   below), qualifies you, answers questions, and works toward booking a
   call.
6. Open `/dashboard` in a second tab → the lead appears live with an intent
   score, category (Hot/Warm/Cold), and a summary — pushed over a
   WebSocket, not polled.

**Why simulate the company site instead of embedding on a real one?** A true
cross-domain embeddable widget (a `<script>` snippet + CORS-safe API +
iframe isolation) is a real production feature, deliberately out of scope
here — this MVP proves the *product concept* (proactive, in-context voice
selling) by rendering the mock site and the widget in the same app. The
widget component (`components/widget/`) is already structured as a
self-contained unit for that future extraction.

## Prerequisites

- Python 3.10+
- Node 20+
- [Ollama](https://ollama.com) running locally with `qwen3:1.7b` pulled:
  `ollama pull qwen3:1.7b`
- A Chromium-based browser (Chrome/Edge) for voice — the Web Speech API
  (SpeechRecognition/SpeechSynthesis) isn't implemented everywhere.

## Running it (local dev — the primary loop)

```powershell
# First-time setup
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\frontend
npm install
cd ..

# Every time after
.\scripts\dev.ps1   # Windows — opens two terminal windows
# or
./scripts/dev.sh    # macOS/Linux
```

The backend seeds its one demo business automatically on startup (see
`backend/app/database/seed.py`) and warms up the Ollama model so the first
real conversation isn't slowed by a cold model load.

- Backend health: http://localhost:8010/api/health — `model_ready: true`
  confirms Ollama is warm, not just that the port is reachable.
- Ad simulator: http://localhost:5173/demo
- Dashboard: http://localhost:5173/dashboard

## Running it with Docker Compose

Ollama is **not** containerized — it stays running natively on the host
(GPU passthrough on Windows/Mac Docker is awkward, and it's already running
there for dev). The backend container reaches it via
`host.docker.internal`.

```bash
docker compose -f docker/docker-compose.yml up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:8010

## Architecture

Clean Architecture layering in `backend/app/`:

```
models/        entities — SQLAlchemy ORM, depend on nothing
schemas/       Pydantic DTOs — kept separate from ORM models on purpose
brain/         the LLM boundary (Ollama client, prompt building, stage
               strategy, extraction) — the only place that imports httpx
               against Ollama's API directly
conversation/  use-case orchestration for a live turn (turn_orchestrator.py
               is the concurrency/consistency core — see its docstring)
knowledge/     KnowledgeProvider interface + the flat-row MVP implementation
               (swap seam for a future RAG implementation)
crm/           in-house lead pipeline (CRUD, status, scoring guardrails,
               appointments) — "CRM" here means our own Lead table, not a
               third-party push
analytics/     dashboard aggregation queries
voice/         the WebSocket turn protocol (not audio codecs — those are
               100% browser-side via the Web Speech API)
api/           FastAPI routers — depend on use cases only, never touch
               database/ directly
config/        settings + stage_prompts.yaml (per-stage sales instructions,
               editable without touching code)
database/      engine/session + the idempotent seed script
utils/         cross-cutting helpers (JSON recovery from LLM text, time,
               ids)
```

Frontend (`frontend/src/`) mirrors this at the UI layer: `hooks/` own the
Web Speech API and WebSocket wiring, `components/voice/` and
`components/dashboard/` are presentational, `pages/` compose them.

### Key decisions worth knowing before you read the code

- **Turn 1 (the greeting) never calls the LLM.** It's a business-configured
  template, spoken immediately — that's what makes "greet within 2
  seconds" a guarantee, not a hope.
- **Two Ollama calls run concurrently per user turn** (`asyncio.gather` in
  `turn_orchestrator.py`): a structured lead-extraction call and the
  conversational reply. The reply reads the *previous* turn's fields, which
  is what makes the concurrency safe (no write-path overlap) and fast
  (`max(t1,t2)` not `t1+t2`).
- **Conversation stage is a deterministic rule-based state machine**
  (`brain/stage_strategy.py`), not self-reported by the LLM — a 1.7B local
  model claiming its own stage is both unreliable and unfalsifiable. Stage
  is computed from which lead fields are already known, plus a small
  keyword heuristic for objection/booking signals.
- **Lead score is guardrailed, never trusted outright.** The extraction LLM
  proposes a 0–100 score; `crm/scoring.py::categorize()` — a pure function —
  is the only thing that decides Hot/Warm/Cold.
- **Native WebSockets, not Socket.io** — simpler for a single local demo
  connection, full native FastAPI support, no second protocol layer.
- **"Should the AI speak yet?" is decided entirely client-side**
  (`hooks/useEngagementTracker.ts`), from real dwell-time-while-visible and
  scroll depth — not a timer that fires the moment the page loads. This is
  cheap, correct to do in the browser (only the browser can observe scroll/
  focus), and keeps the backend's conversation-start endpoint indifferent to
  *when* it's called — proactive trigger or manual bubble click hit the
  exact same code path.

## Tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

Unit tests cover the pure functions (`stage_strategy.py`, `crm/scoring.py`,
`utils/json_extraction.py`) with no I/O; an integration test exercises
`turn_orchestrator.py` end-to-end against a fake `LLMClient` (no real Ollama
call in CI).
