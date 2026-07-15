# Feature 015 — Read the user guide from the site

Presentation-only add-on. The end-user guide (`docs/user-guide.md`, added on this
branch) is only readable in the repo. This puts a **User guide** button in the app's
top nav that opens the same guide **in a modal**, so an analyst can read it without
leaving the dashboard.

**Dependency-free (like 012 export + 014 reskin).** No markdown library → no new
runtime dependency → **no ADR** (per `docs/constraints.md`). The guide's markdown is
rendered by a small, tested, pure `domain/markdown.ts` parser covering exactly the
subset the guide uses.

## User story

As the analyst, I want to open the user guide from inside the app — a single click,
no hunting through the repo — so I can learn what the dashboard can do while I'm
using it.

## Design decisions (confirmed with the user)

- **Single source of truth.** The button renders `docs/user-guide.md` itself, imported
  as raw text (`?raw`). Editing the guide updates the site — no duplicated copy to
  drift. (Confirmed over a hand-authored JSX copy.)
- **Tiny built-in renderer.** A pure `app/src/domain/markdown.ts` `parseMarkdown(src)`
  turns the guide into a small block AST (`heading` / `paragraph` / `list` /
  `blockquote` / `table`) with recursive inline spans (`text` / `code` / `strong` /
  `em`). It supports **only** the constructs the guide uses — no links, no images, no
  nested lists. Node-tested (no jsdom), like every other `domain/` module. React
  renders the AST as real elements (no `dangerouslySetInnerHTML`).
- **Nav button + native `<dialog>` modal.** A `User guide` button sits in the top-nav
  side area (always visible — not gated on `ready`, unlike the header integration
  actions, so it works during loading/error/fallback too). It opens a scrollable
  `<dialog>` modal, reusing the M7 add/edit form pattern (`showModal`, backdrop,
  `Esc`/`onCancel` to close). (Confirmed over a separate `/guide` route — the app has
  no router.)
- **Hidden in print.** The nav (and therefore the button) is already hidden by the
  existing `@media print` block, so it never appears in a printed/saved PDF.
- **Thin glue.** The `?raw` import + the dialog live in a `UserGuide.tsx` component;
  the tested logic is the parser. No component test (components/hooks are untested by
  design).

## Acceptance criteria

- GIVEN the guide markdown
  WHEN `parseMarkdown` runs
  THEN it returns blocks in order: `# ` → `heading` level 1, `## ` → level 2; a pipe
  table with a `---` separator row → `table` with header cells + body rows; `- ` lines
  → one `list` with an item per line; `> ` lines → one `blockquote` (lines joined);
  everything else → `paragraph`, with soft-wrapped source lines joined by a space.

- GIVEN inline markup
  WHEN a span is parsed
  THEN `` `code` `` → `code`, `**bold**` → `strong`, `*em*` → `em`, and `**bold with
  *nested* em**` nests the `em` inside the `strong` (the guide has this case).

- GIVEN the dashboard
  WHEN I click **User guide** in the top nav
  THEN a modal opens showing the guide (headings, tables, lists, blockquotes, bold /
  italic / code all rendered), scrollable within the viewport, and closes on
  **Close**, the backdrop, or `Esc`.

## Out of scope

- Full CommonMark / GFM coverage (links, images, ordered/nested lists, code fences,
  HTML) — add constructs to the parser + a test only when the guide starts using them.
- A standalone route/page, deep-linking to a section, or search within the guide.
