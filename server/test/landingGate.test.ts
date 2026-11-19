import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// The game's index.html starts with a tiny inline script that sends first-time visitors in a
// normal browser tab to the landing page. If it were wrong it could trap the installed app or
// bounce someone in a loop, so this runs the real script against fake browser state.

const html = readFileSync(path.join(__dirname, '../../client/index.html'), 'utf-8');
const GATE = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

function visit(opts: {
  search?: string;
  standalone?: boolean;
  iosStandalone?: boolean;
  tabStorage?: Record<string, string>;
  deviceStorage?: Record<string, string>;
  storageBroken?: boolean;
} = {}) {
  const tab = { ...(opts.tabStorage ?? {}) };
  const device = { ...(opts.deviceStorage ?? {}) };
  const store = (data: Record<string, string>) => ({
    getItem: (k: string) => { if (opts.storageBroken) throw new Error('blocked'); return k in data ? data[k] : null; },
    setItem: (k: string, v: string) => { if (opts.storageBroken) throw new Error('blocked'); data[k] = v; },
  });
  const redirects: string[] = [];
  vm.runInNewContext(GATE, {
    location: { search: opts.search ?? '', replace: (u: string) => redirects.push(u) },
    sessionStorage: store(tab),
    localStorage: store(device),
    window: {
      matchMedia: (q: string) => ({ matches: !!opts.standalone && q === '(display-mode: standalone)' }),
      navigator: { standalone: opts.iosStandalone },
    },
  });
  return { redirects, tab };
}

describe('landing page gate (client/index.html)', () => {
  it('is present and is the first script on the page', () => {
    assert.ok(GATE.includes("location.replace('/welcome.html')"));
    assert.ok(html.indexOf('<script>') < html.indexOf('type="module"'));
  });

  it('sends a first visit in a normal browser tab to the landing page', () => {
    assert.deepEqual(visit().redirects, ['/welcome.html']);
    assert.deepEqual(visit({ search: '?utm_source=chat' }).redirects, ['/welcome.html']);
  });

  it('lets links from the landing page straight into the game, and remembers that for reloads', () => {
    const first = visit({ search: '?play=host' });
    assert.deepEqual(first.redirects, []);
    assert.equal(first.tab['trivia-skip-landing'], '1');
    assert.deepEqual(visit({ search: '?play=join&code=sh2a' }).redirects, []);
    // the next load in the same tab (the address bar has been tidied) stays in the game
    assert.deepEqual(visit({ tabStorage: first.tab }).redirects, []);
  });

  it('never shows the landing page to the installed app', () => {
    assert.deepEqual(visit({ standalone: true }).redirects, []);
    assert.deepEqual(visit({ iosStandalone: true }).redirects, []);
  });

  it('never shows the landing page to someone who has a saved game', () => {
    assert.deepEqual(visit({ tabStorage: { 'trivia-session': '{}' } }).redirects, []);
    assert.deepEqual(visit({ deviceStorage: { 'trivia-session': '{}' } }).redirects, []);
  });

  it('falls through to the game if the browser blocks storage', () => {
    assert.deepEqual(visit({ storageBroken: true }).redirects, []);
    assert.deepEqual(visit({ storageBroken: true, search: '?play=host' }).redirects, []);
  });
});
