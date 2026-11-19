import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { roundCountText } from '../lib/rounds';
import { useEnabledRounds } from '../lib/useEnabledRounds';

// The four answer colours as a small brand mark, the same tiles as on the landing page.
function AnswerMark() {
  const tiles = [
    { l: 'A', cls: 'bg-ans-a border-ans-a-d text-white', rot: '-rotate-6' },
    { l: 'B', cls: 'bg-ans-b border-ans-b-d text-white', rot: 'rotate-3' },
    { l: 'C', cls: 'bg-ans-c border-ans-c-d text-ink', rot: '-rotate-3' },
    { l: 'D', cls: 'bg-ans-d border-ans-d-d text-ink', rot: 'rotate-6' },
  ];
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {tiles.map((t) => (
        <div
          key={t.l}
          className={`${t.cls} ${t.rot} w-11 h-11 rounded-xl border-b-4 flex items-center justify-center font-display text-2xl`}
        >
          {t.l}
        </div>
      ))}
    </div>
  );
}

export default function Home({ onJoin, startInHostMode = false }: { onJoin: () => void; startInHostMode?: boolean }) {
  const { state, createGame, setError } = useGame();
  const [mode, setMode] = useState<'choose' | 'host'>(startInHostMode ? 'host' : 'choose');
  const [hostName, setHostName] = useState('');
  // The rounds a game would really play right now (null until known).
  const { rounds } = useEnabledRounds();
  const hasRounds = !!rounds && rounds.length > 0;

  function handleCreateGame() {
    const name = hostName.trim();
    if (!name) { setError('Please enter your name!'); return; }
    setError(null);
    createGame(name);
  }

  // ── Host creation (dark Game Master ground) ───────────────────────────────
  if (mode === 'host') {
    return (
      <div className="screen">
        <div className="w-full max-w-md flex flex-col gap-6 animate-slide-up">
          <h1 className="sr-only">Host a game</h1>

          <button
            onClick={() => { setMode('choose'); setError(null); }}
            className="text-soft hover:text-chalk text-base font-extrabold flex items-center gap-2 self-start
                       min-h-[44px] pr-3"
          >
            ← Back
          </button>

          <div className="text-center flex flex-col items-center gap-3">
            <div className="text-7xl" aria-hidden="true">⭐</div>
            <span className="badge-sun text-base">Game Master</span>
            <p className="text-soft font-bold text-base max-w-xs">
              You'll control the game from your screen.<br />
              Players answer on their own phones.
            </p>
          </div>

          <div className="panel p-6 sm:p-8 flex flex-col gap-5">
            <div>
              <label htmlFor="host-name" className="text-soft font-extrabold text-sm uppercase tracking-widest block mb-2">
                Your name
              </label>
              <input
                id="host-name"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
                placeholder="Enter your name..."
                maxLength={20}
                className="field-dark"
                autoFocus
              />
            </div>

            {state.error && (
              <div role="alert" className="bg-ans-a/20 border-2 border-ans-a text-chalk rounded-2xl p-3 font-bold text-center text-sm">
                {state.error}
              </div>
            )}

            <button onClick={handleCreateGame} className="btn-sun">
              ⭐ Create game room
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '📺', text: 'Show on big screen' },
              { icon: '📱', text: 'Players use phones' },
              { icon: '🏆', text: 'You control pace' },
            ].map(({ icon, text }) => (
              <div key={text} className="panel rounded-2xl p-3">
                <div className="text-2xl mb-1" aria-hidden="true">{icon}</div>
                <p className="text-soft text-xs font-bold">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Home ──────────────────────────────────────────────────────────────────
  return (
    <div className="screen">
      <div className="w-full max-w-md flex flex-col items-center gap-8 animate-bounce-in">
        <div className="text-center flex flex-col items-center gap-5">
          <AnswerMark />
          <h1 className="font-display text-5xl sm:text-6xl text-chalk leading-[0.98]">
            Amali's<br />Trivia Game
          </h1>
          <p className="text-soft text-xl font-bold">
            {hasRounds ? `${roundCountText(rounds.length)} · ` : ''}Up to 10 players
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <button onClick={() => setMode('host')} className="btn-sun">
            ⭐ Host a game
          </button>
          <button onClick={() => { setError(null); onJoin(); }} className="btn-ghost">
            📱 Join a game
          </button>
        </div>

        {hasRounds && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-soft/70 text-xs font-extrabold uppercase tracking-widest">
              {roundCountText(rounds.length)}
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {rounds.map((r) => (
                <li key={r.id} className="chip">
                  <span aria-hidden="true">{r.emoji}</span> {r.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
