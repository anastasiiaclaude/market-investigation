import type { FeatureArea } from '../domain/competitor';
import { FEATURE_AREAS, FEATURE_AREA_LABELS } from '../domain/competitor';
import type { FilterState } from '../domain/filter';
import type { View } from '../domain/view-preference';
import ViewToggle from './ViewToggle';

interface ToolbarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  view: View;
  onViewChange: (view: View) => void;
  /** Opens the empty add-competitor form. */
  onAdd: () => void;
}

/**
 * Controls row: free-text competitor search, a feature-area filter, and the
 * table/card `ViewToggle`. These always appear together, so they share one
 * component. Controlled — all state lives in `App`. FR-3 + FR-7.
 */
export default function Toolbar({
  filter,
  onFilterChange,
  view,
  onViewChange,
  onAdd,
}: ToolbarProps) {
  const toggleArea = (area: FeatureArea) => {
    const areas = filter.areas.includes(area)
      ? filter.areas.filter((a) => a !== area)
      : [...filter.areas, area];
    onFilterChange({ ...filter, areas });
  };

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <input
          type="search"
          className="search"
          placeholder="Search competitors…"
          aria-label="Search competitors"
          value={filter.query}
          onChange={(e) => onFilterChange({ ...filter, query: e.target.value })}
        />
        <ViewToggle view={view} onChange={onViewChange} />
        <button type="button" className="btn btn-primary add-competitor" onClick={onAdd}>
          Add competitor
        </button>
      </div>
      <div className="area-filter" role="group" aria-label="Filter by feature area">
        {FEATURE_AREAS.map((area) => {
          const active = filter.areas.includes(area);
          return (
            <button
              key={area}
              type="button"
              className={`chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggleArea(area)}
            >
              {FEATURE_AREA_LABELS[area]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
