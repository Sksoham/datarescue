import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const core = stripTypeScriptTypes(await read('lib/rescue.ts'));
const ai = stripTypeScriptTypes((await read('lib/ai.ts')).replace(/^import .*?;\r?\n/, ''));
const html = (await read('web/index.html')).replace('/*APP_CSS*/', await read('web/style.css')).replace('/*APP_JS*/', core.replaceAll('export ', '') + '\n' + await read('web/app.js'));
const worker = core.replaceAll('export ', '') + '\n' + ai.replaceAll('export ', '') + '\nconst HTML = ' + JSON.stringify(html) + ';\n' + await read('web/server.js');
for (const p of ['worker', 'dist/server', 'dist/.openai', 'work']) await mkdir(new URL(p + '/', root), { recursive: true });
await writeFile(new URL('worker/index.js', root), worker);
await writeFile(new URL('dist/server/index.js', root), worker);
await writeFile(new URL('work/core.mjs', root), core);
await writeFile(new URL('work/ai.mjs', root), "import { FIELDS, validateMapping } from './core.mjs';\n" + ai);
let hosting = { d1: null, r2: null };
try { hosting = JSON.parse(await read('.openai/hosting.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await writeFile(new URL('dist/.openai/hosting.json', root), JSON.stringify(hosting, null, 2));
console.log('Built DataRescue: dependency-free Worker and browser application.');
