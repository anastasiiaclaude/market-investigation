import { useState } from 'react';
import type { FormEvent } from 'react';
import { isHttpUrl } from '../domain/url';

interface ResearchBarProps {
  /** Called with a validated `http(s)` URL; the caller runs research + persists. */
  onResearch: (url: string) => void;
  /** A research request is in flight. */
  busy: boolean;
  /** A research failure to surface inline (already a friendly message). */
  error: string | null;
}

/**
 * Research entry point (M8, FR-16 — the frontend for M5's `POST /api/research`).
 * A single URL field + button: the app's way to pull in a competitor by address.
 * Thin — it validates the URL client-side (no request on a bad URL) and renders
 * the busy/error states the caller owns; the fetch + persistence live in `App`
 * over the pure `researchCompetitor` client, mirroring the M7 form.
 */
export default function ResearchBar({ onResearch, busy, error }: ResearchBarProps) {
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!isHttpUrl(trimmed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onResearch(trimmed);
  };

  return (
    <form
      className="research-bar"
      onSubmit={submit}
      // Our `isHttpUrl` check is the single gate; without this the native
      // `type="url"` validation preempts it with a locale-dependent bubble.
      noValidate
      aria-label="Research a competitor by URL"
    >
      <div className="research-row">
        <input
          type="url"
          className="search research-input"
          placeholder="Research a competitor by URL…"
          aria-label="Competitor URL"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (invalid) setInvalid(false);
          }}
          aria-invalid={invalid}
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Researching…' : 'Research'}
        </button>
      </div>
      {invalid && (
        <span className="field-error" role="alert">
          Enter a valid http(s) URL.
        </span>
      )}
      {error && (
        <p className="form-error research-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
