# DataRescue architecture

## Runtime

A dependency-free HTML/CSS/JavaScript client runs the deterministic CSV checks. The server is a standard Fetch API Worker (`worker/index.js`) with a small Node HTTP adapter for local use. Node 24's built-in TypeScript stripping builds the shared engine without installing packages.

`lib/rescue.ts` → parser, mapping, findings, immutable repairs, CSV serialization.

`lib/ai.ts` → Nemotron prompt and evidence validation.

`web/app.js` → UI, in-memory session, approval/undo, audit and download.

`web/server.js` → configuration status and server-side Nebius inference.

`scripts/build-rescue.mjs` → generates a self-contained Worker and deployable `dist/` artifact; `worker/index.js` is generated, not hand-edited.

## Review pipeline

1. Parse CSV into stable row IDs and string cells. Never coerce identifiers to numbers.
2. Infer common headers; let the user correct mappings before any repair.
3. Scan deterministic rules. Normalize unit spellings without changing quantities or converting scales.
4. With explicit consent, send original headers and at most 60 rows to Nemotron through the backend. All rows reach the same-origin backend; only the bounded sample reaches Nebius.
5. Validate output shape, allowed columns, row IDs, nonempty values, unique proposals, and evidence. Model suggestions can only affect name/category/unit and must match another sampled row's value. AI cannot invent quantities, prices, identifiers, or missing values; it cannot delete rows.
6. Show proposals for human approval. Evidence is a review aid, not proof of factual correctness.
7. Apply immutable changes to a copy. Re-scan after every change. Undo removes the last active repair and appends an audit event.
8. Export a reviewed CSV plus a separate JSON audit that retains exact originals, decisions, AI provenance, and unresolved findings.

## Boundaries

- No persistent server database; session data is in tab memory and lost on refresh. Audit JSON is a retention artifact, not an importable session backup in v0.1.
- Limits: 1 MB UTF-8 CSV, 1,000 data rows, 30 columns, 4,000 characters per cell.
- AI reviews the original upload, not the changed copy. Stale proposals are filtered after edits.
- Secret stays on the server. Local `.dev.vars` is ignored by Git. Hosted values are deployment secrets.
- Server rejects cross-origin inference, limits request bytes while reading, restricts the provider URL to official Nebius HTTPS hosts, and times out inference at 60 seconds.
- User text is escaped in the UI. CSV exports escape formula-like text; audit retains originals.
- Hosted preview uses Sites' owner-private access boundary. Before making it public with a shared paid API key, add durable per-user quotas/rate limiting and a deliberate access policy. Private preview is not yet a public judging URL.
- The quality metric is the percentage of current rows without active findings under mapped columns. It is not factual accuracy or a benchmark score.

## Development note

The implementation requires no third-party runtime packages. Node 24 builds the client and Worker directly from the source files.
