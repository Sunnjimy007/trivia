import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// The store reads DATA_DIR once, when it is first imported, so set it up before importing.
// Each test file runs in its own process, so this doesn't leak into other tests.
const dir = mkdtempSync(path.join(tmpdir(), 'trivia-store-'));
const file = path.join(dir, 'custom-rounds.json');

const legacyRound = {
  id: 'old-round', name: 'Old', emoji: '📜', description: '',
  questions: [{ id: 'q1', text: 't', options: [{ id: 'A', text: 'a' }], correctOptionId: 'A' }],
};
// Pretend an older version of the app saved a plain array.
writeFileSync(file, JSON.stringify([legacyRound]));
process.env.DATA_DIR = dir;

let store: typeof import('../src/data/customRoundsStore');

describe('customRoundsStore', () => {
  before(async () => { store = await import('../src/data/customRoundsStore'); });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('saves into DATA_DIR and reads the old plain-array format', () => {
    assert.equal(store.STORE_PATH, file);
    assert.deepEqual(store.getCustomRounds().map((r) => r.id), ['old-round']);
    assert.deepEqual(store.getDisabledRoundIds(), []);
  });

  it('writes toggles and edits to disk in the current format', () => {
    assert.equal(store.toggleRound('round1'), false); // now disabled
    assert.equal(store.isRoundEnabled('round1'), false);

    const saved = JSON.parse(readFileSync(file, 'utf-8'));
    assert.deepEqual(saved.disabledRoundIds, ['round1']);
    assert.equal(saved.customRounds[0].id, 'old-round');

    assert.equal(store.toggleRound('round1'), true); // enabled again
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf-8')).disabledRoundIds, []);
  });

  it('adds, updates and deletes custom rounds (and forgets their disabled flag)', () => {
    store.addCustomRound({ ...legacyRound, id: 'new-round', name: 'New' });
    store.toggleRound('new-round');
    assert.equal(store.updateCustomRound('new-round', { ...legacyRound, id: 'new-round', name: 'Renamed' }), true);
    assert.equal(store.updateCustomRound('missing', legacyRound), false);
    assert.equal(JSON.parse(readFileSync(file, 'utf-8')).customRounds[1].name, 'Renamed');

    assert.equal(store.deleteCustomRound('new-round'), true);
    assert.equal(store.deleteCustomRound('new-round'), false);
    const saved = JSON.parse(readFileSync(file, 'utf-8'));
    assert.deepEqual(saved.customRounds.map((r: { id: string }) => r.id), ['old-round']);
    assert.deepEqual(saved.disabledRoundIds, []);
  });

  it('leaves no temp files behind after saving', () => {
    store.toggleRound('round2');
    assert.deepEqual(readdirSync(dir), ['custom-rounds.json']);
    assert.ok(existsSync(file));
  });
});
