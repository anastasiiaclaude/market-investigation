# Retrospective 014 — Atlassian Design System reskin

## What shipped

A full visual redesign of the dashboard into the **Atlassian Design System (ADS)**
idiom — so a tool that already pushes gaps to **Jira** and publishes to **Confluence**
now *looks* like a native Atlassian product. Presentation-only: no domain logic,
schemas, API, or behaviour changed, and all 226 tests stay green.

- **Tokens** (`app/src/index.css`): real ADS values — brand blue `#0C66E4`, the
  warm-navy ink `#172B4D`, a sunken page (`#F7F8F9`) with raised white panels and
  the authentic ADS elevation shadows. Full dark theme via ADS dark tokens under
  `prefers-color-scheme: dark`. Base font drops to **14px** (ADS default) with
  **Inter** as the closest free stand-in for Atlassian Sans (`display=swap`, system
  fallback = Atlassian's own stack).
- **App shell**: a sticky 48px global nav (logo tile + wordmark + project chip +
  avatar) and an Atlassian page header (eyebrow → title → lede) over a max-width
  content column.
- **Signature — the comparison matrix as a Jira status board**: every rating cell
  is a real ADS **lozenge** mapped to Jira's status vocabulary (Strong→Success,
  Adequate→In-progress, Weak→Moved, Absent→Default, **Gap→Removed**). The home
  column is pinned + blue-tinted like a selected column; the feature column and
  header are sticky; gaps are flagged red like blocked issues.
- **Page actions in the header**: `Push gaps to Jira` / `Publish to Confluence`
  moved top-right next to the title (the ADS header-actions pattern); their async
  results render below as ADS section messages. `IntegrationsBar` slimmed to a
  status-only component that renders `null` until there is something to report.
- New favicon (blue tile + ascending comparison bars) + page `<title>`.

## Key decisions

- **Follow the brief exactly.** The direction was pinned ("use Atlassian as an
  example"), so the boldness went into faithful ADS execution, not a novel palette.
  The lozenge → Jira-status mapping is the one memorable move, and it is *earned* by
  the product's existing Jira/Confluence integration rather than decorative.
- **CSS-first, minimal markup churn.** Kept every class the components already emit;
  only three components changed JSX (table/card cells → lozenges, App shell +
  header actions). The rating glyphs (`●◕◔—`) were dropped in favour of text
  lozenges — the label carries meaning without relying on colour alone (a11y win).
- **No ADR / no new spec.** Pure presentation, consistent with how feature-012
  (export) was handled: a reskin needs neither an architecture decision nor a
  failing test. Behaviour is unchanged, so the existing suite is the guard.
- **Header actions stay gated on `ready`.** Same invariant as before — the buttons
  only appear on real DB data, never the dev mock fallback, so we never publish
  mocks to Jira/Confluence.

## Lesson: verifying a visual change without screenshots

The preview pane's screenshot capture wedged for the whole session (hung on the
external font fetch — `document.fonts.status` was `loaded`, so it was a pane
artifact, not an app bug). Rather than ship unverified, I drove verification through
`javascript_tool`: read `getComputedStyle` on the key nodes (tokens, lozenge colours,
sticky columns, elevation), toggled table↔card view programmatically to confirm both,
and — since the header actions only render in `ready` state (no local backend) —
injected the actions markup to measure the layout (title left, buttons right-aligned,
same row). Takeaway: computed-style + geometry assertions are a solid screenshot
substitute when the visual tool is down, and often *more* precise about whether a
token actually applied.

## Verification

`build` + `lint` clean, **226/226 tests** pass (unchanged — presentation only).
DOM + computed-style checks confirmed the token system, both views, and the header
layout on the dev server. Full visual confirmation on Vercel is deploy-time (the dev
server has no backend, so it runs in `fallback`/sample-data mode and hides the
header integration actions by design).

## Follow-ups

- Nothing behavioural. Open items unchanged: unauthenticated ad-hoc write
  endpoints (#25), SSRF residual (#15), the M7 `type="url"` native-validation note.
- If we later want to drop the Google Fonts runtime dependency, self-host Inter
  (via an `app/` dev-dep + ADR) — the system fallback already covers offline.
