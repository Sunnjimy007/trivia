import type { PlayerScore } from '../types';

interface PodiumProps {
  scores: PlayerScore[];       // already sorted, best first
  highlightId?: string | null; // on a phone: the player's own id, so they can spot themselves
}

// Small tag that marks the player's own spot.
function YouTag() {
  return (
    <span className="bg-sun text-ink rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest">
      You
    </span>
  );
}

// First, second and third on a podium, then everyone else as small chips.
// Used on the host screen and on every player's phone at the end of a round, so both show the same thing.
export default function Podium({ scores, highlightId = null }: PodiumProps) {
  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);
  const isMe = (p: PlayerScore) => highlightId !== null && p.playerId === highlightId;

  // Names can be 20 characters: let them wrap inside a phone-sized column instead of pushing the podium wider.
  const nameClass = 'text-chalk font-bold text-center leading-tight break-words max-w-[6.5rem] sm:max-w-none';

  return (
    <div className="flex flex-col items-center gap-5 sm:gap-8 w-full">
      {/* Screen readers get the standings in rank order; the picture below is for eyes only. */}
      <ol className="sr-only">
        {top3.map((p, i) => (
          <li key={p.playerId}>
            {i + 1}. {p.playerName}, {p.score.toLocaleString()} points{isMe(p) ? ' (you)' : ''}
          </li>
        ))}
      </ol>

      <div className="flex items-end gap-2 sm:gap-4 justify-center w-full max-w-3xl" aria-hidden="true">
        {top3[1] && (
          <div className="flex flex-col items-center gap-1 sm:gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <span className="text-3xl sm:text-4xl">{top3[1].avatar}</span>
            <p className={`${nameClass} text-sm sm:text-lg`}>{top3[1].playerName}</p>
            {isMe(top3[1]) && <YouTag />}
            <p className="text-soft font-display text-base sm:text-xl">{top3[1].score.toLocaleString()}</p>
            <div className="w-24 sm:w-36 h-16 sm:h-24 bg-chalk-edge rounded-t-2xl flex items-center justify-center">
              <span className="font-display text-4xl sm:text-5xl text-ink">2</span>
            </div>
          </div>
        )}
        {top3[0] && (
          <div className="flex flex-col items-center gap-1 sm:gap-3 animate-bounce-in">
            <span className="text-3xl sm:text-5xl">👑</span>
            <span className="text-4xl sm:text-5xl">{top3[0].avatar}</span>
            <p className={`${nameClass} text-base sm:text-xl`}>{top3[0].playerName}</p>
            {isMe(top3[0]) && <YouTag />}
            <p className="text-sun font-display text-lg sm:text-2xl">{top3[0].score.toLocaleString()}</p>
            <div className="w-28 sm:w-44 h-24 sm:h-36 bg-sun rounded-t-2xl flex items-center justify-center">
              <span className="font-display text-5xl sm:text-6xl text-ink">1</span>
            </div>
          </div>
        )}
        {top3[2] && (
          <div className="flex flex-col items-center gap-1 sm:gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-3xl sm:text-4xl">{top3[2].avatar}</span>
            <p className={`${nameClass} text-sm sm:text-lg`}>{top3[2].playerName}</p>
            {isMe(top3[2]) && <YouTag />}
            <p className="text-soft font-display text-base sm:text-xl">{top3[2].score.toLocaleString()}</p>
            <div className="w-20 sm:w-32 h-12 sm:h-16 bg-sun-dark rounded-t-2xl flex items-center justify-center">
              <span className="font-display text-3xl sm:text-4xl text-ink">3</span>
            </div>
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <ul className="flex flex-wrap gap-2 justify-center max-w-2xl">
          {rest.map((p) => (
            <li
              key={p.playerId}
              className={`flex items-center gap-2 bg-ink-2 border rounded-xl px-3 py-2 text-sm
                          ${isMe(p) ? 'border-sun ring-2 ring-sun' : 'border-ink-4'}`}
            >
              <span className="text-soft font-bold">#{p.rank}</span>
              <span className="text-lg" aria-hidden="true">{p.avatar}</span>
              <span className="text-chalk font-bold">{p.playerName}</span>
              {isMe(p) && <YouTag />}
              <span className="text-soft font-display">{p.score.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
