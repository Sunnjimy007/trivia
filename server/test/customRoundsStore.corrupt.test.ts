import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Separate file (= separate process) because the store loads its file once, at import time.
const dir = mkdtempSync(path.join(tmpdir(), 'trivia-store-corrupt-'));
writeFileSync(path.join(dir, 'custom-rounds.json'), '{ this is not json');
process.env.DATA_DIR = dir;

describe('customRoundsStore with an unreadable file', () => {
  let store: typeof import('../src/data/customRoundsStore');
  const realError = console.error;

  before(async () => {
    console.error = () => {}; // the store logs the problem; keep test output clean
    store = await import('../src/data/customRoundsStore');
  });
  after(() => {
    console.error = realError;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts empty but keeps the broken file instead of overwriting it', () => {
    assert.deepEqual(store.getCustomRounds(), []);
    const files = readdirSync(dir);
    const backup = files.find((f) => f.startsWith('custom-rounds.json.corrupt-'));
    assert.ok(backup, `expected a .corrupt backup, got ${files.join(', ')}`);
    assert.equal(readFileSync(path.join(dir, backup!), 'utf-8'), '{ this is not json');
  });

  it('works normally afterwards', () => {
    store.toggleRound('round1');
    assert.deepEqual(JSON.parse(readFileSync(path.join(dir, 'custom-rounds.json'), 'utf-8')).disabledRoundIds, ['round1']);
  });
});
