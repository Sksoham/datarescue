export type Field = 'sku' | 'name' | 'quantity' | 'unit' | 'price' | 'category';
export const FIELDS: Field[] = ['sku', 'name', 'quantity', 'unit', 'price', 'category'];
export const LABELS: Record<Field, string> = { sku: 'SKU', name: 'Product name', quantity: 'Quantity', unit: 'Unit', price: 'Unit price', category: 'Category' };
export type Row = { id: number; cells: string[] };
export type Dataset = { headers: string[]; rows: Row[] };
export type Mapping = Partial<Record<Field, number>>;
export type Issue = { id: string; row: number; column: number; kind: string; severity: 'safe' | 'review' | 'error'; before: string; after: string | null; reason: string; source: 'rules' | 'nemotron'; deleteRow?: boolean };
export type Change = { id: string; row: number; column: number; before: string; after: string | null; reason: string; source: string; deleteRow?: boolean };
export const MAX_ROWS = 1000;
export const MAX_BYTES = 1024 * 1024;

// Strict RFC-style CSV parser: quoted commas/newlines, escaped quotes and CRLF.
export function parseCSV(input: string): Dataset {
  if (new TextEncoder().encode(input).length > MAX_BYTES) throw new Error('This version accepts CSV files up to 1 MB.');
  input = input.replace(/^\uFEFF/, '');
  if (!input.trim()) throw new Error('The CSV is empty.');
  const records: string[][] = []; let record: string[] = [], cell = '', quoted = false, closed = false;
  const pushCell = () => { record.push(cell); cell = ''; closed = false; };
  const pushRow = () => { pushCell(); if (record.some(v => v !== '')) records.push(record); record = []; if (records.length > MAX_ROWS + 1) throw new Error('Please use a CSV with at most 1,000 data rows.'); };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"') { if (input[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; continue; }
    if (c === ',') { pushCell(); continue; }
    if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; pushRow(); continue; }
    if (closed) throw new Error('Unexpected characters after a quoted field. Use comma-separated UTF-8 CSV.');
    if (c === '"') { if (cell.length) throw new Error('A quote inside a field must be escaped inside double quotes.'); quoted = true; } else cell += c;
  }
  if (quoted) throw new Error('An opening quote has no closing quote.');
  if (cell || record.length || closed) pushRow();
  const headers = records.shift();
  if (!headers || headers.length < 2) throw new Error('Use a comma-separated CSV with a header row and at least two columns.');
  if (headers.length > 30) throw new Error('This version supports up to 30 columns.');
  if (headers.some(h => !h.trim())) throw new Error('Every column needs a non-empty header.');
  if (new Set(headers.map(h => h.trim().toLowerCase())).size !== headers.length) throw new Error('Column headers must be unique.');
  if (!records.length) throw new Error('Add at least one data row below the header.');
  const rows = records.map((cells, i) => { if (cells.length !== headers.length) throw new Error(`Data row ${i + 1} has ${cells.length} fields; expected ${headers.length}.`); if (cells.some(c => c.length > 4000)) throw new Error('Individual cells must be at most 4,000 characters.'); return { id: i + 1, cells }; });
  return { headers, rows };
}

