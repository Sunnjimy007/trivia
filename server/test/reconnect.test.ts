import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io, type Socket } from 'socket.io-client';
import { startServer, type RunningServer } from './helpers/server';

// Drives the real server over real sockets: the same events the browser sends.

function connect(url: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(url, { transports: ['websocket'], reconnection: false });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

// Resolves with the first payload of `event`. Register it BEFORE the action that triggers the event.
function waitFor<T = any>(socket: Socket, event: string, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), ms);
    socket.once(event, (data: T) => { clearTimeout(timer); resolve(data); });
  });
}

describe('refreshing and reconnecting during a real game', () => {
  let server: RunningServer;
  let dataDir: string;
  const sockets: Socket[] = [];
  const open = async () => { const s = await connect(server.url); sockets.push(s); return s; };

  before(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), 'trivia-e2e-'));
    server = await startServer({ DATA_DIR: dataDir });
  });
  after(async () => {
    sockets.forEach((s) => s.disconnect());
    await server.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('puts a refreshed player and a refreshed host back exactly where they were', async () => {
    // ── Host creates a room; Ann and Ben join ─────────────────────────────────
    const host = await open();
    const created = waitFor(host, 'game-created');
    host.emit('create-game', { hostName: 'Host' });
    const { roomCode, token: hostToken } = await created;
    assert.match(roomCode, /^[a-z0-9]{4}$/);
    assert.ok(hostToken);

    const ann = await open();
    const annJoined = waitFor(ann, 'join-success');
    ann.emit('join-game', { roomCode, playerName: 'Ann' });
    const { token: annToken, myId: annOldId } = await annJoined;
    assert.ok(annToken);

    const ben = await open();
    const benJoined = waitFor(ben, 'join-success');
    ben.emit('join-game', { roomCode, playerName: 'Ben' });
    await benJoined;

    // ── Start, open the first question, Ann answers ───────────────────────────
    const intro = waitFor(ann, 'round-intro');
    host.emit('start-game', { roomCode });
    await intro;

    const started = waitFor(ann, 'question-started');
    host.emit('advance', { roomCode });
    const { question } = await started;

    const confirmed = waitFor(ann, 'answer-confirmed');
    ann.emit('submit-answer', { roomCode, optionId: 'A' });
    await confirmed;

    // ── Ann's phone drops, and the host sees nothing break ────────────────────
    const hostSeesUpdate = waitFor(host, 'players-updated');
    ann.disconnect();
    const ann2 = await open();
    const rejoined = waitFor(ann2, 'rejoin-success');
    ann2.emit('rejoin-game', { roomCode, token: annToken });
    const snap = await rejoined;

    assert.equal(snap.isHost, false);
    assert.equal(snap.myName, 'Ann');
    assert.equal(snap.myId, ann2.id);
    assert.notEqual(snap.myId, annOldId);
    assert.equal(snap.phase, 'question_active');
    assert.equal(snap.question.id, question.id);
    assert.equal(snap.myAnswer, 'A');
    assert.equal(snap.answeredCount, 1);
    assert.equal(snap.correctOptionId, undefined);

    const update = await hostSeesUpdate;
    assert.ok(update.scores.some((s: any) => s.playerName === 'Ann' && s.playerId === ann2.id));

    // She can't answer twice just because she reconnected
    const again = waitFor(ann2, 'already-answered');
    ann2.emit('submit-answer', { roomCode, optionId: 'B' });
    await again;

    // ── Ben answers, question ends, results go to the reconnected Ann ────────
    const ended = waitFor(ann2, 'question-ended');
    ben.emit('submit-answer', { roomCode, optionId: 'B' });
    const results = await ended;
    assert.ok(results.correctOptionId);
    assert.ok(results.answers.some((a: any) => a.playerName === 'Ann' && a.playerId === ann2.id));

    // ── The host refreshes: players are told, then the host gets control back ─
    const hostAway = waitFor(ben, 'host-connection');
    host.disconnect();
    assert.deepEqual(await hostAway, { connected: false });

    const hostBack = waitFor(ben, 'host-connection');
    const host2 = await open();
    const hostRejoined = waitFor(host2, 'rejoin-success');
    host2.emit('rejoin-game', { roomCode, token: hostToken });
    const hostSnap = await hostRejoined;
    assert.deepEqual(await hostBack, { connected: true });
    assert.equal(hostSnap.isHost, true);
    assert.equal(hostSnap.phase, 'question_results');
    assert.equal(hostSnap.correctOptionId, results.correctOptionId);
    assert.equal(hostSnap.players.length, 2);

    const nextQuestion = waitFor(ann2, 'question-started');
    host2.emit('advance', { roomCode });
    assert.notEqual((await nextQuestion).question.id, question.id);
  });

  it('refuses tokens that are wrong or belong to a game that is gone', async () => {
    const s = await open();
    const err = waitFor(s, 'rejoin-error');
    s.emit('rejoin-game', { roomCode: 'zzzz', token: 'nope' });
    assert.ok((await err).message);
  });

  it('survives malformed socket messages', async () => {
    const s = await open();

    // Garbage in a create request just falls back to the default host name.
    const fallback = waitFor(s, 'game-created');
    s.emit('create-game', 'not an object');
    assert.equal((await fallback).hostName, 'Host');

    s.emit('join-game');
    s.emit('join-game', 5);
    s.emit('join-game', { roomCode: { a: 1 }, playerName: [] });
    s.emit('rejoin-game', null);
    s.emit('start-game', []);
    s.emit('adjust-score', { roomCode: 1, playerId: {}, amount: 'lots' });

    // The server must still be alive and answering.
    const created = waitFor(s, 'game-created');
    s.emit('create-game', { hostName: 'Still Here' });
    assert.equal((await created).hostName, 'Still Here');
  });
});
