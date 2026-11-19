import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { enabledRounds, roundCountText } from '../../client/src/lib/rounds';

describe('client: the rounds list shown on Home and in the host lobby', () => {
  const list = [
    { id: 'round1', name: 'General Knowledge', emoji: '🌍', enabled: false, isCustom: false, questionCount: 14 },
    { id: 'round3', name: 'Animals', emoji: '🐾', enabled: true, isCustom: false, questionCount: 10 },
    { id: 'custom-1', name: 'Family', emoji: '🏠', enabled: true, isCustom: true, questionCount: 5 },
  ];

  it('keeps only switched-on rounds, in order', () => {
    assert.deepEqual(enabledRounds(list), [
      { id: 'round3', name: 'Animals', emoji: '🐾' },
      { id: 'custom-1', name: 'Family', emoji: '🏠' },
    ]);
  });

  it('is empty (not wrong) when nothing is switched on', () => {
    assert.deepEqual(enabledRounds(list.map((r) => ({ ...r, enabled: false }))), []);
  });

  it('ignores anything that is not shaped like a round', () => {
    assert.deepEqual(enabledRounds(null), []);
    assert.deepEqual(enabledRounds({ rounds: list }), []);
    assert.deepEqual(
      enabledRounds([null, 'x', 5, {}, { id: 1, name: 'No', enabled: true }, { id: 'a', name: 'No', enabled: 'yes' }]),
      [],
    );
    // a missing emoji is fine, it just shows nothing
    assert.deepEqual(enabledRounds([{ id: 'a', name: 'A', enabled: true }]), [{ id: 'a', name: 'A', emoji: '' }]);
  });

  it('words the count properly', () => {
    assert.equal(roundCountText(0), '0 rounds');
    assert.equal(roundCountText(1), '1 round');
    assert.equal(roundCountText(5), '5 rounds');
  });
});

describe('client: zoom and tap behaviour', () => {
  const html = readFileSync(path.join(__dirname, '../../client/index.html'), 'utf-8');
  const css = readFileSync(path.join(__dirname, '../../client/src/index.css'), 'utf-8');

  it('lets people pinch-zoom', () => {
    const viewport = /<meta name="viewport"[^>]*>/.exec(html)?.[0] ?? '';
    assert.ok(viewport.includes('width=device-width'));
    assert.ok(!/user-scalable\s*=\s*(no|0)/i.test(viewport), 'user-scalable=no blocks zoom');
    assert.ok(!/maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport), 'maximum-scale=1 blocks zoom');
  });

  it('still stops double-tap zoom, so fast taps on answers do not zoom the page', () => {
    assert.match(css, /html\s*\{[^}]*touch-action:\s*manipulation/);
  });
});
