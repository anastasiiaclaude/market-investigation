import type { ConfluencePublishResult, JiraSyncResult } from '../domain/competitors-api';
import { summarizeJiraSync } from '../domain/jira';

interface JiraProps {
  onPush: () => void;
  busy: boolean;
  result: JiraSyncResult | null;
  error: string | null;
}

interface ConfluenceProps {
  onPublish: () => void;
  busy: boolean;
  result: ConfluencePublishResult | null;
  error: string | null;
}

interface IntegrationsBarProps {
  /** How many gaps exist right now — gates the Jira button + its hint. */
  gapCount: number;
  jira: JiraProps;
  confluence: ConfluenceProps;
}

/**
 * Outbound integrations for the comparison (M8): "Push gaps to Jira" (FR-14) and
 * "Publish to Confluence" (FR-15). Thin — each request + its async state lives in
 * `App` over the pure `syncJiraGaps` / `publishConfluence` clients; this only
 * renders buttons, results, and (friendly) errors.
 */
export default function IntegrationsBar({ gapCount, jira, confluence }: IntegrationsBarProps) {
  return (
    <div className="integrations-bar">
      <div className="integrations-row">
        <button
          type="button"
          className="btn"
          onClick={jira.onPush}
          disabled={jira.busy || gapCount === 0}
        >
          {jira.busy ? 'Pushing to Jira…' : 'Push gaps to Jira'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={confluence.onPublish}
          disabled={confluence.busy}
        >
          {confluence.busy ? 'Publishing…' : 'Publish to Confluence'}
        </button>
        <span className="field-hint">
          {gapCount === 0
            ? 'No gaps to file.'
            : `${gapCount} gap${gapCount === 1 ? '' : 's'} ready to file as Jira tasks.`}
        </span>
      </div>

      {jira.result && (
        <p className="notice integrations-result" role="status">
          Jira: {summarizeJiraSync(jira.result)}
        </p>
      )}
      {jira.error && (
        <>
          <p className="form-error integrations-error" role="alert">
            {jira.error}
          </p>
          <span className="field-hint">
            Any issues already created are safe — re-running skips them.
          </span>
        </>
      )}

      {confluence.result && (
        <p className="notice integrations-result" role="status">
          Confluence page {confluence.result.action} —{' '}
          <a href={confluence.result.url} target="_blank" rel="noreferrer">
            open page
          </a>
        </p>
      )}
      {confluence.error && (
        <p className="form-error integrations-error" role="alert">
          {confluence.error}
        </p>
      )}
    </div>
  );
}
