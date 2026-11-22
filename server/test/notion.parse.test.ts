import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// The Notion module reads DATA_DIR when first imported, so point it at an empty folder first.
const dir = mkdtempSync(path.join(tmpdir(), 'trivia-notion-parse-'));
process.env.DATA_DIR = dir;

let parseNotion: typeof import('../src/data/notion').parseNotion;

const rt = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });
const title = (s: string) => ({ title: s ? [{ plain_text: s }] : [] });

function roundPage(id: string, name: string, o: { emoji?: string; desc?: string; on?: boolean; order?: number; rid?: string; created?: string; archived?: boolean } = {}) {
  return {
    id, url: `https://notion.so/${id}`, created_time: o.created ?? '2026-01-01T00:00:00Z', archived: o.archived,
    properties: {
      Name: title(name), Emoji: rt(o.emoji ?? ''), Description: rt(o.desc ?? ''),
      On: { checkbox: o.on ?? false }, Order: { number: o.order ?? null }, 'Round ID': rt(o.rid ?? ''),
    },
  };
}

function questionPage(id: string, q: { text?: string; a?: string; b?: string; c?: string; d?: string; correct?: string; round?: string[]; order?: number; created?: string }) {
  return {
    id, created_time: q.created ?? '2026-01-01T00:00:00Z',
    properties: {
      Question: title(q.text ?? ''), A: rt(q.a ?? ''), B: rt(q.b ?? ''), C: rt(q.c ?? ''), D: rt(q.d ?? ''),
      Correct: { select: q.correct ? { name: q.correct } : null },
      Round: { relation: (q.round ?? []).map((r) => ({ id: r })) },
      Order: { number: q.order ?? null },
    },
  };
}

const full = (text: string, round: string, extra: object = {}) =>
  questionPage(`q-${text}`, { text, a: 'one', b: 'two', c: 'three', d: 'four', correct: 'B', round: [round], ...extra });

describe('parseNotion', () => {
  before(async () => { ({ parseNotion } = await import('../src/data/notion')); });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('turns a round page and its question rows into a round', () => {
    const { rounds, warnings } = parseNotion(
      [roundPage('r-1', 'Cricket', { emoji: '🏏', desc: 'Bat and ball', on: true, rid: 'cricket' })],
      [full('Who bats first?', 'r-1')],
    );
    assert.deepEqual(warnings, []);
    assert.equal(rounds.length, 1);
    const r = rounds[0];
    assert.deepEqual([r.id, r.name, r.emoji, r.description, r.enabled, r.notionUrl], ['cricket', 'Cricket', '🏏', 'Bat and ball', true, 'https://notion.so/r-1']);
    assert.equal(r.questions.length, 1);
    assert.equal(r.questions[0].text, 'Who bats first?');
    assert.deepEqual(r.questions[0].options, [
      { id: 'A', text: 'one' }, { id: 'B', text: 'two' }, { id: 'C', text: 'three' }, { id: 'D', text: 'four' },
    ]);
    assert.equal(r.questions[0].correctOptionId, 'B');
  });

  it('joins rich text that Notion splits into pieces, ignores archived pages, and defaults the emoji', () => {
    const split = { ...full('Split', 'r-1'), properties: { ...full('Split', 'r-1').properties, A: { rich_text: [{ plain_text: 'Half ' }, { plain_text: 'and half' }] } } };
    const { rounds } = parseNotion(
      [roundPage('r-1', 'Mixed', { on: true }), roundPage('r-2', 'Old', { archived: true })],
      [split, full('Q2', 'r-2')],
    );
    assert.deepEqual(rounds.map((r) => r.name), ['Mixed']);
    assert.equal(rounds[0].emoji, '🎯');
    assert.equal(rounds[0].questions[0].options[0].text, 'Half and half');
  });

  it('skips unfinished questions with a clear message, and ignores empty rows quietly', () => {
    const { rounds, warnings } = parseNotion(
      [roundPage('r-1', 'Draft round', { on: true })],
      [
        full('Finished', 'r-1'),
        questionPage('x1', { text: 'No fourth answer', a: 'a', b: 'b', c: 'c', correct: 'A', round: ['r-1'] }),
        questionPage('x2', { text: 'No right answer picked', a: 'a', b: 'b', c: 'c', d: 'd', round: ['r-1'] }),
        questionPage('x3', { text: 'Nowhere', a: 'a', b: 'b', c: 'c', d: 'd', correct: 'A' }),
        questionPage('x4', {}), // a blank row
      ],
    );
    assert.equal(rounds[0].questions.length, 1);
    assert.equal(warnings.length, 3);
    assert.match(warnings[0], /No fourth answer.*no answer D/);
    assert.match(warnings[1], /No right answer picked.*Correct answer/);
    assert.match(warnings[2], /Nowhere.*not in a Round/);
  });

  it('leaves out rounds with no name or no finished questions, and says so', () => {
    const { rounds, warnings } = parseNotion(
      [roundPage('r-1', 'Empty round'), roundPage('r-2', '', { on: true })],
      [full('Orphaned', 'r-2')],
    );
    assert.deepEqual(rounds, []);
    assert.ok(warnings.some((w) => /Empty round.*no complete questions/.test(w)));
    assert.ok(warnings.some((w) => /has no Name/.test(w)));
  });

  it('orders rounds and questions by their Order number, then by when they were made', () => {
    const { rounds } = parseNotion(
      [
        roundPage('r-late', 'Last', { created: '2026-03-01T00:00:00Z' }),
        roundPage('r-two', 'Second', { order: 2 }),
        roundPage('r-one', 'First', { order: 1 }),
        roundPage('r-early', 'No number, made earlier', { created: '2026-02-01T00:00:00Z' }),
      ],
      ['r-late', 'r-two', 'r-one', 'r-early'].flatMap((r) => [
        full(`${r} b`, r, { order: 2 }),
        full(`${r} a`, r, { order: 1 }),
        full(`${r} z`, r, { created: '2026-05-01T00:00:00Z' }),
        full(`${r} y`, r, { created: '2026-04-01T00:00:00Z' }),
      ]),
    );
    assert.deepEqual(rounds.map((r) => r.name), ['First', 'Second', 'No number, made earlier', 'Last']);
    assert.deepEqual(rounds[0].questions.map((q) => q.text), ['r-one a', 'r-one b', 'r-one y', 'r-one z']);
  });

  it('gives new rounds an automatic id, and falls back when a Round ID is unusable or repeated', () => {
    const { rounds, warnings } = parseNotion(
      [
        roundPage('page-aaaa-1111', 'New one', { order: 1 }),
        roundPage('page-bbbb-2222', 'Bad id', { order: 2, rid: 'has spaces!' }),
        roundPage('page-cccc-3333', 'Takes round3', { order: 3, rid: 'round3' }),
        roundPage('page-dddd-4444', 'Also round3', { order: 4, rid: 'round3' }),
      ],
      ['page-aaaa-1111', 'page-bbbb-2222', 'page-cccc-3333', 'page-dddd-4444'].map((r) => full(`q ${r}`, r)),
    );
    const ids = rounds.map((r) => r.id);
    assert.match(ids[0], /^notion-[0-9a-f]*[a-z0-9]+$/);
    assert.match(ids[1], /^notion-/);
    assert.equal(ids[2], 'round3');
    assert.match(ids[3], /^notion-/);
    assert.equal(new Set(ids).size, 4);
    assert.equal(warnings.length, 2);
  });
});
