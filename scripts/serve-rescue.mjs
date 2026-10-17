import http from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if (existsSync('.dev.vars')) process.loadEnvFile('.dev.vars');
const worker = (await import(pathToFileURL(resolve('worker/index.js')))).default;
const port = Number(process.env.PORT || 5173);
http.createServer(async (req, res) => {
  try {
    const parts = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) { res.writeHead(413); res.end('Request too large'); return; } parts.push(chunk); }
    const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(parts) } : {}) });
    const response = await worker.fetch(request, process.env);
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end('The request could not be processed.'); }
}).listen(port, '127.0.0.1', () => console.log(`DataRescue ready: http://localhost:${port}`));
