import CompetitorTable from './components/CompetitorTable';
import { RATINGS } from './domain/competitor';
import { ratingToCell } from './domain/rating-cell';
import { MOCK_COMPETITORS, VA_INDIGO } from './mocks/competitors';

export default function App() {
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

      <CompetitorTable home={VA_INDIGO} competitors={MOCK_COMPETITORS} />

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
