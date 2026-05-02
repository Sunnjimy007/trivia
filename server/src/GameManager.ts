import type { Round } from './data/questions';
import type {
  GameRoom,
  Player,
  PlayerAnswer,
  QuestionForClient,
  RoundForClient,
  PlayerScore,
} from './types';

const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐺', '🐸', '🦋', '🐙', '🦄', '🐲'];
const QUESTION_TIME_LIMIT = 30000;

function generateRoomCode(): string {
  // lowercase only — no i/o/l to avoid confusion with 1/0
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

class GameManager {
  private rooms = new Map<string, GameRoom>();
  private onRoomUpdate: (roomCode: string, event: string, data: unknown) => void;
  private getRounds: () => Round[];

  constructor(
    onRoomUpdate: (roomCode: string, event: string, data: unknown) => void,
    getRounds: () => Round[],
  ) {
    this.onRoomUpdate = onRoomUpdate;
    this.getRounds = getRounds;
  }

  createGame(hostId: string, hostName: string): { roomCode: string; room: GameRoom } {
    let roomCode = generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    // Host is NOT a player — they are the Game Master
    const room: GameRoom = {
      roomCode,
      hostId,
      hostName,
      players: [],
      phase: 'lobby',
      currentRoundIndex: 0,
      currentQuestionIndex: 0,
      answers: [],
      answerDistribution: emptyDistribution(),
      questionStartTime: 0,
      timeLimit: QUESTION_TIME_LIMIT,
      questionTimer: null,
      correctAnswerOrder: 0,
    };

    this.rooms.set(roomCode, room);
    return { roomCode, room };
  }

  joinGame(
    roomCode: string,
    playerId: string,
    playerName: string,
  ): { success: boolean; error?: string; room?: GameRoom } {
    const room = this.rooms.get(roomCode.toLowerCase());
    if (!room) return { success: false, error: 'Game not found. Check the room code!' };
    if (room.phase !== 'lobby') return { success: false, error: 'Game has already started!' };
    if (room.players.length >= 10) return { success: false, error: 'Game is full (max 10 players)!' };

    const nameTaken = room.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase(),
    );
    if (nameTaken) return { success: false, error: 'That name is already taken!' };

    const usedAvatars = room.players.map((p) => p.avatar);
    const availableAvatars = AVATARS.filter((a) => !usedAvatars.includes(a));
    const avatar = availableAvatars[0] || AVATARS[room.players.length % AVATARS.length];

    const player: Player = { id: playerId, name: playerName, score: 0, avatar, connected: true };
    room.players.push(player);

    return { success: true, room };
  }

  startGame(roomCode: string, hostId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId || room.phase !== 'lobby') return false;
    // Need at least 1 player (host is separate)
    if (room.players.length < 1) return false;

    room.phase = 'round_intro';
    room.currentRoundIndex = 0;
    room.currentQuestionIndex = 0;

    const rounds = this.getRounds();
    this.onRoomUpdate(roomCode, 'round-intro', {
      round: getRoundForClient(rounds, 0),
      roundIndex: 0,
      totalRounds: rounds.length,
      scores: getSortedScores(room.players),
    });

    return true;
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
    }, QUESTION_TIME_LIMIT);

    const rounds = this.getRounds();
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
      timeLimit: QUESTION_TIME_LIMIT,
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

    const currentQuestion = this.getRounds()[room.currentRoundIndex].questions[room.currentQuestionIndex];
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

    // Auto-end if every player has answered
    const allAnswered = room.players.every((p) =>
      room.answers.some((a) => a.playerId === p.id),
    );
    if (allAnswered) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      setTimeout(() => this.endQuestion(room), 600);
    }

    return { success: true };
  }

  private endQuestion(room: GameRoom): void {
    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }
    room.phase = 'question_results';

    const currentQuestion = this.getRounds()[room.currentRoundIndex].questions[room.currentQuestionIndex];

    this.onRoomUpdate(room.roomCode, 'question-ended', {
      correctOptionId: currentQuestion.correctOptionId,
      answers: room.answers,
      scores: getSortedScores(room.players),
      questionIndex: room.currentQuestionIndex,
      distribution: { ...room.answerDistribution },
    });
  }

  private advanceFromResults(room: GameRoom): void {
    const rounds = this.getRounds();
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
    const rounds = this.getRounds();
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

    player.score = Math.max(0, player.score + amount);

    this.onRoomUpdate(roomCode, 'score-adjusted', {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      amount,
      newScore: player.score,
      scores: getSortedScores(room.players),
    });

    return true;
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode);
  }

  removePlayer(playerId: string): void {
    for (const [, room] of this.rooms) {
      // If host disconnects, close the room
      if (playerId === room.hostId) {
        this.onRoomUpdate(room.roomCode, 'host-disconnected', {});
        this.deleteRoom(room.roomCode);
        return;
      }
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.connected = false;
        if (room.phase === 'lobby') {
          room.players = room.players.filter((p) => p.id !== playerId);
        }
        this.onRoomUpdate(room.roomCode, 'player-disconnected', {
          playerId,
          players: room.players,
        });
        return;
      }
    }
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room?.questionTimer) clearTimeout(room.questionTimer);
    this.rooms.delete(roomCode);
  }
}

export default GameManager;
export { getRoundForClient, getSortedScores };
