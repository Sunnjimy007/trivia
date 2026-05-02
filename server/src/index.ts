import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import GameManager from './GameManager';
import { rounds as builtInRounds } from './data/questions';
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

// List all rounds (including disabled) for the manager UI
app.get('/api/rounds', (_req, res) => {
  res.json(allRoundsWithMeta().map(({ id, name, emoji, description, questions, isCustom, enabled }) => ({
    id, name, emoji, description, isCustom, enabled,
    questionCount: questions.length,
  })));
});

// Full round data for the editor
app.get('/api/rounds/:id', (req, res) => {
  const round = allRoundsWithMeta().find((r) => r.id === req.params.id);
  if (!round) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(round);
});

// Create new custom round
app.post('/api/rounds', (req, res) => {
  const round = req.body;
  if (!round.id || !round.name || !Array.isArray(round.questions) || round.questions.length === 0) {
    res.status(400).json({ error: 'Invalid round data' }); return;
  }
  if (allRoundsWithMeta().some((r) => r.id === round.id)) round.id = `${round.id}-${Date.now()}`;
  customRoundsStore.addCustomRound(round);
  res.json({ success: true, id: round.id });
});

// Update an existing custom round
app.put('/api/rounds/:id', (req, res) => {
  const ok = customRoundsStore.updateCustomRound(req.params.id, req.body);
  if (!ok) { res.status(404).json({ error: 'Round not found or not editable' }); return; }
  res.json({ success: true });
});

// Toggle enabled/disabled
app.patch('/api/rounds/:id/toggle', (req, res) => {
  const enabled = customRoundsStore.toggleRound(req.params.id);
  res.json({ success: true, enabled });
});

// Delete custom round
app.delete('/api/rounds/:id', (req, res) => {
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

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('create-game', ({ hostName }: { hostName: string }) => {
    const { roomCode, room } = gameManager.createGame(socket.id, hostName);
    socket.join(roomCode);
    socket.emit('game-created', { roomCode, hostName, players: room.players, isHost: true });
    console.log(`[GAME] Created room ${roomCode} by ${hostName}`);
  });

  socket.on('join-game', ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
    const normalised = roomCode.toLowerCase();
    const result = gameManager.joinGame(normalised, socket.id, playerName);
    if (!result.success) { socket.emit('join-error', { message: result.error }); return; }
    socket.join(normalised);
    socket.emit('join-success', { roomCode: normalised, players: result.room!.players, myId: socket.id });
    io.to(normalised).emit('player-joined', { players: result.room!.players });
    console.log(`[GAME] ${playerName} joined room ${normalised}`);
  });

  socket.on('start-game', ({ roomCode }: { roomCode: string }) => {
    const success = gameManager.startGame(roomCode, socket.id);
    if (!success) socket.emit('start-error', { message: 'Need at least 1 player to start!' });
  });

  socket.on('advance', ({ roomCode }: { roomCode: string }) => {
    gameManager.advance(roomCode, socket.id);
  });

  socket.on('submit-answer', ({ roomCode, optionId }: { roomCode: string; optionId: string }) => {
    const result = gameManager.submitAnswer(roomCode, socket.id, optionId);
    if (result.alreadyAnswered) socket.emit('already-answered');
    else if (!result.success) socket.emit('answer-error', { message: 'Could not submit answer' });
    else socket.emit('answer-confirmed', { optionId });
  });

  socket.on('adjust-score', ({ roomCode, playerId, amount }: { roomCode: string; playerId: string; amount: number }) => {
    const safeAmount = amount > 0 ? 100 : -100;
    gameManager.adjustScore(roomCode, socket.id, playerId, safeAmount);
  });

  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    gameManager.removePlayer(socket.id);
  });
});

// ── Fallback to client SPA ───────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🎉 Trivia server running on http://localhost:${PORT}`);
  console.log(`   Open the app and share your local network IP with players!\n`);
});
