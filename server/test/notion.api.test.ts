import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer, type RunningServer } from './helpers/server';
import { rounds as builtIn } from '../src/data/questions';

const PASSWORD = 'open sesame';
const TOKEN = 'test-token';
const ROUNDS_DB = '11111111-1111-1111-1111-111111111111';
const QUESTIONS_DB = '22222222-2222-2222-2222-222222222222';
const key = (id: string) => id.replace(/-/g, '');

// ── A small pretend Notion: two databases, paging, and the few calls the game makes ──
function fakeNotion() {
  const dbs: Record<string, any[]> = { [key(ROUNDS_DB)]: [], [key(QUESTIONS_DB)]: [] };
  const state = { down: false, failCreatesAfter: Infinity, creates: 0, calls: [] as string[] };

  // Turns the write format ({ text: { content } }) into what a read returns ({ plain_text }).
  const toRead = (props: Record<string, any>) => Object.fromEntries(Object.entries(props).map(([k, v]) => {
    if (v.title) return [k, { title: v.title.map((t: any) => ({ plain_text: t.text.content })) }];
    if (v.rich_text) return [k, { rich_text: v.rich_text.map((t: any) => ({ plain_text: t.text.content })) }];
    return [k, v];
  }));

  const page = (dbId: string, props: Record<string, any>) => {
    const p = { object: 'page', id: randomUUID(), url: `https://notion.so/${randomUUID()}`, created_time: new Date().toISOString(), archived: false, properties: toRead(props) };
    dbs[dbId].push(p);
    return p;
  };

  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const send = (status: number, json: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
      state.calls.push(`${req.method} ${req.url}`);
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: 'API token is invalid.' });
      if (state.down) return send(500, { message: 'Notion is having a bad day' });

      const query = /^\/v1\/databases\/([0-9a-f]{32})\/query$/.exec(req.url ?? '');
      if (req.method === 'POST' && query) {
        const all = dbs[query[1]]?.filter((p) => !p.archived);
        if (!all) return send(404, { message: 'Could not find database' });
        const start = Number(JSON.parse(body || '{}').start_cursor ?? 0);
        const size = 3; // small pages, so paging is exercised
        return send(200, { object: 'list', results: all.slice(start, start + size), has_more: start + size < all.length, next_cursor: String(start + size) });
      }
      if (req.method === 'POST' && req.url === '/v1/pages') {
        if (++state.creates > state.failCreatesAfter) return send(500, { message: 'Could not create' });
        const { parent, properties } = JSON.parse(body);
        return send(200, page(key(parent.database_id), properties));
      }
      const patch = /^\/v1\/pages\/([^/]+)$/.exec(req.url ?? '');
      if (req.method === 'PATCH' && patch) {
        for (const list of Object.values(dbs)) {
          const found = list.find((p) => p.id === patch[1]);
          if (found) { found.archived = JSON.parse(body).archived === true; return send(200, found); }
        }
      }
      send(404, { message: 'Not found' });
    });
  });

  return {
    state,
    live: (db: string) => dbs[key(db)].filter((p) => !p.archived),
    // Adds the kind of row you would type into Notion.
    addRound: (name: string, o: { on?: boolean; rid?: string; order?: number } = {}) => page(key(ROUNDS_DB), {
      Name: { title: [{ text: { content: name } }] }, Emoji: { rich_text: [{ text: { content: '🧪' } }] },
      Description: { rich_text: [{ text: { content: `About ${name}` } }] }, On: { checkbox: o.on ?? false },
      Order: { number: o.order ?? null }, 'Round ID': { rich_text: o.rid ? [{ text: { content: o.rid } }] : [] },
    }),
    addQuestion: (roundId: string, text: string, correct = 'B', answers = ['one', 'two', 'three', 'four']) => page(key(QUESTIONS_DB), {
      Question: { title: [{ text: { content: text } }] }, Round: { relation: [{ id: roundId }] },
      A: { rich_text: [{ text: { content: answers[0] } }] }, B: { rich_text: [{ text: { content: answers[1] } }] },
      C: { rich_text: [{ text: { content: answers[2] } }] }, D: { rich_text: answers[3] ? [{ text: { content: answers[3] } }] : [] },
      Correct: { select: { name: correct } }, Order: { number: null },
    }),
    rename: (p: any, name: string) => { p.properties.Name = { title: [{ plain_text: name }] }; },
    listen: () => new Promise<number>((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as any).port))),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function until<T>(fn: () => Promise<T | false | undefined>, ms = 15_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 50));
  }
}

