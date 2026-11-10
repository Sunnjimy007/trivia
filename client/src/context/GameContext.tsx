import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  AppView,
  GameState,
  Player,
  PlayerAnswer,
  PlayerScore,
  Question,
  RoomSnapshot,
  RoundInfo,
} from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// ── Remembering our seat so a refresh or dropped connection can rejoin ────────
// The server hands each browser a secret token when it creates/joins a game. We keep it in
// sessionStorage (this tab) and localStorage (so a relaunched phone app / new tab can still resume).
const SESSION_KEY = 'trivia-session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;   // a game never lasts this long
const FINISHED_TTL_MS = 10 * 60 * 1000;       // after game over, only keep it briefly

interface StoredSession {
  roomCode: string;
  token: string;
  role: 'host' | 'player';
  expiresAt: number;
}

function readSession(storage: Storage): StoredSession | null {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (typeof s?.roomCode !== 'string' || typeof s?.token !== 'string' || typeof s?.expiresAt !== 'number') return null;
    if (s.expiresAt < Date.now()) return null;
    return s;
  } catch {
    return null; // storage unavailable (private mode, blocked) or corrupt
  }
}

// The seed of this very tab (survives a refresh). Safe to resume automatically.
function loadTabSession(): StoredSession | null {
  try { return readSession(sessionStorage); } catch { return null; }
}

// The last game this device was in. A *new* tab or a relaunched app finds this, but must ask first,
// because taking the seat over would silently kick the tab that is still playing.
function loadDeviceSession(): StoredSession | null {
  try { return readSession(localStorage); } catch { return null; }
}

