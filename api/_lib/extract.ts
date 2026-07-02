// Dependency-free HTML → clean-text extraction (ADR 005). A pure function so it
// is unit-tested on fixtures with no network. Good enough for typical marketing
// pages; a readability library remains a pre-authorized fallback if needed.

/** Max characters of extracted text handed to the summarizer (token budget). */
export const EXTRACT_CHAR_BUDGET = 12_000;

/** Elements whose entire content is noise for summarization. */
const DROP_ELEMENTS = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'nav',
  'header',
  'footer',
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(parseInt(body.slice(2), 16));
    }
    if (body.startsWith('#')) {
      return String.fromCodePoint(parseInt(body.slice(1), 10));
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

/**
 * Reduce raw HTML to visible text: drop noisy elements with their content,
 * strip comments and remaining tags, decode common entities, collapse
 * whitespace, and truncate to `budget` characters.
 */
export function extract(html: string, budget = EXTRACT_CHAR_BUDGET): string {
  let text = html;
  for (const tag of DROP_ELEMENTS) {
    text = text.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi'), ' ');
  }
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > budget ? text.slice(0, budget) : text;
}