function harness() {
  const notion = fakeNotion();
  let server: RunningServer;
  let dataDir: string;
  const api = (p: string, init: RequestInit & { pw?: string | null } = {}) => {
    const { pw = PASSWORD, ...rest } = init;
    return fetch(`${server.url}${p}`, { ...rest, headers: { ...(pw ? { 'x-admin-password': pw } : {}) } });
  };
  const json = async (p: string, init?: RequestInit & { pw?: string | null }) => (await api(p, init)).json();
  return {
    notion, api, json,
    async start() {
      const port = await notion.listen();
      dataDir = mkdtempSync(path.join(tmpdir(), 'trivia-notion-api-'));
      server = await startServer({
        ADMIN_PASSWORD: PASSWORD, DATA_DIR: dataDir, NOTION_TOKEN: TOKEN,
        NOTION_ROUNDS_DB: ROUNDS_DB, NOTION_QUESTIONS_DB: `https://www.notion.so/Rounds-${key(QUESTIONS_DB)}?v=abc`, // a pasted URL works too
        NOTION_API_BASE: `http://127.0.0.1:${port}`, NOTION_REQUEST_GAP_MS: '0',
      });
    },
    async stop() { await server.stop(); await notion.close(); rmSync(dataDir, { recursive: true, force: true }); },
    firstRead: () => until(async () => { const s = await json('/api/notion', { pw: null }); return s.syncedAt ? s : false; }),
  };
}

describe('Notion connector: reading rounds', () => {
  const h = harness();
  const roundPage = { current: null as any };

  before(async () => {
    // What someone has typed into Notion: a copy of round3 with new wording, one brand-new draft round, and a half-typed question.
    const animals = h.notion.addRound('Animals (typed in Notion)', { on: true, rid: 'round3', order: 3 });
    roundPage.current = animals;
    h.notion.addQuestion(animals.id, 'Which animal says moo?', 'C', ['dog', 'cat', 'cow', 'duck']);
    h.notion.addQuestion(animals.id, 'Which animal barks?', 'A', ['dog', 'cat', 'cow', 'duck']);
    const draft = h.notion.addRound('Brand new draft', { on: false });
    h.notion.addQuestion(draft.id, 'Is this finished?', 'A', ['yes', 'no', 'maybe', 'so']);
    h.notion.addQuestion(draft.id, 'Half typed', 'A', ['yes', 'no', 'maybe', '']);
    await h.start();
  });
  after(() => h.stop());

  it('reads the databases at startup (paging, dashed ids and pasted URLs included) and never shows the token', async () => {
    const status = await h.firstRead();
    assert.equal(status.configured, true);
    assert.equal(status.rounds, 2);
    assert.equal(status.questions, 3);
    assert.equal(status.warningCount, 1);
    assert.equal(status.error, null);
    assert.ok(!JSON.stringify(status).includes(TOKEN));
  });

  it('lets a Notion round replace the built-in one in place, and adds new rounds after the built-ins', async () => {
    const list = await h.json('/api/rounds', { pw: null });
    assert.equal(list.length, builtIn.length + 1);
    assert.equal(list[2].id, 'round3');                  // same place as the built-in round3
    assert.equal(list[2].name, 'Animals (typed in Notion)');
    assert.equal(list[2].source, 'notion');
    assert.equal(list[2].questionCount, 2);
    assert.equal(list[2].enabled, true);
    assert.ok(list[2].notionUrl.startsWith('https://notion.so/'));
    assert.equal(list[0].source, 'builtin');
    const draft = list.at(-1);
    assert.deepEqual([draft.name, draft.source, draft.enabled, draft.questionCount], ['Brand new draft', 'notion', false, 1]);
    assert.ok(!JSON.stringify(list).includes('correctOptionId'));
  });

  it('hands the answers to the admin only, from Notion', async () => {
    assert.equal((await h.api('/api/rounds/round3', { pw: null })).status, 401);
    const full = await h.json('/api/rounds/round3');
    assert.equal(full.questions[0].text, 'Which animal says moo?');
    assert.equal(full.questions[0].correctOptionId, 'C');
  });

  it('leaves on and off to Notion for its own rounds, and still toggles the others', async () => {
    const res = await h.api('/api/rounds/round3/toggle', { method: 'PATCH' });
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /Notion/);
    assert.equal((await h.api('/api/rounds/round1/toggle', { method: 'PATCH' })).status, 200);
    await h.api('/api/rounds/round1/toggle', { method: 'PATCH' });
  });

  it('reads Notion again on request, with the password, and reports what to fix', async () => {
    assert.equal((await h.api('/api/notion/sync', { method: 'POST', pw: null })).status, 401);
    h.notion.rename(roundPage.current, 'Animals, renamed');
    const res = await h.api('/api/notion/sync', { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.rounds, 2);
    assert.equal(body.warnings.length, 1);
    assert.match(body.warnings[0], /Half typed.*no answer D/);
    const list = await h.json('/api/rounds', { pw: null });
    assert.equal(list[2].name, 'Animals, renamed');
  });

  it('keeps using the last good copy while Notion is down', async () => {
    h.notion.state.down = true;
    const res = await h.api('/api/notion/sync', { method: 'POST' });
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /Notion error 500/);
    const list = await h.json('/api/rounds', { pw: null });
    assert.equal(list[2].name, 'Animals, renamed');       // still there
    assert.match((await h.json('/api/notion', { pw: null })).error, /Notion error 500/);

    h.notion.state.down = false;
    const again = await h.json('/api/notion/sync', { method: 'POST' });
    assert.equal(again.error, null);
  });
});

