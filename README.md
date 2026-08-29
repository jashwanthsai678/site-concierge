# Site Concierge

**An AI sales concierge any business can drop onto their own website —
the way a good in-store associate works a real store, not the way a chatbot
answers a FAQ.**

## The problem this exists to solve

Most website visitors leave with unanswered questions and no one to ask —
a contact form is the only option, and most people never fill it out.
Existing fixes are either a static chatbot that answers FAQs robotically
without actually moving anyone toward a decision, or an enterprise
platform (Qualified, Drift-era tools) priced at $40K–$68K/year — completely
out of reach for the small and mid-sized businesses that make up most of
the web.

Site Concierge is built for the businesses in between: real companies with
real websites and real visitors who have real doubts, who can't justify an
enterprise sales-engagement platform but still lose customers to
unanswered questions every day.

## The vision

Not "a smarter chatbot" — a system built around the same job a good sales
associate does in person: notice someone is genuinely interested, start a
real conversation, answer their actual questions using what you know about
the business, take their hesitation seriously instead of steamrolling past
it, and gently guide them toward the next step. Concretely, that means:

- **It only speaks up when a visitor is actually engaged** — real
  dwell-time-while-visible and scroll depth, not a timer that fires the
  moment the page loads.
- **The visitor picks how they want to talk** — voice or text, changeable
  at any point mid-conversation — not a voice-only experience forced on
  someone in a quiet room or on a phone with the sound off.
- **It only knows what the business actually told it** — grounded in that
  business's own FAQ/pricing/policy content (and, optionally, their real
  website's content via RAG), never inventing facts beyond that.
- **It follows a real sales structure**, not a wandering chat: discovery →
  qualification → recommendation → objection handling → closing → booking
  — computed deterministically from what's actually been learned about the
  visitor, not self-reported by the model.
- **It de-escalates instead of matching hostility.** If a visitor is
  frustrated or short with it, it acknowledges that calmly, softens its
  tone, and keeps gently working toward the goal instead of getting
  defensive or giving up.
- **Every qualified visitor becomes a scored lead** — intent score,
  Hot/Warm/Cold category, and a summary — live on a dashboard the moment
  the conversation happens, not a CSV export at the end of the week.

## Who this is actually for

The right fit is a **high-consideration, trust-sensitive purchase** — a
business where a real conversation changes whether someone buys, not a
low-consideration or catalog-browsing purchase where a conversation adds
nothing:

- Education, study-abroad, and immigration consultancies
- Coaching, test-prep, and online course providers
- Fitness studios, wellness clinics, dental/aesthetic practices
- Financial advisors and insurance agents
- Home services (roofing, solar, remodeling) — big-ticket, trust-heavy
- Law firm intake — "do I have a case" qualification

**Deliberately not the target**: e-commerce/retail (a different, already
well-served category — see Rep.ai), low-consideration high-volume
purchases, and anything requiring regulated advice-giving (legal/medical
diagnosis, not just intake) where an AI voice risks real liability.

## How the SaaS actually works

1. **Sign up** (`/onboarding`) — a business creates its account, describes
   its persona and how the AI should greet visitors, and registers the
   domain(s) it'll embed on.
2. **Add what the AI should know** — FAQ/pricing/policy rows, or point it
   at the business's real website to crawl.
3. **Get a two-line embed snippet** and paste it onto the real, live
   website — WordPress, Shopify, hand-written HTML, anything.
4. **Manage it going forward from the portal** (`/portal`) — edit the
   persona, fix or extend the knowledge base, re-run ingestion, view
   qualified leads — without ever touching code or asking anyone for help.

### Why this can be priced for the businesses enterprise tools ignore

The widget's voice runs entirely on the browser's native Web Speech API
and the reasoning runs on a low/no-cost LLM route — unlike competitors who
pay per-minute for hosted voice infrastructure, there is close to **zero
marginal cost per conversation**. That's what makes real SMB pricing
possible instead of an enterprise-only price tag: the cost structure that
forces Qualified toward $40K+/year deals doesn't apply here.

**Honest, unresolved risk, not a solved problem**: whether voice-as-default
actually converts better than text is genuinely unvalidated — see
`PRODUCTION_ROADMAP.md` and the "voice/text toggle" behavior below, which
exists specifically because this hasn't been proven either way yet.

## Where this actually stands right now

