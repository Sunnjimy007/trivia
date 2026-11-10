import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import GameManager, { calculatePoints, cleanName } from '../src/GameManager';
import type { Round } from '../src/data/questions';

function question(id: string, correct: string) {
  return {
    id,
    text: `Question ${id}`,
    options: ['A', 'B', 'C', 'D'].map((x) => ({ id: x, text: `Option ${x}` })),
    correctOptionId: correct,
  };
}

const ROUNDS: Round[] = [
  { id: 'r1', name: 'Round One', emoji: '1️⃣', description: 'first', questions: [question('r1q1', 'B'), question('r1q2', 'A')] },
  { id: 'r2', name: 'Round Two', emoji: '2️⃣', description: 'second', questions: [question('r2q1', 'C')] },
];

type Evt = { room: string; event: string; data: any };

function setup(getRounds: () => Round[] = () => ROUNDS) {
  const events: Evt[] = [];
  const gm = new GameManager(
    (room, event, data) => events.push({ room, event, data }),
    getRounds,
    { hostGraceMs: 1000, lobbyGraceMs: 500, questionTimeMs: 30000 },
  );
  const last = (name: string) => events.filter((e) => e.event === name).at(-1)?.data;
  const count = (name: string) => events.filter((e) => e.event === name).length;
  return { gm, events, last, count };
}

// A lobby with a host ("host-sock") and players p0, p1, p2... joined.
function lobby(names = ['Ann', 'Ben', 'Cat'], getRounds?: () => Round[]) {
  const s = setup(getRounds);
  const { roomCode, token: hostToken } = s.gm.createGame('host-sock', 'Hosty');
  const players = names.map((name, i) => {
    const r = s.gm.joinGame(roomCode, `p${i}`, name);
    assert.ok(r.success, `${name} should join`);
    return { id: `p${i}`, name, token: r.token! };
  });
  return { ...s, roomCode, hostToken, players };
}

// A started game, sitting in the first question of round one.
function inFirstQuestion(names?: string[]) {
  const l = lobby(names);
  assert.ok(l.gm.startGame(l.roomCode, 'host-sock').success);
  l.gm.advance(l.roomCode, 'host-sock'); // round_intro -> question_active
  return l;
}

