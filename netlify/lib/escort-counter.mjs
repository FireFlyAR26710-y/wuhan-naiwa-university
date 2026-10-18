import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = '__Host-naiwa-escort';
const TARGET = 'https://www.whcp.edu.cn/';
const SINCE = '2026-10-14';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const noCache = { 'Cache-Control': 'private, no-store', 'Netlify-CDN-Cache-Control': 'no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {status, headers: {...noCache, 'Content-Type': 'application/json; charset=utf-8', ...extra}});
}

async function secretFor(store) {
  let secret = await store.get('private/signing-key');
  if (!secret) {
    await store.set('private/signing-key', randomBytes(32).toString('hex'), {onlyIfNew: true});
    secret = await store.get('private/signing-key');
  }
  if (!secret) throw new Error('Counter storage unavailable');
  return secret;
}

function signature(id, secret) {
  return createHmac('sha256', secret).update(id).digest('base64url');
}

function validVisitor(cookie, secret) {
  if (!cookie || cookie.length > 120) return null;
  const [id, proof, ...extra] = cookie.split('.');
  if (extra.length || !UUID.test(id || '') || !/^[A-Za-z0-9_-]{43}$/.test(proof || '')) return null;
  const actual = Buffer.from(proof);
  const expected = Buffer.from(signature(id, secret));
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}

function readCookie(request) {
  const cookies = request.headers.get('cookie') || '';
  return cookies.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE_NAME + '='))?.slice(COOKIE_NAME.length + 1);
}

export async function countDepartures(store) {
  let count = 0;
  for await (const page of store.list({prefix: 'departures/', paginate: true})) count += page.blobs.length;
  return count;
}

export function counterHandler(store, {historicalBase = 0, targetUrl = TARGET, since = SINCE} = {}) {
  if (!Number.isSafeInteger(historicalBase) || historicalBase < 0) throw new Error('Invalid historical baseline');
  return async function handle(request) {
    try {
      if (request.method !== 'GET' && request.method !== 'POST') return json({error: 'method_not_allowed'}, 405, {'Allow': 'GET, POST'});
      const origin = request.headers.get('origin');
      if (request.method === 'POST' && origin !== new URL(request.url).origin) return json({error: 'origin_not_allowed'}, 403);
      const secret = await secretFor(store);
      let visitor = validVisitor(readCookie(request), secret);
      if (request.method === 'GET') {
        const headers = {};
        if (!visitor) {
          visitor = randomUUID();
          headers['Set-Cookie'] = `${COOKIE_NAME}=${visitor}.${signature(visitor, secret)}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`;
        }
        return json({count: historicalBase + await countDepartures(store), since, metric: 'unique_browser_departures'}, 200, headers);
      }
      if (!visitor) return json({error: 'browser_identifier_missing'}, 401);
      if (Number(request.headers.get('content-length')) > 512) return json({error: 'request_too_large'}, 413);
      const body = await request.text();
      if (body.length > 512) return json({error: 'request_too_large'}, 413);
      let payload;
      try { payload = JSON.parse(body); } catch { return json({error: 'invalid_request'}, 400); }
      if (payload?.event !== 'depart' || payload?.target !== targetUrl) return json({error: 'invalid_request'}, 400);
      const key = createHash('sha256').update(visitor).digest('hex');
      const result = await store.set(`departures/${key}`, '1', {onlyIfNew: true});
      return json({recorded: Boolean(result.modified), metric: 'unique_browser_departures'});
    } catch {
      // No identifiers or storage credentials are logged or returned.
      return json({error: 'temporarily_unavailable'}, 503);
    }
  };
}
