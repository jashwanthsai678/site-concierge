# Production Roadmap

Status snapshot and what's next — read this first when picking the project
back up. Update this file as items get done or priorities change; don't let
it go stale (it did once already — see the audit note below).

**Current direction (as of 2026-09-09): staying local on purpose.** The
plan is to make the software itself as solid as possible against the
current local/SQLite setup first, and only move to Tier 1 (real hosting,
Postgres, a real domain) once that's been used and observed enough to call
it done. Don't start Tier 1 items without an explicit go-ahead.

---

## What exists today (the short version)

A working voice/text AI sales widget: RAG knowledge grounding (Qdrant,
actually active by default now — see below), tone-adaptive/objection-
handling prompting with a stage machine and guardrailed lead scoring, an
embeddable `<script>` bundle with per-business CORS security, a self-serve
onboarding flow, and a full client portal (login, bot setup incl. mascot
image upload, knowledge CRUD, embed snippet, leads) — all verified
end-to-end in a real browser, not just type-checked. Full detail in the
main [README.md](README.md).

A full security/reliability audit closed 8 critical and 9 high-impact
findings (cross-tenant IDOR on leads/conversations, an unauthenticated
dashboard WebSocket broadcasting every business's lead PII, unowned
onboarding endpoints, SSRF on the website crawler, an unbounded visitor-
message length, no session expiry, no rate limiting, a mobile-unusable
portal sidebar, and more) — see git log for `bdd5d5c`. 91 backend tests
passing.

Everything still runs against `localhost` — SQLite, a local dev server, no
real domain, no deployment. That's still the biggest gap between here and
a real launch, but it's an intentional one right now, not a forgotten one.

---

## Tier 0 — Local polish still worth doing before the production transition

Things that make the software better without requiring hosting/a real DB:

- **Rate limit `/api/widget/*/start`.** Login and signup are now rate-
  limited; this one isn't yet. Lower severity (cost/spam, not a data
  leak) since it needs a registered-but-hostile origin, but still open.
- **CI pipeline.** Tests are still run by hand every session. A GitHub
  Actions workflow running `pytest` + `tsc` + both frontend builds on
  every push doesn't need any deployment target to exist — it can run
  against the same local test suite. Cheap, high-value, zero risk.
- **Password reset / email verification.** No "forgot password" flow, and
  signup accepts any email string with nothing confirming the owner
  controls it. Both are pure application features, no infra needed.
- **Background job queue for RAG ingestion.** `ingestion_service.py` runs
  synchronously inside the HTTP request — fine for a demo-sized crawl, will
  time out on a large real site. Needs a real task queue (Celery, arq, or
  similar) — a code change, not a hosting change, though it's more
  naturally sequenced with the production work below.
- **`allowed_origins` exact-match review** (`api/cors.py`) — should `www.`
  and the bare domain both be allowed automatically, or does a business
  register both explicitly? Currently: explicitly, exact match only.
- **Widget bundle size** — `dist-widget/widget.js` is ~378KB (gzip
  ~116KB), unchanged by this session's code-splitting work (that only
  applies to the main app's routes; the standalone widget bundle is a
  separate build with no routes to split). framer-motion is a meaningful
  chunk of it — worth revisiting if load time on a slow connection ever
  becomes a complaint.
