# User guide — what you can do in Market Investigation

Market Investigation is a competitive-analysis dashboard. It shows how
**VA‑INDIGO** (the VON ARDENNE analysis suite) stacks up against the competitive
landscape, flags where you're behind, and turns those gaps into work your team can
act on.

## Your role

There is a single role today — **the analyst** — and there is **no sign‑in**. Anyone
who can open the app has the full set of capabilities below. (Access control /
multiple roles are not built yet; if that changes, this page will describe them.)

## At a glance

| You want to… | Where | Notes |
| --- | --- | --- |
| See how VA‑INDIGO compares | Comparison board | Table or Cards view |
| Find a competitor or a feature area | Search + area filters | Narrows the current view |
| Pull in a competitor from its website | **Research** bar | Paste a URL; the app fills in the rest |
| Add or correct a competitor by hand | **Add competitor** / **Edit** | Website can't be changed after creation |
| File your gaps as work | **Push gaps to Jira** | One task per gap, in your team's board |
| Share the comparison | **Publish to Confluence** | One living page, updated in place |
| Take the data with you | **Download CSV** / **Print / Save as PDF** | Exports exactly what you see |

## Reading the comparison

The board compares VA‑INDIGO against each competitor across six feature areas:

- Real‑time KPI dashboards
- Machine & data‑source integration
- Trend analysis
- Process & quality analytics
- Alerting & notifications
- Reporting & export

Each cell shows a **rating** as a status lozenge:

| Rating | Means |
| --- | --- |
| **Strong** | Best‑in‑class coverage |
| **Adequate** | Solid, covers the need |
| **Weak** | Present but limited |
| **Absent** | Not offered |

**VA‑INDIGO is pinned** as the first, highlighted column (or the first card) so you
always read "us vs. them". A cell is flagged with a **⚠ gap** when VA‑INDIGO is
**weak or absent *and* at least one competitor is stronger** — those are the areas
worth your attention.

**Two views, same data:**

- **Table** — the full matrix; feature areas down the side, products across the top.
  The header row and the feature column stay put while you scroll a long or wide table.
- **Cards** — one card per product, easier to scan on a narrow screen. VA‑INDIGO's
  card leads and carries the same gap flags.

Switch with the **Table / Cards** toggle; your choice is remembered next time.

## Finding what you need

- **Search** — type in the search box to narrow the board to competitors whose name
  matches.
- **Feature‑area filters** — click the area chips to show only the rows/ratings you
  care about. Click again to clear.

Search and filters only change what's *shown* — they never change your data, and gap
counts are always computed over the whole market, not the filtered view.

## Adding competitors

**Research a competitor by URL** — paste a competitor's web address into the
**Research** bar and choose **Research**. The app reads the page and drafts a
competitor record — name, description, and a first pass at the six ratings — then
adds it to the board for you to review and adjust. Enter a full `http(s)` address; an
invalid address is caught before anything is sent.

**Add a competitor by hand** — choose **Add competitor** to open the form and enter
the details yourself, including a rating for each feature area.

**Edit a competitor** — open a competitor's card and choose **Edit** to correct its
description or ratings.

> **The website is the identity.** A competitor is keyed by its website, so the
> website is **read‑only when editing**. To change it, delete and re‑create the
> record.

## Acting on your gaps

**Push gaps to Jira** — files every flagged gap as a task on your team's Jira board,
so the work to close them lives where your team already plans. Re‑running is safe:
gaps that were already filed are skipped, not duplicated. The button is disabled when
there are no gaps to file, and the caption tells you how many are ready.

**Publish to Confluence** — publishes the comparison as a single, living page in your
Confluence space. Publishing again **updates the same page** rather than creating a
new one, so there's always one source of truth to link to. The result gives you a
direct link to open it.

## Exporting

- **Download CSV** — saves the current comparison as a spreadsheet you can open in
  Excel (accented characters and symbols are preserved).
- **Print / Save as PDF** — opens your browser's print dialog with a clean,
  controls‑free layout: just the title and the comparison.

Both exports are **what‑you‑see‑is‑what‑you‑get** — they contain exactly the
competitors and feature areas currently shown, so filter first if you want a subset.

## Keeping data fresh

Saved competitors are **re‑researched automatically once a day**, so ratings and
descriptions stay current without anyone re‑running research by hand. If one
competitor's site can't be reached on a given day, the rest still refresh and that
one is retried the next day.

## Good to know

- **Integrations need live data.** *Push gaps to Jira* and *Publish to Confluence*
  only appear once real competitor data has loaded. If the app shows a
  **"Showing sample data"** banner (it couldn't reach the server), those actions are
  hidden on purpose — so sample data is never published to Jira or Confluence.
- **If the app can't load your competitors**, you'll see an error with a **Retry**
  button rather than a broken screen. Retry once the connection is back.
- **Nothing here is destructive.** Search, filters, view choice, and exports never
  change your data.
