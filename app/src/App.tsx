import CompetitorTable from './components/CompetitorTable';
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
        <li>
          <span className="cell rating-strong cell-symbol">●</span> Strong
        </li>
        <li>
          <span className="cell rating-adequate cell-symbol">◕</span> Adequate
        </li>
        <li>
          <span className="cell rating-weak cell-symbol">◔</span> Weak
        </li>
        <li>
          <span className="cell rating-absent cell-symbol">—</span> Absent
        </li>
      </ul>
    </main>
  );
}