describe('Notion connector: copying the built-in rounds', () => {
  const h = harness();
  const totalQuestions = builtIn.reduce((n, r) => n + r.questions.length, 0);

  before(() => h.start());
  after(() => h.stop());

  const copyFinished = () => until(async () => {
    const s = await h.json('/api/notion', { pw: null });
    return !s.seed.running && s.seed.finishedAt ? s : false;
  });

  it('needs the password', async () => {
    assert.equal((await h.api('/api/notion/seed', { method: 'POST', pw: null })).status, 401);
  });

  it('tidies away a round that was only half copied, then finishes the job when run again', async () => {
    await h.firstRead();
    h.notion.state.failCreatesAfter = 5;                  // Notion starts refusing part way through round one
    assert.equal((await h.api('/api/notion/seed', { method: 'POST' })).status, 202);
    const failed = await copyFinished();
    assert.match(failed.seed.error, /Notion error 500/);
    assert.equal(h.notion.live(ROUNDS_DB).length, 0);     // the half-copied round was archived
    assert.equal(h.notion.live(QUESTIONS_DB).length, 0);

    h.notion.state.failCreatesAfter = Infinity;
    assert.equal((await h.api('/api/notion/seed', { method: 'POST' })).status, 202);
    const done = await copyFinished();
    assert.equal(done.seed.error, null);
    assert.equal(h.notion.live(ROUNDS_DB).length, builtIn.length);
    assert.equal(h.notion.live(QUESTIONS_DB).length, totalQuestions);
  });

  it('puts every round in Notion with its answers, and the game then reads them back from there', async () => {
    const list = await until(async () => {
      const l = await h.json('/api/rounds', { pw: null });
      return l.every((r: any) => r.source === 'notion') ? l : false;
    });
    assert.equal(list.length, builtIn.length);
    assert.deepEqual(list.map((r: any) => r.id), builtIn.map((r) => r.id));
    assert.deepEqual(list.map((r: any) => r.questionCount), builtIn.map((r) => r.questions.length));
    // Same answers as before: the first question of round 3 survives the round trip.
    const round3 = await h.json('/api/rounds/round3');
    assert.equal(round3.questions[0].text, builtIn[2].questions[0].text);
    assert.equal(round3.questions[0].correctOptionId, builtIn[2].questions[0].correctOptionId);
    assert.deepEqual(round3.questions[0].options, builtIn[2].questions[0].options);
  });

  it('leaves rounds that are already in Notion alone when copied again', async () => {
    const before = h.notion.state.calls.filter((c) => c === 'POST /v1/pages').length;
    assert.equal((await h.api('/api/notion/seed', { method: 'POST' })).status, 202);
    await copyFinished();
    assert.equal(h.notion.state.calls.filter((c) => c === 'POST /v1/pages').length, before);
    assert.equal(h.notion.live(QUESTIONS_DB).length, totalQuestions);
  });
});

describe('Notion connector: not connected', () => {
  let server: RunningServer;
  let dir: string;
  before(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'trivia-notion-off-'));
    server = await startServer({ DATA_DIR: dir, NOTION_TOKEN: '', NOTION_ROUNDS_DB: '', NOTION_QUESTIONS_DB: '' });
  });
  after(async () => { await server.stop(); rmSync(dir, { recursive: true, force: true }); });

  it('changes nothing: the built-in rounds play as before, and syncing says Notion is not connected', async () => {
    const status = await (await fetch(`${server.url}/api/notion`)).json();
    assert.equal(status.configured, false);
    const list = await (await fetch(`${server.url}/api/rounds`)).json();
    assert.equal(list.length, builtIn.length);
    assert.ok(list.every((r: any) => r.source === 'builtin' || r.source === 'custom'));
    assert.equal((await fetch(`${server.url}/api/notion/sync`, { method: 'POST' })).status, 400);
    assert.equal((await fetch(`${server.url}/api/notion/seed`, { method: 'POST' })).status, 400);
  });
});
