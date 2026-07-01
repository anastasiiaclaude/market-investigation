import { VIEWS, type View } from '../domain/view-preference';

interface ViewToggleProps {
  view: View;
  onChange: (view: View) => void;
}

const LABELS: Record<View, string> = {
  table: 'Table',
  cards: 'Cards',
};

/**
 * Segmented control switching between the table and card views. Controlled by
 * the parent (which persists the choice via `useViewPreference`). FR-3.
 */
export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="View">
      {VIEWS.map((option) => (
        <button
          key={option}
          type="button"
          className={`toggle-btn${view === option ? ' is-active' : ''}`}
          aria-pressed={view === option}
          onClick={() => onChange(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
