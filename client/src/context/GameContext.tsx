import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  AppView,
  GameState,
  Player,
  PlayerAnswer,
  PlayerScore,
  Question,
  RoundInfo,
} from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

interface AppState {
  socket: Socket | null;
  view: AppView;
  myId: string;
  myName: string;
  isHost: boolean;
  roomCode: string;
  players: Player[];
  game: GameState;
  myAnswer: string | null;
  error: string | null;
  answeredCount: number;
  answerDistribution: Record<string, number>;
  lastAdjustment: { playerName: string; avatar: string; amount: number } | null;
}

const initialGame: GameState = {
  phase: 'lobby',
  roomCode: '',
  players: [],
  roundIndex: 0,
  totalRounds: 7,
  questionIndex: 0,
  totalQuestions: 0,
  questionStartTime: 0,
  timeLimit: 30000,
  answers: [],
  scores: [],
  isLastRound: false,
};

const initialState: AppState = {
  socket: null,
  view: 'home',
  myId: '',
  myName: '',
  isHost: false,
  roomCode: '',
  players: [],
  game: initialGame,
  myAnswer: null,
  error: null,
  answeredCount: 0,
  answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
  lastAdjustment: null,
};

type Action =
  | { type: 'SET_SOCKET'; socket: Socket }
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'GAME_CREATED'; roomCode: string; players: Player[]; myId: string; myName: string }
  | { type: 'JOIN_SUCCESS'; roomCode: string; players: Player[]; myId: string }
  | { type: 'PLAYER_JOINED'; players: Player[] }
  | { type: 'ROUND_INTRO'; round: RoundInfo; roundIndex: number; totalRounds: number; scores: PlayerScore[] }
  | { type: 'QUESTION_STARTED'; question: Question; questionIndex: number; totalQuestions: number; roundIndex: number; roundName: string; roundEmoji: string; startTime: number; timeLimit: number }
  | { type: 'ANSWER_CONFIRMED'; optionId: string }
  | { type: 'ANSWER_SUBMITTED'; answeredCount: number; totalPlayers: number; distribution: Record<string, number> }
  | { type: 'QUESTION_ENDED'; correctOptionId: string; answers: PlayerAnswer[]; scores: PlayerScore[]; distribution: Record<string, number> }
  | { type: 'ROUND_SUMMARY'; roundIndex: number; round: RoundInfo; scores: PlayerScore[]; isLastRound: boolean }
  | { type: 'GAME_OVER'; scores: PlayerScore[] }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string; players: Player[] }
  | { type: 'SCORE_ADJUSTED'; playerName: string; avatar: string; amount: number; scores: PlayerScore[] }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.socket };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'GAME_CREATED':
      return {
        ...state,
        view: 'host_lobby',
        isHost: true,
        myId: action.myId,
        myName: action.myName,
        roomCode: action.roomCode,
        players: action.players,
        game: { ...initialGame, roomCode: action.roomCode, players: action.players },
        error: null,
      };

    case 'JOIN_SUCCESS':
      return {
        ...state,
        view: 'player_lobby',
        isHost: false,
        myId: action.myId,
        roomCode: action.roomCode,
        players: action.players,
        game: { ...initialGame, roomCode: action.roomCode, players: action.players },
        error: null,
      };

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: action.players,
        game: { ...state.game, players: action.players },
      };

    case 'ROUND_INTRO':
      return {
        ...state,
        view: state.isHost ? 'host_game' : 'player_game',
        myAnswer: null,
        answeredCount: 0,
        answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
        game: {
          ...state.game,
          phase: 'round_intro',
          currentRound: action.round,
          roundIndex: action.roundIndex,
          totalRounds: action.totalRounds,
          scores: action.scores,
          players: state.players,
        },
      };

    case 'QUESTION_STARTED':
      return {
        ...state,
        myAnswer: null,
        answeredCount: 0,
        answerDistribution: { A: 0, B: 0, C: 0, D: 0 },
        game: {
          ...state.game,
          phase: 'question_active',
          currentQuestion: action.question,
          questionIndex: action.questionIndex,
          totalQuestions: action.totalQuestions,
          questionStartTime: action.startTime,
          timeLimit: action.timeLimit,
          answers: [],
          correctOptionId: undefined,
        },
      };

    case 'ANSWER_CONFIRMED':
      return { ...state, myAnswer: action.optionId };

    case 'ANSWER_SUBMITTED':
      return {
        ...state,
        answeredCount: action.answeredCount,
        answerDistribution: action.distribution,
      };

    case 'QUESTION_ENDED':
      return {
        ...state,
        answerDistribution: action.distribution,
        game: {
          ...state.game,
          phase: 'question_results',
          correctOptionId: action.correctOptionId,
          answers: action.answers,
          scores: action.scores,
        },
      };

    case 'ROUND_SUMMARY':
      return {
        ...state,
        game: {
          ...state.game,
          phase: 'round_summary',
          scores: action.scores,
          isLastRound: action.isLastRound,
          currentRound: action.round,
          roundIndex: action.roundIndex,
        },
      };

    case 'GAME_OVER':
      return {
        ...state,
        game: { ...state.game, phase: 'game_over', scores: action.scores },
      };

    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        players: action.players,
        game: { ...state.game, players: action.players },
      };

    case 'SCORE_ADJUSTED':
      return {
        ...state,
        lastAdjustment: { playerName: action.playerName, avatar: action.avatar, amount: action.amount },
        game: { ...state.game, scores: action.scores },
      };

    case 'RESET':
      return { ...initialState, socket: state.socket };

    default:
      return state;
  }
}

