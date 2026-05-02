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

export interface PlayerScore {
  playerId: string;
  playerName: string;
  avatar: string;
  score: number;
  rank: number;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface RoundInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  totalQuestions: number;
}

export type AppView =
  | 'home'
  | 'host_lobby'
  | 'player_join'
  | 'player_lobby'
  | 'host_game'
  | 'player_game';

export type GamePhase =
  | 'lobby'
  | 'round_intro'
  | 'question_active'
  | 'question_results'
  | 'round_summary'
  | 'game_over';

export interface GameState {
  phase: GamePhase;
  roomCode: string;
  players: Player[];
  currentRound?: RoundInfo;
  roundIndex: number;
  totalRounds: number;
  currentQuestion?: Question;
  questionIndex: number;
  totalQuestions: number;
  questionStartTime: number;
  timeLimit: number;
  answers: PlayerAnswer[];
  correctOptionId?: string;
  scores: PlayerScore[];
  isLastRound: boolean;
}
