import test from 'node:test';
import assert from 'node:assert/strict';
import {counterHandler, COOKIE_NAME, countDepartures} from '../netlify/lib/escort-counter.mjs';

class MemoryStore {
  entries = new Map();
  async get(key) { return this.entries.get(key) ?? null; }
  async set(key, value, options = {}) {
    if (options.onlyIfNew && this.entries.has(key)) return {modified: false};
    this.entries.set(key, value); return {modified: true};
  }
  async *list({prefix}) {
    const keys = [...this.entries.keys()].filter(key => key.startsWith(prefix));
    for(let i = 0; i < keys.length; i += 2) yield {blobs: keys.slice(i, i + 2).map(key => ({key}))};
  }
}
const URL = 'https://example.netlify.app/api/escort-count';
const depart = cookie => new Request(URL, {method: 'POST', headers: {origin: 'https://example.netlify.app', cookie, 'content-type': 'application/json'}, body: JSON.stringify({event: 'depart', target: 'https://www.whcp.edu.cn/'})});
async function identify(handler) {
  const response = await handler(new Request(URL));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Secure; HttpOnly; SameSite=Lax/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  return response.headers.get('set-cookie').split(';')[0];
}

test('page views, preview and repeated GET do not count departures', async () => {
  const store = new MemoryStore(), handle = counterHandler(store), cookie = await identify(handle);
  for(let i=0;i<3;i++) assert.equal((await (await handle(new Request(URL, {headers: {cookie}}))).json()).count, 0);
});
test('concurrent departure events from one browser produce exactly one record', async () => {
  const store = new MemoryStore(), handle = counterHandler(store), cookie = await identify(handle);
  const results = await Promise.all(Array.from({length: 12}, () => handle(depart(cookie)).then(r => r.json())));
  assert.equal(results.filter(r => r.recorded).length, 1);
  assert.equal(await countDepartures(store), 1);
  assert.equal((await (await handle(depart(cookie))).json()).recorded, false);
});
test('different browsers count separately and all listing pages are included', async () => {
  const store = new MemoryStore(), handle = counterHandler(store);
  const cookies = await Promise.all(Array.from({length: 7}, () => identify(handle)));
  await Promise.all(cookies.map(cookie => handle(depart(cookie))));
  assert.equal(await countDepartures(store), 7);
});
test('forged identifiers, foreign-origin posts and wrong events are rejected', async () => {
  const store = new MemoryStore(), handle = counterHandler(store), cookie = await identify(handle);
  const forged = `${COOKIE_NAME}=00000000-0000-4000-8000-000000000000.${'a'.repeat(43)}`;
  assert.equal((await handle(depart(forged))).status, 401);
  assert.equal((await handle(new Request(URL, {method: 'POST',headers:{origin:'https://foreign.example',cookie},body:'{}'}))).status,403);
  assert.equal((await handle(new Request(URL, {method:'POST',headers:{origin:'https://example.netlify.app',cookie},body:'{}'}))).status,400);
  assert.equal(await countDepartures(store),0);
});
test('count survives constructing a new handler and does not expose identifiers', async () => {
  const store = new MemoryStore(), handle = counterHandler(store), cookie = await identify(handle);
  await handle(depart(cookie));
  const response = await counterHandler(store)(new Request(URL,{headers:{cookie}}));
  const data = await response.json();
  assert.equal(data.count,1);assert.deepEqual(Object.keys(data).sort(),['count','metric','since']);
  assert.equal(response.headers.get('set-cookie'),null);
});
test('storage failure returns unavailable instead of inventing a count', async () => {
  const store={async get(){throw new Error('storage secret must not leak')}};
  const response=await counterHandler(store)(new Request(URL));
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'temporarily_unavailable'});
});

test('historical baseline is included while live departures keep deduplicating', async () => {
  const store = new MemoryStore(), handle = counterHandler(store, {historicalBase: 500});
  for (let i = 0; i < 5; i++) await handle(depart(await identify(handle)));
  assert.equal((await (await handle(new Request(URL))).json()).count, 505);
  const cookie = await identify(handle);
  await handle(depart(cookie));
  await handle(depart(cookie));
  assert.equal((await (await handle(new Request(URL))).json()).count, 506);
  assert.equal(await countDepartures(store), 6);
  assert.equal((await (await counterHandler(store, {historicalBase: 500})(new Request(URL))).json()).count, 506);
});
