# Retrospective 015 — Read the user guide from the site

## What shipped

A **User guide** button in the top nav that opens `docs/user-guide.md` in an in-app
modal, so an analyst can read the guide without leaving the dashboard. Feature
[015](../requirements/feature-015-user-guide-in-app.md). Dependency-free (like 012
export + 014 reskin), so **no ADR**.

- **`app/src/domain/markdown.ts`** — a tiny, pure, node-tested Markdown parser.
  `parseMarkdown(src)` → a small block AST (`heading` / `paragraph` / `list` /
  `blockquote` / `table`); `parseInline(src)` → recursive spans (`text` / `code` /
  `strong` / `em`). Supports **only** the subset the guide uses. 12 new specs; suite
  226 → **238**, all green.
- **`app/src/components/UserGuide.tsx`** — imports the guide as raw text
  (`../../../docs/user-guide.md?raw`, single source of truth), parses it with a
  `useMemo`, and renders the AST as **real React elements** (no
  `dangerouslySetInnerHTML`). Native `<dialog>` modal reusing the M7 form pattern
  (`showModal`, backdrop-click + `Esc`/`onCancel` to close).
- **`App.tsx`** — a `guideOpen` boolean + a `.nav-guide-btn` in the nav side area;
  the modal renders next to the add/edit form dialog.
- **`index.css`** — `.guide-dialog` / `.guide-body` styles, all off existing ADS
  tokens (headings, tables, lists, blockquote, inline code). Inherits dark mode and
  the existing `@media print` hides the nav, so the button never prints.

## Key decisions

- **Single source of truth over a hand-authored copy.** The button renders the
  actual `docs/user-guide.md` via Vite `?raw`, so editing the doc updates the site —
  no second copy to drift. The cost is a small parser; paid down once, tested.
- **A subset parser, not a Markdown library.** Adding `react-markdown` would have
  been a new runtime dependency (ADR + approval) against the project's
  dependency-free posture. The guide uses a fixed, small set of constructs, so a
  ~150-line tested pure module is the right size. **Grow it only with a test** when
  the guide adopts a new construct (links, fences, nested lists are explicitly out).
- **Recursive inline spans.** The guide has `**weak or absent *and* …**` — emphasis
  nested inside bold — so `strong`/`em` carry `children: Inline[]`, not flat text.
  Covered by a dedicated spec + verified live (`strong em` present in the DOM).
- **Nav button, not header actions.** The header integration buttons are gated on
  `ready` (real data); the guide is always relevant, so it lives in the persistent
  nav and works during loading / error / sample-data fallback too.

## What worked / lessons

- **`?raw` from outside the Vite root just works.** `docs/` sits at the repo root
  (outside `app/`), but Vite's default `server.fs.allow` reaches the workspace root
  (there's a `.git` there), and the production `vite build` inlined the file (123
  modules) with no `fs.allow` config. `vite/client` types made the `?raw` import
  `string` with no ambient declaration of our own.
- **Browser verification, not screenshots — again (cf. 014).** The preview pane's
  `screenshot` and multi-frame async probes wedged (30s timeouts), so I verified the
  rendered modal structurally through `javascript_tool`: counted the h1/9×h2/2
  tables/blockquote, asserted `dialog:modal`, `strong em` nesting, `overflow-y:auto`
  + scrollability, zero console errors, and Close→unmount. Single synchronous
  `(() => …)()` probes are reliable; chained `requestAnimationFrame` promises are the
  ones that hang.
- **`noUncheckedIndexedAccess` in the parser.** `src[i]` is `string | undefined`;
  used `src.charAt(i)` (always `string`) for the char buffer and `?? ''` /
  non-null `!` where a guard already proved presence, to keep it strict-clean.
