import type { PlayerScore } from '../types';

interface ScoreboardProps {
  scores: PlayerScore[];
  highlightId?: string;
  compact?: boolean;
}

const RANK_LABELS = ['🥇', '🥈', '🥉'];

// Chalk rows with ink text read on every ground (ink, yellow, or the green and rose result grounds).
// The player's own row gets a double outline (ink inside, yellow outside) so it stands out on any of them.
export default function Scoreboard({ scores, highlightId, compact = false }: ScoreboardProps) {
  return (
    <ol className="flex flex-col gap-2 w-full">
      {scores.map((player, i) => {
        const isHighlighted = player.playerId === highlightId;
        const rankLabel = RANK_LABELS[i] || `${i + 1}`;

        return (
          <li
            key={player.playerId}
            aria-current={isHighlighted ? 'true' : undefined}
            className={`flex items-center gap-3 rounded-2xl px-4 transition-all duration-300 text-ink
              ${isHighlighted
                ? 'bg-white ring-4 ring-ink outline outline-4 outline-sun outline-offset-4 my-1'
                : 'bg-chalk'}
              ${compact ? 'py-2' : 'py-3'}`}
          >
            {/* Rank badge */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ink text-sun flex items-center justify-center font-display text-lg">
              {rankLabel}
            </div>

            {/* Avatar + name */}
            <div className="text-2xl" aria-hidden="true">{player.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className={`font-extrabold truncate ${compact ? 'text-base' : 'text-lg'}`}>
                {player.playerName}
              </p>
            </div>

            {/* Score */}
            <div className={`font-display ${compact ? 'text-xl' : 'text-2xl'} flex-shrink-0 tabular-nums`}>
              {player.score.toLocaleString()}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