const aliases: Record<Field, string[]> = { sku: ['sku', 'productid', 'itemid', 'itemcode', 'productcode'], name: ['name', 'product', 'productname', 'item', 'itemname', 'description'], quantity: ['quantity', 'qty', 'stock', 'stocklevel', 'onhand', 'stockquantity'], unit: ['unit', 'units', 'uom', 'unitofmeasure'], price: ['price', 'unitprice', 'cost', 'unitcost'], category: ['category', 'department', 'productcategory'] };
export function inferMapping(headers: string[]): Mapping { const map: Mapping = {}; headers.forEach((h, i) => { const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, ''); const f = FIELDS.find(f => aliases[f].includes(normalized)); if (f && map[f] === undefined) map[f] = i; }); return map; }
export function validateMapping(mapping: Mapping, count: number) { const indexes = Object.values(mapping); return indexes.every(i => Number.isInteger(i) && i! >= 0 && i! < count) && new Set(indexes).size === indexes.length; }
const unitAliases: Record<string, string> = { pcs: 'pcs', pc: 'pcs', piece: 'pcs', pieces: 'pcs', ea: 'pcs', each: 'pcs', kg: 'kg', kilogram: 'kg', kilograms: 'kg', g: 'g', gram: 'g', grams: 'g', l: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L', ml: 'mL', milliliter: 'mL', milliliters: 'mL', millilitre: 'mL', millilitres: 'mL', box: 'box', boxes: 'box', pack: 'pack', packs: 'pack' };
export function validNumber(value: string) { return /^\d+(?:\.\d+)?$/.test(value.trim()) && Number.isFinite(Number(value)) && Number(value) <= Number.MAX_SAFE_INTEGER; }
export function scan(rows: Row[], mapping: Mapping): Issue[] {
  const issues: Issue[] = []; const skuSeen = new Map<string, number>(); const exactSeen = new Map<string, number>();
  const add = (r: Row, col: number, kind: string, severity: Issue['severity'], after: string | null, reason: string, deleteRow = false) => { const before = col >= 0 ? r.cells[col] : ''; issues.push({ id: `${r.id}:${col}:${kind}:${before}`, row: r.id, column: col, kind, severity, before, after, reason, source: 'rules', deleteRow }); };
  for (const row of rows) {
    const exact = JSON.stringify(row.cells); const prior = exactSeen.get(exact);
    if (prior !== undefined) add(row, -1, 'Exact duplicate', 'review', null, `Every cell matches data row ${prior}. Confirm these are not separate stock lots before removing.`, true);
    else exactSeen.set(exact, row.id);
    for (let c = 0; c < row.cells.length; c++) {
      const value = row.cells[c]; const trimmed = value.trim();
      if (value !== trimmed) add(row, c, 'Extra whitespace', 'safe', trimmed, 'Remove leading and trailing whitespace; preserve internal spaces.');
      if (/^[=+@\t\r]/.test(trimmed) || /^-\D/.test(trimmed)) add(row, c, 'Spreadsheet formula', 'error', null, 'This cell may execute as a formula in spreadsheet software. Export escapes formula-like text.');
    }
    for (const f of FIELDS) {
      const c = mapping[f]; if (c === undefined) continue; const value = row.cells[c].trim();
      if (!value) { if (['sku', 'name', 'quantity', 'unit', 'price'].includes(f)) add(row, c, 'Missing value', 'error', null, `${LABELS[f]} is missing. Enter a verified value; DataRescue will not invent one.`); continue; }
      if (f === 'sku') { const prev = skuSeen.get(value); if (prev !== undefined && prior === undefined) add(row, c, 'Repeated SKU', 'review', null, `SKU also appears in data row ${prev}. Verify whether these are different lots or conflicting records.`); else skuSeen.set(value, row.id); }
      if (f === 'quantity' || f === 'price') {
        if (!validNumber(value)) add(row, c, 'Invalid number', 'error', null, `${LABELS[f]} must be a non-negative decimal using a dot. Currency symbols, thousands separators, negatives and unknown text require verification.`);
      }
      if (f === 'unit') { const canonical = unitAliases[value.toLowerCase()]; if (canonical && canonical !== row.cells[c]) add(row, c, 'Unit spelling', 'safe', canonical, 'Standardize the unit label only. Quantity and physical scale stay unchanged.'); else if (!canonical) add(row, c, 'Unrecognized unit', 'review', null, 'Verify this unit. Supported labels: pcs, kg, g, L, mL, box, pack. No unit conversions are inferred.'); }
    }
  }
  // A cell gets one automatic transformation at a time, so approval cannot overwrite another repair.
  return issues.filter(i => !(i.kind === 'Extra whitespace' && issues.some(j => j.row === i.row && j.column === i.column && j.kind === 'Unit spelling')));
}

export function applyChanges(rows: Row[], changes: Change[]): Row[] { let result = rows.map(r => ({ id: r.id, cells: [...r.cells] })); for (const c of changes) { const r = result.find(r => r.id === c.row); if (!r) continue; if (c.deleteRow) result = result.filter(r => r.id !== c.row); else { if (r.cells[c.column] !== c.before) throw new Error('A repair is stale. Re-run the review.'); r.cells[c.column] = c.after ?? ''; } } return result; }
export function csvText(headers: string[], rows: Row[], escapeFormulas = true): string { const quote = (v: string) => { if (escapeFormulas && /^[\s]*[=+\-@\t\r]/.test(v) && !/^-?\d+(?:\.\d+)?$/.test(v.trim())) v = "'" + v; return '"' + v.replaceAll('"', '""') + '"'; }; return '\uFEFF' + [headers, ...rows.map(r => r.cells)].map(r => r.map(quote).join(',')).join('\r\n'); }
export function quality(rows: Row[], issues: Issue[]) { if (!rows.length) return 0; const bad = new Set(issues.map(i => i.row)).size; return Math.round(100 * (rows.length - bad) / rows.length); }

// A handoff gate is stricter than a per-row quality score: a duplicate group is
// unresolved as a whole. No member should silently enter a partial delivery.
export function handoffReport(data: Dataset, mapping: Mapping, changes: Change[] = [], extraIssues: Issue[] = []) {
  if (!validateMapping(mapping, data.headers.length)) throw new Error('Confirm a valid column mapping before preparing a handoff.');
  const rows = applyChanges(data.rows, changes);
  const missingFields = FIELDS.filter(f => f !== 'category' && mapping[f] === undefined);
  const issues = [...scan(rows, mapping), ...extraIssues.filter(i => rows.find(r => r.id === i.row)?.cells[i.column] === i.before)];
  const reasons = new Map<number, Set<string>>(rows.map(r => [r.id, new Set<string>()]));
  for (const row of rows) if (missingFields.length) reasons.get(row.id)!.add('Required columns not mapped: ' + missingFields.map(f => LABELS[f]).join(', '));
  for (const issue of issues) reasons.get(issue.row)?.add(issue.kind + ': ' + issue.reason);
  const duplicateGroups: { kind: string; rows: number[] }[] = [];
  for (const kind of ['Identical record', 'Repeated SKU']) {
    if (kind === 'Repeated SKU' && mapping.sku === undefined) continue;
    const groups = new Map<string, number[]>();
    for (const row of rows) {
      const key = kind === 'Identical record' ? JSON.stringify(row.cells) : row.cells[mapping.sku!].trim();
      if (!key) continue;
      groups.set(key, [...(groups.get(key) || []), row.id]);
    }
    for (const ids of groups.values()) if (ids.length > 1) {
      duplicateGroups.push({ kind, rows: ids });
      for (const id of ids) reasons.get(id)!.add(kind + ' group (rows ' + ids.join(', ') + '): verify all members before handoff; separate stock lots may be legitimate.');
    }
  }
  const held = rows.filter(r => reasons.get(r.id)!.size).map(r => ({ row: r.id, reasons: [...reasons.get(r.id)!] }));
  const eligibleIds = rows.filter(r => !reasons.get(r.id)!.size).map(r => r.id);
  const currentIds = new Set(rows.map(r => r.id));
  const removedIds = data.rows.filter(r => !currentIds.has(r.id)).map(r => r.id);
  const materialChanges: { row: number; field: string; before: string; after: string }[] = [];
  for (const row of rows) {
    const original = data.rows.find(r => r.id === row.id)!;
    for (const field of ['sku', 'quantity', 'price'] as Field[]) {
      const col = mapping[field];
      if (col !== undefined && original.cells[col].trim() !== row.cells[col].trim()) materialChanges.push({ row: row.id, field: LABELS[field], before: original.cells[col], after: row.cells[col] });
    }
  }
  return { version: 1, scope: 'Mapped inventory rules plus active AI proposals; not a factual accuracy certificate.', status: !rows.length ? 'empty' : held.length ? 'verification-needed' : 'checks-passed', originalCount: data.rows.length, currentCount: rows.length, eligibleIds, held, removedIds, missingFields, duplicateGroups, materialChanges, activeRepairCount: changes.length };
}

export const SAMPLE = `SKU,Product name,Quantity,Unit,Unit price,Category
DR-1001,Canvas tote,24,pieces,18.50,Accessories
DR-1002, Ceramic mug ,36,PCS,12.00,Home
DR-1003,Desk lamp,12,pcs,45.00,Electronics
DR-1004,USB-C cable,50,pcs,9.50,Electroncis
DR-1005,Coffee beans,8,kilograms,24.00,Pantry
DR-1006,Notebook,72,pcs,6.00,Stationery
DR-1007,Water bottle,-4,pcs,22.00,Accessories
DR-1008,Hand soap,18,liters,8.00,Home
DR-1009,Storage basket,16,pcs,,Home
DR-1010,Wireless mouse,10,pcs,29.00,Electronics
DR-1010,Wireless mouse,10,pcs,29.00,Electronics
DR-1011,Desk mat,20,pcs,15.00,Accessories
DR-1012,Pen set,32,packs,7.00,Stationery
DR-1013,Green tea,15,box,11.50,Pantry
DR-1014,Cotton towel, 40 ,pcs,14.00,Home
DR-1015,Screen cleaner,24,milliliters,5.50,Electronics
DR-1016,Phone stand,18,pcs,16.00,Electronics
DR-1017,Scented candle,12,pcs,19.00,Home
DR-1018,Travel pouch,28,pcs,13.00,Accessories
DR-1019,Paper clips,60,box,3.50,Stationery`;
