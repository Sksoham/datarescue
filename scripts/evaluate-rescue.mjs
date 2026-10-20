import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parseCSV, inferMapping, scan, applyChanges, csvText, handoffReport } from '../work/core.mjs';
const root = new URL('../', import.meta.url);
const cases = JSON.parse(await readFile(new URL('evaluation/cases.json', root), 'utf8'));
const results = [];
let rowCount = 0, proposed = 0, correct = 0, expected = 0, heldCount = 0;
for (const fixture of cases) {
  const data = parseCSV(await readFile(new URL('evaluation/fixtures/' + fixture.file, root), 'utf8'));
  const original = structuredClone(data), mapping = inferMapping(data.headers);
  const safe = scan(data.rows, mapping).filter(i => i.severity === 'safe');
  const key = c => JSON.stringify([c.row, c.column, c.after]);
  const gold = new Set(fixture.repairs.map(key));
  const repaired = applyChanges(data.rows, safe);
  const report = handoffReport(data, mapping, safe);
  const actual = new Set(safe.map(key));
  proposed += safe.length; expected += gold.size;
  correct += safe.filter(c => gold.has(key(c))).length;
  assert.deepEqual([...actual].sort(), [...gold].sort(), fixture.file + ': repair proposals differ from golden labels');
  assert.deepEqual(report.held.map(r => r.row), fixture.held, fixture.file + ': incorrect handoff hold set');
  assert.equal(report.eligibleIds.length + report.held.length + report.removedIds.length, data.rows.length, fixture.file + ': missing row');
  assert.equal(report.removedIds.length, 0, fixture.file + ': automatic row deletion');
  assert.equal(report.materialChanges.length, 0, fixture.file + ': automatic business-value change');
  assert.deepEqual(data, original, fixture.file + ': original mutated');
  for (const row of repaired) for (let c = 0; c < row.cells.length; c++) {
    const labeled = fixture.repairs.find(g => g.row === row.id && g.column === c);
    assert.equal(row.cells[c], labeled ? labeled.after : original.rows[row.id - 1].cells[c], fixture.file + ': unlabelled cell changed');
  }
  for (const ids of [report.eligibleIds, report.held.map(r => r.row)]) {
    const subset = repaired.filter(r => ids.includes(r.id));
    if (!subset.length) continue;
    const roundTrip = parseCSV(csvText(data.headers, subset));
    assert.equal(roundTrip.rows.length, subset.length);
    for (const row of roundTrip.rows) for (const cell of row.cells) assert.ok(!/^[\s]*[=+@]/.test(cell), 'Formula-like text must be escaped');
  }
  rowCount += data.rows.length; heldCount += report.held.length;
  results.push({ fixture: fixture.file, rows: data.rows.length, safeRepairs: safe.length, passingRows: report.eligibleIds.length, heldRows: report.held.length, missingMapping: report.missingFields, knownContextualErrorsOutsideRules: fixture.contextualErrors || 0, passed: true });
}
// Reproducible generated variations exercise invariants beyond the fixed files.
let generatedVariations = 0;
for (let n = 1; n <= 100; n++) {
  const data = parseCSV(`SKU,Name,Quantity,Unit,Price,Notes\n00${n}, Item ${n} , ${n} ,${n % 2 ? 'pieces' : 'grams'},1.25,unchanged-${n}`);
  const mapping = inferMapping(data.headers), before = structuredClone(data);
  const safe = scan(data.rows, mapping).filter(i => i.severity === 'safe');
  const repaired = applyChanges(data.rows, safe), report = handoffReport(data, mapping, safe);
  assert.equal(report.eligibleIds.length, 1);
  assert.equal(report.materialChanges.length, 0);
  assert.equal(repaired[0].cells[0], `00${n}`);
  assert.equal(repaired[0].cells[2], String(n));
  assert.equal(repaired[0].cells[5], `unchanged-${n}`);
  assert.deepEqual(data, before);
  assert.deepEqual(applyChanges(data.rows, []), before.rows);
  generatedVariations++;
}
const output = { evaluationVersion: 1, provenance: 'Developer-authored synthetic fixtures introduced after the original demo. Golden expectations written before the first evaluation run. Not a blinded, independent, or real-customer benchmark.', liveModelEvaluated: false, fixedDatasets: cases.length, fixedRows: rowCount, exactSafeRepairs: { proposed, matchingGold: correct, expected }, heldRowsAfterSafeRepairs: heldCount, generatedInvariantVariations: generatedVariations, knownContextualErrorsNotDetectedByRules: results.reduce((n,r) => n+r.knownContextualErrorsOutsideRules, 0), limitations: ['Small synthetic corpus; perfect agreement here does not establish general accuracy.', 'No live Nemotron accuracy, latency, cost, or user time savings measured.', 'A category typo intentionally passes mapped rules; human verification remains necessary.', 'Generated variants are related cases, not 100 independent datasets.'], cases: results };
await writeFile(new URL('evaluation/results.json', root), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
