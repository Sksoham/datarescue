# Validation record

## Automated checks
Command: `node scripts/build-rescue.mjs` then `node --test tests/rescue.test.mjs`.

18 tests cover:

1. CSV text/identifier fidelity and round-trip serialization.
2. Malformed CSV and size/row-limit rejection.
3. Header aliases without modification of unknown columns.
4. Safe repairs preserve quantities, prices, row counts, and originals.
5. Duplicate/repeated-SKU review and reversible row removal.
6. Stale edit rejection.
7. Spreadsheet formula escaping.
8. Non-negative decimal validation.
9. Evidence-backed AI proposal validation.
10. AI mapping, duplicate-proposal, and evidence constraints.
11. HTTP HTML and unconfigured-key behavior.
12. Cross-origin inference rejection.
13. Explicitly mocked provider response through the API route.

The generated Worker is additionally imported and exercised by `scripts/validate-rescue.mjs`.

## Browser verification during development
The sample was exercised in a headless installed Edge browser at desktop and 390-pixel mobile widths. Checks covered the eight bulk repairs, undo, manual quantity correction, duplicate removal, before/after row counts, audit display, CSV download, finding search, no page-wide mobile overflow, and safe rendering of HTML-looking CSV values. No page JavaScript errors were reported. Screenshots are in `docs/images/`.

These are observed development checks, not a published reusable browser-test suite. Screenshots show the local deterministic workflow with AI setup pending.

## What this does not prove
No successful live Nebius request, NVIDIA model quality benchmark, measured time savings, production load test, or independent user study has been completed. The synthetic evaluation and its limitations are documented in EVALUATION.md.

## Handoff evaluation
Five additional tests cover whole duplicate groups, missing mappings, rehearsal conservation, active AI proposals, and empty exports. Eight synthetic fixtures (28 rows) and 100 generated formatting variants passed. One deliberately contextual typo remains undetected; this is recorded as a limitation, not counted as AI success.

Browser verification confirmed the rehearsal changes no data until approval, then yields 16 passing and 4 held sample rows. The JSON report includes the source fingerprint and export row maps.

