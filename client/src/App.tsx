import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import ConnectionBanner from './components/ConnectionBanner';
import Home from './pages/Home';
import HostLobby from './pages/HostLobby';
import PlayerJoin from './pages/PlayerJoin';
import PlayerLobby from './pages/PlayerLobby';
import HostGame from './pages/HostGame';
import PlayerGame from './pages/PlayerGame';

// Shown for a moment on page load while we get back into a game this browser was already in.
function Restoring() {
  const { leaveGame } = useGame();
  return (
    <div className="screen">
      <div className="text-center flex flex-col items-center gap-6">
        <div className="text-7xl animate-wiggle">🎉</div>
        <p className="text-white text-xl font-bold">Reconnecting to your game…</p>
        <button onClick={leaveGame} className="text-white/60 hover:text-white text-sm font-bold underline">
          Start over
        </button>
      </div>
    </div>
  );
}

// A different tab (or a relaunched app) on this device was in a game. Ask before taking that seat back,
// because doing so would knock the other tab out of it.
function ResumePrompt({ roomCode, role }: { roomCode: string; role: 'host' | 'player' }) {
  const { resumeGame, declineResume } = useGame();
  return (
    <div className="screen">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center animate-bounce-in">
        <div className="text-7xl">👋</div>
        <div>
          <h2 className="font-display text-4xl text-white">Welcome back!</h2>
          <p className="text-white/70 text-lg mt-2">
            You were {role === 'host' ? 'hosting' : 'playing in'} game{' '}
            <span className="font-display tracking-widest text-white">{roomCode.toUpperCase()}</span>.
          </p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <button onClick={resumeGame} className="w-full bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-4 rounded-2xl text-xl border-b-4 border-amber-700 active:border-b-0 active:scale-95 transition-all">
            Rejoin game
          </button>
          <button onClick={declineResume} className="btn-secondary">
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}

function Page() {
  const { state } = useGame();
  const [showJoin, setShowJoin] = useState(false);

  // Route based on app view state
  const { view, isHost } = state;

  if (state.restoring) return <Restoring />;
  if (state.resumeOffer && view === 'home') {
    return <ResumePrompt roomCode={state.resumeOffer.roomCode} role={state.resumeOffer.role} />;
  }

  if (view === 'home') {
    return showJoin
      ? <PlayerJoin onBack={() => setShowJoin(false)} />
      : <Home onJoin={() => setShowJoin(true)} />;
  }

  if (view === 'host_lobby') return <HostLobby />;
  if (view === 'player_lobby') return <PlayerLobby />;
  if (view === 'player_join') return <PlayerJoin onBack={() => {}} />;

  if (view === 'host_game' || view === 'player_game') {
    return isHost ? <HostGame /> : <PlayerGame />;
  }

  return <Home onJoin={() => setShowJoin(true)} />;
}

function AppContent() {
  return (
    <>
      <ConnectionBanner />
      <Page />
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
