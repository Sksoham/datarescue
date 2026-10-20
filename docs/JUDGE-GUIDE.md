# Judge testing guide

## Current status
The local application works without credentials. Live AI review requires an active Nebius Token Factory account, an API key, and access to the configured NVIDIA model. Live inference has not yet been verified by the team. The owner-private preview cannot be used as a public judging link.

## Launch
Use Node.js 24+. From the repository directory:

```sh
node scripts/build-rescue.mjs
node scripts/serve-rescue.mjs
```

Open http://localhost:5173. No package installation is required. The data is synthetic and contains no customer records.

## Deterministic walkthrough
1. Confirm the sample has 20 rows and six columns. Its initial queue has 11 findings: eight formatting repairs and three findings needing review. The initial passing-row metric is 50%.
2. Open Review column mapping. Confirm SKU, product name, quantity, unit, price and category.
3. Approve the eight safe repairs. Three findings remain; the passing-row metric becomes 85%. Check that `kilograms` became `kg` while its quantity stayed `8`.
4. Inspect the negative quantity on row 7. It is never automatically changed. For this synthetic walkthrough only, assume a source stocktake confirms `4`, then enter that value. This is user input, not a model prediction.
5. Inspect duplicate row 11. If it represents an accidental repeat rather than another lot, remove it. The working dataset has 19 rows; original data still has 20.
6. Leave the missing price unresolved. Export explicitly warns that unresolved values remain.
7. Use Undo last repair and confirm the deleted row is restored. Audit trail retains both actions.
8. Export the CSV and JSON audit. Check original values, active changes, and unresolved findings.

## AI walkthrough (requires live access)
1. Configure `.dev.vars` using the README and restart the server.
2. Load the sample again to begin a clean session.
3. Consent to sending the original headers and first 60 rows, then select Run AI review.
4. Confirm a real review-completed event appears in Audit trail. Inspect the reported model, duration and usage if returned.
5. The misspelled `Electroncis` category is a candidate for correction using `Electronics` from another row. Model output is variable; do not treat this suggestion as guaranteed.
6. Review before approving. Verify that the source value and explanation are visible, and that quantities and prices were not guessed.
7. If a provider error occurs, it is displayed. No simulated response should be represented as a live result.

## Known boundaries
Mapping is locked after applying repairs. Refresh clears the session; export first. The audit is downloadable but not importable. The passing-row metric measures current checks, not truth. AI review is bounded to 60 original rows.

## Rehearse the handoff
Click Rehearse handoff before applying repairs: 9 of 20 sample rows pass, with 16 projected after eight safe repairs. Apply them and reopen the report. Export 16 passing rows and 4 held rows separately. Both members of the duplicate group remain held; this stricter group rule explains why the handoff count differs from the per-row finding score. Download the JSON report for source-row lineage, conservation and AI coverage. See EVALUATION.md for unfamiliar synthetic datasets, reproducible results and a deliberate contextual blind spot.

