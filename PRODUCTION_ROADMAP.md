# Production Roadmap

Status snapshot and what's next — read this first when picking the project
back up. Everything below is either genuinely unbuilt, or built but only to
local-dev/demo standard, not production standard. Update this file as items
get done or priorities change; don't let it go stale.

## What exists today (the short version)

A working voice/text AI sales widget: RAG-optional knowledge grounding,
tone-adaptive/objection-handling prompting, an embeddable `<script>` bundle
with per-business CORS security, a self-serve onboarding flow, and a client
portal (login, settings, knowledge CRUD, embed snippet, leads) — all
verified end-to-end in a real browser, not just type-checked. Full detail in
the main [README.md](README.md).

Everything currently runs against `localhost` — SQLite, a local dev server,
no real domain, no deployment. That's the biggest single gap: **nothing
here has been deployed anywhere yet.**

---

## Tier 1 — Blockers before any real user touches this

Nothing below is optional if this goes live, even for a handful of pilot
customers.

- **Deploy it somewhere.** Backend (FastAPI) needs a real host; frontend
  (the SPA + `widget.js`) needs real static hosting with a real domain;
  `DEFAULT_API_BASE`/`cors_origins`/embed snippets all currently hardcode
  `localhost` and need the real URLs once that exists.
- **Move off SQLite to Postgres.** `database/engine.py`'s own comment says
  this was deliberate ("MVP uses metadata.create_all + seed script rather
  than Alembic migrations — not worth the tooling investment before the
  schema stabilizes"). The schema has stabilized. SQLite will not hold up
  to concurrent writers once there's more than one active conversation at
  a time from different businesses.
- **Add real DB migrations (Alembic).** Every schema change this session
  was done by hand-patching the dev `.db` file with raw `ALTER TABLE`
  statements. That does not work against a real production database with
  real data in it.
- **TokenRouter reliability.** The free tier (`qwen/qwen3.8-max-free`) has
  measured ~15–25% intermittent 503 failure rates in testing this session.
  Already handled gracefully (a failed turn shows a retry message, doesn't
  crash) — but that failure rate is not acceptable for a paying customer's
  first impression. Decide: upgrade to a paid TokenRouter tier, add a
  fallback provider, or add automatic retry-on-503 in
  `token_router_client.py`.
- **Secrets management.** `backend/.env` (API keys, Qdrant credentials)
  works for local dev because it's gitignored. Production needs a real
  secrets manager (whatever the hosting platform provides), not a `.env`
  file sitting on a server.
- **Session expiry on `BusinessSession`.** Portal login tokens
  (`models/business_session.py`) currently never expire — a token is valid
  forever until explicit logout. No idle timeout, no absolute TTL. Fine for
  a demo, a real security gap for production.

## Tier 2 — Security hardening before onboarding real (non-pilot) customers

- **Auth the internal `/api/leads` and `/api/analytics/*` endpoints.**
  Flagged already in the README: they trust a `business_id` query param
  with zero auth. Left alone deliberately because they're used by the
  separate operator-facing `/dashboard`, not the client portal — but if
  `/dashboard` is ever reachable outside a trusted local/internal network,
  this is a real data-leak path (anyone can list anyone's leads).
- **Rate limiting.** Nothing rate-limits `/api/auth/login` (brute-forceable),
  `/api/onboarding/businesses` (spammable signup), or `/api/widget/*/start`
  (a registered-but-hostile origin could hammer conversation creation).
- **Password reset flow.** There is no "forgot password" — if a client
  loses their password, there is currently no way to recover the account
  short of a manual DB edit.
- **Email verification.** Signup accepts any email string; nothing confirms
  the business owner actually controls that inbox.
- **Security review of `allowed_origins` exact-match logic** (`api/cors.py`)
  once real customer domains are involved — e.g. should `www.` and bare
  domain both be allowed automatically, or does a business have to register
  both explicitly? (Currently: explicitly, exact match only.)

## Tier 3 — Product features still missing

- **Voice selection** — deliberately not built. Blocked on a real decision:
  keep free/inconsistent browser `SpeechSynthesis`, or move to a paid
  provider (ElevenLabs-tier) for a consistent voice, which reintroduces
  per-conversation cost. Needs a decision before it's worth building the
  picker UI.
- **Real mascot picker** — the data plumbing (`mascot_key`, the registry)
  is ready; there is exactly one mascot to choose from. Needs more
  character art before "choose a mascot" is a real feature, not a
  one-item dropdown.
- **Background job queue for RAG ingestion.** `ingestion_service.py` runs
  synchronously inside the HTTP request — fine for a handful of knowledge
  rows and a small crawl, but a large site crawl will time out the request.
  Needs a real task queue (Celery, arq, or similar) once ingestion volume
  grows.
- **Billing/subscription management** — never built, always out of scope
  so far. Needed before this can actually charge anyone.
- **CRM integrations** (Salesforce/HubSpot export) — never built. Not
  worth building before there are customers asking for it specifically
  (see the earlier competitive-positioning discussion: chasing enterprise
  integration parity too early is a trap).
- **Multi-staff logins per business** — currently exactly one email/password
  per `Business`. Fine for a solo owner, not for a business with a team
  that needs its own logins.

## Tier 4 — Operational readiness

- **Monitoring/error tracking** — no Sentry (or equivalent), no structured
  log aggregation, no uptime monitoring. Right now the only way to know
  something broke is reading a local log file.
- **CI** — tests are run by hand (`pytest`, `tsc`, lint) every time this
  session verified a change. No GitHub Actions/CI pipeline runs them
  automatically on push or PR.
- **Database backups** — none exist; there's no production database yet,
  but this needs to be solved *before* one does, not after.
- **Widget bundle size** — `dist-widget/widget.js` is ~368KB (gzipped
  ~114KB). Workable, but framer-motion (the mascot animation library) is a
  meaningful chunk of that; worth revisiting if load-time on slow
  connections becomes a complaint.

---

## Recommended order, if starting fresh next session

1. Decide + provision: hosting platform, Postgres, and whether to keep
   TokenRouter free tier or upgrade (these three block everything else).
2. Alembic migrations, so the schema stops being hand-patched.
3. Deploy to a real domain; update `cors_origins`/`DEFAULT_API_BASE`/embed
   snippets to match.
4. Session expiry + rate limiting (Tier 1/2's remaining security items) —
   cheap to add, expensive to skip once real accounts exist.
5. Only then: revisit voice selection, mascot art, billing — the actual
   next *features*, once the ground underneath them is solid.

## Open decisions that need a person, not more code

- Which hosting platform (affects the deployment step directly)?
- TokenRouter: upgrade tier, add a fallback provider, or accept the
  current reliability for now?
- Voice: free browser TTS forever, or pay for a real voice provider?
- Is Qdrant actually going to be provisioned, or does RAG stay
  permanently optional/off for the near term?
