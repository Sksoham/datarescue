const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export default { async fetch(request, env = {}) {
  const url = new URL(request.url);
  const model = env.NEBIUS_MODEL || DEFAULT_MODEL;
  if (url.pathname === '/' && request.method === 'GET') return new Response(HTML, { headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' } });
  if (url.pathname !== '/api/review') return json({ error: 'Not found' }, 404);
  if (request.method === 'GET') return json({ configured: Boolean(env.NEBIUS_API_KEY), model, maxReviewedRows: 60 });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.NEBIUS_API_KEY) return json({ error: 'Set NEBIUS_API_KEY as a server secret to enable Nemotron. Local checks remain available.' }, 503);
  if (request.headers.get('origin') !== url.origin) return json({ error: 'Same-origin requests only.' }, 403);
  try {
    if (Number(request.headers.get('content-length') || 0) > MAX_BYTES * 2) return json({ error: 'Request too large' }, 413);
    // Enforce a streaming byte limit even when Content-Length is absent.
    const reader = request.body?.getReader(); if (!reader) throw new Error('A request body is required.');
    const chunks = []; let total = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_BYTES * 2) { await reader.cancel(); return json({ error: 'Request too large' }, 413); } chunks.push(value); }
    const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes)); if (typeof body.csv !== 'string') throw new Error('A CSV string is required.');
    const data = parseCSV(body.csv); const mapping = {};
    if (body.mapping && typeof body.mapping === 'object') for (const f of FIELDS) if (body.mapping[f] !== undefined) mapping[f] = body.mapping[f];
    if (!validateMapping(mapping, data.headers.length)) throw new Error('Invalid column mapping.');
    const base = env.NEBIUS_BASE_URL || DEFAULT_BASE_URL, endpoint = new URL(base);
    if (endpoint.protocol !== 'https:' || !(endpoint.hostname === 'api.tokenfactory.nebius.com' || /^api\.tokenfactory\.[a-z0-9-]+\.nebius\.com$/.test(endpoint.hostname))) throw new Error('Use an official Nebius Token Factory HTTPS endpoint.');
    const start = Date.now();
    const result = await fetch(base.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${env.NEBIUS_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: reviewPrompt(data, mapping), max_tokens: 3000, response_format: { type: 'json_object' } }), signal: AbortSignal.timeout(60000) });
    if (!result.ok) return json({ error: `Nebius returned HTTP ${result.status}. Check the key, credits, model access, and region.` }, 502);
    const output = await result.json(); const content = output.choices?.[0]?.message?.content;
    if (!content) return json({ error: 'Nemotron returned an empty response. Try again.' }, 502);
    let review; try { review = validateReview(JSON.parse(content), data, mapping); } catch { return json({ error: 'Nemotron returned an invalid review. No data was changed.' }, 502); }
    return json({ ...review, model, usage: output.usage, durationMs: Date.now() - start, reviewedRows: Math.min(60, data.rows.length), timestamp: new Date().toISOString() });
  } catch (e) { return json({ error: e?.name === 'TimeoutError' ? 'Nemotron timed out. Your data is unchanged.' : 'Review could not be completed. Check the CSV, mapping, and server configuration.' }, 400); }
} };