Built and verified end-to-end this project: the conversation engine
(voice + text, RAG-optional, objection-handling, lead scoring), a genuinely
embeddable widget with per-business security, self-serve onboarding, and a
client portal. **Nothing is deployed yet** — every part of this still runs
against `localhost`. See **[PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md)**
for the exact, prioritized list of what's between here and a real launch
(hosting, a real database, security hardening, and the features — voice
selection, billing, CRM integration — deliberately not built yet), and for
the open decisions (hosting platform, LLM tier, voice provider) that need a
person, not more code.

Everything below this point is the technical documentation: how to run it,
how the demo works, and how the codebase is put together.

## Demo flow

1. Open `/demo` — a simulated Meta ad card.
2. Click **Learn More** → lands on the business's own (simulated) website
   (`/site/study-abroad-meta`) — plain, light-themed marketing content,
   nothing like our product's branding, exactly as a real advertiser's site
   would look. It's a real multi-page site (Home, Destinations, Pricing,
   Process, Why Us, Testimonials, FAQ under `/site/study-abroad-meta/*`),
   not one long scrolling page.
3. Browse it like a real visitor would — scroll, read, click around. A
   small floating widget bubble sits in the corner the whole time,
   unobtrusive, and persists across page navigation.
4. After the visitor shows genuine engagement (dwell time + scroll depth —
   see `useEngagementTracker`), the widget proactively surfaces a prompt:
   *"Have a few questions? I'm happy to help — want to chat?"* — asking
   whether to talk or type — or the visitor can click the bubble directly
   at any time to start immediately.
5. Accepting expands the widget into a full conversation: the AI greets you
   within ~2 seconds (no LLM call on the first turn — see below), qualifies
   you, answers questions, and works toward booking a call. As it talks
   about a given topic (e.g. pricing), it navigates the visitor to that
   page as it explains — see `lib/topicMatch.ts` and `CompanyWebsiteLayout`.
   A 🎙️/⌨️ toggle next to the business name lets the visitor switch mode at
   any point.
6. Open `/dashboard` in a second tab → the lead appears live with an intent
   score, category (Hot/Warm/Cold), and a summary — pushed over a
   WebSocket, not polled.

**Why simulate the company site for the demo, when real embedding exists?**
The demo's own "site" is rendered in this same app for narrative
convenience (the ad-simulator flow needs a landing page to click through
to) — but the widget itself is a real, separately-embeddable product now,
not confined to pages this app renders. See **Embedding on a real
website** below.

## Embedding on a real website

Any onboarded business can drop the widget onto their own actual site —
WordPress, Shopify, a hand-written HTML page, anything — via a two-line
snippet, generated automatically at the end of onboarding:

```html
<script>
  window.SITE_CONCIERGE_CONFIG = { slug: "acme-fitness", apiBase: "https://api.yourapp.com" };
</script>
<script src="https://yourapp.com/widget.js" defer></script>
```

Build the bundle with `npm run build:widget` (outputs a single
self-contained `dist-widget/widget.js`, separate from the normal SPA
build). A config global is used rather than `document.currentScript` or a
`data-*` attribute — the same pattern most embeddable widgets use, since
`currentScript` is unreliable across browsers for deferred/module scripts.

**Security**: a business must register the exact origin(s) it'll embed
from (the "Allowed origins" field during onboarding, or
`allowed_origins` on `POST /api/onboarding/businesses`) — the backend
validates the request's `Origin` header against that list on every
`/api/widget/*` call and on the conversation WebSocket handshake itself
(WebSockets have no CORS preflight mechanism, so this check happens inside
the route handler, before `accept()`). An unregistered origin gets a clean
403/connection-close, not a silently broken widget.

**Isolation**: the widget mounts into a shadow root, so neither the host
page's CSS can affect the widget, nor the widget's own (Tailwind-compiled)
styles can leak onto the host page — verified with a deliberately hostile
host-page stylesheet during development.

## Client portal

Onboarding (`/onboarding`) now also creates a login — a business is created
with a password, not just a persona. From `/portal/login`, that business can:

- Edit their own persona, greeting, branding color, and allowed embed
  origins (`/portal`)
- Add, edit, and delete their own knowledge rows, and re-run RAG ingestion
  on demand (`/portal/knowledge`) — onboarding's own knowledge endpoint can
  only add rows; the portal is where mistakes get fixed
- View and copy their embed snippet (`/portal/embed`)
- See their own qualified leads (`/portal/leads`)

