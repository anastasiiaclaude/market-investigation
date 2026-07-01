import { useState } from 'react';
import CompetitorCards from './components/CompetitorCards';
import CompetitorTable from './components/CompetitorTable';
import Toolbar from './components/Toolbar';
import { RATINGS } from './domain/competitor';
import { EMPTY_FILTER, filterCompetitors, visibleAreas } from './domain/filter';
import { ratingToCell } from './domain/rating-cell';
import { useViewPreference } from './hooks/useViewPreference';
import { MOCK_COMPETITORS, VA_INDIGO } from './mocks/competitors';

export default function App() {
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [view, setView] = useViewPreference();

  const competitors = filterCompetitors(MOCK_COMPETITORS, filter.query);
  const areas = visibleAreas(filter.areas);

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Market investigation</h1>
        <p>
          How <strong>{VA_INDIGO.name}</strong> compares against the competitive
          landscape. Cells flagged <span className="gap-flag">⚠</span> mark where
          VA-INDIGO is weak or absent and a competitor is stronger.
        </p>
      </header>

      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        view={view}
        onViewChange={setView}
      />

      {view === 'table' ? (
        <CompetitorTable home={VA_INDIGO} competitors={competitors} areas={areas} />
      ) : (
        <CompetitorCards home={VA_INDIGO} competitors={competitors} areas={areas} />
      )}

      {competitors.length === 0 && (
        <p className="empty-note">No competitors match your search.</p>
      )}

      <ul className="legend" aria-label="Rating legend">
        {RATINGS.map((rating) => {
          const cell = ratingToCell(rating);
          return (
            <li key={cell.rating}>
              <span className={`cell ${cell.className} cell-symbol`} aria-hidden="true">
                {cell.symbol}
              </span>{' '}
              {cell.label}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
