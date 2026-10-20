# Handoff gate and unfamiliar-data evaluation

## What is different

DataRescue separates a cleanup score from a handoff decision. The new gate rehearses safe repairs without applying them and shows which rows still need verification. Every member of a repeated-SKU or exact-duplicate group stays on hold, including the first occurrence. This avoids handing off half a conflicting group. Legitimate stock lots remain held until the user resolves them against their source; the app does not assume they should be merged or deleted.

The current working dataset can be downloaded as passing-checks and on-hold CSVs. Nothing is silently discarded. A separate JSON report accounts for original, passing, held, and explicitly removed rows; flags edits to identifiers, quantities, and prices beyond whitespace; and maps each exported data row back to its source row ID. The report fingerprints the parsed original dataset with SHA-256. That is an integrity reference, not a signature, a raw-file hash, or proof that the data is correct. Keep the existing audit JSON for the full original values and decision history.

Missing required mappings hold every row. Kept-original findings and active AI proposals remain unresolved. A passing row means no supported checks or active proposals flag it; it does not mean verified business truth. Category correctness and errors outside mapped fields are not certified. No currency totals or physical-unit conversions are inferred.

## Reproduce

Use Node.js 24 or newer from the repository root:

```sh
node scripts/build-rescue.mjs
node --test tests/rescue.test.mjs
node scripts/evaluate-rescue.mjs
node scripts/validate-rescue.mjs
```

The evaluator reads CSVs under `evaluation/fixtures/` and the golden labels in `evaluation/cases.json`, then writes `evaluation/results.json`. Assertions fail the command if proposals, held rows, source preservation, row accounting, or export protection differ from the expected results. GitHub Actions runs the same evaluation.

## Results — 20 October 2026

These are developer-authored synthetic cases introduced after the original sample app. Expected outcomes were written before the first evaluator run. They are unfamiliar to the original demo, but **not a blinded, independent, or real-customer benchmark**. The same developer wrote the feature and test cases.

| Dataset | Rows | Exact safe repairs | Held after safe repairs |
| --- | ---: | ---: | ---: |
| Hardware supplier / leading-zero IDs | 3 | 4 | 0 |
| Clinic inventory / separate stock lots | 4 | 0 | 3 |
| Cafe / ambiguous numeric formats | 5 | 1 | 4 |
| Clean multilingual CSV | 4 | 0 | 0 |
| Warehouse / duplicates and mixed scales | 5 | 0 | 4 |
| Untrusted supplier notes | 3 | 0 | 2 |
| Unknown schema | 2 | 0 | 2 |
| Contextual blind spot | 2 | 0 | 0 |

- 8 datasets, 28 rows. All 5 proposed safe repairs exactly matched the 5 labeled repairs.
- All 8 expected hold sets matched; 15 rows remained on hold after safe repairs.
- No original mutations, automatic row deletions, or unlabelled cell edits in these cases.
- 100 reproducible generated whitespace/unit variations passed conservation and identifier-preservation assertions. These are related variations, not 100 independent datasets.
- 18 automated regression tests passed, including whole-group holding, undo, empty handoffs, and unmapped-column blocking.

## A deliberately visible failure

`contextual-blindspot.csv` contains `Electroncis` instead of `Electronics`. Both rows pass the deterministic gate: the category typo remains undetected. This is a known limitation, not a successful correction. The report warns about contextual coverage, and this case is a useful target for later live Nemotron evaluation.

Do not describe these results as “100% accurate.” Five repairs and a small authored corpus cannot establish general performance. The supplier-note case tests rule behavior and export escaping; it does not establish live model resistance to prompt injection.

## Next evidence to collect

Real Nebius access is still required. On a separately labeled set, measure Nemotron proposal precision, missed errors, rejected unsupported suggestions, and abstentions. Record actual latency and token usage. Ask an inventory user to complete the same task manually and with DataRescue; measure time and remaining errors. Do not claim these outcomes until observed.