Auth is an opaque bearer token (`BusinessSession`, same pattern as
`Visitor.session_token`) rather than a JWT — trivially revocable on logout,
which a self-contained token isn't without a blocklist. Every portal
endpoint depends on `get_current_business` (resolves the token) and checks
row ownership before any mutation, so one business can never edit or even
discover another's data by guessing an ID (verified: a cross-business
delete attempt 404s, not 403 — it doesn't even confirm the row exists).

**Known gap, left alone on purpose**: the existing internal `/api/leads`
endpoint (used by the separate operator-facing `/dashboard`) still trusts a
`business_id` query parameter with no auth at all. It wasn't retrofitted
here since that dashboard is a different audience (you, not a client) —
worth closing if `/dashboard` is ever exposed beyond local/internal use.

**Not yet built**: voice selection (blocked on the free-vs-paid TTS
provider decision) and a real mascot picker (there's only one mascot to
choose from today) — both deferred, not forgotten. Full list in
`PRODUCTION_ROADMAP.md`.

## Prerequisites

- Python 3.10+
- Node 20+
- A [TokenRouter](https://tokenrouter.com) API key, in `backend/.env`:
  ```
  TOKEN_ROUTER_BASE_URL=https://api.tokenrouter.com/v1
  TOKEN_ROUTER_API_KEY=<your key>
  TOKEN_ROUTER_MODEL=qwen/qwen3.8-max-free
  ```
- (Optional — for RAG knowledge retrieval) A [Qdrant](https://qdrant.tech) URL
  + API key in `backend/.env` (`QDRANT_URL`, `QDRANT_API_KEY`). Without
  these, `RagKnowledgeProvider` just degrades to no extra context per turn
  rather than failing — see its docstring. Once set, run:
  ```powershell
  cd backend
  python -m app.knowledge.ingestion_service
  ```
  to chunk + embed the demo business's knowledge rows and website copy into
  Qdrant (embeddings run locally via `fastembed`, no extra API key needed
  for that part). Pass `--website-url <url>` to crawl a real live site
  instead of the demo's seeded copy.
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
`backend/app/database/seed.py`) and fires a warm-up call to TokenRouter so
the first real conversation isn't the request that first discovers a bad
key or connectivity issue.

- Backend health: http://localhost:8010/api/health — `model_ready: true`
  confirms TokenRouter actually returned a completion, not just that a key
  is configured.
- Ad simulator: http://localhost:5173/demo
- Dashboard: http://localhost:5173/dashboard
- Onboarding: http://localhost:5173/onboarding
- Client portal: http://localhost:5173/portal/login

## Running it with Docker Compose

TokenRouter is a hosted API, so nothing extra needs to run on the host —
set `TOKEN_ROUTER_API_KEY` in your shell before bringing the stack up:

```bash
export TOKEN_ROUTER_API_KEY=<your key>
docker compose -f docker/docker-compose.yml up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:8010

## Architecture

Clean Architecture layering in `backend/app/`:

```
models/        entities — SQLAlchemy ORM, depend on nothing
schemas/       Pydantic DTOs — kept separate from ORM models on purpose
brain/         the LLM boundary (TokenRouter client, prompt building, stage
               strategy, extraction) — the only place that imports httpx
               against an LLM provider's API directly
conversation/  use-case orchestration for a live turn (turn_orchestrator.py
               is the concurrency/consistency core — see its docstring)
knowledge/     KnowledgeProvider interface + RagKnowledgeProvider — retrieves
               top-K relevant chunks from Qdrant (client-provided knowledge
               rows + crawled website pages, both chunked/embedded offline
               by ingestion_service.py) instead of dumping everything
crm/           in-house lead pipeline (CRUD, status, scoring guardrails,
               appointments) — "CRM" here means our own Lead table, not a
               third-party push
analytics/     dashboard aggregation queries
voice/         the WebSocket turn protocol (not audio codecs — those are
               100% browser-side via the Web Speech API)
api/           FastAPI routers — depend on use cases only, never touch
               database/ directly. cors.py + scoped_cors.py handle the
               embeddable widget's per-business dynamic CORS (see
               "Embedding on a real website" above) — deliberately
               separate from the app-wide static CORSMiddleware, which
               can't consult per-business data. auth.py + portal.py are
               the client portal's login and self-service endpoints.
config/        settings + stage_prompts.yaml (per-stage sales instructions,
               editable without touching code)
