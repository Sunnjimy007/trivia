import { useState } from 'react';
import { useGame } from '../context/GameContext';

interface PlayerJoinProps {
  onBack: () => void;
}

export default function PlayerJoin({ onBack }: PlayerJoinProps) {
  const { state, joinGame, setError } = useGame();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'code' | 'name'>('code');

  function handleCodeSubmit() {
    if (roomCode.trim().length !== 4) {
      setError('Room code is 4 characters!');
      return;
    }
    setError(null);
    setStep('name');
  }

  function handleJoin() {
    const name = playerName.trim();
    if (!name) {
      setError('Please enter your name!');
      return;
    }
    setError(null);
    // server normalises to lowercase — just pass as-is
    joinGame(roomCode.trim(), name);
  }

  return (
    <div className="screen">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-slide-up">
        <button
          onClick={() => {
            if (step === 'name') { setStep('code'); setError(null); }
            else { onBack(); setError(null); }
          }}
          className="text-white/70 hover:text-white text-lg font-bold flex items-center gap-2 self-start"
        >
          ← Back
        </button>

        <div className="text-center">
          <div className="text-6xl mb-3">📱</div>
          <h2 className="font-display text-4xl text-white">Join a Game</h2>
          <p className="text-white/70 text-lg mt-2">
            {step === 'code' ? 'Enter the room code from the host' : 'What shall we call you?'}
          </p>
        </div>

        <div className="card flex flex-col gap-4">
          {step === 'code' ? (
            <>
              <label className="text-gray-700 font-bold text-lg">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="e.g. ab3x"
                maxLength={4}
                className="w-full border-2 border-purple-200 rounded-xl p-4 text-4xl font-display
                           text-center tracking-[0.3em] focus:outline-none focus:border-purple-500
                           text-gray-800"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <p className="text-gray-400 text-sm text-center">
                lowercase or uppercase — doesn't matter!
              </p>
              {state.error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-700 rounded-xl p-3 font-bold text-center text-sm">
                  {state.error}
                </div>
              )}
              <button onClick={handleCodeSubmit} className="btn-primary">
                Next →
              </button>
            </>
          ) : (
            <>
              <label className="text-gray-700 font-bold text-lg">Your name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full border-2 border-purple-200 rounded-xl p-4 text-xl font-bold
                           focus:outline-none focus:border-purple-500 text-gray-800"
                autoFocus
              />
              {state.error && (
                <div className="bg-red-100 border-2 border-red-300 text-red-700 rounded-xl p-3 font-bold text-center text-sm">
                  {state.error}
                </div>
              )}
              <button onClick={handleJoin} className="btn-green">
                Join Game! 🎉
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