- **More test coverage** — `knowledge/chunking.py`, `ingestion_service.py`,
  `rag_knowledge_provider.py`'s retrieval/budget logic, and `brain/
  extraction_engine.py`/`prompt_builder.py`/`reply_engine.py` have little
  to no direct unit coverage despite being core, previously-buggy-in-
  practice subsystems (the RAG context-budget and stage-instruction-
  overriding-direct-questions bugs were both found by manual live testing,
  not caught by a test).

## Tier 1 — Blockers before any real user touches this (do NOT start without explicit go-ahead)

- **Deploy it somewhere.** Backend (FastAPI) needs a real host; frontend
  (the SPA + `widget.js`) needs real static hosting with a real domain;
  `DEFAULT_API_BASE`/`cors_origins`/embed snippets all currently hardcode
  `localhost` and need the real URLs once that exists.
- **Move off SQLite to Postgres.** SQLite will not hold up to concurrent
  writers once there's more than one active conversation at a time from
  different businesses — every turn is two concurrent LLM-call-then-write
  paths per conversation.
- **Add real DB migrations (Alembic).** Every schema change so far —
  including this session's `mascot_energy`, `mascot_image_url`,
  `expires_at` columns — was a hand-patched raw `ALTER TABLE` against the
  dev `.db` file. That does not work against a real database with real
  data in it.
- **Secrets management.** `backend/.env` works for local dev because it's
  gitignored. Production needs a real secrets manager (whatever the
  hosting platform provides), not a `.env` file sitting on a server.
- **Pick the model tier a paying client actually runs on.** The current
  Groq free tier (`openai/gpt-oss-20b`) is the *development* configuration,
  not a commitment: measured live, its ~8,000 tokens/minute cap is hit
  after roughly 10 rapid-fire turns (mitigated via `reasoning_effort=low`,
  a completion-token cap, trimmed extraction history and rate-limit-aware
  retry — so conversations slow down rather than fail, but the ceiling is
  still there). A real client engagement is expected to run a stronger,
  paid model where the conversation quality justifies it. Because
  everything goes through the `LLMClient` interface, that is a new
  implementation plus config, not an engine change. What's needed is the
  commercial decision — which tier for which client — and then a way to
  select the provider per business rather than globally in `api/deps.py`.

## Tier 2 — Security hardening before onboarding real (non-pilot) customers

- ~~**`/api/leads`, `/api/conversations`, `/api/analytics/*` are not behind
  real auth.**~~ **Closed 2026-09-09.** The "acceptable because /dashboard
  is operator-only" reasoning was wrong: `/dashboard` ships in the same
  SPA, on the same origin a logged-in client's browser already uses, and
  was an unguarded route bootstrapping off `GET /api/business/current`,
  which returned *whichever business was first in the table*. Any client
  could read and edit another tenant's leads, transcripts and analytics by
  typing a URL. All of these endpoints now derive the business from the
  session token, `/api/business/current` is deleted, `/dashboard` is
  auth-guarded, and `/ws/dashboard` requires a token and fans out only
  that business's events (it previously broadcast every tenant's lead PII
  to every connected socket, filtered only by a cosmetic client-side `if`).
  13 live cross-tenant checks + 9 new regression tests.
- **Multi-staff logins per business** — currently exactly one email/
  password per `Business`. Fine for a solo owner, not for a team.
- **No operator/admin view any more.** Closing the above turned
  `/dashboard` into a client-scoped view. A genuine cross-business
  operator console would now need real operator auth — a deliberate
  feature, not a hole to leave open.

## Tier 3 — Product features still missing

- **Voice selection + a paid TTS adapter** — deliberately not built yet.
  Browser `SpeechSynthesis` is the development default: free, but its
  voices vary by OS/browser and can't be chosen per business. Serving a
  client who wants a specific, consistent voice means adding a TTS adapter
  (ElevenLabs-tier) alongside the existing hook, which carries real
  per-conversation cost — priced into that client's plan rather than
  absorbed. The picker UI is worth building once there's a second voice
  source to pick from.
- **More mascot characters** — a business can now upload their own custom
  mascot image (portal → Bot Setup), which covers "I want MY character,"
  but there's still only one built-in pre-made character to choose from
  if they don't have their own art.
- **Billing/subscription management** — never built. Needed before this
  can actually charge anyone.
- **CRM integrations** (Salesforce/HubSpot export) — never built, and not
  worth building ahead of a customer actually asking for it.

## Tier 4 — Operational readiness (needs Tier 1 to exist first)

- **Monitoring/error tracking** — no Sentry (or equivalent), no structured
  log aggregation, no uptime monitoring.
- **Database backups** — none exist; no production database yet, but this
  needs solving *before* one does.

---

## Recommended order from here

1. Work through Tier 0 — real software improvements that don't need a
   hosting decision, matching the current "perfect it locally first"
   direction.
2. When told to move toward production: decide + provision hosting,
   Postgres, and the model-tier question (these three block everything
   else in Tier 1).
3. Alembic migrations, so the schema stops being hand-patched.
4. Deploy to a real domain; update `cors_origins`/`DEFAULT_API_BASE`/embed
   snippets to match.
5. Tier 2's remaining auth gaps, then Tier 3 features, then Tier 4.

## Open decisions that need a person, not more code

- Which hosting platform (affects the deployment step directly)?
- Which model tier does a paying client run on, and does provider/model
  become a per-business setting rather than one global choice in
  `api/deps.py`? (The free Groq tier is the dev default, not the product.)
- Same question for voice: which clients get a paid TTS voice, and how is
  that cost carried in their plan?
- When is "perfect enough, locally" — i.e., what does "done observing it"
  actually look like before greenlighting Tier 1?
