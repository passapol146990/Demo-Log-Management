# Gap Fix Tasks — 2.2 Functional Minimums + 6.1 Deliverable Structure

Context: Gap analysis against `/home/passa/Documents/Demo-Log-Management/FullStack_Developer_Intern_Assignment_TH.md`
sections 2.2 (Functional Minimums) and 6.1 (Git Repository deliverables). Each task below is
independent enough to run in a separate sub-agent in parallel, but touches the areas noted under
"Coordinate with" — read those files first to avoid clobbering another task's edits.

Project root: `/home/passa/Documents/Demo-Log-Management`
Tech stack (fixed, do not change): Next.js 16 App Router + TypeScript, OpenSearch, Vector, JWT
(jsonwebtoken) + bcryptjs, Zod, Docker Compose. No inline comments explaining behavior unless the
logic is genuinely non-obvious (existing repo convention). Follow existing file/folder separation
patterns exactly.

Auth architecture reminder: tenant MUST always come from the JWT payload (`user.tenant`), NEVER
from client-provided query params or body fields. `requireAuth`/`requireRole` live in
`backend/src/lib/auth.ts`. Client-side fetches must use `authFetch()` from
`backend/src/hooks/useAuthFetch.ts` (adds `credentials: "include"`).

---

## Task 1 — Dashboard filters (source + time range)

**Problem:** `backend/src/app/dashboard/page.tsx` fetches a flat `/api/search?keyword=&from=&to=&size=1000`
with no way for the user to filter by source or date range. Only `/dashboard/search` has filters.
The assignment's acceptance checklist (section 7) explicitly requires the Dashboard to show
"Filter by tenant/source/time" — tenant is already implicit via JWT (do NOT add a tenant filter
control, that would violate tenant isolation), but source/time controls are missing on the main
dashboard.

**Files to touch:**
- `backend/src/app/dashboard/page.tsx`
- Reuse `backend/src/components/dashboard/SearchFilters.tsx` (already used in `/dashboard/search`)
  — either reuse it directly, or extract a smaller variant if the full component (which includes a
  keyword box meant for search) doesn't fit the dashboard's use case. Prefer reuse for consistency
  unless it's awkward, in which case create `backend/src/components/dashboard/DashboardFilters.tsx`
  (source + from + to only, no keyword) following the same prop-drilling pattern as `SearchFilters`.
- Do not touch `/api/search/route.ts` — it already supports `source`, `from`, `to`, `size` query
  params server-side (tenant filter is enforced server-side from JWT already, this is UI-only work).

**Requirements:**
- Add source dropdown (reuse `LOG_SOURCES` from `backend/src/lib/types/log.ts`) and from/to
  datetime-local inputs to the Dashboard page, wired to re-run the `/api/search` fetch with those
  params via `authFetch`.
- Include a way to reset/clear filters back to "all logs, no time bound".
- Keep existing StatCard/TopNChart/TimelineChart/SeverityChart/LogsTable components and
  aggregation calls (`topByField`, `timelineBuckets`, `severityDistribution` from
  `backend/src/lib/aggregations.ts`) working against the filtered dataset — i.e. filters change
  what's fetched, and all charts/aggregations should reflect the filtered result set.
- No inline code comments unless truly non-trivial. Match existing TSX formatting/style exactly
  (see `backend/src/app/dashboard/search/page.tsx` as the closest analog).

