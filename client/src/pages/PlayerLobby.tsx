import { useGame } from '../context/GameContext';

export default function PlayerLobby() {
  const { state, leaveGame } = useGame();
  const { roomCode, players, myId } = state;
  const me = players.find((p) => p.id === myId);

  // Bright yellow ground for the welcome, like the "who runs the show" scene on the landing page.
  return (
    <div className="screen ground-sun">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-bounce-in">
        <h1 className="sr-only">Game lobby. Room code {roomCode}.</h1>

        <div className="text-center">
          <div className="text-7xl mb-3 animate-pulse-slow" aria-hidden="true">{me?.avatar ?? '🦄'}</div>
          <h2 className="font-display text-4xl sm:text-5xl text-ink">{me?.name ?? 'You'}</h2>
          <p className="text-[#34206A] text-lg font-extrabold mt-1">You're in! 🎉</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-[#34206A] font-extrabold uppercase tracking-widest text-sm">Room code</p>
          <div className="flex gap-2" aria-label={`Room code ${roomCode.toUpperCase()}`}>
            {[...roomCode].map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="w-14 h-[4.25rem] rounded-2xl bg-ink text-sun border-b-4 border-black
                           flex items-center justify-center font-display text-5xl uppercase"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-[#34206A] font-extrabold text-sm">Players joined ({players.length})</p>
          <ul className="flex flex-wrap gap-2 justify-center">
            {players.map((player) => (
              <li
                key={player.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-extrabold
                  ${player.id === myId ? 'bg-ink text-sun' : 'bg-white text-ink'}`}
              >
                <span aria-hidden="true">{player.avatar}</span>
                <span>{player.name}</span>
                {player.id === myId && <span className="text-xs">(you)</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-ans-d animate-pulse" />
            <p className="font-extrabold text-ink text-lg">Waiting for host to start...</p>
          </div>
          <p className="text-[#4B3A7C] text-sm font-bold">
            Get ready to play! 🏆
          </p>
        </div>

        <button
          onClick={leaveGame}
          className="text-ink/70 hover:text-ink text-sm font-extrabold underline self-center min-h-[44px] px-4"
        >
          Leave game
        </button>
      </div>
    </div>
  );
}
