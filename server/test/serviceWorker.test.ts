import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Runs client/public/sw.js in a sandbox with a fake cache and fake network, so its behaviour
// is checked without a browser. The worker must never get in the way of the live game traffic.

const SW_SOURCE = readFileSync(path.join(__dirname, '../../client/public/sw.js'), 'utf-8');
const ORIGIN = 'https://trivia.example';
const tick = () => new Promise((r) => setTimeout(r, 0));
const href = (u: any) => new URL(typeof u === 'string' ? u : u.url, ORIGIN).href;

function loadWorker(network: (req: any) => Promise<Response> | Response = () => new Response('net')) {
  const handlers: Record<string, (e: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const state = { skipped: false, claimed: false, fetchCalls: [] as string[] };

  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const m = stores.get(name)!;
      return {
        addAll: async (urls: string[]) => { for (const u of urls) m.set(href(u), new Response(`cached ${u}`)); },
        put: async (req: any, res: Response) => { m.set(href(req), res); },
        keys: async () => [...m.keys()].map((url) => ({ url })),
        delete: async (req: any) => m.delete(href(req)),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (req: any) => {
      for (const m of stores.values()) if (m.has(href(req))) return m.get(href(req))!.clone();
      return undefined;
    },
  };

  const self = {
    addEventListener: (type: string, fn: (e: any) => void) => { handlers[type] = fn; },
    location: { origin: ORIGIN },
    skipWaiting: async () => { state.skipped = true; },
    clients: { claim: async () => { state.claimed = true; } },
  };
  const fetch = async (req: any) => { state.fetchCalls.push(href(req)); return network(req); };

  vm.runInNewContext(SW_SOURCE, { self, caches, fetch, Response, URL, Promise, console });

  async function lifecycle(type: 'install' | 'activate') {
    const waits: Promise<unknown>[] = [];
    handlers[type]({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  }

  // Returns the Response the worker answered with, or null if it left the request to the browser.
  async function request(url: string, init: { method?: string; mode?: string } = {}) {
    let answer: Promise<Response> | null = null;
    handlers.fetch({
      request: { method: init.method ?? 'GET', mode: init.mode ?? 'no-cors', url: new URL(url, ORIGIN).href },
      respondWith: (p: Promise<Response>) => { answer = p; },
    });
    const res = answer ? await answer : null;
    await tick(); // let background cache writes finish
    return res;
  }

  return { stores, state, caches, lifecycle, request };
}

describe('service worker (client/public/sw.js)', () => {
  it('precaches the app shell on install and takes over straight away', async () => {
    const w = loadWorker();
    await w.lifecycle('install');
    const shell = [...w.stores.get('trivia-shell-v1')!.keys()].map((u) => new URL(u).pathname);
    assert.deepEqual(shell.sort(), ['/', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest']);
    assert.equal(w.state.skipped, true);
  });

  it('removes caches from older versions when it activates', async () => {
    const w = loadWorker();
    await w.caches.open('trivia-shell-v0');
    await w.caches.open('some-other-cache');
    await w.caches.open('trivia-shell-v1');
    await w.caches.open('trivia-assets-v1');
    await w.lifecycle('activate');
    assert.deepEqual([...w.stores.keys()].sort(), ['trivia-assets-v1', 'trivia-shell-v1']);
    assert.equal(w.state.claimed, true);
  });

  it('never touches live game traffic, writes, or other sites', async () => {
    const w = loadWorker();
    assert.equal(await w.request('/socket.io/?EIO=4&transport=polling'), null);
    assert.equal(await w.request('/socket.io/', { method: 'POST' }), null);
    assert.equal(await w.request('/api/rounds'), null);
    assert.equal(await w.request('/api/rounds/round1', { mode: 'cors' }), null);
    assert.equal(await w.request('/api/rounds/round1/toggle', { method: 'PATCH' }), null);
    assert.equal(await w.request('https://fonts.googleapis.com/css2?family=Nunito'), null);
    assert.equal(await w.request('/icons/icon-192.png'), null); // everything else: default browser behaviour
    assert.deepEqual(w.state.fetchCalls, []);
  });

  it('loads pages from the network first and keeps a copy of the shell', async () => {
    const w = loadWorker(() => new Response('fresh page'));
    const res = await w.request('/', { mode: 'navigate' });
    assert.equal(await res!.text(), 'fresh page');
    const saved = await w.caches.match('/');
    assert.equal(await saved!.text(), 'fresh page');
  });

  it('shows the saved shell when the network is down, or the server is erroring', async () => {
    let up = true;
    const w = loadWorker(() => { if (!up) throw new TypeError('offline'); return new Response('v1 page'); });
    await w.request('/', { mode: 'navigate' }); // visit once while online
    up = false;
    assert.equal(await (await w.request('/', { mode: 'navigate' }))!.text(), 'v1 page');
    assert.equal(await (await w.request('/some/deep/link', { mode: 'navigate' }))!.text(), 'v1 page');

    const erroring = loadWorker(() => new Response('bad gateway', { status: 502 }));
    await erroring.caches.open('trivia-shell-v1').then((c) => c.put('/', new Response('saved shell')));
    assert.equal(await (await erroring.request('/', { mode: 'navigate' }))!.text(), 'saved shell');
  });

  it('does not invent a page it never saved', async () => {
    const offline = loadWorker(() => { throw new TypeError('offline'); });
    assert.equal((await offline.request('/', { mode: 'navigate' }))!.type, 'error');

    const erroring = loadWorker(() => new Response('bad gateway', { status: 502 }));
    const res = await erroring.request('/', { mode: 'navigate' });
    assert.equal(res!.status, 502); // nothing saved, so the real error comes through
  });

  it('does not save error pages over a good shell', async () => {
    let status = 200;
    const w = loadWorker(() => new Response(status === 200 ? 'good' : 'broken', { status }));
    await w.request('/', { mode: 'navigate' });
    status = 500;
    await w.request('/', { mode: 'navigate' });
    assert.equal(await (await w.caches.match('/'))!.text(), 'good');
  });

  it('serves hashed build files from the cache after the first load', async () => {
    const w = loadWorker(() => new Response('console.log(1)'));
    await w.request('/assets/index-abc123.js');
    assert.equal(w.state.fetchCalls.length, 1);
    const again = await w.request('/assets/index-abc123.js');
    assert.equal(await again!.text(), 'console.log(1)');
    assert.equal(w.state.fetchCalls.length, 1); // answered from the cache, no second download
  });

  it('keeps only the newest 30 build files', async () => {
    const w = loadWorker(() => new Response('x'));
    for (let i = 0; i < 35; i++) await w.request(`/assets/chunk-${i}.js`);
    const kept = [...w.stores.get('trivia-assets-v1')!.keys()].map((u) => new URL(u).pathname);
    assert.equal(kept.length, 30);
    assert.ok(!kept.includes('/assets/chunk-0.js'));
    assert.ok(kept.includes('/assets/chunk-34.js'));
  });
});
