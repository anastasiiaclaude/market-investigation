# Feature 008 — Add/edit competitor via form (M7)

Milestone **M7**. A `CompetitorForm` lets the user **add** a new competitor and
**edit** an existing one, wired to the M6 CRUD API so a save persists to the
database and the dashboard re-renders. Traces to **FR-5** (add a competitor
record via a form) and **FR-6** (edit an existing competitor record). Depends on
M6 (persistence + CRUD, done) — [issue #7](https://github.com/anastasiiaclaude/market-investigation/issues/7).

No new decision is needed: the write endpoints (`POST`/`PUT /api/competitors`)
already exist and are specified in
[feature-007](feature-007-persistence.md#api-contract). This feature is the
frontend that consumes them. No new runtime dependency → no ADR.

## User story

As the product manager, I want to add a competitor I know about, and correct the
details of an existing one, through a form — without re-running research — and
have the change saved so it's still there when I reload.

## Design decisions (confirmed)

- **URL identity is the backend's job, restated on the client.** A competitor's
  `id` is `websiteKey(website)` (M6, ADR 007). The form computes the same key so
  the record it POSTs already carries the correct id; the backend re-derives it
  regardless. On **edit** the website is therefore **read-only** — changing it
  would change the id, which `PUT` rejects with `400` ("delete and re-create").
  New competitors get a fully editable website.
- **Pure form logic, thin component.** All value/validation logic lives in a pure
  `app/src/domain/competitor-form.ts` (node-tested): blank values for create,
  competitor→values for edit, field-level `validate`, and `toCompetitor(values,
  now)` which sets `id = websiteKey(website)` + a fresh `updatedAt` and validates
  through `competitorSchema`. `CompetitorForm.tsx` only renders + wires inputs —
  the project's logic/rendering split.
- **Native `<dialog>` modal.** The form is a modal `<dialog>`. An "Add
  competitor" button (in the toolbar, available in both views) opens it empty; an
  "Edit" button on each **rival** card opens it pre-filled. No router — the app
  stays single-page.
- **Write client mirrors the read client.** `competitors-api.ts` gains
  `createCompetitor(competitor, fetchImpl)` (`POST` → `201`) and
  `updateCompetitor(id, patch, fetchImpl)` (`PUT` → `200`), each with an
  injectable `fetch`, validating the returned row against `competitorSchema` and
  throwing on a non-OK status. Node-tested, no server — the `fetchCompetitors`
  seam pattern.
- **Re-render by merging the returned record.** `useCompetitors` exposes an
  `upsert(competitor)` that replaces-by-id (or appends) into local state. On a
  successful save the caller merges the record the API returns — no full refetch.
  This also updates the list when running against the mock fallback locally.
- **Scope: add + edit rivals only.** VA-INDIGO stays a client-pinned, non-editable
  home product (it isn't persisted). No delete in M7 (the `DELETE` endpoint
  exists but is left for a follow-up). Edit affordance lives on **cards** (the
  issue says "editing a card"); the table view keeps the global Add button only.

## Form fields

| Field | Control | Create | Edit | Validation |
|---|---|---|---|---|
| Name | text input | editable | editable | non-empty |
| Website | url input | editable | **read-only** | valid `http(s)` URL |
| Description | textarea | editable | editable | any (may be empty) |
| Each of 6 feature areas | `<select>` of the 4 ratings | editable | editable | one of `RATINGS` |

`id` and `updatedAt` are never user-entered: `id = websiteKey(website)`,
`updatedAt = now`.

## Acceptance criteria

- GIVEN blank form values
  WHEN `toCompetitor` runs with a valid name + `http(s)` website + all ratings
  THEN it yields a `competitorSchema`-valid record whose `id` equals
  `websiteKey(website)`.
- GIVEN an empty name or a non-`http(s)` website
  WHEN `validate` runs
  THEN it reports a field-level error and `toCompetitor` is not attempted.
- GIVEN an existing competitor
  WHEN the edit form loads
  THEN its values are pre-filled from the record and the website field is
  read-only.
- GIVEN a valid new competitor
  WHEN `createCompetitor` POSTs it and the API returns `201` the upserted record
  THEN the client returns that record and the dashboard shows it (merged via
  `upsert`).
- GIVEN a `POST`/`PUT` that returns a non-OK status
  WHEN the client runs
  THEN it throws, and the dialog stays open showing the error.

## Verification

Automated specs are node-only (no jsdom, per project convention):
`competitor-form.spec.ts` (values↔competitor + validation) and the extended
`competitors-api.spec.ts` (create/update with an injected fetch). The
component + hook are untested glue, like `useCompetitors`/`useViewPreference`.

The live write round-trip is **deploy-verified**, like M5's model check and M6's
DB path (vite dev does not serve `api/`): add a competitor, reload, confirm it
persists; edit it, reload, confirm the change persists. In vite-only dev a save
fails and the dialog surfaces the error — consistent with the M6 "sample data"
fallback.

## Out of scope

- Delete competitor (endpoint exists; a small follow-up).
- Editing VA-INDIGO / persisting the home product.
- Per-row editing in the table view.
- Rich async UX beyond a submitting state + inline error (M8, FR-16).

## Open questions

- None.
