import type { Competitor, FeatureArea } from '../domain/competitor';
import { FEATURE_AREA_LABELS } from '../domain/competitor';
import { ratingToCell } from '../domain/rating-cell';

interface CompetitorCardProps {
  competitor: Competitor;
  /** Feature areas to list, already filtered + ordered by the caller. */
  areas: FeatureArea[];
  /** VA-INDIGO card — highlighted like the pinned table column. */
  home?: boolean;
  /** Areas where the home product has a gap; only meaningful when `home`. */
  gaps?: ReadonlySet<FeatureArea>;
  /** Opens the edit form for this competitor (rival cards only). */
  onEdit?: (competitor: Competitor) => void;
}

/**
 * One competitor as a card: name, website, description, and its per-feature
 * ratings (as ADS status lozenges, like the comparison table). The VA-INDIGO
 * card is highlighted and flags its gaps, mirroring the table. Pure rendering. FR-2.
 */
export default function CompetitorCard({
  competitor,
  areas,
  home = false,
  gaps,
  onEdit,
}: CompetitorCardProps) {
  return (
    <article className={`card${home ? ' home-card' : ''}`}>
      <header className="card-header">
        <h2>{competitor.name}</h2>
        {home && <span className="home-badge">Your product</span>}
        {onEdit && (
          <button type="button" className="card-edit" onClick={() => onEdit(competitor)}>
            Edit
          </button>
        )}
        <a href={competitor.website} target="_blank" rel="noreferrer noopener">
          {competitor.website}
        </a>
      </header>
      <p className="card-description">{competitor.description}</p>
      <dl className="card-features">
        {areas.map((area) => {
          const cell = ratingToCell(competitor.features[area]);
          const isGap = home && gaps?.has(area) === true;
          return (
            <div key={area} className={`card-feature${isGap ? ' is-gap' : ''}`}>
              <dt>{FEATURE_AREA_LABELS[area]}</dt>
              <dd>
                <span className={`lozenge ${cell.className}`}>{cell.label}</span>
                {isGap && (
                  <span className="gap-flag" aria-label="gap vs. competitors">
                    ⚠
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
