import type { Round } from './data/questions';

export interface Player {
  id: string;
  name: string;
  score: number;
  avatar: string;
  connected: boolean;
}

export interface PlayerAnswer {
  playerId: string;
  playerName: string;
  avatar: string;
  optionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  answerOrder: number;
}

export type GamePhase =
  | 'lobby'
  | 'round_intro'
  | 'question_active'
  | 'question_results'
  | 'round_summary'
  | 'game_over';

type Timer = ReturnType<typeof setTimeout>;

export interface GameRoom {
  roomCode: string;
  hostId: string;
  hostName: string;
  // Secret that lets the host's browser take its seat back after a refresh or dropped connection.
  // Never put tokens in anything that is broadcast to the room.
  hostToken: string;
  hostConnected: boolean;
  hostGraceTimer: Timer | null;
  players: Player[];
  // token -> current player id (the id is the socket id, so it changes when a player reconnects)
  playerTokens: Map<string, string>;
  // token -> timer that removes a disconnected player from the lobby if they never come back
  lobbyGraceTimers: Map<string, Timer>;
  // The enabled rounds as they were when the game started, so toggling a round mid-game can't shift indices.
  rounds: Round[];
  phase: GamePhase;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  answers: PlayerAnswer[];
  answerDistribution: Record<string, number>;
  questionStartTime: number;
  timeLimit: number;
  questionTimer: Timer | null;
  correctAnswerOrder: number;
  adjustedPlayerIds: Set<string>;
}

export interface QuestionForClient {
  id: string;
  text: string;
  options: { id: string; text: string }[];
}

export interface RoundForClient {
  id: string;
  name: string;
  emoji: string;
  description: string;
  totalQuestions: number;
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  avatar: string;
  score: number;
  rank: number;
}

// Everything a reconnecting client needs to redraw the game exactly where it left off.
export interface RoomSnapshot {
  roomCode: string;
  isHost: boolean;
  myId: string;
  myName: string;
  hostConnected: boolean;
  players: Player[];
  phase: GamePhase;
  round?: RoundForClient;
  roundIndex: number;
  totalRounds: number;
  question?: QuestionForClient;
  questionIndex: number;
  totalQuestions: number;
  questionStartTime: number;
  timeLimit: number;
  answeredCount: number;
  distribution: Record<string, number>;
  myAnswer: string | null;
  correctOptionId?: string;
  answers: PlayerAnswer[];
  scores: PlayerScore[];
  isLastRound: boolean;
  adjustedPlayerIds: string[];
}
