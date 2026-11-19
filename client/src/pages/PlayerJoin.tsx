import { useState } from 'react';
import { useGame } from '../context/GameContext';

interface PlayerJoinProps {
  onBack: () => void;
  // A room code typed on the landing page: skip straight to asking for a name.
  initialCode?: string;
}

export default function PlayerJoin({ onBack, initialCode = '' }: PlayerJoinProps) {
  const { state, joinGame, setError } = useGame();
  const [roomCode, setRoomCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'code' | 'name'>(initialCode ? 'name' : 'code');

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

  const errorBox = state.error && (
    <div role="alert" className="bg-ans-a/15 border-2 border-ans-a text-ink rounded-2xl p-3 font-bold text-center text-sm">
      {state.error}
    </div>
  );

  // Calm, pale ground: the same quiet scene as "Join with four letters" on the landing page.
  return (
    <div className="screen ground-chalk">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-slide-up">
        <button
          onClick={() => {
            if (step === 'name') { setStep('code'); setError(null); }
            else { onBack(); setError(null); }
          }}
          className="text-ink/70 hover:text-ink text-lg font-extrabold flex items-center gap-2 self-start
                     min-h-[44px] pr-3"
        >
          ← Back
        </button>

        <div className="text-center">
          <div className="text-6xl mb-3" aria-hidden="true">📱</div>
          <h1 className="font-display text-4xl sm:text-5xl text-ink">Join a game</h1>
          <p className="text-[#4B3A7C] text-lg font-bold mt-2">
            {step === 'code' ? 'Enter the room code from the host' : 'What shall we call you?'}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {step === 'code' ? (
            <>
              <label htmlFor="room-code" className="text-ink font-extrabold text-lg">Room code</label>
              <input
                id="room-code"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="e.g. ab3x"
                maxLength={4}
                className="field text-center font-display font-normal text-4xl tracking-[0.3em] uppercase
                           placeholder:font-body placeholder:text-xl placeholder:tracking-normal placeholder:normal-case"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <p className="text-[#4B3A7C] text-sm text-center font-bold">
                Lowercase or uppercase, it doesn't matter.
              </p>
              {errorBox}
              <button onClick={handleCodeSubmit} className="btn-ink">
                Next →
              </button>
            </>
          ) : (
            <>
              <label htmlFor="player-name" className="text-ink font-extrabold text-lg">Your name</label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter your name..."
                maxLength={20}
                className="field"
                autoFocus
              />
              {errorBox}
              <button onClick={handleJoin} className="btn-ink">
                Join game! 🎉
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
