import { randomBytes, timingSafeEqual } from 'crypto';
import type { Round } from './data/questions';
import type {
  GameRoom,
  Player,
  PlayerAnswer,
  QuestionForClient,
  RoundForClient,
  PlayerScore,
  RoomSnapshot,
} from './types';

const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐺', '🐸', '🦋', '🐙', '🦄', '🐲'];
const QUESTION_TIME_LIMIT = 30000;
const MAX_PLAYERS = 10;
const MAX_NAME_LENGTH = 20;
// How long a dropped host / lobby player gets to come back before they are removed.
const DEFAULT_HOST_GRACE_MS = 90_000;
const DEFAULT_LOBBY_GRACE_MS = 30_000;

export interface GameManagerOptions {
  hostGraceMs?: number;
  lobbyGraceMs?: number;
  questionTimeMs?: number;
}

function generateRoomCode(): string {
  // lowercase only — no i/o/l to avoid confusion with 1/0
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateToken(): string {
  return randomBytes(16).toString('hex');
}

function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Trim, collapse whitespace and cap the length (by characters, so emoji aren't cut in half).
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return Array.from(raw.replace(/\s+/g, ' ').trim()).slice(0, MAX_NAME_LENGTH).join('');
}

function getRoundForClient(rounds: Round[], roundIndex: number): RoundForClient {
  const round = rounds[roundIndex];
  return {
    id: round.id,
    name: round.name,
    emoji: round.emoji,
    description: round.description,
    totalQuestions: round.questions.length,
  };
}

function getQuestionForClient(rounds: Round[], roundIndex: number, questionIndex: number): QuestionForClient {
  const q = rounds[roundIndex].questions[questionIndex];
  return {
    id: q.id,
    text: q.text,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

function getSortedScores(players: Player[]): PlayerScore[] {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      playerId: p.id,
      playerName: p.name,
      avatar: p.avatar,
      score: p.score,
      rank: i + 1,
    }));
}

function calculatePoints(answerOrder: number, totalPlayers: number): number {
  // 1st: n×125, 2nd: (n-1)×125, ..., last: 1×125
  return Math.round((totalPlayers - answerOrder + 1) * 125);
}

function emptyDistribution(): Record<string, number> {
  return { A: 0, B: 0, C: 0, D: 0 };
}

export type RejoinResult =
  | { success: false }
  | { success: true; room: GameRoom; snapshot: RoomSnapshot };

class GameManager {
  private rooms = new Map<string, GameRoom>();
  private onRoomUpdate: (roomCode: string, event: string, data: unknown) => void;
  private getRounds: () => Round[];
  private hostGraceMs: number;
  private lobbyGraceMs: number;
  private questionTimeMs: number;

  constructor(
    onRoomUpdate: (roomCode: string, event: string, data: unknown) => void,
    getRounds: () => Round[],
    options: GameManagerOptions = {},
  ) {
    this.onRoomUpdate = onRoomUpdate;
    this.getRounds = getRounds;
    this.hostGraceMs = options.hostGraceMs ?? DEFAULT_HOST_GRACE_MS;
    this.lobbyGraceMs = options.lobbyGraceMs ?? DEFAULT_LOBBY_GRACE_MS;
    this.questionTimeMs = options.questionTimeMs ?? QUESTION_TIME_LIMIT;
  }

  createGame(hostId: string, hostName: string): { roomCode: string; room: GameRoom; token: string } {
    let roomCode = generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const token = generateToken();

    // Host is NOT a player — they are the Game Master
    const room: GameRoom = {
      roomCode,
      hostId,
      hostName: cleanName(hostName) || 'Host',
      hostToken: token,
      hostConnected: true,
      hostGraceTimer: null,
      players: [],
      playerTokens: new Map(),
      lobbyGraceTimers: new Map(),
      rounds: [],
      phase: 'lobby',
      currentRoundIndex: 0,
      currentQuestionIndex: 0,
      answers: [],
      answerDistribution: emptyDistribution(),
      questionStartTime: 0,
      timeLimit: this.questionTimeMs,
      questionTimer: null,
      correctAnswerOrder: 0,
      adjustedPlayerIds: new Set(),
    };

    this.rooms.set(roomCode, room);
    return { roomCode, room, token };
  }

