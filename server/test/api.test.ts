import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer, type RunningServer } from './helpers/server';

const PASSWORD = 'correct horse';

function validRound(overrides: Record<string, unknown> = {}) {
  return {
    id: 'custom-test-1',
    name: 'Test Round',
    emoji: '🧪',
    description: 'made in a test',
    questions: [
      {
        id: 'custom-test-1-q1',
        text: 'Pick B',
        options: [
          { id: 'A', text: 'one' }, { id: 'B', text: 'two' }, { id: 'C', text: 'three' }, { id: 'D', text: 'four' },
        ],
        correctOptionId: 'B',
      },
    ],
    ...overrides,
  };
}

describe('rounds API with ADMIN_PASSWORD set', () => {
  let server: RunningServer;
  let dataDir: string;
  const api = (p: string, init: RequestInit & { pw?: string | null } = {}) => {
    const { pw = PASSWORD, ...rest } = init;
    return fetch(`${server.url}${p}`, {
      ...rest,
      headers: {
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(pw ? { 'x-admin-password': pw } : {}),
      },
    });
  };
  const saved = () => JSON.parse(readFileSync(path.join(dataDir, 'custom-rounds.json'), 'utf-8'));

  before(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), 'trivia-api-'));
    server = await startServer({ ADMIN_PASSWORD: PASSWORD, DATA_DIR: dataDir });
  });
  after(async () => {
    await server.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('tells the operator the password is active', async () => {
    await server.waitForOutput(/protected by ADMIN_PASSWORD/);
    assert.ok(server.output().includes(dataDir));
  });

  it('keeps the round list public, and free of questions and answers', async () => {
    const res = await api('/api/rounds', { pw: null });
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.equal(list.length, 7);
    assert.ok(list.every((r: any) => r.questions === undefined && r.questionCount > 0));
    assert.ok(!JSON.stringify(list).includes('correctOptionId'));
  });

  it('hides full round data (the answers) without the password', async () => {
    assert.equal((await api('/api/rounds/round3', { pw: null })).status, 401);
    assert.equal((await api('/api/rounds/round3', { pw: 'wrong' })).status, 401);
    const ok = await api('/api/rounds/round3');
    assert.equal(ok.status, 200);
    assert.ok((await ok.json()).questions[0].correctOptionId);
    assert.equal((await api('/api/rounds/nope')).status, 404);
  });

  it('rejects every change without the password and changes nothing', async () => {
    assert.equal((await api('/api/rounds/round1/toggle', { method: 'PATCH', pw: null })).status, 401);
    assert.equal((await api('/api/rounds', { method: 'POST', pw: null, body: JSON.stringify(validRound()) })).status, 401);
    assert.equal((await api('/api/rounds/round1', { method: 'DELETE', pw: 'wrong' })).status, 401);
    assert.equal((await api('/api/rounds/round1', { method: 'PUT', pw: null, body: JSON.stringify(validRound()) })).status, 401);
    const list = await (await api('/api/rounds', { pw: null })).json();
    assert.ok(list.every((r: any) => r.enabled));
  });

  it('toggles a round and saves it, and 404s for rounds that do not exist', async () => {
    const off = await (await api('/api/rounds/round1/toggle', { method: 'PATCH' })).json();
    assert.deepEqual(off, { success: true, enabled: false });
    assert.deepEqual(saved().disabledRoundIds, ['round1']);
    const list = await (await api('/api/rounds', { pw: null })).json();
    assert.equal(list.find((r: any) => r.id === 'round1').enabled, false);

    await api('/api/rounds/round1/toggle', { method: 'PATCH' });
    assert.deepEqual(saved().disabledRoundIds, []);
    assert.equal((await api('/api/rounds/not-a-round/toggle', { method: 'PATCH' })).status, 404);
  });

  it('creates, edits and deletes a custom round', async () => {
    const created = await (await api('/api/rounds', { method: 'POST', body: JSON.stringify(validRound()) })).json();
    assert.deepEqual(created, { success: true, id: 'custom-test-1' });
    assert.equal(saved().customRounds.length, 1);

    const list = await (await api('/api/rounds', { pw: null })).json();
    assert.equal(list.find((r: any) => r.id === 'custom-test-1').isCustom, true);

    // The id comes from the URL, whatever the body says.
    const edit = await api('/api/rounds/custom-test-1', {
      method: 'PUT',
      body: JSON.stringify(validRound({ id: 'something-else', name: 'Edited' })),
    });
    assert.equal(edit.status, 200);
    assert.deepEqual(saved().customRounds.map((r: any) => [r.id, r.name]), [['custom-test-1', 'Edited']]);

    assert.equal((await api('/api/rounds/round1', { method: 'PUT', body: JSON.stringify(validRound()) })).status, 404); // built-in
    assert.deepEqual(await (await api('/api/rounds/custom-test-1', { method: 'DELETE' })).json(), { success: true });
    assert.equal(saved().customRounds.length, 0);
  });

  it('rejects rounds that would break a game', async () => {
    const q = validRound().questions[0];
    const bad: unknown[] = [
      null,
      'a string',
      validRound({ id: 'has spaces!' }),
      validRound({ name: '   ' }),
      validRound({ questions: [] }),
      validRound({ questions: [{ ...q, options: q.options.slice(0, 3) }] }),                       // 3 options
      validRound({ questions: [{ ...q, options: q.options.map((o) => ({ ...o, id: 'A' })) }] }),   // duplicate ids
      validRound({ questions: [{ ...q, correctOptionId: 'Z' }] }),                                 // answer not an option
      validRound({ questions: [{ ...q, text: '' }] }),
      validRound({ questions: [{ ...q, options: q.options.map((o) => ({ ...o, text: '' })) }] }),
    ];
    for (const body of bad) {
      const res = await api('/api/rounds', { method: 'POST', body: JSON.stringify(body) });
      assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body)?.slice(0, 80)}`);
    }
    assert.equal(saved().customRounds.length, 0);
  });
});

describe('rounds API without ADMIN_PASSWORD', () => {
  let server: RunningServer;
  let dataDir: string;

  before(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), 'trivia-api-open-'));
    server = await startServer({ DATA_DIR: dataDir });
  });
  after(async () => {
    await server.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('stays open (as before) but warns loudly at startup', async () => {
    await server.waitForOutput(/ADMIN_PASSWORD is not set/);
    assert.equal((await fetch(`${server.url}/api/rounds/round3`)).status, 200);
    assert.equal((await fetch(`${server.url}/api/rounds/round3/toggle`, { method: 'PATCH' })).status, 200);
  });
});
