import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseInline } from './markdown';

describe('parseInline', () => {
  it('returns a single text span for plain text', () => {
    expect(parseInline('just words')).toEqual([{ kind: 'text', text: 'just words' }]);
  });

  it('parses inline code, bold, and italic', () => {
    expect(parseInline('use `npm run dev` now')).toEqual([
      { kind: 'text', text: 'use ' },
      { kind: 'code', text: 'npm run dev' },
      { kind: 'text', text: ' now' },
    ]);
    expect(parseInline('a **bold** word')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'bold' }] },
      { kind: 'text', text: ' word' },
    ]);
    expect(parseInline('an *em* word')).toEqual([
      { kind: 'text', text: 'an ' },
      { kind: 'em', children: [{ kind: 'text', text: 'em' }] },
      { kind: 'text', text: ' word' },
    ]);
  });

  it('nests emphasis inside bold (the guide has this case)', () => {
    expect(parseInline('**weak *and* absent**')).toEqual([
      {
        kind: 'strong',
        children: [
          { kind: 'text', text: 'weak ' },
          { kind: 'em', children: [{ kind: 'text', text: 'and' }] },
          { kind: 'text', text: ' absent' },
        ],
      },
    ]);
  });

  it('leaves a lone asterisk or backtick as literal text', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ kind: 'text', text: '2 * 3 = 6' }]);
  });
});

describe('parseMarkdown', () => {
  it('parses headings by level', () => {
    expect(parseMarkdown('# Title')).toEqual([
      { kind: 'heading', level: 1, inlines: [{ kind: 'text', text: 'Title' }] },
    ]);
    expect(parseMarkdown('## Section')).toEqual([
      { kind: 'heading', level: 2, inlines: [{ kind: 'text', text: 'Section' }] },
    ]);
  });

  it('joins soft-wrapped paragraph lines with a space', () => {
    expect(parseMarkdown('one line\nsecond line')).toEqual([
      {
        kind: 'paragraph',
        inlines: [{ kind: 'text', text: 'one line second line' }],
      },
    ]);
  });

  it('separates blocks on blank lines', () => {
    const blocks = parseMarkdown('# Title\n\nA paragraph.');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ kind: 'paragraph' });
  });

  it('collects consecutive `- ` lines into one list', () => {
    expect(parseMarkdown('- first\n- second')).toEqual([
      {
        kind: 'list',
        items: [[{ kind: 'text', text: 'first' }], [{ kind: 'text', text: 'second' }]],
      },
    ]);
  });

  it('folds a soft-wrapped continuation line into the current list item', () => {
    const md = '- **Table** — the matrix\n  stays put while you scroll.\n- **Cards** — one per product';
    expect(parseMarkdown(md)).toEqual([
      {
        kind: 'list',
        items: [
          [
            { kind: 'strong', children: [{ kind: 'text', text: 'Table' }] },
            { kind: 'text', text: ' — the matrix stays put while you scroll.' },
          ],
          [
            { kind: 'strong', children: [{ kind: 'text', text: 'Cards' }] },
            { kind: 'text', text: ' — one per product' },
          ],
        ],
      },
    ]);
  });

  it('ends the list at a blank line, keeping a following paragraph separate', () => {
    const blocks = parseMarkdown('- only item\n\nA new paragraph.');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'list' });
    expect(blocks[1]).toMatchObject({ kind: 'paragraph' });
  });

  it('joins consecutive `> ` lines into one blockquote', () => {
    expect(parseMarkdown('> keep the\n> website read-only')).toEqual([
      {
        kind: 'blockquote',
        inlines: [{ kind: 'text', text: 'keep the website read-only' }],
      },
    ]);
  });

  it('parses a pipe table with a separator row', () => {
    const md = ['| Rating | Means |', '| --- | --- |', '| **Strong** | Best |'].join('\n');
    expect(parseMarkdown(md)).toEqual([
      {
        kind: 'table',
        headers: [[{ kind: 'text', text: 'Rating' }], [{ kind: 'text', text: 'Means' }]],
        rows: [
          [
            [{ kind: 'strong', children: [{ kind: 'text', text: 'Strong' }] }],
            [{ kind: 'text', text: 'Best' }],
          ],
        ],
      },
    ]);
  });

  it('does not treat a bare pipe line without a separator as a table', () => {
    const blocks = parseMarkdown('a | b | c');
    expect(blocks[0]?.kind).toBe('paragraph');
  });

  it('ignores blank leading/trailing lines and returns no empty blocks', () => {
    const blocks = parseMarkdown('\n\n# Only\n\n');
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, inlines: [{ kind: 'text', text: 'Only' }] },
    ]);
  });
});
