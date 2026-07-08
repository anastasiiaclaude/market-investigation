/**
 * Friendly, typed errors for every API surface (M8, FR-16). The backend writes
 * real human sentences into a `{ error }` JSON body with a meaningful HTTP status
 * (400 invalid URL, 429 rate-limited, 5xx server/pipeline). This module turns a
 * failed `Response` into an `ApiError` the UI can show verbatim — no more
 * "failed with status 500" — and flags whether retrying makes sense.
 *
 * Pure and node-testable: it only reads a `Response`, no React, no fetch.
 */

export class ApiError extends Error {
  /** The HTTP status (0 when the request never reached the server). */
  readonly status: number;
  /** True when trying again could plausibly succeed (rate limit or server error). */
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
  }
}

const RATE_LIMIT_MESSAGE =
  'The service is busy right now (rate-limited). Please wait a moment and try again.';
const NETWORK_MESSAGE =
  "Couldn't reach the server. Check your connection and try again.";

/** A 429/5xx is worth retrying; a 4xx is the caller's request to fix. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * The API's `{ error }` sentence, or `null` when the body isn't JSON (e.g. vite
 * dev serving `index.html`, or an HTML 5xx page). Reads the body as text once so
 * a non-JSON body can't throw.
 */
async function readServerMessage(res: Response): Promise<string | null> {
  let raw: string;
  try {
    raw = await res.text();
  } catch {
    return null;
  }
  if (raw.trim() === '') return null;
  try {
    const data = JSON.parse(raw) as { error?: unknown };
    if (typeof data.error === 'string' && data.error.trim() !== '') {
      return data.error;
    }
  } catch {
    // Not JSON — no usable sentence.
  }
  return null;
}

/** Turn a non-OK `Response` into an `ApiError`. Consumes the response body. */
export async function apiError(res: Response): Promise<ApiError> {
  const { status } = res;
  const retryable = isRetryable(status);

  // Rate limits get a fixed, actionable message — the raw upstream text is noise.
  if (status === 429) {
    return new ApiError(RATE_LIMIT_MESSAGE, status, retryable);
  }

  const serverMessage = await readServerMessage(res);
  const message =
    serverMessage ??
    (res.statusText
      ? `${res.statusText} (status ${status}).`
      : `The request failed (status ${status}).`);

  return new ApiError(message, status, retryable);
}

/** When `fetch` itself rejects (offline, DNS, CORS) there is no `Response`. */
export function networkError(): ApiError {
  return new ApiError(NETWORK_MESSAGE, 0, true);
}
