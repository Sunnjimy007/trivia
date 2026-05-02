import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function Home() {
  const { state, createGame, setError } = useGame();
  const [mode, setMode] = useState<'choose' | 'host'>('choose');
  const [hostName, setHostName] = useState('');

  function handleCreateGame() {
    const name = hostName.trim();
    if (!name) { setError('Please enter your name!'); return; }
    setError(null);
    createGame(name);
  }

  // ── Host creation (dark Game Master theme) ────────────────────────────────
  if (mode === 'host') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md flex flex-col gap-6 animate-slide-up">

          <button
            onClick={() => { setMode('choose'); setError(null); }}
            className="text-gray-400 hover:text-white text-base font-bold flex items-center gap-2 self-start"
          >
            ← Back
          </button>

          {/* Game Master badge */}
          <div className="text-center flex flex-col items-center gap-3">
            <div className="text-7xl">⭐</div>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40
                            rounded-full px-5 py-2">
              <span className="text-amber-400 font-bold text-lg uppercase tracking-widest">
                Game Master
              </span>
            </div>
            <p className="text-gray-400 font-bold text-base max-w-xs text-center">
              You'll control the game from your screen.<br />
              Players answer on their own phones.
            </p>
          </div>

          {/* Form */}
          <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 flex flex-col gap-5">
            <div>
              <label className="text-gray-400 font-bold text-sm uppercase tracking-widest block mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full bg-gray-800 border-2 border-gray-700 focus:border-amber-500
                           rounded-xl p-4 text-xl font-bold text-white placeholder-gray-600
                           focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {state.error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl
                              p-3 font-bold text-center text-sm">
                {state.error}
              </div>
            )}

            <button
              onClick={handleCreateGame}
              className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900
                         font-bold py-5 rounded-2xl text-xl border-b-4 border-amber-700
                         active:border-b-0 active:scale-95 transition-all"
            >
              ⭐ Create Game Room
            </button>
          </div>

          {/* What to expect */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '📺', text: 'Show on big screen' },
              { icon: '📱', text: 'Players use phones' },
              { icon: '🏆', text: 'You control pace' },
            ].map(({ icon, text }) => (
              <div key={text} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-gray-500 text-xs font-bold">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Home (purple player theme) ─────────────────────────────────────────────
  return (
    <div className="screen">
      <div className="w-full max-w-md flex flex-col items-center gap-8 animate-bounce-in">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-wiggle">🎉</div>
          <h1 className="font-display text-5xl text-white leading-tight">
            Amali's<br />Trivia Game
          </h1>
          <p className="text-white/70 text-xl mt-3 font-bold">
            7 rounds · Up to 10 players
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          {/* Host button — gold-ish to stand out */}
          <button
            onClick={() => setMode('host')}
            className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900
                       font-bold py-5 px-8 rounded-2xl text-2xl border-b-4 border-amber-700
                       active:border-b-0 active:scale-95 transition-all shadow-lg shadow-amber-500/30"
          >
            ⭐ Host a Game
          </button>

          {/* Player join button — purple */}
          <button
            onClick={() => setError(null)}
            className="btn-secondary"
            id="go-to-join"
          >
            📱 Join a Game
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">7 Rounds</p>
          <p className="text-white/50 text-sm text-center font-bold">
            General Knowledge · Australian Animals · Animals<br />
            Countries · Sports · Geography · Diwali
          </p>
        </div>
      </div>
    </div>
  );
}