database/      engine/session + the idempotent seed script
utils/         cross-cutting helpers (JSON recovery from LLM text, time,
               ids, password hashing)
```

Frontend (`frontend/src/`) mirrors this at the UI layer: `hooks/` own the
Web Speech API and WebSocket wiring, `components/voice/` and
`components/dashboard/` are presentational, `pages/` compose them.
`CompanyWebsiteLayout` is the persistent chrome (nav/footer/widget) around
the mock company site's actual pages, in `pages/company-site/*` — the
widget lives in the layout, one level above the routed page content, so it
and its live conversation survive page-to-page navigation. `pages/portal/*`
is the client-facing self-service app, gated by `PortalLayout`.

### Key decisions worth knowing before you read the code

- **Turn 1 (the greeting) never calls the LLM.** It's a business-configured
  template, spoken immediately — that's what makes "greet within 2
  seconds" a guarantee, not a hope.
- **Two TokenRouter calls run concurrently per user turn** (`asyncio.gather` in
  `turn_orchestrator.py`): a structured lead-extraction call and the
  conversational reply. The reply reads the *previous* turn's fields, which
  is what makes the concurrency safe (no write-path overlap) and fast
  (`max(t1,t2)` not `t1+t2`).
- **Conversation stage is a deterministic rule-based state machine**
  (`brain/stage_strategy.py`), not self-reported by the LLM — a small
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
- **Knowledge retrieval embeds locally, stores remotely.** `RagKnowledgeProvider`
  runs `fastembed` in-process for embeddings (no extra network hop or API
  key per turn) and only sends the resulting vectors to Qdrant — chosen
  because this is a live voice conversation where per-turn latency matters.
  Ingestion (`knowledge/ingestion_service.py`) is a separate, standalone
  step, never run from a live turn. `StaticKnowledgeProvider` (flat-row
  concatenation, no external dependency) is the currently *active* default
  in `api/deps.py` — RAG is built and tested but sits dormant until Qdrant
  is actually provisioned for a given environment.
- **Topic values double as page routes.** `lib/topicMatch.ts`'s keyword
  matching returns a `Topic` (e.g. `'pricing'`), and `CompanyWebsiteLayout`
  navigates to `/site/:slug/<topic>` directly — one mapping instead of two,
  so the AI moving the visitor to a different page is a plain
  `useNavigate()` call, not a scroll-to-section trick.
- **`speechSynthesis` is nudged, not trusted.** Chrome/Edge can silently
  stall mid-utterance after continuous speaking (chromium:679437) and never
  fire `onend` — `useSpeechSynthesis` periodically calls `pause()`/`resume()`
  while speaking to work around it, since the mic's auto-restart depends
  entirely on that callback firing.
- **The frontend sends heartbeats now.** The WS protocol always supported a
  `heartbeat` client message to keep an idle connection alive past
  `conversation_idle_timeout_seconds` (90s), but nothing sent one — a long
  pause between turns (thinking, a slow TTS queue) would get force-closed
  and treated like an abandoned visitor. `useConversationSocket` now sends
  one every 30s while connected.
- **The embeddable widget's CORS is per-business and dynamic, so it can't
  live in the app-wide `CORSMiddleware`.** Starlette's `CORSMiddleware`
  answers every preflight OPTIONS request itself, app-wide, against a
  static origin list fixed at startup — it never reaches routing at all.
  Since a business's allowed embed origins live in the database and are
  decided per-request, `/api/widget/*` is carved out of that middleware
  entirely (`api/scoped_cors.py`) so the widget router's own DB-aware
  check is what actually decides. The conversation websocket does its own
  origin check before `accept()` for the same reason — WebSockets have no
  preflight mechanism at all.
- **Portal auth is an opaque bearer token, not a JWT.** `BusinessSession`
  (same pattern as `Visitor.session_token`) is trivially revocable on
  logout — a self-contained JWT would need a blocklist to revoke early.
  Every portal endpoint depends on `get_current_business` and checks row
  ownership before mutating, not just that *some* valid session exists.

## Tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

Unit tests cover the pure functions (`stage_strategy.py`, `crm/scoring.py`,
`utils/json_extraction.py`, `utils/security.py`) with no I/O; integration
tests exercise `turn_orchestrator.py`, the onboarding/widget/CORS routers,
and the full auth + portal flow (including cross-business isolation) end
to end against a fake `LLMClient` (no real TokenRouter call in CI).
