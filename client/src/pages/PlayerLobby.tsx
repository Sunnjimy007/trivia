import { useGame } from '../context/GameContext';

export default function PlayerLobby() {
  const { state } = useGame();
  const { roomCode, players, myId } = state;
  const me = players.find((p) => p.id === myId);

  return (
    <div className="screen">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-bounce-in">
        <div className="text-center">
          <div className="text-7xl mb-3 animate-pulse-slow">{me?.avatar ?? '🦄'}</div>
          <h2 className="font-display text-4xl text-white">{me?.name ?? 'You'}</h2>
          <p className="text-white/70 text-lg mt-1">You're in! 🎉</p>
        </div>

        <div className="card flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Room Code</p>
            <p className="font-display text-5xl text-purple-600 tracking-widest">{roomCode}</p>
          </div>

          <div className="w-full border-t border-gray-100 pt-4">
            <p className="text-gray-500 font-bold text-sm mb-3 text-center">
              Players joined ({players.length})
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold
                    ${player.id === myId ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}
                >
                  <span>{player.avatar}</span>
                  <span>{player.name}</span>
                  {player.id === myId && <span className="text-xs">(you)</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <p className="font-bold text-gray-700 text-lg">Waiting for host to start...</p>
          </div>
          <p className="text-gray-500 text-sm">
            Get ready! Answer fast for more points 🏆
          </p>
        </div>
      </div>
    </div>
  );
}
