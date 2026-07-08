import { useState } from 'react';
import CompetitorCards from './components/CompetitorCards';
import CompetitorForm from './components/CompetitorForm';
import CompetitorTable from './components/CompetitorTable';
import IntegrationsBar from './components/IntegrationsBar';
import ResearchBar from './components/ResearchBar';
import Toolbar from './components/Toolbar';
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
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Market investigation</h1>
        <p>
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

      {!errored && (
        <IntegrationsBar
          gapCount={gapCount}
          jira={{
            onPush: handlePushJira,
            busy: jiraBusy,
            result: jiraResult,
            error: jiraError,
          }}
          confluence={{
            onPublish: handlePublishConfluence,
            busy: confluenceBusy,
            result: confluenceResult,
            error: confluenceError,
          }}
        />
      )}

      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        view={view}
        onViewChange={setView}
        onAdd={openAdd}
      />

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
              <span className={`cell ${cell.className} cell-symbol`} aria-hidden="true">
                {cell.symbol}
              </span>{' '}
              {cell.label}
            </li>
          );
        })}
      </ul>

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
    </main>
  );
}
