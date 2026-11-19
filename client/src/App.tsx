import { useEffect, useState } from 'react';
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
        <h1 className="font-display text-3xl text-chalk">Reconnecting to your game…</h1>
        <button onClick={leaveGame} className="text-soft hover:text-chalk text-sm font-extrabold underline min-h-[44px] px-4">
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
          <h1 className="font-display text-4xl sm:text-5xl text-chalk">Welcome back!</h1>
          <p className="text-soft text-lg font-bold mt-2">
            You were {role === 'host' ? 'hosting' : 'playing in'} game{' '}
            <span className="font-display tracking-widest text-sun">{roomCode.toUpperCase()}</span>.
          </p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <button onClick={resumeGame} className="btn-sun">
            Rejoin game
          </button>
          <button onClick={declineResume} className="btn-ghost">
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}

// Where the landing page sent the visitor: /?play=host, /?play=join or /?play=join&code=abcd
function readIntent(): { play: 'host' | 'join' | null; code: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    const play = params.get('play');
    const code = (params.get('code') ?? '').trim();
    return {
      play: play === 'host' || play === 'join' ? play : null,
      code: /^[a-z0-9]{4}$/i.test(code) ? code : '',
    };
  } catch {
    return { play: null, code: '' };
  }
}

function Page() {
  const { state, dismissResumeOffer } = useGame();
  const [intent] = useState(readIntent);
  const [showJoin, setShowJoin] = useState(intent.play === 'join');
  const [startCode, setStartCode] = useState(intent.code);

  // Keep the address bar tidy once we have read where the visitor wanted to go.
  useEffect(() => {
    if (intent.play) window.history.replaceState(null, '', window.location.pathname);
  }, [intent.play]);

  // An explicit request (a host or join link) beats the "welcome back" offer for an old game on
  // this device. The saved game is kept; the offer just doesn't get in the way, including if the
  // visitor taps Back to the start screen.
  useEffect(() => {
    if (intent.play && state.resumeOffer) dismissResumeOffer();
  }, [intent.play, state.resumeOffer, dismissResumeOffer]);

  // Route based on app view state
  const { view, isHost } = state;

  if (state.restoring) return <Restoring />;
  if (state.resumeOffer && view === 'home' && !intent.play) {
    return <ResumePrompt roomCode={state.resumeOffer.roomCode} role={state.resumeOffer.role} />;
  }

  if (view === 'home') {
    return showJoin
      ? <PlayerJoin initialCode={startCode} onBack={() => { setShowJoin(false); setStartCode(''); }} />
      : <Home onJoin={() => setShowJoin(true)} startInHostMode={intent.play === 'host'} />;
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