interface GameContextValue {
  state: AppState;
  createGame: (hostName: string) => void;
  joinGame: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  advance: () => void;
  submitAnswer: (optionId: string) => void;
  adjustScore: (playerId: string, amount: number) => void;
  resetGame: () => void;
  setError: (error: string | null) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: true });

    socket.on('game-created', (data: { roomCode: string; hostName: string; players: Player[] }) => {
      dispatch({
        type: 'GAME_CREATED',
        roomCode: data.roomCode,
        players: data.players,
        myId: socket.id!,
        myName: data.hostName,
      });
    });

    socket.on('join-success', (data: { roomCode: string; players: Player[]; myId: string }) => {
      dispatch({ type: 'JOIN_SUCCESS', ...data });
    });

    socket.on('join-error', (data: { message: string }) => {
      dispatch({ type: 'SET_ERROR', error: data.message });
    });

    socket.on('start-error', (data: { message: string }) => {
      dispatch({ type: 'SET_ERROR', error: data.message });
    });

    socket.on('player-joined', (data: { players: Player[] }) => {
      dispatch({ type: 'PLAYER_JOINED', players: data.players });
    });

    socket.on('round-intro', (data: { round: RoundInfo; roundIndex: number; totalRounds: number; scores: PlayerScore[] }) => {
      dispatch({ type: 'ROUND_INTRO', ...data });
    });

    socket.on('question-started', (data: {
      question: Question; questionIndex: number; totalQuestions: number;
      roundIndex: number; roundName: string; roundEmoji: string; startTime: number; timeLimit: number;
    }) => {
      dispatch({ type: 'QUESTION_STARTED', ...data });
    });

    socket.on('answer-confirmed', (data: { optionId: string }) => {
      dispatch({ type: 'ANSWER_CONFIRMED', optionId: data.optionId });
    });

    socket.on('answer-submitted', (data: { answeredCount: number; totalPlayers: number; distribution: Record<string, number> }) => {
      dispatch({ type: 'ANSWER_SUBMITTED', ...data });
    });

    socket.on('question-ended', (data: { correctOptionId: string; answers: PlayerAnswer[]; scores: PlayerScore[]; distribution: Record<string, number> }) => {
      dispatch({ type: 'QUESTION_ENDED', ...data });
    });

    socket.on('round-summary', (data: { roundIndex: number; round: RoundInfo; scores: PlayerScore[]; isLastRound: boolean }) => {
      dispatch({ type: 'ROUND_SUMMARY', ...data });
    });

    socket.on('game-over', (data: { scores: PlayerScore[] }) => {
      dispatch({ type: 'GAME_OVER', scores: data.scores });
    });

    socket.on('player-disconnected', (data: { playerId: string; players: Player[] }) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', ...data });
    });

    socket.on('score-adjusted', (data: { playerName: string; avatar: string; amount: number; scores: PlayerScore[] }) => {
      dispatch({ type: 'SCORE_ADJUSTED', ...data });
    });

    socket.on('host-disconnected', () => {
      alert('The host has disconnected. The game has ended.');
      window.location.reload();
    });

    dispatch({ type: 'SET_SOCKET', socket });

    return () => { socket.disconnect(); };
  }, []);

  const createGame = useCallback((hostName: string) => {
    if (!state.socket) return;
    state.socket.emit('create-game', { hostName });
  }, [state.socket]);

  const joinGame = useCallback((roomCode: string, playerName: string) => {
    if (!state.socket) return;
    state.socket.emit('join-game', { roomCode: roomCode.toUpperCase(), playerName });
  }, [state.socket]);

  const startGame = useCallback(() => {
    if (!state.socket || !state.roomCode) return;
    state.socket.emit('start-game', { roomCode: state.roomCode });
  }, [state.socket, state.roomCode]);

  const advance = useCallback(() => {
    if (!state.socket || !state.roomCode) return;
    state.socket.emit('advance', { roomCode: state.roomCode });
  }, [state.socket, state.roomCode]);

  const submitAnswer = useCallback((optionId: string) => {
    if (!state.socket || !state.roomCode || state.myAnswer) return;
    state.socket.emit('submit-answer', { roomCode: state.roomCode, optionId });
  }, [state.socket, state.roomCode, state.myAnswer]);

  const adjustScore = useCallback((playerId: string, amount: number) => {
    if (!state.socket || !state.roomCode) return;
    state.socket.emit('adjust-score', { roomCode: state.roomCode, playerId, amount });
  }, [state.socket, state.roomCode]);

  const resetGame = useCallback(() => { dispatch({ type: 'RESET' }); }, []);
  const setError = useCallback((error: string | null) => { dispatch({ type: 'SET_ERROR', error }); }, []);

  return (
    <GameContext.Provider value={{ state, createGame, joinGame, startGame, advance, submitAnswer, adjustScore, resetGame, setError }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
