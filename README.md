# Site Concierge

**An embeddable AI sales concierge that qualifies website visitors through real voice or text conversation, and turns them into scored leads in real time.**

Site Concierge is a multi-tenant SaaS platform. A business signs up, describes its persona, supplies the knowledge its assistant may use, and pastes a two-line `<script>` snippet onto its existing website. From then on the widget engages visitors who show genuine interest, holds a structured sales conversation grounded in that business's own content, and delivers qualified, scored leads to a live dashboard.

> **Project status:** feature-complete for local development and verified end to end against a local stack. Not yet deployed — everything currently runs against `localhost` with SQLite. See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for the prioritized path to a production launch.

---

## Contents

- [Overview](#overview)
- [Key capabilities](#key-capabilities)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Product flow](#product-flow)
- [Embedding the widget](#embedding-the-widget)
- [Client portal and dashboard](#client-portal-and-dashboard)
- [Architecture](#architecture)
- [Design decisions](#design-decisions)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## Overview

### The problem

Most website visitors leave with unanswered questions and no practical way to ask them. A contact form is usually the only option, and most people never complete one. The existing alternatives are a static chatbot that answers FAQs without moving anyone toward a decision, or an enterprise sales-engagement platform priced well beyond what a small or mid-sized business can justify.

Site Concierge targets the gap between those two: companies with real websites and real prospects, who need conversation to close business but cannot fund an enterprise deployment.

### Design philosophy

The system models the job a capable in-person sales associate does — notice genuine interest, open a real conversation, answer the actual question, take hesitation seriously, and guide toward a next step. In practice:

| Principle | Implementation |
| --- | --- |
| Engage only when interest is real | Dwell-time-while-visible and scroll depth, not a page-load timer |
| Let the visitor choose the medium | Voice or text, switchable mid-conversation |
| Never invent facts | Answers grounded in the business's own knowledge base via RAG |
| Follow a sales structure | Deterministic stage machine, not a model self-reporting its progress |
| De-escalate, don't match hostility | Frustration is acknowledged calmly; the goal is pursued more patiently |
| Score every lead as it happens | Intent score, Hot/Warm/Cold category and summary pushed live over WebSocket |

### Intended market

Best suited to **high-consideration, trust-sensitive purchases**, where a conversation genuinely changes the outcome:

- Education, study-abroad and immigration consultancies
- Coaching, test-prep and online course providers
- Fitness studios, wellness clinics, dental and aesthetic practices
- Financial advisors and insurance agents
- Home services — roofing, solar, remodeling
- Law firm intake and case qualification

**Explicitly out of scope:** e-commerce and retail (a distinct, well-served category), low-consideration high-volume purchases, and any use requiring regulated advice rather than intake.

### Cost model

Voice runs entirely on the browser's native Web Speech API, and reasoning runs on a low-cost hosted LLM route. There is close to zero marginal cost per conversation, which is what makes pricing for smaller businesses viable rather than enterprise-only.

**Unvalidated assumption:** whether voice-as-default converts better than text is not yet proven. The voice/text toggle exists specifically because that question is still open.

---

## Key capabilities

- **Conversation engine** — streaming voice and text, RAG-grounded, objection-aware, with a deterministic sales-stage machine
- **Embeddable widget** — a single self-contained script, isolated in a shadow root, with a per-business origin allowlist
- **Self-serve onboarding** — account, persona, knowledge base and embed snippet without developer involvement
- **Client portal** — persona and branding, knowledge CRUD, RAG re-ingestion, embed snippet, lead list
- **Live dashboard** — today's stats, conversion funnel, lead pipeline and full conversation transcripts, updated over WebSocket
- **Multi-tenant isolation** — every client-facing endpoint derives its tenant from the session token; no caller-supplied identifiers are trusted

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.10+, FastAPI 0.115, SQLAlchemy 2.0 (async), Pydantic 2 |
| Database | SQLite via `aiosqlite` (development) |
| Vector store | Qdrant, with local `fastembed` embeddings |
| LLM | Groq (`openai/gpt-oss-20b`) over the OpenAI-compatible Chat Completions API |
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router 7 |
| Voice | Browser-native Web Speech API (`SpeechRecognition` / `SpeechSynthesis`) |
| Realtime | Native WebSockets |
| Testing | pytest with `pytest-asyncio` — 100 tests |

---

## Quick start

### Prerequisites

- **Python 3.10+** and **Node 20+**
- **A Chromium-based browser** (Chrome or Edge) — the Web Speech API is not implemented everywhere
- **A [Groq](https://groq.com) API key**
- **A [Qdrant](https://qdrant.tech) instance** (optional but recommended — see below)

Create `backend/.env`:

```ini
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEY=<your key>
GROQ_MODEL=openai/gpt-oss-20b

QDRANT_URL=<your qdrant url>
QDRANT_API_KEY=<your qdrant key>
```

Qdrant is optional: without it, `RagKnowledgeProvider` degrades to supplying no additional context per turn rather than failing, so the widget still runs — just without grounding in the business's knowledge base.

### Installation

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd ..\frontend
npm install
```

### Populate the vector store

```powershell
cd backend
python -m app.knowledge.ingestion_service
```

This chunks and embeds the demo business's knowledge rows and website copy into Qdrant. Embeddings are computed locally by `fastembed`, so no additional API key is required. Pass `--website-url <url>` to crawl a live site instead of the seeded demo content.

### Run

```powershell
.\scripts\dev.ps1    # Windows — opens two terminal windows
./scripts/dev.sh     # macOS / Linux
```

The backend seeds its demo business on startup (`backend/app/database/seed.py`) and issues a warm-up call to Groq, so the first real conversation is not the request that discovers a bad key.

| Surface | URL |
| --- | --- |
| Backend health | http://localhost:8010/api/health |
| Ad simulator demo | http://localhost:5173/demo |
| Onboarding | http://localhost:5173/onboarding |
| Client portal | http://localhost:5173/portal/login |
| Dashboard | http://localhost:5173/dashboard |

`model_ready: true` on the health endpoint confirms Groq actually returned a completion, not merely that a key is configured.

### Docker Compose

Groq is a hosted API, so nothing additional needs to run on the host:

```bash
export GROQ_API_KEY=<your key>
docker compose -f docker/docker-compose.yml up --build
```

Frontend on `:8080`, backend on `:8010`.

---

## Product flow

1. **Sign up** at `/onboarding` — the business creates an account, defines its persona and greeting, and registers the domains it will embed on.
2. **Supply knowledge** — FAQ, pricing and policy rows entered directly, or crawled from the business's live website.
3. **Install the snippet** — two lines of HTML on the existing site; no framework or platform requirements.
4. **Operate from the portal** — refine the persona, correct the knowledge base, re-run ingestion, and work the incoming leads.

### Demo walkthrough

The repository ships a self-contained narrative demo:

1. Open `/demo` — a simulated advertisement card.
2. Click **Learn More** to land on a simulated advertiser's website at `/site/study-abroad-meta` — a real multi-page site (Home, Destinations, Pricing, Process, Why Us, Testimonials, FAQ), styled nothing like this product.
3. Browse as a visitor would. A floating widget bubble persists across navigation.
4. Once engagement thresholds are met, the widget proactively offers to help, and asks whether to talk or type. Clicking the bubble starts the conversation immediately at any time.
5. The assistant greets within ~2 seconds, qualifies the visitor, answers questions, and works toward booking. As it discusses a topic it navigates the visitor to the matching page.
6. Open `/dashboard` in a second tab to watch the lead arrive live with its score, category and summary.

The demo renders its own "advertiser site" purely for narrative convenience. The widget itself is independently embeddable — see below.

---

## Embedding the widget

Any onboarded business can install the widget on its own site — WordPress, Shopify, hand-written HTML or otherwise — using the snippet generated at the end of onboarding and available at `/portal/embed`:

```html
<script>
  window.SITE_CONCIERGE_CONFIG = { slug: "acme-fitness", apiBase: "https://api.yourapp.com" };
</script>
<script src="https://yourapp.com/widget.js" defer></script>
```

`npm run build:widget` emits a single self-contained IIFE to `frontend/public/widget.js`, which the SPA serves at `/widget.js` on its own origin — the exact path the snippet references, in both development and production. `npm run build` runs the widget build first, so `dist/` always contains a matching copy.

Configuration is passed through a global rather than `document.currentScript` or a `data-*` attribute, because `currentScript` is unreliable across browsers for deferred and module scripts.

### Origin allowlist

A business must register the exact origin(s) it will embed from, either during onboarding or under **Settings → Allowed embed origins**. The backend validates the request's `Origin` header on every `/api/widget/*` call and on the conversation WebSocket handshake. An unregistered origin receives a clean `403` or connection close.

Because allowed origins live in the database and are evaluated per request, `/api/widget/*` is deliberately carved out of Starlette's app-wide `CORSMiddleware` (see `api/scoped_cors.py`), which answers preflight requests itself against a static list fixed at startup and never reaches routing.

### Style isolation

The widget mounts into a shadow root, so the host page's CSS cannot affect it and its own compiled Tailwind styles cannot leak outward. A shadow root alone is not sufficient, so three further measures are in place:

- **`:host { all: initial }`** — inherited properties such as `font-family`, `color` and `line-height` cross the shadow boundary regardless of encapsulation. Without this reset the widget renders in the host site's typography.
- **`z-index: 2147483647`** — the maximum 32-bit value, the convention among embeddable widgets, so that sticky headers and cookie banners cannot obscure the widget.
- **Mounted outside `<body>`** — `position: fixed` re-anchors to any ancestor carrying a `transform`, `filter` or `contain`, which smooth-scroll and page-transition libraries routinely apply to `<body>`. The widget's host element is appended to `<html>` instead.

### Integration test harness

`test-sites/` contains two standalone static pages, served from their own origins, for exercising the real embed snippet end to end:

| Page | Purpose |
| --- | --- |
| `generic-business/` | A conventional client website — the realistic case |
| `hostile-css/` | Transformed `<body>`, Comic Sans, a global `button { all: unset }` reset, and two overlays at `z-index: 999999` |

Serving instructions are documented in each file. Register the corresponding origin in the portal before testing.

---

## Client portal and dashboard

Onboarding creates a login alongside the business record. From `/portal/login` a client can:

- Edit persona, greeting, branding colour, mascot image and allowed embed origins
- Add, edit and delete knowledge rows, and re-run RAG ingestion on demand
- View and copy the embed snippet
- Review qualified leads
- Open the dashboard for live statistics, the conversion funnel, the lead pipeline and full conversation transcripts

### Authentication and tenant isolation

Authentication uses an opaque bearer token (`BusinessSession`, mirroring `Visitor.session_token`) rather than a JWT, because it is trivially revocable at logout — a self-contained token would require a blocklist to revoke early. Tokens expire after 30 days, and both login and signup are rate-limited.

Every client-facing endpoint resolves its tenant through `get_current_business` and verifies row ownership before any read or mutation. This covers the portal API, `/api/leads`, `/api/conversations` and `/api/analytics/*` — none of which accept a caller-supplied `business_id`. The dashboard WebSocket authenticates the same session token (passed as a query parameter, since browsers cannot set headers on a WebSocket handshake) and fans events out per business rather than broadcasting.

Cross-tenant access returns `404` rather than `403`, so a probe cannot confirm that another tenant's record exists.

---

## Architecture

The backend follows Clean Architecture layering under `backend/app/`:

```
models/        SQLAlchemy entities — depend on nothing
schemas/       Pydantic DTOs — deliberately separate from ORM models
brain/         the LLM boundary: GroqClient, prompt building, stage strategy,
               extraction. The only place that talks to an LLM provider
conversation/  use-case orchestration for a live turn; turn_orchestrator.py
               is the concurrency and consistency core
knowledge/     KnowledgeProvider interface and RagKnowledgeProvider — top-K
               chunk retrieval from Qdrant, populated offline by
               ingestion_service.py
crm/           in-house lead pipeline: CRUD, status, scoring guardrails,
               appointments
analytics/     dashboard aggregation queries
voice/         the WebSocket turn protocol (audio itself is browser-side)
api/           FastAPI routers, depending on use cases only. cors.py and
               scoped_cors.py implement per-business dynamic CORS for the
               widget; auth.py and portal.py serve the client portal
config/        settings and stage_prompts.yaml — per-stage sales instructions,
               editable without touching code
database/      engine, session and the idempotent seed script
utils/         cross-cutting helpers: JSON recovery, time, ids, password hashing
```

The frontend mirrors this at the UI layer under `frontend/src/`: `hooks/` own the Web Speech API and WebSocket wiring, `components/` are presentational, and `pages/` compose them. `CompanyWebsiteLayout` provides persistent chrome around the demo site's routed pages, with the widget mounted one level above the page content so that an active conversation survives navigation. `pages/portal/*` is the client-facing application, gated by `PortalLayout`.

### API surface

| Prefix | Purpose | Auth |
| --- | --- | --- |
| `/api/widget/*` | Widget config and conversation start | Per-business origin allowlist |
| `/api/pages/*` | Demo landing pages | Public |
| `/api/onboarding/*` | Self-serve signup | Rate-limited |
| `/api/auth/*` | Portal login and logout | Rate-limited |
| `/api/portal/*` | Client self-service | Session token |
| `/api/leads`, `/api/conversations`, `/api/analytics/*` | Dashboard data | Session token |
| `/ws/conversation/{id}` | Live conversation turns | Origin check before `accept()` |
| `/ws/dashboard` | Live lead updates | Session token, scoped per business |

---

## Design decisions

- **The greeting never calls the LLM.** Turn 1 is a business-configured template, spoken immediately. This is what makes "greet within two seconds" a guarantee rather than an aspiration.
- **Two LLM calls run concurrently per turn.** `turn_orchestrator.py` dispatches structured lead extraction and the conversational reply under `asyncio.gather`. The reply reads the *previous* turn's fields, which keeps the concurrency safe — there is no write-path overlap — and makes latency `max(t1, t2)` rather than `t1 + t2`.
- **Conversation stage is a deterministic state machine.** `brain/stage_strategy.py` computes the stage from which lead fields are known, plus a keyword heuristic for objection and booking signals. A model reporting its own stage is both unreliable and unfalsifiable.
- **Lead scoring is guardrailed.** The extraction model proposes a 0–100 score, but `crm/scoring.py::categorize()` — a pure function — is the sole authority on Hot/Warm/Cold.
- **Engagement detection is client-side.** `hooks/useEngagementTracker.ts` measures real dwell-time-while-visible and scroll depth. Only the browser can observe these, and it keeps the conversation-start endpoint indifferent to whether it was triggered proactively or by a click.
- **Embeddings are computed locally, stored remotely.** `RagKnowledgeProvider` runs `fastembed` in-process and sends only vectors to Qdrant, avoiding an extra network hop per turn in a latency-sensitive voice conversation. Ingestion is a separate offline step, never run during a live turn.
- **Topic values double as routes.** `lib/topicMatch.ts` returns a `Topic` such as `'pricing'`, and `CompanyWebsiteLayout` navigates to `/site/:slug/<topic>` — one mapping instead of two, making page changes a plain `useNavigate()` call.
- **`speechSynthesis` is nudged, not trusted.** Chromium can stall mid-utterance and never fire `onend` (chromium bug 679437). `useSpeechSynthesis` periodically cycles `pause()`/`resume()` while speaking, because microphone auto-restart depends on that callback.
- **The client sends heartbeats.** `useConversationSocket` sends one every 30 seconds, so a long pause between turns is not mistaken for an abandoned visitor and force-closed at the 90-second idle timeout.
- **Native WebSockets over Socket.IO.** Full native FastAPI support and no second protocol layer.

---

## Testing

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

100 tests, no network calls — a fake `LLMClient` stands in for Groq.

- **Unit tests** cover the pure logic: `stage_strategy.py`, `crm/scoring.py`, `utils/json_extraction.py`, `utils/security.py`, `api/rate_limit.py`, the Groq client's retry and rate-limit handling, and `knowledge/website_crawler.py`'s SSRF host check.
- **Integration tests** exercise `turn_orchestrator.py`, the onboarding, widget and CORS routers, both WebSocket handshakes, and the full auth and portal flow — including cross-tenant isolation on leads, conversations and knowledge, session expiry, and mascot upload with a spoofed content-type rejection.

---

## Roadmap

[PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) is the authoritative status document. In summary:

| Tier | Scope |
| --- | --- |
| **Tier 0** | Local polish achievable without hosting — CI, password reset, background ingestion queue, wider test coverage |
| **Tier 1** | Production blockers — deployment, PostgreSQL, Alembic migrations, secrets management, LLM tier decision |
| **Tier 2** | Multi-staff logins, and an operator console with dedicated operator authentication |
| **Tier 3** | Voice selection, additional mascots, billing, CRM integrations |
| **Tier 4** | Monitoring, error tracking and backups |

Open questions that need a decision rather than more code: hosting platform, Groq tier versus a fallback provider, and whether to keep free browser TTS or adopt a paid voice provider.
