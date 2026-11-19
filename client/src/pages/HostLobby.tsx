import { useState } from 'react';
import { useGame } from '../context/GameContext';
import RoundsManager from './RoundsManager';
import { useEnabledRounds } from '../lib/useEnabledRounds';

export default function HostLobby() {
  const { state, startGame, leaveGame } = useGame();
  const { roomCode, players, error, myName } = state;
  const [showRoundsManager, setShowRoundsManager] = useState(false);
  // The rounds this game will really play (null until known). Refreshed after Manage Rounds closes.
  const { rounds, refresh: refreshRounds } = useEnabledRounds();
  const noRounds = rounds !== null && rounds.length === 0;
  const canStart = players.length >= 1 && !noRounds;

  return (
    <div className="min-h-screen bg-ink text-chalk flex flex-col items-center p-4 sm:p-6 gap-5 overflow-y-auto">
      <h1 className="sr-only">Host lobby. Room code {roomCode}.</h1>
      {showRoundsManager && (
        <RoundsManager onClose={() => { setShowRoundsManager(false); refreshRounds(); }} />
      )}

      <span className="badge-sun mt-2">
        <span aria-hidden="true">⭐</span> Game Master <span aria-hidden="true">⭐</span>
      </span>

      <p className="text-soft font-bold text-sm sm:text-base text-center">
        Welcome, <span className="text-chalk font-extrabold">{myName}</span>! Your game is ready.
      </p>

      {/* Two-column on md+, single on mobile */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {/* Room code: big yellow tiles, readable across a room */}
        <div className="panel p-6 sm:p-8 flex flex-col items-center gap-4">
          <p className="text-soft font-extrabold uppercase tracking-widest text-xs sm:text-sm">Room code</p>
          <div className="flex gap-2 sm:gap-3 justify-center flex-wrap" aria-label={`Room code ${roomCode.toUpperCase()}`}>
            {[...roomCode].map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="w-14 h-[4.5rem] sm:w-[4.5rem] sm:h-24 rounded-2xl bg-sun text-ink border-b-[6px] border-sun-dark
                           flex items-center justify-center font-display text-5xl sm:text-6xl uppercase"
              >
                {c}
              </span>
            ))}
          </div>
          <div className="w-full bg-ink rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-soft text-xs sm:text-sm font-bold">Players visit this site and enter:</p>
            <p className="text-sun font-display text-xl sm:text-2xl mt-1 tracking-widest uppercase">{roomCode}</p>
          </div>
          <div className="flex items-center gap-2 text-soft text-xs sm:text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-ans-d animate-pulse flex-shrink-0" />
            Waiting for players to join...
          </div>
        </div>

        {/* Player list */}
        <div className="panel p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-chalk font-extrabold text-lg sm:text-xl">Players joined</h2>
            <span className="rounded-full bg-sun px-3 py-1 font-extrabold text-xs sm:text-sm text-ink">
              {players.length} / 10
            </span>
          </div>

          <ul className="flex flex-col gap-2 min-h-[160px]">
            {players.length === 0 ? (
              <li className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-6">
                <div className="text-4xl opacity-40" aria-hidden="true">👥</div>
                <p className="text-soft font-extrabold text-sm">No players yet</p>
                <p className="text-soft/70 text-xs font-bold">Share the room code above!</p>
              </li>
            ) : (
              players.map((player, i) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 bg-ink-3 rounded-2xl px-3 py-2.5 animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <span className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center text-sun font-extrabold text-xs flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-2xl" aria-hidden="true">{player.avatar}</span>
                  <span className="text-chalk font-extrabold text-base flex-1 truncate">{player.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-ans-d flex-shrink-0" aria-label="connected" />
                </li>
              ))
            )}

            {players.length > 0 && players.length < 3 &&
              Array.from({ length: 3 - players.length }).map((_, i) => (
                <li key={`empty-${i}`} className="flex items-center gap-3 border-2 border-dashed border-ink-4 rounded-2xl px-3 py-2.5">
                  <span className="text-soft/70 font-bold text-xs">Waiting for player...</span>
                </li>
              ))
            }
          </ul>

          {players.length < 1 && (
            <p className="text-sun text-xs font-extrabold text-center">⚠️ Need at least 1 player to start</p>
          )}
        </div>
      </div>

      {/* The rounds this game will play, in order. Only switched-on rounds are listed. */}
      {rounds && rounds.length > 0 && (
        <ul className="w-full max-w-3xl flex flex-wrap justify-center gap-2">
          {rounds.map(({ id, emoji, name }, i) => (
            <li
              key={id}
              className="w-[calc(25%-0.375rem)] sm:w-24 bg-ink-2 border border-ink-4 rounded-2xl p-2 text-center"
            >
              <p className="text-soft text-xs font-extrabold">R{i + 1}</p>
              <p className="text-lg mt-0.5" aria-hidden="true">{emoji}</p>
              <p className="text-soft text-xs font-bold mt-0.5 hidden sm:block leading-tight">{name}</p>
            </li>
          ))}
        </ul>
      )}

      {noRounds && (
        <div className="w-full max-w-3xl bg-sun/15 border-2 border-sun text-sun rounded-2xl px-4 py-3 font-extrabold text-center text-sm">
          No rounds are switched on. Open "Add / Manage Rounds" and turn some on to start.
        </div>
      )}

      {error && (
        <div role="alert" className="w-full max-w-3xl bg-ans-a/20 border-2 border-ans-a text-chalk rounded-2xl px-4 py-3 font-bold text-center text-sm">
          {error}
        </div>
      )}

      <button onClick={() => setShowRoundsManager(true)} className="btn-ghost max-w-3xl !py-3 !text-base">
        📝 Add / Manage Rounds
      </button>

      <button
        onClick={startGame}
        disabled={!canStart}
        className={`btn-sun max-w-3xl !py-5 sm:!py-6 !text-xl sm:!text-2xl
          ${canStart ? '' : '!bg-ink-3 !border-ink-3 !border-b-ink-4 !text-soft/70 disabled:!opacity-100'}`}
      >
        {canStart
          ? `🚀 Start the game! (${players.length} player${players.length !== 1 ? 's' : ''})`
          : noRounds
          ? 'Turn on a round to start'
          : 'Waiting for players to join...'}
      </button>

      <button
        onClick={() => { if (confirm('Cancel this game and go back to the start?')) leaveGame(); }}
        className="text-soft hover:text-chalk text-sm font-extrabold underline min-h-[44px] px-4"
      >
        Cancel game
      </button>

      <div className="h-2" />
    </div>
  );
}