  joinGame(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; error?: string; room?: GameRoom; token?: string } {
    const room = this.rooms.get(String(roomCode).toLowerCase());
    if (!room) return { success: false, error: 'Game not found. Check the room code!' };
    if (room.phase !== 'lobby') return { success: false, error: 'Game has already started!' };
    if (room.players.length >= MAX_PLAYERS) return { success: false, error: 'Game is full (max 10 players)!' };

    const name = cleanName(playerName);
    if (!name) return { success: false, error: 'Please enter your name!' };

    if (playerId === room.hostId || room.players.some((p) => p.id === playerId)) {
      return { success: false, error: 'You are already in this game!' };
    }

    const nameTaken = room.players.some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (nameTaken) return { success: false, error: 'That name is already taken!' };

    const usedAvatars = room.players.map((p) => p.avatar);
    const availableAvatars = AVATARS.filter((a) => !usedAvatars.includes(a));
    const avatar = availableAvatars[0] || AVATARS[room.players.length % AVATARS.length];

    const player: Player = { id: playerId, name, score: 0, avatar, connected: true };
    room.players.push(player);

    const token = generateToken();
    room.playerTokens.set(token, playerId);

    return { success: true, room, token };
  }

  startGame(roomCode: string, hostId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId || room.phase !== 'lobby') {
      return { success: false, error: "Can't start the game right now." };
    }
    // Need at least 1 player (host is separate)
    if (!room.players.some((p) => p.connected)) {
      return { success: false, error: 'Need at least 1 player to start!' };
    }

    const rounds = this.getRounds();
    if (rounds.length === 0) {
      return { success: false, error: 'No rounds are turned on. Enable at least one in Manage Rounds.' };
    }

    // Disconnected lobby players stay in the game (they can still rejoin), so stop their removal timers.
    for (const timer of room.lobbyGraceTimers.values()) clearTimeout(timer);
    room.lobbyGraceTimers.clear();

    room.rounds = rounds;
    room.phase = 'round_intro';
    room.currentRoundIndex = 0;
    room.currentQuestionIndex = 0;
    room.adjustedPlayerIds = new Set();

    this.onRoomUpdate(roomCode, 'round-intro', {
      round: getRoundForClient(rounds, 0),
      roundIndex: 0,
      totalRounds: rounds.length,
      scores: getSortedScores(room.players),
    });

