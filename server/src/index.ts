import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'http';
import { createHash, timingSafeEqual } from 'crypto';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import GameManager from './GameManager';
import { rounds as builtInRounds, type Round } from './data/questions';
import * as customRoundsStore from './data/customRoundsStore';

const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const httpServer = createServer(app);

// In production set CORS_ORIGIN=https://your-app.vercel.app on Railway
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
     'http://localhost:5176', 'http://127.0.0.1:5173'];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── Admin protection ─────────────────────────────────────────────────────────
// Set ADMIN_PASSWORD to require a password for changing rounds and for reading full round data
// (which includes the correct answers). If it is not set the rounds API stays open, as before.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

function passwordMatches(supplied: string): boolean {
  // Hash both sides so the comparison is constant-time and length-independent.
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(ADMIN_PASSWORD).digest();
  return timingSafeEqual(a, b);
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_PASSWORD) { next(); return; }
  if (!passwordMatches(req.header('x-admin-password') ?? '')) {
    res.status(401).json({ error: 'Admin password required' });
    return;
  }
  next();
}

// ── Rounds REST API ──────────────────────────────────────────────────────────
function allRoundsWithMeta() {
  const customIds = new Set(customRoundsStore.getCustomRounds().map((r) => r.id));
  const all = [...builtInRounds, ...customRoundsStore.getCustomRounds()];
  return all.map((r) => ({
    ...r,
    isCustom: customIds.has(r.id),
    enabled: customRoundsStore.isRoundEnabled(r.id),
  }));
}

// Games only see enabled rounds
function getAllRounds() {
  return allRoundsWithMeta().filter((r) => r.enabled);
}

const OPTION_IDS = ['A', 'B', 'C', 'D'];

// Checks the shape a round must have to be playable and returns a clean copy (or null).
// Anything malformed would otherwise crash the game the first time it is played.
function parseRound(body: unknown, forcedId?: string): Round | null {
  if (!body || typeof body !== 'object') return null;
  const r = body as Record<string, unknown>;

  const id = forcedId ?? r.id;
  if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) return null;
  if (typeof r.name !== 'string' || !r.name.trim()) return null;
  if (!Array.isArray(r.questions) || r.questions.length === 0) return null;

  const questions: Round['questions'] = [];
  for (const raw of r.questions) {
    if (!raw || typeof raw !== 'object') return null;
    const q = raw as Record<string, unknown>;
    if (typeof q.id !== 'string' || !q.id) return null;
    if (typeof q.text !== 'string' || !q.text.trim()) return null;
    if (!Array.isArray(q.options) || q.options.length !== OPTION_IDS.length) return null;

    const options: { id: string; text: string }[] = [];
    for (const [i, rawOpt] of q.options.entries()) {
      const o = rawOpt as Record<string, unknown> | null;
      if (!o || o.id !== OPTION_IDS[i] || typeof o.text !== 'string' || !o.text.trim()) return null;
      options.push({ id: o.id, text: o.text });
    }
    if (typeof q.correctOptionId !== 'string' || !OPTION_IDS.includes(q.correctOptionId)) return null;

    questions.push({ id: q.id, text: q.text, options, correctOptionId: q.correctOptionId });
  }

  return {
    id,
    name: r.name.trim(),
    emoji: typeof r.emoji === 'string' && r.emoji.trim() ? r.emoji.trim() : '🎯',
    description: typeof r.description === 'string' ? r.description : '',
    questions,
  };
}

// List all rounds (including disabled) for the manager UI. Metadata only, so it is public.
app.get('/api/rounds', (_req, res) => {
  res.json(allRoundsWithMeta().map(({ id, name, emoji, description, questions, isCustom, enabled }) => ({
    id, name, emoji, description, isCustom, enabled,
    questionCount: questions.length,
  })));
});

// Full round data for the editor (includes correct answers, so it needs the admin password)
app.get('/api/rounds/:id', requireAdmin, (req, res) => {
  const round = allRoundsWithMeta().find((r) => r.id === req.params.id);
  if (!round) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(round);
});

// Create new custom round
app.post('/api/rounds', requireAdmin, (req, res) => {
  const round = parseRound(req.body);
  if (!round) { res.status(400).json({ error: 'Invalid round data' }); return; }
  if (allRoundsWithMeta().some((r) => r.id === round.id)) round.id = `${round.id}-${Date.now()}`;
  customRoundsStore.addCustomRound(round);
  res.json({ success: true, id: round.id });
});

// Update an existing custom round
app.put('/api/rounds/:id', requireAdmin, (req, res) => {
  const round = parseRound(req.body, req.params.id);
  if (!round) { res.status(400).json({ error: 'Invalid round data' }); return; }
  const ok = customRoundsStore.updateCustomRound(req.params.id, round);
  if (!ok) { res.status(404).json({ error: 'Round not found or not editable' }); return; }
  res.json({ success: true });
});

