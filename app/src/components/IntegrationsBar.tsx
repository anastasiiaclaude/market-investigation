import type { ConfluencePublishResult, JiraSyncResult } from '../domain/competitors-api';
import { summarizeJiraSync } from '../domain/jira';

interface IntegrationsBarProps {
  jira: { result: JiraSyncResult | null; error: string | null };
  confluence: { result: ConfluencePublishResult | null; error: string | null };
}

/**
 * Status area for the outbound integrations (M8, FR-14/FR-15). The action buttons
 * now live in the page header (Atlassian pattern — primary page actions sit
 * top-right, next to the title); this renders the async result/error banners those
 * actions produce, as ADS section messages. Renders nothing until there is
 * something to report, so it never leaves an empty strip. Thin: the requests + all
 * their state live in `App` over the pure `syncJiraGaps` / `publishConfluence`
 * clients.
 */
export default function IntegrationsBar({ jira, confluence }: IntegrationsBarProps) {
  const hasContent = jira.result || jira.error || confluence.result || confluence.error;
  if (!hasContent) return null;

  return (
    <div className="integrations-bar">
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
