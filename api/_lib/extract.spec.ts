import { describe, it, expect } from 'vitest';
import { extract, EXTRACT_CHAR_BUDGET } from './extract';

describe('extract', () => {
  it('keeps visible text and drops tags', () => {
    const html = '<html><body><h1>Acme</h1><p>Process analytics</p></body></html>';
    expect(extract(html)).toBe('Acme Process analytics');
  });

  it('drops script and style bodies entirely', () => {
    const html =
      '<style>.a{color:red}</style><p>Keep me</p><script>var x = 1; alert(x);</script>';
    const text = extract(html);
    expect(text).toContain('Keep me');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('alert');
  });

  it('drops chrome elements (nav/header/footer/noscript)', () => {
    const html =
      '<nav>Home About</nav><header>Logo</header><main>Body text</main><footer>© 2026</footer>';
    const text = extract(html);
    expect(text).toBe('Body text');
  });

  it('removes HTML comments', () => {
    expect(extract('<p>A</p><!-- hidden note -->\n<p>B</p>')).toBe('A B');
  });

  it('decodes common HTML entities', () => {
    expect(extract('<p>Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#39;apos&#39; &nbsp;end</p>')).toBe(
      'Tom & Jerry <3 "quotes" \'apos\' end',
    );
  });

  it('decodes numeric entities (decimal and hex)', () => {
    expect(extract('<p>&#65;&#x42;&#67;</p>')).toBe('ABC');
  });

  it('collapses runs of whitespace', () => {
    expect(extract('<p>a\n\n   b\t\tc</p>')).toBe('a b c');
  });

  it('truncates to the character budget', () => {
    const html = `<p>${'x'.repeat(EXTRACT_CHAR_BUDGET + 500)}</p>`;
    expect(extract(html).length).toBe(EXTRACT_CHAR_BUDGET);
  });

  it('respects an explicit budget argument', () => {
    expect(extract('<p>abcdefghij</p>', 4)).toBe('abcd');
  });
});