// Toggle enabled/disabled
app.patch('/api/rounds/:id/toggle', requireAdmin, (req, res) => {
  if (!allRoundsWithMeta().some((r) => r.id === req.params.id)) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  const enabled = customRoundsStore.toggleRound(req.params.id);
  res.json({ success: true, enabled });
});

// Delete custom round
app.delete('/api/rounds/:id', requireAdmin, (req, res) => {
  const deleted = customRoundsStore.deleteCustomRound(req.params.id);
  res.json({ success: deleted });
});

// ── Serve built client in production ────────────────────────────────────────
app.use(express.static(clientDist));

// ── Socket.io game logic ─────────────────────────────────────────────────────
const gameManager = new GameManager(
  (roomCode, event, data) => io.to(roomCode).emit(event, data),
  getAllRounds,
);

// Socket payloads come straight from browsers, so never trust their shape.
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

// One bad payload (or a bug) in a handler must not take the whole server down.
function safe<T>(event: string, handler: (data: Partial<T>) => void) {
  return (data: unknown) => {
    try {
      handler((data && typeof data === 'object' ? data : {}) as Partial<T>);
    } catch (err) {
      console.error(`[socket] Error handling "${event}":`, err);
    }
  };
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('create-game', safe<{ hostName: string }>('create-game', ({ hostName }) => {
    const { roomCode, room, token } = gameManager.createGame(socket.id, str(hostName));
    socket.join(roomCode);
    socket.emit('game-created', { roomCode, hostName: room.hostName, players: room.players, isHost: true, token });
    console.log(`[GAME] Created room ${roomCode} by ${room.hostName}`);
  }));

  socket.on('join-game', safe<{ roomCode: string; playerName: string }>('join-game', ({ roomCode, playerName }) => {
    const normalised = str(roomCode).toLowerCase();
    const result = gameManager.joinGame(normalised, socket.id, str(playerName));
    if (!result.success) { socket.emit('join-error', { message: result.error }); return; }
    socket.join(normalised);
    socket.emit('join-success', { roomCode: normalised, players: result.room!.players, myId: socket.id, token: result.token });
    io.to(normalised).emit('player-joined', { players: result.room!.players });
    console.log(`[GAME] ${str(playerName)} joined room ${normalised}`);
  }));

  // A browser that was already in a game takes its seat back (page refresh, dropped connection...).
  socket.on('rejoin-game', safe<{ roomCode: string; token: string }>('rejoin-game', ({ roomCode, token }) => {
    const result = gameManager.rejoin(str(roomCode), str(token), socket.id);
    if (!result.success) { socket.emit('rejoin-error', { message: 'That game is no longer running.' }); return; }
    socket.join(result.room.roomCode);
    socket.emit('rejoin-success', result.snapshot);
    console.log(`[GAME] ${result.snapshot.isHost ? 'Host' : result.snapshot.myName} rejoined room ${result.room.roomCode}`);
  }));

  socket.on('start-game', safe<{ roomCode: string }>('start-game', ({ roomCode }) => {
    const result = gameManager.startGame(str(roomCode), socket.id);
    if (!result.success) socket.emit('start-error', { message: result.error });
  }));

  socket.on('advance', safe<{ roomCode: string }>('advance', ({ roomCode }) => {
    gameManager.advance(str(roomCode), socket.id);
  }));

  socket.on('submit-answer', safe<{ roomCode: string; optionId: string }>('submit-answer', ({ roomCode, optionId }) => {
    const result = gameManager.submitAnswer(str(roomCode), socket.id, str(optionId));
    if (result.alreadyAnswered) socket.emit('already-answered');
    else if (!result.success) socket.emit('answer-error', { message: 'Could not submit answer' });
    else socket.emit('answer-confirmed', { optionId });
  }));

  socket.on('adjust-score', safe<{ roomCode: string; playerId: string; amount: number }>('adjust-score', ({ roomCode, playerId, amount }) => {
    const safeAmount = typeof amount === 'number' && amount > 0 ? 100 : -100;
    gameManager.adjustScore(str(roomCode), socket.id, str(playerId), safeAmount);
  }));

  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket.id);
  });
});

// ── Fallback to client SPA ───────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Last resort for errors thrown inside routes (for example a failed save to disk).
// Errors that are the client's fault (like a malformed JSON body) keep their 4xx status.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Bad request' });
    return;
  }
  console.error('[http] Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🎉 Trivia server running on http://localhost:${PORT}`);
  console.log(`   Open the app and share your local network IP with players!`);
  console.log(`   Custom rounds are saved to ${customRoundsStore.STORE_PATH}`);
  if (!ADMIN_PASSWORD) {
    console.warn('   ⚠️  ADMIN_PASSWORD is not set: anyone can edit rounds and read the answers via /api/rounds/:id.\n');
  } else {
    console.log('   Rounds API is protected by ADMIN_PASSWORD.\n');
  }
});
