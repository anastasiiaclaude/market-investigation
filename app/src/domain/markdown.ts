/**
 * A tiny, dependency-free Markdown parser (feature 015).
 *
 * It renders the in-app user guide (`docs/user-guide.md`) and deliberately
 * supports **only** the constructs that guide uses: `#`/`##` headings, soft-wrapped
 * paragraphs, `- ` bullet lists, `> ` blockquotes, GFM pipe tables, and inline
 * `code` / `**bold**` / `*em*` (bold may contain em). Anything else is treated as
 * plain paragraph text. It is intentionally NOT a general Markdown engine — grow it
 * (with a test) only when the guide starts using a new construct.
 *
 * Parsing yields a small AST that React renders as real elements, so there is no
 * `dangerouslySetInnerHTML` in the render path.
 */

/** An inline span. `strong`/`em` nest; `text`/`code` are leaves. */
export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] };

/** A block-level element. */
export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; inlines: Inline[] }
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'list'; items: Inline[][] }
  | { kind: 'blockquote'; inlines: Inline[] }
  | { kind: 'table'; headers: Inline[][]; rows: Inline[][][] };

/**
 * Parse an inline string into spans. Tries, in order, `` `code` ``, `**strong**`,
 * then `*em*` — `**` before `*` so bold wins over italic. `strong`/`em` bodies are
 * parsed recursively, so `**a *b* c**` nests correctly. An opener with no matching
 * closer is emitted as literal text.
 */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf });
    buf = '';
  };

  let i = 0;
  while (i < src.length) {
    if (src.startsWith('`', i)) {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        out.push({ kind: 'code', text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    } else if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        out.push({ kind: 'strong', children: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (src.startsWith('*', i)) {
      const end = src.indexOf('*', i + 1);
      if (end !== -1) {
        flush();
        out.push({ kind: 'em', children: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += src.charAt(i);
    i += 1;
  }
  flush();
  return out;
}

/** Split a table row on unescaped pipes, dropping the outer border pipes. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((cell) => cell.trim());
}

/** A GFM separator row: every cell is `---`, `:--`, `--:`, or `:-:`. */
function isTableSeparator(line: string): boolean {
  if (!line.includes('-')) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

/**
 * Parse Markdown into a block list. Blocks are separated by blank lines or by a
 * change of block type; soft-wrapped lines within a paragraph/blockquote are joined
 * with a space.
 */
export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Blank line — block separator.
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Heading: #, ##, ###.
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, inlines: parseInline(heading[2]!.trim()) });
      i += 1;
      continue;
    }

    // Table: a pipe line immediately followed by a separator row.
    const next = lines[i + 1];
    if (line.includes('|') && next !== undefined && isTableSeparator(next)) {
      const headers = splitRow(line).map(parseInline);
      i += 2; // consume header + separator
      const rows: Inline[][][] = [];
      while (i < lines.length && (lines[i] ?? '').includes('|') && (lines[i] ?? '').trim() !== '') {
        rows.push(splitRow(lines[i]!).map(parseInline));
        i += 1;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // Bullet list: consecutive `- ` lines.
    if (/^-\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^-\s+/.test(lines[i] ?? '')) {
        items.push(parseInline((lines[i] ?? '').replace(/^-\s+/, '').trim()));
        i += 1;
      }
      blocks.push({ kind: 'list', items });
      continue;
    }

    // Blockquote: consecutive `>` lines, joined into one paragraph.
    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        parts.push((lines[i] ?? '').replace(/^>\s?/, '').trim());
        i += 1;
      }
      blocks.push({ kind: 'blockquote', inlines: parseInline(parts.join(' ')) });
      continue;
    }

    // Paragraph: run of plain lines until a blank line or a new block starts.
    const parts: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? '';
      if (
        l.trim() === '' ||
        /^(#{1,3})\s+/.test(l) ||
        /^-\s+/.test(l) ||
        /^>\s?/.test(l) ||
        (l.includes('|') && isTableSeparator(lines[i + 1] ?? ''))
      ) {
        break;
      }
      parts.push(l.trim());
      i += 1;
    }
    blocks.push({ kind: 'paragraph', inlines: parseInline(parts.join(' ')) });
  }

  return blocks;
}