    return { success: true };
  }

  advance(roomCode: string, hostId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId) return;

    switch (room.phase) {
      case 'round_intro':
        this.startQuestion(room);
        break;
      case 'question_results':
        this.advanceFromResults(room);
        break;
      case 'round_summary':
        this.advanceFromRoundSummary(room);
        break;
    }
  }

  private startQuestion(room: GameRoom): void {
    room.phase = 'question_active';
    room.answers = [];
    room.answerDistribution = emptyDistribution();
    room.correctAnswerOrder = 0;
    room.questionStartTime = Date.now();

    if (room.questionTimer) clearTimeout(room.questionTimer);
    room.questionTimer = setTimeout(() => {
      if (room.phase === 'question_active') this.endQuestion(room);
    }, this.questionTimeMs);

    const rounds = room.rounds;
    const question = getQuestionForClient(rounds, room.currentRoundIndex, room.currentQuestionIndex);
    const roundInfo = getRoundForClient(rounds, room.currentRoundIndex);

    this.onRoomUpdate(room.roomCode, 'question-started', {
      question,
      questionIndex: room.currentQuestionIndex,
      totalQuestions: rounds[room.currentRoundIndex].questions.length,
      roundIndex: room.currentRoundIndex,
      roundName: roundInfo.name,
      roundEmoji: roundInfo.emoji,
      startTime: room.questionStartTime,
      timeLimit: this.questionTimeMs,
    });
  }

  submitAnswer(
    roomCode: string,
    playerId: string,
    optionId: string,
  ): { success: boolean; alreadyAnswered?: boolean } {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== 'question_active') return { success: false };

    // Host cannot answer questions
    if (playerId === room.hostId) return { success: false };

    const alreadyAnswered = room.answers.some((a) => a.playerId === playerId);
    if (alreadyAnswered) return { success: false, alreadyAnswered: true };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false };

    const currentQuestion = room.rounds[room.currentRoundIndex].questions[room.currentQuestionIndex];
    // Ignore anything that isn't one of this question's options.
    if (!currentQuestion.options.some((o) => o.id === optionId)) return { success: false };
    const isCorrect = optionId === currentQuestion.correctOptionId;

    if (isCorrect) room.correctAnswerOrder++;

    const answer: PlayerAnswer = {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      optionId,
      isCorrect,
      pointsEarned: isCorrect ? calculatePoints(room.correctAnswerOrder, room.players.length) : 0,
      answerOrder: isCorrect ? room.correctAnswerOrder : 0,
    };

    if (isCorrect) player.score += answer.pointsEarned;

    room.answers.push(answer);

    // Track per-option distribution for the host display
    if (optionId in room.answerDistribution) {
      room.answerDistribution[optionId]++;
    }

    // Broadcast live update (host shows distribution, players show count)
    this.onRoomUpdate(room.roomCode, 'answer-submitted', {
      answeredCount: room.answers.length,
      totalPlayers: room.players.length,
      distribution: { ...room.answerDistribution },
    });

    // Auto-end once every connected player has answered
    this.maybeEndQuestion(room);

    return { success: true };
  }

  // Ends the question early when every player who is still connected has answered.
  // Disconnected players don't hold the game up (they get the normal timer if they never return).
  private maybeEndQuestion(room: GameRoom): void {
    if (room.phase !== 'question_active') return;
    const connected = room.players.filter((p) => p.connected);
    if (connected.length === 0) return;
    const allAnswered = connected.every((p) => room.answers.some((a) => a.playerId === p.id));
    if (!allAnswered) return;

    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }
    setTimeout(() => {
      if (this.rooms.get(room.roomCode) === room && room.phase === 'question_active') this.endQuestion(room);
    }, 600);
  }

  private endQuestion(room: GameRoom): void {
    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }
    room.phase = 'question_results';

    const currentQuestion = room.rounds[room.currentRoundIndex].questions[room.currentQuestionIndex];

    this.onRoomUpdate(room.roomCode, 'question-ended', {
      correctOptionId: currentQuestion.correctOptionId,
      answers: room.answers,
      scores: getSortedScores(room.players),
      questionIndex: room.currentQuestionIndex,
      distribution: { ...room.answerDistribution },
    });
  }

  private advanceFromResults(room: GameRoom): void {
    const rounds = room.rounds;
    const roundQuestions = rounds[room.currentRoundIndex].questions;
    const isLastQuestion = room.currentQuestionIndex >= roundQuestions.length - 1;

    if (isLastQuestion) {
      room.phase = 'round_summary';
      const isLastRound = room.currentRoundIndex >= rounds.length - 1;

      this.onRoomUpdate(room.roomCode, 'round-summary', {
        roundIndex: room.currentRoundIndex,
        round: getRoundForClient(rounds, room.currentRoundIndex),
        scores: getSortedScores(room.players),
        isLastRound,
      });
    } else {
      room.currentQuestionIndex++;
      this.startQuestion(room);
    }
  }

  private advanceFromRoundSummary(room: GameRoom): void {
    const rounds = room.rounds;
    const isLastRound = room.currentRoundIndex >= rounds.length - 1;

    if (isLastRound) {
      room.phase = 'game_over';
      this.onRoomUpdate(room.roomCode, 'game-over', {
        scores: getSortedScores(room.players),
      });
    } else {
      room.currentRoundIndex++;
      room.currentQuestionIndex = 0;
      room.phase = 'round_intro';
      room.adjustedPlayerIds = new Set();

      this.onRoomUpdate(room.roomCode, 'round-intro', {
        round: getRoundForClient(rounds, room.currentRoundIndex),
        roundIndex: room.currentRoundIndex,
        totalRounds: rounds.length,
        scores: getSortedScores(room.players),
      });
    }
  }

  adjustScore(roomCode: string, hostId: string, playerId: string, amount: number): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId) return false;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;
    if (room.adjustedPlayerIds.has(playerId)) return false;

    player.score = Math.max(0, player.score + amount);
    room.adjustedPlayerIds.add(playerId);

    this.onRoomUpdate(roomCode, 'score-adjusted', {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      amount,
      newScore: player.score,
      scores: getSortedScores(room.players),
      adjustedPlayerIds: [...room.adjustedPlayerIds],
    });

    return true;
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  // A socket dropped. Nobody is thrown out straight away: refreshing the page or a patchy
  // connection looks exactly like this, and the person can take their seat back with rejoin().
  handleDisconnect(socketId: string): void {
    for (const room of this.rooms.values()) {
      if (room.hostId === socketId) {
        room.hostConnected = false;
        this.onRoomUpdate(room.roomCode, 'host-connection', { connected: false });

        if (room.hostGraceTimer) clearTimeout(room.hostGraceTimer);
        room.hostGraceTimer = setTimeout(() => {
          room.hostGraceTimer = null;
          if (room.hostConnected) return;
          this.onRoomUpdate(room.roomCode, 'host-disconnected', {});
          this.deleteRoom(room.roomCode);
        }, this.hostGraceMs);
        return;
      }

      const player = room.players.find((p) => p.id === socketId);
      if (!player) continue;

      player.connected = false;
      this.onRoomUpdate(room.roomCode, 'player-disconnected', {
        playerId: player.id,
        players: room.players,
      });

      if (room.phase === 'lobby') {
        // In the lobby, drop them if they don't come back (frees up their name).
        const token = this.tokenForPlayer(room, player.id);
        if (token) {
          const existing = room.lobbyGraceTimers.get(token);
          if (existing) clearTimeout(existing);
          room.lobbyGraceTimers.set(token, setTimeout(() => {
            room.lobbyGraceTimers.delete(token);
            if (room.phase !== 'lobby' || player.connected) return;
            room.players = room.players.filter((p) => p !== player);
            room.playerTokens.delete(token);
            this.onRoomUpdate(room.roomCode, 'player-disconnected', {
              playerId: player.id,
              players: room.players,
            });
          }, this.lobbyGraceMs));
        }
      } else {
        // Mid-game they stay on the board; just stop waiting for them.
        this.maybeEndQuestion(room);
      }
      return;
    }
  }

  // A browser that was in a game (page refresh, dropped connection, phone woke up) presents its
  // token to take its old seat back on a brand-new socket.
  rejoin(roomCode: string, token: string, socketId: string): RejoinResult {
    const room = this.rooms.get(String(roomCode).toLowerCase());
    if (!room || typeof token !== 'string' || !token) return { success: false };

    // Host
    if (tokensEqual(token, room.hostToken)) {
      if (room.hostGraceTimer) {
        clearTimeout(room.hostGraceTimer);
        room.hostGraceTimer = null;
      }
      room.hostId = socketId;
      room.hostConnected = true;
      this.onRoomUpdate(room.roomCode, 'host-connection', { connected: true });
      return { success: true, room, snapshot: this.getSnapshot(room, socketId, true) };
    }

    // Player
    const knownId = room.playerTokens.get(token);
    const player = knownId ? room.players.find((p) => p.id === knownId) : undefined;
    if (!player) return { success: false };

    const pending = room.lobbyGraceTimers.get(token);
    if (pending) {
      clearTimeout(pending);
      room.lobbyGraceTimers.delete(token);
    }

    // Move everything keyed by the old socket id over to the new one.
    const oldId = player.id;
    if (oldId !== socketId) {
      player.id = socketId;
      room.playerTokens.set(token, socketId);
      for (const a of room.answers) {
        if (a.playerId === oldId) a.playerId = socketId;
      }
      if (room.adjustedPlayerIds.delete(oldId)) room.adjustedPlayerIds.add(socketId);
    }
    player.connected = true;

    this.onRoomUpdate(room.roomCode, 'players-updated', {
      players: room.players,
      scores: getSortedScores(room.players),
      adjustedPlayerIds: [...room.adjustedPlayerIds],
    });

    return { success: true, room, snapshot: this.getSnapshot(room, socketId, false) };
  }

  getSnapshot(room: GameRoom, forId: string, isHost: boolean): RoomSnapshot {
    const rounds = room.rounds;
    const started = room.phase !== 'lobby' && rounds.length > 0;
    const showingQuestion = room.phase === 'question_active' || room.phase === 'question_results';
    const me = isHost ? undefined : room.players.find((p) => p.id === forId);

    return {
      roomCode: room.roomCode,
      isHost,
      myId: forId,
      myName: isHost ? room.hostName : me?.name ?? '',
      hostConnected: room.hostConnected,
      players: room.players,
      phase: room.phase,
      round: started ? getRoundForClient(rounds, room.currentRoundIndex) : undefined,
      roundIndex: room.currentRoundIndex,
      totalRounds: rounds.length,
      question: started && showingQuestion
        ? getQuestionForClient(rounds, room.currentRoundIndex, room.currentQuestionIndex)
        : undefined,
      questionIndex: room.currentQuestionIndex,
      totalQuestions: started ? rounds[room.currentRoundIndex].questions.length : 0,
      questionStartTime: room.questionStartTime,
      timeLimit: room.timeLimit,
      answeredCount: showingQuestion ? room.answers.length : 0,
      distribution: showingQuestion ? { ...room.answerDistribution } : emptyDistribution(),
      myAnswer: showingQuestion && !isHost
        ? room.answers.find((a) => a.playerId === forId)?.optionId ?? null
        : null,
      // Only reveal the answer once the question is over.
      correctOptionId: room.phase === 'question_results'
        ? rounds[room.currentRoundIndex].questions[room.currentQuestionIndex].correctOptionId
        : undefined,
      answers: room.phase === 'question_results' ? room.answers : [],
      scores: getSortedScores(room.players),
      isLastRound: started ? room.currentRoundIndex >= rounds.length - 1 : false,
      adjustedPlayerIds: [...room.adjustedPlayerIds],
    };
  }

  private tokenForPlayer(room: GameRoom, playerId: string): string | undefined {
    for (const [token, id] of room.playerTokens) {
      if (id === playerId) return token;
    }
    return undefined;
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      if (room.hostGraceTimer) clearTimeout(room.hostGraceTimer);
      for (const timer of room.lobbyGraceTimers.values()) clearTimeout(timer);
    }
    this.rooms.delete(roomCode);
  }
}

export default GameManager;
export { getRoundForClient, getSortedScores, calculatePoints };
