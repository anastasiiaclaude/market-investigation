import type { JiraSyncResult } from '../domain/competitors-api';
import { summarizeJiraSync } from '../domain/jira';

interface IntegrationsBarProps {
  /** Push the current gaps to Jira; the caller runs the request + owns state. */
  onPushJira: () => void;
  busy: boolean;
  result: JiraSyncResult | null;
  /** A failure to surface inline (already a friendly message). */
  error: string | null;
  /** How many gaps exist right now — gates the button + the empty hint. */
  gapCount: number;
}

/**
 * Outbound integrations for the comparison (M8). Today: "Push gaps to Jira"
 * (FR-14) — files one Task per competitive gap, deduped server-side. Thin: the
 * request + async state live in `App` over the pure `syncJiraGaps` client;
 * Confluence publish (FR-15) will join here.
 */
export default function IntegrationsBar({
  onPushJira,
  busy,
  result,
  error,
  gapCount,
}: IntegrationsBarProps) {
  return (
    <div className="integrations-bar">
      <div className="integrations-row">
        <button
          type="button"
          className="btn"
          onClick={onPushJira}
          disabled={busy || gapCount === 0}
        >
          {busy ? 'Pushing to Jira…' : 'Push gaps to Jira'}
        </button>
        {gapCount === 0 ? (
          <span className="field-hint">No gaps to file — nothing to push.</span>
        ) : (
          <span className="field-hint">
            {gapCount} gap{gapCount === 1 ? '' : 's'} ready to file as Jira tasks.
          </span>
        )}
      </div>
      {result && (
        <p className="notice integrations-result" role="status">
          {summarizeJiraSync(result)}
        </p>
      )}
      {error && (
        <p className="form-error integrations-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