**Verification (must run yourself before reporting done):**
```bash
cd /home/passa/Documents/Demo-Log-Management/backend
npx tsc --noEmit
npm run lint
```
Both must be clean (0 errors; the pre-existing `coverage/lcov-report/block-navigation.js` warning
is expected and fine to ignore — do not try to fix it, it's unrelated generated output).
Also manually sanity check the JSX structure compiles by confirming `npx tsc --noEmit` has zero
new errors introduced by your change (there is one pre-existing unrelated error in
`src/app/layout.tsx` about `LayoutProps` — that is NOT yours to fix, ignore it, just make sure
you don't add new errors).

**Report back:** file(s) changed, confirmation both commands passed, and a short note on how you
structured the filter (reused SearchFilters vs new component, and why).

---

## Task 2 — File-batch ingestion support in `/api/ingest`

**Problem:** The assignment (2.2) requires ingestion of "Syslog / HTTP JSON / File batch" with at
least 2 protocols. Syslog (Vector, UDP/TCP 514) and single-JSON HTTP POST already work. There is
no true "file batch" ingestion path — `samples/scripts/post_logs.py` merely loops client-side,
calling `/api/ingest` once per record, which does not satisfy "file batch" as a backend capability.

**Files to touch:**
- `backend/src/app/api/ingest/route.ts` (the only file with real logic changes)
- `tests/ingest.test.ts` (add coverage for the new batch path)
- Do NOT touch `backend/src/lib/ingest-schema.ts` structurally beyond what's described below —
  the single-object schema (`ingestSchema`) must keep working exactly as before for backward
  compatibility with Vector's syslog sink and any existing single-object POST callers.

**Requirements:**
- Extend `POST /api/ingest` to accept EITHER:
  1. A single log object (existing behavior, unchanged) — body shape: `{ source, ... }`
  2. A batch: `{ "logs": [ {source, ...}, {source, ...}, ... ] }` — new behavior
- Detect which shape was sent by checking `Array.isArray(body.logs)`. If `body.logs` is an array,
  process it as a batch: validate each item independently against `ingestSchema`, normalize it via
  the existing `normalize()` switch function in the same file, and index each valid one via
  `indexLog`. Continue processing the rest of the batch even if one item fails validation
  (partial success), and return a per-item result summary — e.g.:
  ```json
  {
    "batch": true,
    "total": 10,
    "succeeded": 8,
    "failed": 2,
    "results": [
      { "index": 0, "status": "ok" },
      { "index": 1, "status": "error", "error": "Validation failed: ..." },
      ...
    ]
  }
  ```
  Use HTTP 200 for batch responses as long as the request itself was well-formed (even if some
  items failed) — reserve 400 for a malformed request (e.g. `logs` present but not an array, or
  not JSON at all).
- Keep the existing single-object success/error response shapes EXACTLY as they are today (return
  `{ normalized: result }` on success, existing `ZodError`/generic error handling on failure) —
  do not change status codes or shape for the non-batch path. This is a backward-compatible
  additive change only.
- `requireRole(request, ["admin"])` auth check stays exactly as-is and applies to both single and
  batch requests (same admin-only RBAC gate).
- No inline comments unless the branching logic genuinely needs explanation for a future reader
  (a short comment on the batch-vs-single detection is acceptable, do not comment every line).

**Tests to add in `tests/ingest.test.ts`:**
Since this repo's existing ingest tests exercise `ingestSchema`/normalizers directly rather than
importing the Next.js route handler (Next route handlers aren't easily unit-testable without a
request/response mock — check how other route-adjacent tests in this repo are structured first,
e.g. `tests/opensearch.test.ts` for the mocking pattern used with `@opensearch-project/opensearch`).
Add tests that validate the array-detection/validation logic at the schema level, for example:
- A test that `z.array(ingestSchema)`-style validation (or equivalent manual loop matching your
  route implementation) correctly reports which of a mixed valid/invalid array of log objects
  pass/fail, mirroring what your route's batch branch actually does.
- If you determine it's more valuable and low-risk, you MAY extract the batch-processing logic
  (validate+normalize+summarize, everything except the actual `indexLog`/OpenSearch call and the
  `requireRole` auth check) into a small pure function in `backend/src/lib/ingest-batch.ts` that
  the route imports and calls — this makes it directly unit-testable without mocking Next.js
  request/response objects or OpenSearch. This is the PREFERRED approach if it doesn't overcomplicate
  the route file. Use your judgement; either approach is acceptable as long as there is real test
  coverage of the batch validation/partial-success behavior.

**Verification (must run yourself before reporting done):**
```bash
cd /home/passa/Documents/Demo-Log-Management/backend
npx tsc --noEmit
npm run lint
npx jest
```
All three must be clean/passing (same caveats as Task 1 regarding the pre-existing unrelated
`layout.tsx` TS error and the coverage lint warning — not yours to fix).

**Report back:** file(s) changed/added, the exact new request/response contract you implemented
for the batch path (so Task 4 can document it accurately), and confirmation all three verification
commands passed with test counts (e.g. "43/43 passing, up from 40/40").

---

## Task 3 — Architecture diagram + `/frontend` absence rationale in `docs/architecture.md`

**Problem:** Assignment section 6.1 requires `/docs/architecture.md` to contain "แผนภาพ +
อธิบาย data flow/tenant model" (a diagram + data flow/tenant model explanation). The current
`docs/architecture.md` has prose sections (Technology Stack, Components, Data Flow, Security,
Deployment Modes) but no diagram at all — an ASCII diagram currently lives in
`docs/setup_appliance.md` instead, which is the wrong file per the assignment's explicit mapping.
Additionally, section 6.1 lists `/frontend/` as a required top-level folder, but this project
merges frontend+backend into a single Next.js App Router project under `/backend/` — there is no
`/frontend/` folder, and this needs to be justified in the architecture doc so it doesn't read as
a missing deliverable when reviewed.

**Files to touch:**
- `docs/architecture.md` (primary target — add diagram + a short "Repository Structure Rationale"
  or similarly named section explaining the `/frontend` + `/backend` merge decision)
- `docs/setup_appliance.md` — the existing ASCII diagram currently there should stay (it's useful
  context for a setup guide too) but is not required to be removed; your job is to make sure
  `architecture.md` has its own diagram, not to deduplicate. Do not delete content from
  `setup_appliance.md`.

**Requirements:**
- Add an architecture diagram to `docs/architecture.md`. An ASCII diagram is acceptable (matches
  existing repo conventions — see the one in `docs/setup_appliance.md` for style reference), or a
  Mermaid diagram if you prefer (GitHub renders Mermaid natively in `.md` files, e.g. inside a
  ` ```mermaid ` fenced block) — pick whichever you think documents the following most clearly:
  - All 4 docker-compose services and their relationships: backend (Next.js), vector (syslog
    collector), opensearch (storage), worker (alert checker + retention background jobs)
  - The 7 ingestion sources funneling in: firewall/network syslog → Vector → backend `/api/ingest`;
    api/crowdstrike/aws/m365/ad → direct HTTP POST → backend `/api/ingest`
  - The tenant isolation boundary — i.e. that every search/ingest is scoped by the `tenant` claim
    embedded in the JWT, never by client input
  - The two deployment modes (Appliance vs SaaS with Caddy TLS termination) — can be one diagram
    with a note, or two small diagrams, your call
- Add a section (right after the diagram, or wherever flows best in the existing doc structure)
  explaining tenant model in a bit more depth than what's already under "Security" — specifically:
  how the JWT payload's `tenant` field (see `backend/src/lib/auth.ts` `TokenPayload` interface) is
  the single source of truth, injected server-side into every OpenSearch query
  (`backend/src/lib/opensearch.ts` `searchLogs`) and every ingest write, and can never be
  overridden by request body/query params.
- Add a short section explaining why `/frontend/` doesn't exist as a separate folder: Next.js App
  Router serves both the UI (`backend/src/app/dashboard/*`, `backend/src/app/login/*`) and the API
  routes (`backend/src/app/api/*`) from the same project, sharing types/auth/lib code directly
  without a network hop or duplicate schema definitions — this was a deliberate architecture
  choice, not an oversight. Keep this section short (a few sentences), not defensive/long-winded.
- Preserve everything else already in `docs/architecture.md` (Technology Stack, Components, Data
  Flow, Security, Deployment Modes sections) — this is an additive edit, not a rewrite. You may
  reorder sections slightly if it improves flow (e.g. diagram should probably come near the top,
  right after "System Overview"), but don't delete existing accurate content.

**Verification (must do yourself before reporting done):**
- Re-read the final `docs/architecture.md` top to bottom and confirm: diagram present, tenant
  model explained, `/frontend` rationale present, all prior content intact.
- If you used a Mermaid block, double check the syntax is valid Mermaid (no stray syntax errors) —
  you can't render it yourself, so be careful and use simple, well-known Mermaid diagram types
  (flowchart/graph) to minimize risk of syntax mistakes.
- This task does not touch any code, so no `tsc`/`lint`/`jest` run is required — but do run:
  ```bash
  cd /home/passa/Documents/Demo-Log-Management
  git diff --stat docs/architecture.md
  ```
  and report the diff stat as confirmation of what changed.

**Report back:** confirmation of the 3 required additions (diagram, tenant model detail, frontend
rationale), diagram style chosen (ASCII vs Mermaid) and why, and the `git diff --stat` output.

---

## Task 4 — Update Postman collection, samples/README, acceptance results, and คู่มือ.md for the new batch ingestion endpoint

**Problem:** Task 2 (running in parallel, by a different sub-agent) adds batch ingestion support
to `POST /api/ingest`. Several documentation/test-collection artifacts need to be updated to
reflect this new capability once it lands, and the existing `docs/acceptance_results.md` has a
known inaccuracy (claims "29/29 tests passing" which was already found to be false in a prior
session — the real count at last check was 40/40, and will change again after Task 2 adds tests).

**IMPORTANT — sequencing:** Task 2 is being done by a separate sub-agent concurrently. Before you
start, check whether `backend/src/app/api/ingest/route.ts` already contains batch-handling logic
(look for `Array.isArray` or `logs` array handling, or a `backend/src/lib/ingest-batch.ts` file).
If it's not there yet, wait and poll every ~30-60 seconds (re-read the file) for up to a
reasonable number of attempts before proceeding — do not guess at the batch contract, use the
actual implementation as ground truth once it exists. If after a reasonable wait it still isn't
there, use this best-effort contract as a fallback assumption and clearly flag in your final report
that you had to assume the shape:
```json
// Request: POST /api/ingest  { "logs": [ {source, ...}, ... ] }
// Response: { "batch": true, "total": N, "succeeded": N, "failed": N, "results": [...] }
```

**Files to touch:**
- `tests/postman_collection.json`
- `samples/README.md`
- `docs/acceptance_results.md`
- `คู่มือ.md`

**Requirements:**

1. **`tests/postman_collection.json`**: Add a new request under the existing "Ingest" folder (match
   the existing structure/style — check how the other 7 ingest requests are structured, same auth
   header pattern using `{{token}}` or cookie as the others do) named something like "Ingest —
   Batch (file-batch simulation)". Body should be a `raw`/`application/json` array-wrapped payload
   with 2-3 sample log objects from different sources (e.g. reuse shapes from
   `samples/logs/api_events.json` and `samples/logs/crowdstrike_events.json`) wrapped in
   `{ "logs": [...] }`. Validate the final JSON file is still valid JSON:
   ```bash
   python3 -c "import json; json.load(open('/home/passa/Documents/Demo-Log-Management/tests/postman_collection.json')); print('valid')"
   ```

2. **`samples/README.md`**: Read the existing file first. Add a short subsection documenting the
   new batch ingestion capability — e.g. how someone could adapt `samples/scripts/post_logs.py` to
   send a whole file as one batch POST instead of looping per-record (you don't need to rewrite
   `post_logs.py` itself unless you think it's low-risk and clearly beneficial to add a
   `--batch` flag; if you do modify it, keep the default behavior — no flag — identical to today so
   existing usage/instructions elsewhere in the repo don't break).

3. **`docs/acceptance_results.md`**: This file currently overclaims "29/29 tests passing" which is
   stale/wrong (real count has moved since). Update:
   - Item 1 ("System can ingest logs from all 6 sources") — add a note that both single-object and
     file-batch ingestion are supported per the assignment's "File batch" requirement in 2.2.
   - Item 9 ("All tests passing") — update the test count to the actual current count. Run
     `cd backend && npx jest` yourself and use the real number you observe, do not copy a number
     from this task file or guess.
   - Do not touch other items unless they reference something changed by Tasks 1-3 (skim the whole
     file first, it's short).

4. **`คู่มือ.md`** (Thai user runbook, root of repo): Find the section discussing sample data
   ingestion via `send_syslog.sh`/`post_logs.py` (search for "post_logs.py" or "ยิง" or "sample").
   Add a short paragraph (in Thai, matching the doc's existing tone/style) explaining that
   `/api/ingest` now also accepts a batch of logs in one request via `{ "logs": [...] }`, useful
   for uploading a whole sample file at once instead of one record at a time. Include one example
   `curl` command demonstrating it (use `admin@demoA` credentials pattern consistent with other
   curl examples already in this doc — read a couple of the existing curl examples in this file
   first to match the exact style/flags used, e.g. cookie jar usage or Bearer token usage).

**Verification (must do yourself before reporting done):**
```bash
python3 -c "import json; json.load(open('/home/passa/Documents/Demo-Log-Management/tests/postman_collection.json')); print('postman valid')"
cd /home/passa/Documents/Demo-Log-Management/backend && npx jest 2>&1 | tail -5
```
Report the real passing test count you observed and confirm the Postman JSON is valid.

**Report back:** files changed, the real test count now documented in acceptance_results.md, and
whether Task 2's batch endpoint was ready when you started (or whether you had to use the fallback
assumed contract — flag this clearly if so, so it can be double-checked afterward).

---

## Final integration check (main session, after all 4 sub-agents report done)

Not a sub-agent task — done directly in the main session after collecting all 4 reports:
```bash
cd /home/passa/Documents/Demo-Log-Management/backend
npx tsc --noEmit
npm run lint
npx jest
```
All three must pass cleanly (module the one known pre-existing `layout.tsx` `LayoutProps` TS error,
which is unrelated and pre-dates all 4 tasks). Then spot-check:
- `git diff --stat` across the whole repo to see the full blast radius
- Manually confirm `docs/architecture.md` renders sensibly (no broken Mermaid fences, etc.)
- Confirm Task 4's documented test count actually matches the final `npx jest` output after all
  changes from Task 2 landed (Task 4 may have run before Task 2 finished — recheck).