function saveSession(s: Omit<StoredSession, 'expiresAt'>, ttlMs = SESSION_TTL_MS) {
  const value = JSON.stringify({ ...s, expiresAt: Date.now() + ttlMs });
  try { sessionStorage.setItem(SESSION_KEY, value); } catch { /* ignore */ }
  try { localStorage.setItem(SESSION_KEY, value); } catch { /* ignore */ }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

interface AppState {
  socket: Socket | null;
  connection: 'connecting' | 'online' | 'offline';
  // True while we are trying to get back into this tab's game (page just loaded / refreshed).
  restoring: boolean;
  // A game from this device that a different tab was in: we ask before rejoining it.
  resumeOffer: { roomCode: string; role: 'host' | 'player' } | null;
  hostConnected: boolean;
  notice: string | null;
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
  adjustedPlayerIds: string[];
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
  connection: 'connecting',
  restoring: loadTabSession() !== null,
  resumeOffer: (() => {
    if (loadTabSession()) return null;
    const s = loadDeviceSession();
    return s ? { roomCode: s.roomCode, role: s.role } : null;
  })(),
  hostConnected: true,
  notice: null,
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
  adjustedPlayerIds: [],
};

type Action =
  | { type: 'SET_SOCKET'; socket: Socket }
  | { type: 'SET_CONNECTION'; connection: AppState['connection'] }
  | { type: 'HOST_CONNECTION'; connected: boolean }
  | { type: 'REJOINED'; snapshot: RoomSnapshot }
  | { type: 'RESTORE_FAILED' }
  | { type: 'ACCEPT_RESUME' }
  | { type: 'DECLINE_RESUME' }
  | { type: 'PLAYERS_UPDATED'; players: Player[]; scores: PlayerScore[]; adjustedPlayerIds: string[] }
  | { type: 'CLEAR_NOTICE' }
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
  | { type: 'SCORE_ADJUSTED'; playerId: string; playerName: string; avatar: string; amount: number; scores: PlayerScore[] }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.socket };

    case 'SET_CONNECTION':
      return { ...state, connection: action.connection };

    case 'HOST_CONNECTION':
      return { ...state, hostConnected: action.connected };

    case 'CLEAR_NOTICE':
      return { ...state, notice: null };

    case 'ACCEPT_RESUME':
      return { ...state, resumeOffer: null, restoring: true };

    case 'DECLINE_RESUME':
      return { ...state, resumeOffer: null };

    // The server restored our seat: redraw whatever phase the game is in right now.
    case 'REJOINED': {
      const s = action.snapshot;
      const inLobby = s.phase === 'lobby';
      return {
        ...state,
        view: s.isHost ? (inLobby ? 'host_lobby' : 'host_game') : (inLobby ? 'player_lobby' : 'player_game'),
        restoring: false,
        notice: null,
        error: null,
        isHost: s.isHost,
        myId: s.myId,
        myName: s.myName,
        roomCode: s.roomCode,
        players: s.players,
        hostConnected: s.hostConnected,
        myAnswer: s.myAnswer,
        answeredCount: s.answeredCount,
        answerDistribution: s.distribution,
        adjustedPlayerIds: s.adjustedPlayerIds,
        lastAdjustment: null,
        game: {
          phase: s.phase,
          roomCode: s.roomCode,
          players: s.players,
          currentRound: s.round,
          roundIndex: s.roundIndex,
          totalRounds: s.totalRounds || initialGame.totalRounds,
          currentQuestion: s.question,
          questionIndex: s.questionIndex,
          totalQuestions: s.totalQuestions,
          questionStartTime: s.questionStartTime,
          timeLimit: s.timeLimit,
          answers: s.answers,
          correctOptionId: s.correctOptionId,
          scores: s.scores,
          isLastRound: s.isLastRound,
        },
      };
    }

    // The saved game is gone (it ended, or the server restarted): go back to a clean home screen.
    case 'RESTORE_FAILED':
      return {
        ...initialState,
        socket: state.socket,
        connection: state.connection,
        restoring: false,
        resumeOffer: null,
        notice: state.view !== 'home' ? 'That game has ended.' : null,
      };

    // Someone's seat moved to a new connection, so their id (and the leaderboard entries) changed.
    case 'PLAYERS_UPDATED':
      return {
        ...state,
        players: action.players,
        adjustedPlayerIds: action.adjustedPlayerIds,
        game: { ...state.game, players: action.players, scores: action.scores },
      };

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
        adjustedPlayerIds: [],
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
        adjustedPlayerIds: [...state.adjustedPlayerIds, action.playerId],
        lastAdjustment: { playerName: action.playerName, avatar: action.avatar, amount: action.amount },
        game: { ...state.game, scores: action.scores },
      };

    case 'RESET':
      return { ...initialState, socket: state.socket, connection: state.connection, restoring: false, resumeOffer: null };

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
  // Forget the saved seat and start over from the home screen (used by "Play Again" / "Leave game").
  leaveGame: () => void;
  // Answer the "welcome back" question shown when a new tab finds a game this device was in.
  resumeGame: () => void;
  declineResume: () => void;
  clearNotice: () => void;
  setError: (error: string | null) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: true });

    // (Re)connected, including after a refresh or a dropped connection. If this browser was in a
    // game, ask the server to give it its seat back.
    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTION', connection: 'online' });
      const session = loadTabSession();
      if (session) socket.emit('rejoin-game', { roomCode: session.roomCode, token: session.token });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTION', connection: 'offline' });
    });

    socket.on('rejoin-success', (snapshot: RoomSnapshot) => {
      dispatch({ type: 'REJOINED', snapshot });
    });

    socket.on('rejoin-error', () => {
      clearSession();
      dispatch({ type: 'RESTORE_FAILED' });
    });

    socket.on('players-updated', (data: { players: Player[]; scores: PlayerScore[]; adjustedPlayerIds: string[] }) => {
      dispatch({ type: 'PLAYERS_UPDATED', ...data });
    });

    socket.on('host-connection', (data: { connected: boolean }) => {
      dispatch({ type: 'HOST_CONNECTION', connected: data.connected });
    });

    socket.on('game-created', (data: { roomCode: string; hostName: string; players: Player[]; token: string }) => {
      saveSession({ roomCode: data.roomCode, token: data.token, role: 'host' });
      dispatch({
        type: 'GAME_CREATED',
        roomCode: data.roomCode,
        players: data.players,
        myId: socket.id!,
        myName: data.hostName,
      });
    });

    socket.on('join-success', (data: { roomCode: string; players: Player[]; myId: string; token: string }) => {
      saveSession({ roomCode: data.roomCode, token: data.token, role: 'player' });
      dispatch({ type: 'JOIN_SUCCESS', roomCode: data.roomCode, players: data.players, myId: data.myId });
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
      // The game is finished: a refresh can still show the final scores for a few minutes, then it's forgotten.
      const session = loadTabSession();
      if (session) saveSession({ roomCode: session.roomCode, token: session.token, role: session.role }, FINISHED_TTL_MS);
      dispatch({ type: 'GAME_OVER', scores: data.scores });
    });

    socket.on('player-disconnected', (data: { playerId: string; players: Player[] }) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', ...data });
    });

    socket.on('score-adjusted', (data: { playerId: string; playerName: string; avatar: string; amount: number; scores: PlayerScore[] }) => {
      dispatch({ type: 'SCORE_ADJUSTED', ...data });
    });

    // Sent only after the host has been gone long enough that the room was closed.
    socket.on('host-disconnected', () => {
      clearSession();
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

  const resetGame = useCallback(() => {
    clearSession();
    dispatch({ type: 'RESET' });
  }, []);
  const leaveGame = useCallback(() => {
    clearSession();
    window.location.reload();
  }, []);
  const resumeGame = useCallback(() => {
    const s = loadDeviceSession();
    if (!s) { dispatch({ type: 'DECLINE_RESUME' }); return; }
    // Adopt the seat into this tab, so a refresh from here on resumes it automatically.
    saveSession({ roomCode: s.roomCode, token: s.token, role: s.role }, Math.max(1000, s.expiresAt - Date.now()));
    dispatch({ type: 'ACCEPT_RESUME' });
    if (state.socket?.connected) state.socket.emit('rejoin-game', { roomCode: s.roomCode, token: s.token });
  }, [state.socket]);
  const declineResume = useCallback(() => {
    clearSession();
    dispatch({ type: 'DECLINE_RESUME' });
  }, []);
  const clearNotice = useCallback(() => { dispatch({ type: 'CLEAR_NOTICE' }); }, []);
  const setError = useCallback((error: string | null) => { dispatch({ type: 'SET_ERROR', error }); }, []);

  return (
    <GameContext.Provider value={{ state, createGame, joinGame, startGame, advance, submitAnswer, adjustScore, resetGame, leaveGame, resumeGame, declineResume, clearNotice, setError }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
