import type { Competitor, FeatureArea } from '../domain/competitor';
import { buildComparison } from '../domain/gap';
import CompetitorCard from './CompetitorCard';

interface CompetitorCardsProps {
  home: Competitor;
  competitors: Competitor[];
  /** Feature areas to show on each card, already filtered + ordered. */
  areas: FeatureArea[];
}

/**
 * Card-view counterpart to `CompetitorTable`: VA-INDIGO pinned first with its
 * gap flags, then one card per (filtered) competitor. Gap areas are derived
 * from the same `buildComparison` model the table uses, so both views agree.
 * Pure rendering. FR-2.
 */
export default function CompetitorCards({ home, competitors, areas }: CompetitorCardsProps) {
  const model = buildComparison(home, competitors, areas);
  const gaps = new Set<FeatureArea>(
    model.rows.filter((row) => row.home.isGap).map((row) => row.area),
  );

  return (
    <div className="cards">
      <CompetitorCard competitor={home} areas={areas} home gaps={gaps} />
      {competitors.map((competitor) => (
        <CompetitorCard key={competitor.id} competitor={competitor} areas={areas} />
      ))}
    </div>
  );
}
