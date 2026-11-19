import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rounds } from '../src/data/questions';

// Every built-in round has to be playable: four lettered options, one of which is the answer.
describe('built-in rounds', () => {
  it('have unique round ids and question ids', () => {
    const roundIds = rounds.map((r) => r.id);
    assert.equal(new Set(roundIds).size, roundIds.length);
    const questionIds = rounds.flatMap((r) => r.questions.map((q) => q.id));
    assert.equal(new Set(questionIds).size, questionIds.length);
  });

  it('each have a name, an emoji, a description and at least one question', () => {
    for (const r of rounds) {
      assert.ok(r.name.trim(), `${r.id} needs a name`);
      assert.ok(r.emoji.trim(), `${r.id} needs an emoji`);
      assert.ok(r.description.trim(), `${r.id} needs a description`);
      assert.ok(r.questions.length > 0, `${r.id} needs questions`);
    }
  });

  it('give every question four distinct options, lettered A to D, with one valid answer', () => {
    for (const r of rounds) {
      for (const q of r.questions) {
        const where = `${r.id}/${q.id}`;
        assert.ok(q.text.trim(), `${where} needs question text`);
        assert.deepEqual(q.options.map((o) => o.id), ['A', 'B', 'C', 'D'], `${where} options`);
        assert.ok(q.options.every((o) => o.text.trim()), `${where} has an empty option`);
        assert.equal(new Set(q.options.map((o) => o.text)).size, 4, `${where} repeats an option`);
        assert.ok(q.options.some((o) => o.id === q.correctOptionId), `${where} answer is not an option`);
      }
    }
  });

  it('have the ten Australian rounds of ten questions', () => {
    const australian = rounds.filter((r) => /^round(8|9|1[0-7])$/.test(r.id));
    assert.equal(australian.length, 10);
    assert.ok(australian.every((r) => r.questions.length === 10));
  });
});
