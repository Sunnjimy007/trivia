import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Home from './pages/Home';
import HostLobby from './pages/HostLobby';
import PlayerJoin from './pages/PlayerJoin';
import PlayerLobby from './pages/PlayerLobby';
import HostGame from './pages/HostGame';
import PlayerGame from './pages/PlayerGame';

function AppContent() {
  const { state } = useGame();
  const [showJoin, setShowJoin] = useState(false);

  // Route based on app view state
  const { view, isHost } = state;

  // Show join page if user clicked "Join a Game"
  if (view === 'home' && showJoin) {
    return <PlayerJoin onBack={() => setShowJoin(false)} />;
  }

  // Home page - intercept "join" button click
  if (view === 'home') {
    return (
      <div onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#go-to-join')) setShowJoin(true);
      }}>
        <Home />
      </div>
    );
  }

  if (view === 'host_lobby') return <HostLobby />;
  if (view === 'player_lobby') return <PlayerLobby />;
  if (view === 'player_join') return <PlayerJoin onBack={() => {}} />;

  if (view === 'host_game' || view === 'player_game') {
    return isHost ? <HostGame /> : <PlayerGame />;
  }

  return <Home />;
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
