import { useState } from 'react';
import { useGame } from '../context/GameContext';
import RoundsManager from './RoundsManager';

const ROUNDS = [
  { emoji: '🌍', name: 'General Knowledge' },
  { emoji: '🦘', name: 'Australian Animals' },
  { emoji: '🐾', name: 'Animals' },
  { emoji: '🗺️', name: 'Countries' },
  { emoji: '⚽', name: 'Sports' },
  { emoji: '🧭', name: 'Geography' },
  { emoji: '🪔', name: 'Diwali' },
];

export default function HostLobby() {
  const { state, startGame } = useGame();
  const { roomCode, players, error, myName } = state;
  const canStart = players.length >= 1;
  const [showRoundsManager, setShowRoundsManager] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center p-4 sm:p-6 gap-5 overflow-y-auto">
      {showRoundsManager && <RoundsManager onClose={() => setShowRoundsManager(false)} />}

      {/* Game Master badge */}
      <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40
                      rounded-full px-4 py-2 mt-2">
        <span className="text-base sm:text-lg">⭐</span>
        <span className="text-amber-400 font-bold text-sm sm:text-base uppercase tracking-widest">
          Game Master
        </span>
        <span className="text-base sm:text-lg">⭐</span>
      </div>

      <p className="text-gray-400 font-bold text-sm sm:text-base text-center">
        Welcome, <span className="text-white">{myName}</span>! Your game is ready.
      </p>

      {/* Two-column on md+, single on mobile */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {/* Room code panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 sm:p-8
                        flex flex-col items-center gap-4">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs sm:text-sm">
            Room Code
          </p>
          {/* Scale the code to fit — clamp so it never overflows */}
          <div className="font-display text-6xl sm:text-7xl md:text-8xl text-white tracking-widest
                          leading-none drop-shadow-[0_0_30px_rgba(168,85,247,0.6)] text-center
                          break-all">
            {roomCode}
          </div>
          <div className="w-full bg-gray-800 rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-gray-400 text-xs sm:text-sm font-bold">
              Players visit this site and enter:
            </p>
            <p className="text-purple-400 font-bold text-lg sm:text-xl mt-1 font-display tracking-widest">
              {roomCode}
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            Waiting for players to join...
          </div>
        </div>

        {/* Player list panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-3xl p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg sm:text-xl">Players Joined</h3>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30
                             rounded-full px-3 py-1 font-bold text-xs sm:text-sm">
              {players.length} / 10
            </span>
          </div>

          <div className="flex flex-col gap-2 min-h-[160px]">
            {players.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-6">
                <div className="text-4xl opacity-30">👥</div>
                <p className="text-gray-500 font-bold text-sm">No players yet</p>
                <p className="text-gray-600 text-xs">Share the room code above!</p>
              </div>
            ) : (
              players.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5 animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center
                                  text-purple-300 font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="text-white font-bold text-base flex-1 truncate">{player.name}</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                </div>
              ))
            )}

            {players.length > 0 && players.length < 3 &&
              Array.from({ length: 3 - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 border border-dashed border-gray-700
                             rounded-xl px-3 py-2.5"
                >
                  <span className="text-gray-600 font-bold text-xs">Waiting for player...</span>
                </div>
              ))
            }
          </div>

          {!canStart && (
            <p className="text-amber-400 text-xs font-bold text-center">
              ⚠️ Need at least 1 player to start
            </p>
          )}
        </div>
      </div>

      {/* Round list — wraps cleanly on mobile */}
      <div className="w-full max-w-3xl grid grid-cols-4 sm:grid-cols-7 gap-2">
        {ROUNDS.map(({ emoji, name }, i) => (
          <div key={name} className="bg-gray-900 border border-gray-800 rounded-xl p-2 text-center">
            <p className="text-gray-500 text-xs font-bold">R{i + 1}</p>
            <p className="text-lg mt-0.5">{emoji}</p>
            <p className="text-gray-500 text-xs mt-0.5 hidden sm:block leading-tight">{name}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="w-full max-w-3xl bg-red-500/20 border border-red-500/40 text-red-400
                        rounded-xl px-4 py-3 font-bold text-center text-sm">
          {error}
        </div>
      )}

      {/* Manage Rounds */}
      <button
        onClick={() => setShowRoundsManager(true)}
        className="w-full max-w-3xl py-3 rounded-2xl text-base font-bold
                   bg-gray-800 hover:bg-gray-700 border border-gray-600
                   text-gray-300 hover:text-white transition-all"
      >
        📝 Add / Manage Rounds
      </button>

      {/* Start button */}
      <button
        onClick={startGame}
        disabled={!canStart}
        className={`w-full max-w-3xl py-5 sm:py-6 rounded-2xl text-xl sm:text-2xl font-bold
          transition-all duration-200 border-b-4 active:scale-95 active:border-b-0
          ${canStart
            ? 'bg-emerald-500 border-emerald-700 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
            : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'}`}
      >
        {canStart
          ? `🚀 Start the Game! (${players.length} player${players.length !== 1 ? 's' : ''})`
          : 'Waiting for players to join...'}
      </button>

      {/* Bottom padding for mobile */}
      <div className="h-2" />
    </div>
  );
}
