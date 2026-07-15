import { useState } from 'react';
import CompetitorCards from './components/CompetitorCards';
import CompetitorForm from './components/CompetitorForm';
import CompetitorTable from './components/CompetitorTable';
import ExportBar from './components/ExportBar';
import IntegrationsBar from './components/IntegrationsBar';
import ResearchBar from './components/ResearchBar';
import Toolbar from './components/Toolbar';
import UserGuide from './components/UserGuide';
import { RATINGS, type Competitor } from './domain/competitor';
import { toCompetitor, type CompetitorFormValues } from './domain/competitor-form';
import {
  createCompetitor,
  publishConfluence,
  researchCompetitor,
  syncJiraGaps,
  updateCompetitor,
  type ConfluencePublishResult,
  type JiraSyncResult,
} from './domain/competitors-api';
import { EMPTY_FILTER, filterCompetitors, visibleAreas } from './domain/filter';
import { gapAreas } from './domain/gap';
import { ratingToCell } from './domain/rating-cell';
import { useCompetitors } from './hooks/useCompetitors';
import { useViewPreference } from './hooks/useViewPreference';
import { VA_INDIGO } from './mocks/competitors';

type FormState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; competitor: Competitor };

export default function App() {
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [view, setView] = useViewPreference();
  const { state: competitorsState, upsert, reload } = useCompetitors();

  const [guideOpen, setGuideOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ open: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const [jiraBusy, setJiraBusy] = useState(false);
  const [jiraResult, setJiraResult] = useState<JiraSyncResult | null>(null);
  const [jiraError, setJiraError] = useState<string | null>(null);

  const [confluenceBusy, setConfluenceBusy] = useState(false);
  const [confluenceResult, setConfluenceResult] = useState<ConfluencePublishResult | null>(null);
  const [confluenceError, setConfluenceError] = useState<string | null>(null);

  const loading = competitorsState.status === 'loading';
  const errored = competitorsState.status === 'error';
  // Integrations must act on real DB data only — never the mock fallback or an
  // empty loading list (publishing would overwrite Confluence/Jira with mocks).
  const ready = competitorsState.status === 'ready';
  const source = 'competitors' in competitorsState ? competitorsState.competitors : [];
  const competitors = filterCompetitors(source, filter.query);
  const areas = visibleAreas(filter.areas);

  // Gaps are computed over the full market (not the filtered view) + VA-INDIGO.
  const gapCount = gapAreas(VA_INDIGO, source).length;

  const handleResearch = async (url: string) => {
    setResearching(true);
    setResearchError(null);
    try {
      upsert(await researchCompetitor(url));
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : String(error));
    } finally {
      setResearching(false);
    }
  };

  const handlePushJira = async () => {
    setJiraBusy(true);
    setJiraError(null);
    setJiraResult(null);
    try {
      setJiraResult(await syncJiraGaps(VA_INDIGO, source));
    } catch (error) {
      setJiraError(error instanceof Error ? error.message : String(error));
    } finally {
      setJiraBusy(false);
    }
  };

  const handlePublishConfluence = async () => {
    setConfluenceBusy(true);
    setConfluenceError(null);
    setConfluenceResult(null);
    try {
      setConfluenceResult(await publishConfluence(VA_INDIGO, source));
    } catch (error) {
      setConfluenceError(error instanceof Error ? error.message : String(error));
    } finally {
      setConfluenceBusy(false);
    }
  };

  const openAdd = () => {
    setFormError(null);
    setForm({ open: true, mode: 'create' });
  };
  const openEdit = (competitor: Competitor) => {
    setFormError(null);
    setForm({ open: true, mode: 'edit', competitor });
  };
  const closeForm = () => {
    setForm({ open: false });
    setFormError(null);
  };

  const handleSubmit = async (values: CompetitorFormValues) => {
    if (!form.open) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const record = toCompetitor(values, new Date());
      const saved =
        form.mode === 'edit'
          ? await updateCompetitor(form.competitor.id, record)
          : await createCompetitor(record);
      upsert(saved);
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <nav className="app-nav" aria-label="Product">
        <div className="app-nav-inner">
          <a className="app-brand" href="/" aria-label="Market Investigation home">
            <span className="app-logo" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 32 32" role="img">
                <rect x="6" y="16" width="4.5" height="9" rx="1.4" fill="#fff" opacity="0.55" />
                <rect x="13.75" y="11" width="4.5" height="14" rx="1.4" fill="#fff" opacity="0.8" />
                <rect x="20.5" y="7" width="4.5" height="18" rx="1.4" fill="#fff" />
              </svg>
            </span>
            <span className="app-wordmark">Market Investigation</span>
          </a>
          <div className="app-nav-side">
            <button type="button" className="btn nav-guide-btn" onClick={() => setGuideOpen(true)}>
              User guide
            </button>
            <span className="app-project">VON ARDENNE</span>
            <span className="app-avatar" aria-hidden="true">
              VA
            </span>
          </div>
        </div>
      </nav>

      <main className="dashboard">
        <header className="dashboard-header">
          <p className="eyebrow">Competitive analysis</p>
          <div className="header-top">
            <h1>Market investigation</h1>
            {ready && (
              <div className="header-actions">
                <div className="header-buttons">
                  <button
                    type="button"
                    className="btn"
                    onClick={handlePushJira}
                    disabled={jiraBusy || gapCount === 0}
                  >
                    {jiraBusy ? 'Pushing to Jira…' : 'Push gaps to Jira'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handlePublishConfluence}
                    disabled={confluenceBusy}
                  >
                    {confluenceBusy ? 'Publishing…' : 'Publish to Confluence'}
                  </button>
                </div>
                <span className="field-hint header-hint">
                  {gapCount === 0
                    ? 'No gaps to file.'
                    : `${gapCount} gap${gapCount === 1 ? '' : 's'} ready to file as Jira tasks.`}
                </span>
              </div>
            )}
          </div>
          <p className="lede">
            How <strong>{VA_INDIGO.name}</strong> compares against the competitive
            landscape. Cells flagged <span className="gap-flag">⚠</span> mark where
            VA-INDIGO is weak or absent and a competitor is stronger.
          </p>
        </header>

        {competitorsState.status === 'fallback' && (
          <p className="notice" role="status">
            Showing sample data — couldn’t reach the server.
          </p>
        )}

        {errored && (
          <div className="form-error error-notice" role="alert">
            <span>Couldn’t load competitors: {competitorsState.error}</span>
            <button type="button" className="btn" onClick={reload} disabled={loading}>
              Retry
            </button>
          </div>
        )}

        <ResearchBar onResearch={handleResearch} busy={researching} error={researchError} />

        {ready && (
          <IntegrationsBar
            jira={{ result: jiraResult, error: jiraError }}
            confluence={{ result: confluenceResult, error: confluenceError }}
          />
        )}

        <section className="board" aria-label="Competitor comparison">
          <Toolbar
            filter={filter}
            onFilterChange={setFilter}
            view={view}
            onViewChange={setView}
            onAdd={openAdd}
          />

          {!loading && !errored && (
            <ExportBar home={VA_INDIGO} competitors={competitors} areas={areas} />
          )}

          {!errored &&
            (view === 'table' ? (
              <CompetitorTable home={VA_INDIGO} competitors={competitors} areas={areas} />
            ) : (
              <CompetitorCards
                home={VA_INDIGO}
                competitors={competitors}
                areas={areas}
                onEdit={openEdit}
              />
            ))}

          {loading && <p className="empty-note">Loading competitors…</p>}

          {!loading && !errored && source.length === 0 && (
            <p className="empty-note">No competitors yet — research one above.</p>
          )}

          {!loading && !errored && source.length > 0 && competitors.length === 0 && (
            <p className="empty-note">No competitors match your search.</p>
          )}

          <ul className="legend" aria-label="Rating legend">
            {RATINGS.map((rating) => {
              const cell = ratingToCell(rating);
              return (
                <li key={cell.rating}>
                  <span className={`lozenge ${cell.className}`}>{cell.label}</span>
                </li>
              );
            })}
            <li>
              <span className="lozenge rating-gap">⚠ Gap</span>
            </li>
          </ul>
        </section>

        {form.open && (
          <CompetitorForm
            mode={form.mode}
            initial={form.mode === 'edit' ? form.competitor : undefined}
            onSubmit={handleSubmit}
            onClose={closeForm}
            submitting={submitting}
            error={formError}
          />
        )}

        {guideOpen && <UserGuide onClose={() => setGuideOpen(false)} />}
      </main>
    </>
  );
}
