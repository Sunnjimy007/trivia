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

export interface GameRoom {
  roomCode: string;
  hostId: string;
  hostName: string;
  players: Player[];
  phase: GamePhase;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  answers: PlayerAnswer[];
  answerDistribution: Record<string, number>;
  questionStartTime: number;
  timeLimit: number;
  questionTimer: ReturnType<typeof setTimeout> | null;
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