describe('GameManager', () => {
  // Fake timers for every test: nothing waits on a real 30 second question timer, and grace periods are instant.
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => mock.timers.reset());

  describe('scoring', () => {
    it('awards n×125 for the first correct answer, counting down to 125', () => {
      assert.equal(calculatePoints(1, 3), 375);
      assert.equal(calculatePoints(2, 3), 250);
      assert.equal(calculatePoints(3, 3), 125);
      assert.equal(calculatePoints(1, 10), 1250);
    });

    it('pays by order of correct answers; wrong answers score nothing', () => {
      const g = inFirstQuestion(); // 3 players, correct answer is B
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p1', 'B'), { success: true });
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p2', 'A'), { success: true }); // wrong
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p0', 'B'), { success: true });

      mock.timers.tick(600);
      const ended = g.last('question-ended');
      const byName = Object.fromEntries(ended.scores.map((s: any) => [s.playerName, s.score]));
      assert.deepEqual(byName, { Ben: 375, Ann: 250, Cat: 0 });
      assert.equal(ended.correctOptionId, 'B');
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'question_results');
    });

    it('rejects a second answer from the same player and options that do not exist', () => {
      const g = inFirstQuestion();
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p0', 'B'), { success: true });
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p0', 'A'), { success: false, alreadyAnswered: true });
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p1', 'Z'), { success: false });
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'host-sock', 'B'), { success: false });
    });

    it('ends the question when the 30 second timer runs out', () => {
      const g = inFirstQuestion();
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');
      mock.timers.tick(29999);
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'question_active');
      mock.timers.tick(1);
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'question_results');
    });
  });

  describe('joining', () => {
    it('rejects unknown rooms, duplicate names, a full room, and joins after the start', () => {
      const s = setup();
      const { roomCode } = s.gm.createGame('host-sock', 'Hosty');

      assert.equal(s.gm.joinGame('nope', 'x', 'Zed').success, false);
      assert.ok(s.gm.joinGame(roomCode, 'p0', 'Ann').success);
      assert.match(s.gm.joinGame(roomCode, 'p9', 'ANN').error!, /already taken/);

      for (let i = 1; i < 10; i++) assert.ok(s.gm.joinGame(roomCode, `p${i}`, `Player ${i}`).success);
      assert.match(s.gm.joinGame(roomCode, 'p10', 'Eleven').error!, /full/);

      assert.ok(s.gm.startGame(roomCode, 'host-sock').success);
      const late = lobby(['Ann']);
      late.gm.startGame(late.roomCode, 'host-sock');
      assert.match(late.gm.joinGame(late.roomCode, 'late', 'Late').error!, /already started/);
    });

    it('cleans names, rejects empty ones, and refuses the same socket twice', () => {
      const s = setup();
      const { roomCode, room } = s.gm.createGame('host-sock', '   ');
      assert.equal(room.hostName, 'Host');
      assert.match(s.gm.joinGame(roomCode, 'a', '    ').error!, /enter your name/);

      const ok = s.gm.joinGame(roomCode, 'b', '  Ann   Marie   the   Third   of   Many  ');
      assert.ok(ok.success);
      assert.equal(ok.room!.players[0].name, 'Ann Marie the Third ');
      assert.equal(cleanName('x'.repeat(50)).length, 20);
      assert.equal(cleanName(42), '');
      assert.match(s.gm.joinGame(roomCode, 'b', 'Other').error!, /already in this game/);
      assert.match(s.gm.joinGame(roomCode, 'host-sock', 'Sneaky').error!, /already in this game/);
    });

    it('never puts tokens into data that is broadcast', () => {
      const g = lobby();
      const players = g.gm.getRoom(g.roomCode)!.players;
      for (const p of players) assert.deepEqual(Object.keys(p).sort(), ['avatar', 'connected', 'id', 'name', 'score']);
      g.gm.startGame(g.roomCode, 'host-sock');
      const broadcast = JSON.stringify(g.events);
      for (const p of g.players) assert.ok(!broadcast.includes(p.token));
      assert.ok(!broadcast.includes(g.hostToken));
    });
  });

  describe('starting', () => {
    it('needs a connected player and at least one enabled round', () => {
      const empty = setup();
      const { roomCode } = empty.gm.createGame('host-sock', 'Hosty');
      assert.match(empty.gm.startGame(roomCode, 'host-sock').error!, /at least 1 player/);

      const noRounds = lobby(['Ann'], () => []);
      assert.match(noRounds.gm.startGame(noRounds.roomCode, 'host-sock').error!, /No rounds/);

      const g = lobby(['Ann']);
      assert.equal(g.gm.startGame(g.roomCode, 'not-the-host').success, false);
      assert.ok(g.gm.startGame(g.roomCode, 'host-sock').success);
    });

    it('keeps the rounds it started with even if rounds are toggled mid-game', () => {
      let current = ROUNDS;
      const g = lobby(['Ann'], () => current);
      g.gm.startGame(g.roomCode, 'host-sock');
      current = [ROUNDS[1]]; // someone disables round one in Manage Rounds
      g.gm.advance(g.roomCode, 'host-sock');
      assert.equal(g.last('question-started').question.id, 'r1q1');
    });
  });

  describe('score adjustments', () => {
    function toResults() {
      const g = inFirstQuestion(['Ann', 'Ben']);
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');
      g.gm.submitAnswer(g.roomCode, 'p1', 'B');
      mock.timers.tick(600);
      return g;
    }

    it('allows one ±100 adjustment per player per round, never below zero', () => {
      const g = toResults();
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'p0', -100), true);
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'p0', 100), false); // already adjusted this round
      assert.equal(g.gm.adjustScore(g.roomCode, 'someone-else', 'p1', 100), false); // not the host
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'ghost', 100), false);

      const p0 = g.gm.getRoom(g.roomCode)!.players[0];
      assert.equal(p0.score, 150); // 250 earned for being second, minus 100
      // a 100 penalty can't push anybody negative
      const g2 = lobby(['Zed']);
      g2.gm.startGame(g2.roomCode, 'host-sock');
      g2.gm.adjustScore(g2.roomCode, 'host-sock', 'p0', -100);
      assert.equal(g2.gm.getRoom(g2.roomCode)!.players[0].score, 0);
    });

    it('lets the host adjust the same player again in the next round', () => {
      const g = inFirstQuestion(['Ann']);
      const play = () => { g.gm.submitAnswer(g.roomCode, 'p0', 'A'); mock.timers.tick(600); g.gm.advance(g.roomCode, 'host-sock'); };
      play();                                  // r1q1 answered (wrong), now r1q2
      play();                                  // r1q2 answered, now round_summary
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'round_summary');
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'p0', 100), true);
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'p0', 100), false);
      g.gm.advance(g.roomCode, 'host-sock');   // -> round two intro
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'round_intro');
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'p0', 100), true);
    });
  });

  describe('disconnects mid-question', () => {
    it('does not wait for players who dropped', () => {
      const g = inFirstQuestion();
      g.gm.handleDisconnect('p2');
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'question_active');
      g.gm.submitAnswer(g.roomCode, 'p1', 'B');
      mock.timers.tick(600);
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'question_results');
    });

    it('ends the question as soon as the last unanswered player drops', () => {
      const g = inFirstQuestion();
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');
      g.gm.submitAnswer(g.roomCode, 'p1', 'B');
      g.gm.handleDisconnect('p2');
      mock.timers.tick(600);
      assert.equal(g.gm.getRoom(g.roomCode)!.phase, 'question_results');
    });

    it('keeps the player on the board and falls back to the timer if nobody is connected', () => {
      const g = inFirstQuestion(['Ann']);
      g.gm.handleDisconnect('p0');
      mock.timers.tick(600);
      const room = g.gm.getRoom(g.roomCode)!;
      assert.equal(room.phase, 'question_active');
      assert.equal(room.players.length, 1);
      assert.equal(room.players[0].connected, false);
      mock.timers.tick(30000);
      assert.equal(room.phase, 'question_results');
    });
  });

  describe('lobby disconnects', () => {
    it('removes a lobby player who never comes back, and frees their name', () => {
      const g = lobby(['Ann', 'Ben']);
      g.gm.handleDisconnect('p0');
      assert.equal(g.gm.getRoom(g.roomCode)!.players.length, 2);
      assert.equal(g.gm.getRoom(g.roomCode)!.players[0].connected, false);
      mock.timers.tick(500);
      assert.deepEqual(g.gm.getRoom(g.roomCode)!.players.map((p) => p.name), ['Ben']);
      assert.ok(g.gm.joinGame(g.roomCode, 'new', 'Ann').success);
    });

    it('keeps them if they rejoin within the grace period', () => {
      const g = lobby(['Ann', 'Ben']);
      g.gm.handleDisconnect('p0');
      mock.timers.tick(400);
      const r = g.gm.rejoin(g.roomCode, g.players[0].token, 'p0-new');
      assert.equal(r.success, true);
      mock.timers.tick(5000);
      const players = g.gm.getRoom(g.roomCode)!.players;
      assert.deepEqual(players.map((p) => [p.name, p.id, p.connected]), [['Ann', 'p0-new', true], ['Ben', 'p1', true]]);
    });
  });

  describe('rejoining a game in progress', () => {
    it('moves a player onto the new socket and restores the question, their answer and the scores', () => {
      const g = inFirstQuestion();
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');           // Ann is first, 375
      g.gm.handleDisconnect('p0');                        // her phone drops
      const r = g.gm.rejoin(g.roomCode, g.players[0].token, 'p0-new');
      assert.ok(r.success);
      if (!r.success) return;

      const snap = r.snapshot;
      assert.equal(snap.isHost, false);
      assert.equal(snap.myId, 'p0-new');
      assert.equal(snap.myName, 'Ann');
      assert.equal(snap.phase, 'question_active');
      assert.equal(snap.question!.id, 'r1q1');
      assert.equal(snap.myAnswer, 'B');
      assert.equal(snap.answeredCount, 1);
      assert.equal(snap.round!.name, 'Round One');
      assert.equal(snap.totalRounds, 2);
      assert.equal(snap.scores.find((s) => s.playerName === 'Ann')!.playerId, 'p0-new');
      assert.equal(snap.correctOptionId, undefined);
      assert.ok(!JSON.stringify(snap.question).includes('correctOptionId'));
      assert.deepEqual(snap.answers, []);                  // nobody's answers are revealed mid-question

      // everything keyed by the old id moved over
      assert.equal(g.gm.submitAnswer(g.roomCode, 'p0', 'A').success, false);
      assert.deepEqual(g.gm.submitAnswer(g.roomCode, 'p0-new', 'A'), { success: false, alreadyAnswered: true });
      assert.equal(g.gm.getRoom(g.roomCode)!.answers[0].playerId, 'p0-new');

      // the others are told about the new id, so the host's adjust buttons keep working
      const update = g.last('players-updated');
      assert.equal(update.scores.find((s: any) => s.playerName === 'Ann').playerId, 'p0-new');
    });

    it('shows results (with the right answer) to someone who rejoins after the question ended', () => {
      const g = inFirstQuestion(['Ann', 'Ben']);
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');
      g.gm.submitAnswer(g.roomCode, 'p1', 'A');
      mock.timers.tick(600);
      g.gm.handleDisconnect('p1');
      const r = g.gm.rejoin(g.roomCode, g.players[1].token, 'p1-new');
      assert.ok(r.success && r.snapshot.phase === 'question_results');
      if (!r.success) return;
      assert.equal(r.snapshot.correctOptionId, 'B');
      assert.equal(r.snapshot.myAnswer, 'A');
      assert.equal(r.snapshot.answers.length, 2);
    });

    it('carries the "already adjusted" flag across to the new id', () => {
      const g = inFirstQuestion(['Ann', 'Ben']);
      g.gm.submitAnswer(g.roomCode, 'p0', 'B');
      g.gm.submitAnswer(g.roomCode, 'p1', 'B');
      mock.timers.tick(600);
      g.gm.adjustScore(g.roomCode, 'host-sock', 'p0', 100);
      g.gm.rejoin(g.roomCode, g.players[0].token, 'p0-new');
      assert.equal(g.gm.adjustScore(g.roomCode, 'host-sock', 'p0-new', 100), false);
    });

    it('rejects wrong, missing and foreign tokens', () => {
      const g = inFirstQuestion();
      const other = lobby(['Zed']);
      assert.equal(g.gm.rejoin(g.roomCode, 'wrong', 'x').success, false);
      assert.equal(g.gm.rejoin(g.roomCode, '', 'x').success, false);
      assert.equal(g.gm.rejoin(g.roomCode, undefined as any, 'x').success, false);
      assert.equal(g.gm.rejoin('zzzz', g.players[0].token, 'x').success, false);
      assert.equal(g.gm.rejoin(g.roomCode, other.players[0].token, 'x').success, false);
    });
  });

  describe('host connection', () => {
    it('holds the room open for the host and hands control to their new socket', () => {
      const g = lobby(['Ann']);
      g.gm.handleDisconnect('host-sock');
      assert.deepEqual(g.last('host-connection'), { connected: false });
      mock.timers.tick(900);

      const r = g.gm.rejoin(g.roomCode, g.hostToken, 'host-new');
      assert.ok(r.success);
      if (!r.success) return;
      assert.equal(r.snapshot.isHost, true);
      assert.equal(r.snapshot.myName, 'Hosty');
      assert.deepEqual(g.last('host-connection'), { connected: true });

      mock.timers.tick(5000); // the old grace timer must not close the room now
      assert.ok(g.gm.getRoom(g.roomCode));
      assert.equal(g.count('host-disconnected'), 0);

      assert.equal(g.gm.startGame(g.roomCode, 'host-sock').success, false); // old socket lost control
      assert.equal(g.gm.startGame(g.roomCode, 'host-new').success, true);
    });

    it('closes the room if the host never comes back', () => {
      const g = lobby(['Ann']);
      g.gm.handleDisconnect('host-sock');
      mock.timers.tick(1000);
      assert.equal(g.count('host-disconnected'), 1);
      assert.equal(g.gm.getRoom(g.roomCode), undefined);
      assert.equal(g.gm.rejoin(g.roomCode, g.hostToken, 'host-new').success, false);
    });

    it('ignores a stale disconnect from a socket that has already been replaced', () => {
      const g = inFirstQuestion(['Ann']);
      g.gm.rejoin(g.roomCode, g.players[0].token, 'p0-new');
      g.gm.handleDisconnect('p0'); // the old socket finally times out
      assert.equal(g.gm.getRoom(g.roomCode)!.players[0].connected, true);
    });
  });
});
