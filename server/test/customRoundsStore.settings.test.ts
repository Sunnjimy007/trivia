import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// A saved file that already has the speed factor switched off, as after a server restart.
// The store reads DATA_DIR once when first imported, and each test file runs in its own process.
const dir = mkdtempSync(path.join(tmpdir(), 'trivia-settings-'));
writeFileSync(
  path.join(dir, 'custom-rounds.json'),
  JSON.stringify({ customRounds: [], disabledRoundIds: ['round1'], settings: { speedScoring: false } }),
);
process.env.DATA_DIR = dir;

describe('customRoundsStore settings after a restart', () => {
  let store: typeof import('../src/data/customRoundsStore');
  before(async () => { store = await import('../src/data/customRoundsStore'); });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('remembers that the speed factor was switched off, and everything else in the file', () => {
    assert.deepEqual(store.getSettings(), { speedScoring: false });
    assert.deepEqual(store.getDisabledRoundIds(), ['round1']);
  });
});
