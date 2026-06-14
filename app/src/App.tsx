import { greeting } from './greeting';

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>{greeting('market-investigation')}</h1>
      <p>Веб-дашборд для конкурентного анализа.</p>
    </main>
  );
}
