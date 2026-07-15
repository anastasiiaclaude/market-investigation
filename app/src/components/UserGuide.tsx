import { useEffect, useMemo, useRef } from 'react';
import guideMarkdown from '../../../docs/user-guide.md?raw';
import { parseMarkdown, type Block, type Inline } from '../domain/markdown';

interface UserGuideProps {
  onClose: () => void;
}

/** Render inline spans (recursively) as React nodes. */
function renderInlines(inlines: Inline[]) {
  return inlines.map((span, i) => {
    switch (span.kind) {
      case 'text':
        return <span key={i}>{span.text}</span>;
      case 'code':
        return <code key={i}>{span.text}</code>;
      case 'strong':
        return <strong key={i}>{renderInlines(span.children)}</strong>;
      case 'em':
        return <em key={i}>{renderInlines(span.children)}</em>;
    }
  });
}

/** Render one parsed block as its matching element. */
function renderBlock(block: Block, i: number) {
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3';
      return <Tag key={i}>{renderInlines(block.inlines)}</Tag>;
    }
    case 'paragraph':
      return <p key={i}>{renderInlines(block.inlines)}</p>;
    case 'list':
      return (
        <ul key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInlines(item)}</li>
          ))}
        </ul>
      );
    case 'blockquote':
      return <blockquote key={i}>{renderInlines(block.inlines)}</blockquote>;
    case 'table':
      return (
        <div className="guide-table-scroll" key={i}>
          <table>
            <thead>
              <tr>
                {block.headers.map((cell, j) => (
                  <th key={j}>{renderInlines(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{renderInlines(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/**
 * The end-user guide (`docs/user-guide.md`) rendered in-app as a native `<dialog>`
 * modal (feature 015). The markdown is the single source of truth — imported raw and
 * parsed by the pure `domain/markdown` AST, then rendered as real React elements.
 * Mirrors the M7 add/edit form pattern: `showModal` for a focus-trapped backdrop,
 * `Esc`/backdrop close via `onCancel`/`onClose`.
 */
export default function UserGuide({ onClose }: UserGuideProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const blocks = useMemo(() => parseMarkdown(guideMarkdown), []);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Close when the backdrop (outside the content box) is clicked.
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="guide-dialog"
      onClose={onClose}
      onCancel={onClose}
      onClick={handleClick}
      aria-labelledby="guide-title"
    >
      <div className="guide-panel">
        <header className="guide-head">
          <h2 id="guide-title">User guide</h2>
          <button type="button" className="btn" onClick={onClose} aria-label="Close user guide">
            Close
          </button>
        </header>
        <div className="guide-body">{blocks.map(renderBlock)}</div>
      </div>
    </dialog>
  );
}
