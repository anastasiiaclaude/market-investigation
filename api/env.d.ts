// Minimal ambient declaration for the only Node global the functions read:
// `process.env` (Vercel injects environment variables there). Avoids pulling in
// `@types/node` — `api/` has no node_modules of its own and stays dependency-free
// (web-standard handlers, per ADR 003). The Vercel runtime provides the real
// `process` at execution time.
declare const process: {
  env: Record<string, string | undefined>;
};
