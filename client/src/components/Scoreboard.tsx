import type { PlayerScore } from '../types';

interface ScoreboardProps {
  scores: PlayerScore[];
  highlightId?: string;
  compact?: boolean;
}

const RANK_COLORS = ['from-yellow-400 to-amber-500', 'from-slate-300 to-slate-400', 'from-amber-600 to-amber-700'];
const RANK_LABELS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ scores, highlightId, compact = false }: ScoreboardProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {scores.map((player, i) => {
        const isHighlighted = player.playerId === highlightId;
        const rankColor = RANK_COLORS[i] || 'from-indigo-400 to-indigo-500';
        const rankLabel = RANK_LABELS[i] || `${i + 1}`;

        return (
          <div
            key={player.playerId}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300
              ${isHighlighted ? 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-105' : ''}
              ${compact ? 'py-2' : 'py-3'}`}
            style={{
              background: isHighlighted
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(255,255,255,0.1)',
            }}
          >
            {/* Rank badge */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${rankColor}
                flex items-center justify-center font-display text-lg shadow-md`}
            >
              {rankLabel}
            </div>

            {/* Avatar + name */}
            <div className="text-2xl">{player.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-white font-bold truncate ${compact ? 'text-base' : 'text-lg'}`}>
                {player.playerName}
              </p>
            </div>

            {/* Score */}
            <div className={`font-display text-white ${compact ? 'text-xl' : 'text-2xl'} flex-shrink-0`}>
              {player.score.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
