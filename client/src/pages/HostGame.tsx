import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';
import type { PlayerScore } from '../types';

const OPTION_STYLES = [
  { tile: 'bg-rose-600 border-rose-800', bar: 'bg-rose-400', label: 'bg-rose-800' },
  { tile: 'bg-blue-600 border-blue-800', bar: 'bg-blue-400', label: 'bg-blue-800' },
  { tile: 'bg-amber-500 border-amber-700', bar: 'bg-amber-300', label: 'bg-amber-700' },
  { tile: 'bg-emerald-600 border-emerald-800', bar: 'bg-emerald-400', label: 'bg-emerald-800' },
];

// ── Bonus/penalty card (used in round_intro, round_summary, game_over) ─────────
function BonusRow({
  p,
  onAdjust,
  isAdjusted,
}: {
  p: PlayerScore;
  onAdjust: (id: string, amt: number) => void;
  isAdjusted: boolean;
}) {
  return (
    <div className="bg-gray-800 rounded-2xl p-3 flex flex-col gap-2">
      {/* Player info */}
      <div className="flex items-center gap-2">
        <span className="text-2xl flex-shrink-0">{p.avatar}</span>
        <span className="flex-1 text-white font-bold text-base truncate">{p.playerName}</span>
        <span className="text-amber-300 font-display text-lg flex-shrink-0">
          {p.score.toLocaleString()} pts
        </span>
        {isAdjusted && (
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Done</span>
        )}
      </div>
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAdjust(p.playerId, -100)}
          disabled={isAdjusted}
          className={`flex items-center justify-center gap-1.5 text-white font-bold text-base
                     py-2.5 rounded-xl transition-all touch-manipulation border-b-2
                     ${isAdjusted
                       ? 'bg-gray-600 border-gray-700 opacity-40 cursor-not-allowed'
                       : 'bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-95 border-red-800'}`}
        >
          <span className="text-lg">−</span>
          <span>100 pts</span>
        </button>
        <button
          onClick={() => onAdjust(p.playerId, 100)}
          disabled={isAdjusted}
          className={`flex items-center justify-center gap-1.5 text-white font-bold text-base
                     py-2.5 rounded-xl transition-all touch-manipulation border-b-2
                     ${isAdjusted
                       ? 'bg-gray-600 border-gray-700 opacity-40 cursor-not-allowed'
                       : 'bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95 border-green-800'}`}
        >
          <span className="text-lg">+</span>
          <span>100 pts</span>
        </button>
      </div>
    </div>
  );
}

// ── Leaderboard sidebar — score + prominent bonus buttons ─────────────────────
function LeaderboardSidebar({
  scores,
  onAdjust,
  adjustedIds,
}: {
  scores: PlayerScore[];
  onAdjust: (id: string, amt: number) => void;
  adjustedIds: string[];
}) {
  const RANK_ICONS = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex flex-col gap-2 w-full lg:w-72 xl:w-80 flex-shrink-0">
      {/* Header */}
      <div className="bg-gray-800/60 rounded-xl px-3 py-2 text-center">
        <p className="text-gray-300 font-bold text-xs uppercase tracking-widest">
          🏆 Scores &amp; Bonus Points
        </p>
      </div>

      {scores.map((p, i) => {
        const isAdjusted = adjustedIds.includes(p.playerId);
        return (
          <div key={p.playerId} className="bg-gray-800/80 rounded-2xl p-2.5 flex flex-col gap-2">
            {/* Rank + name + score */}
            <div className="flex items-center gap-2">
              <span className="text-base w-6 text-center flex-shrink-0">
                {RANK_ICONS[i] ?? `${i + 1}`}
              </span>
              <span className="text-xl flex-shrink-0">{p.avatar}</span>
              <span className="flex-1 text-white font-bold text-sm truncate">{p.playerName}</span>
              <span className="text-amber-300 font-display text-sm flex-shrink-0">
                {p.score.toLocaleString()}
              </span>
              {isAdjusted && (
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Done</span>
              )}
            </div>
            {/* Bonus / penalty buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onAdjust(p.playerId, -100)}
                disabled={isAdjusted}
                className={`flex items-center justify-center gap-1 text-white font-bold text-xs
                           py-2 rounded-lg transition-all touch-manipulation border-b-2
                           ${isAdjusted
                             ? 'bg-gray-600 border-gray-700 opacity-40 cursor-not-allowed'
                             : 'bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-95 border-red-800'}`}
                title={`Remove 100 pts from ${p.playerName}`}
              >
                <span>−</span><span>100 pts</span>
              </button>
              <button
                onClick={() => onAdjust(p.playerId, 100)}
                disabled={isAdjusted}
                className={`flex items-center justify-center gap-1 text-white font-bold text-xs
                           py-2 rounded-lg transition-all touch-manipulation border-b-2
                           ${isAdjusted
                             ? 'bg-gray-600 border-gray-700 opacity-40 cursor-not-allowed'
                             : 'bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95 border-green-800'}`}
                title={`Give 100 pts to ${p.playerName}`}
              >
                <span>+</span><span>100 pts</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Adjustment toast ──────────────────────────────────────────────────────────
function AdjustmentToast({
  adjustment,
}: {
  adjustment: { playerName: string; avatar: string; amount: number } | null;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!adjustment) return;
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2000);
  }, [adjustment]);

  if (!visible || !adjustment) return null;
  const isBonus = adjustment.amount > 0;
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                  px-5 py-3 rounded-2xl shadow-2xl border-2 animate-bounce-in
                  ${isBonus ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'}`}
    >
      <span className="text-2xl sm:text-3xl">{adjustment.avatar}</span>
      <div>
        <p className="font-bold text-white text-base">{adjustment.playerName}</p>
        <p className={`font-display text-xl ${isBonus ? 'text-green-300' : 'text-red-300'}`}>
          {isBonus ? '+100 pts 🎉' : '−100 pts 😬'}
        </p>
      </div>
    </div>
  );
}

// ── Host wrapper ──────────────────────────────────────────────────────────────
export default function HostGame() {
  const { state, advance, adjustScore } = useGame();
  const { game, players, answeredCount, answerDistribution, myName, lastAdjustment, adjustedPlayerIds } = state;

  // ── Round Intro ─────────────────────────────────────────────────────────
  if (game.phase === 'round_intro') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center
                      p-4 sm:p-8 gap-5 sm:gap-8 overflow-y-auto">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30
                        rounded-full px-4 py-1.5">
          <span className="text-amber-400 font-bold text-xs sm:text-sm uppercase tracking-widest">
            ⭐ Game Master: {myName}
          </span>
        </div>

        {/* Round card */}
        <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 sm:p-12 lg:p-16
                        text-center shadow-2xl max-w-3xl w-full animate-bounce-in">
          <div className="text-6xl sm:text-8xl lg:text-9xl mb-4 sm:mb-6">
            {game.currentRound?.emoji}
          </div>
          <div className="inline-block bg-purple-500/20 border border-purple-500/30 rounded-full
                          px-4 py-1.5 mb-4">
            <span className="text-purple-300 font-bold text-xs sm:text-sm uppercase tracking-widest">
              Round {game.roundIndex + 1} of {game.totalRounds}
            </span>
          </div>
          <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl text-white mb-3">
            {game.currentRound?.name}
          </h2>
          <p className="text-gray-300 text-base sm:text-xl lg:text-2xl font-bold">
            {game.currentRound?.description}
          </p>
          <p className="text-gray-500 text-sm sm:text-lg mt-2">
            {game.currentRound?.totalQuestions} questions
          </p>
        </div>

        {/* Bonus / penalty — always visible once players exist */}
        {game.scores.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-full max-w-lg">
            <p className="text-white font-bold text-sm uppercase tracking-widest text-center mb-3">
              ✨ Bonus &amp; Penalty Points
            </p>
            <div className="flex flex-col gap-3">
              {game.scores.map((p) => (
                <BonusRow key={p.playerId} p={p} onAdjust={adjustScore} isAdjusted={adjustedPlayerIds.includes(p.playerId)} />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={advance}
          className="w-full max-w-md bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
                     text-white font-bold text-xl sm:text-3xl py-5 sm:py-6 rounded-2xl
                     border-b-4 border-emerald-700 active:border-b-0 active:scale-95
                     transition-all shadow-lg shadow-emerald-500/30"
        >
          🚀 Begin Round!
        </button>
      </div>
    );
  }

  // ── Question Active ──────────────────────────────────────────────────────
  if (game.phase === 'question_active') {
    const totalPlayers = players.length;
    const progressPct = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

    return (
      // scrollable on mobile, fixed-height on lg+
      <div className="bg-gray-950 min-h-screen overflow-y-auto
                      lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="flex flex-col p-3 gap-3 lg:flex-1 lg:min-h-0">

          {/* Top bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-amber-400 font-bold text-xs sm:text-sm">⭐ {myName}</span>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-white font-bold text-xs sm:text-sm">
                {game.currentRound?.emoji} Q{game.questionIndex + 1}/{game.totalQuestions}
              </span>
            </div>
            <div className="flex-1" />
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-white font-bold text-xs sm:text-sm">
                {answeredCount}/{totalPlayers} ✓
              </span>
            </div>
            <Timer startTime={game.questionStartTime} timeLimit={game.timeLimit} />
          </div>

          {/* Two-column on lg+, stacked on mobile */}
          <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-3">

            {/* LEFT: question + tiles + progress */}
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6
                              text-center">
                <p className="font-display text-xl sm:text-3xl lg:text-4xl text-white leading-tight">
                  {game.currentQuestion?.text}
                </p>
              </div>

              {/* Fixed-height tiles on mobile, flex-1 on desktop */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3
                              h-[260px] sm:h-[320px] lg:h-auto lg:flex-1">
                {game.currentQuestion?.options.map((opt, i) => {
                  const style = OPTION_STYLES[i];
                  const count = answerDistribution[opt.id] ?? 0;
                  const barWidth = totalPlayers > 0 ? (count / totalPlayers) * 100 : 0;
                  return (
                    <div
                      key={opt.id}
                      className={`${style.tile} rounded-2xl border-b-4 flex flex-col
                                  p-2 sm:p-4 gap-2 relative overflow-hidden`}
                    >
                      <div
                        className={`absolute inset-0 ${style.bar} opacity-20 transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="relative flex items-start gap-2">
                        <div className={`${style.label} rounded-lg w-8 h-8 sm:w-11 sm:h-11
                                        flex items-center justify-center font-display
                                        text-lg sm:text-2xl text-white flex-shrink-0`}>
                          {opt.id}
                        </div>
                        <p className="text-white font-bold text-xs sm:text-base lg:text-lg leading-tight flex-1">
                          {opt.text}
                        </p>
                      </div>
                      {count > 0 && (
                        <div className="relative flex justify-end">
                          <span className="bg-black/30 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-xl p-2 sm:p-3">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs font-bold text-center mt-1">
                  {answeredCount === totalPlayers && totalPlayers > 0
                    ? '✅ All answered!'
                    : `${totalPlayers - answeredCount} still thinking...`}
                </p>
              </div>
            </div>

            {/* RIGHT: leaderboard + bonus — full width below on mobile */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 lg:overflow-y-auto lg:min-h-0">
              <LeaderboardSidebar scores={game.scores} onAdjust={adjustScore} adjustedIds={adjustedPlayerIds} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Question Results ─────────────────────────────────────────────────────
  if (game.phase === 'question_results') {
    const correct = game.answers
      .filter((a) => a.isCorrect)
      .sort((a, b) => a.answerOrder - b.answerOrder);

    return (
      <div className="bg-gray-950 min-h-screen overflow-y-auto
                      lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="flex flex-col p-3 gap-3 lg:flex-1 lg:min-h-0">

          {/* Top bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-amber-400 font-bold text-xs sm:text-sm">⭐ {myName}</span>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-white font-bold text-xs sm:text-sm">
                {game.currentRound?.emoji} Q{game.questionIndex + 1}/{game.totalQuestions} — Results
              </span>
            </div>
            <div className="flex-1" />
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-green-400 font-bold text-xs sm:text-sm">
                {correct.length}/{players.length} correct
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-3">

            {/* LEFT: answer tiles + next button */}
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3 sm:p-5 text-center">
                <p className="font-display text-lg sm:text-3xl text-white leading-tight">
                  {game.currentQuestion?.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3
                              h-[260px] sm:h-[320px] lg:h-auto lg:flex-1">
                {game.currentQuestion?.options.map((opt, i) => {
                  const style = OPTION_STYLES[i];
                  const isCorrect = opt.id === game.correctOptionId;
                  const whoChose = game.answers.filter((a) => a.optionId === opt.id);
                  const count = answerDistribution[opt.id] ?? 0;
                  const barWidth = players.length > 0 ? (count / players.length) * 100 : 0;
                  return (
                    <div
                      key={opt.id}
                      className={`rounded-2xl border-b-4 flex flex-col p-2 sm:p-4 gap-2
                                  relative overflow-hidden transition-all duration-500
                                  ${isCorrect
                                    ? 'bg-emerald-700 border-emerald-900 ring-2 sm:ring-4 ring-emerald-400'
                                    : 'bg-gray-800 border-gray-700 opacity-50'}`}
                    >
                      <div
                        className={`absolute inset-0 ${isCorrect ? 'bg-emerald-400' : style.bar} opacity-10`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="relative flex items-center gap-2">
                        <div className={`rounded-lg w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
                                        font-display text-base sm:text-xl text-white flex-shrink-0
                                        ${isCorrect ? 'bg-emerald-900' : style.label}`}>
                          {isCorrect ? '✓' : opt.id}
                        </div>
                        <p className={`font-bold text-xs sm:text-sm lg:text-base leading-tight flex-1
                                       ${isCorrect ? 'text-white' : 'text-gray-400'}`}>
                          {opt.text}
                        </p>
                        <span className={`font-display text-sm flex-shrink-0
                                          ${isCorrect ? 'text-emerald-200' : 'text-gray-500'}`}>
                          {count}
                        </span>
                      </div>
                      {whoChose.length > 0 && (
                        <div className="relative flex flex-wrap gap-1">
                          {whoChose.map((a) => (
                            <div
                              key={a.playerId}
                              className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-bold
                                          ${a.isCorrect ? 'bg-emerald-900/70 text-emerald-200' : 'bg-gray-700 text-gray-300'}`}
                            >
                              <span>{a.avatar}</span>
                              {a.isCorrect && (
                                <span className="text-amber-300 font-display">+{a.pointsEarned}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={advance}
                className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white
                           font-bold text-lg sm:text-xl py-4 rounded-2xl border-b-4
                           border-purple-800 active:border-b-0 active:scale-95 transition-all"
              >
                {game.questionIndex + 1 >= game.totalQuestions
                  ? '📊 Round Summary →'
                  : `Next Question → (${game.questionIndex + 2}/${game.totalQuestions})`}
              </button>
            </div>

            {/* RIGHT: leaderboard + bonus — ALWAYS visible, full width below on mobile */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 lg:overflow-y-auto lg:min-h-0">
              <LeaderboardSidebar scores={game.scores} onAdjust={adjustScore} adjustedIds={adjustedPlayerIds} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Round Summary ────────────────────────────────────────────────────────
  if (game.phase === 'round_summary') {
    const top3 = game.scores.slice(0, 3);
    const rest = game.scores.slice(3);

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center
                      p-4 sm:p-8 gap-5 sm:gap-8 overflow-y-auto">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="text-center animate-bounce-in">
          <div className="text-5xl sm:text-7xl mb-3">{game.currentRound?.emoji}</div>
          <div className="inline-block bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 mb-3">
            <span className="text-purple-300 font-bold text-xs sm:text-sm uppercase tracking-widest">
              Round {game.roundIndex + 1} Complete!
            </span>
          </div>
          <h2 className="font-display text-4xl sm:text-6xl text-white">{game.currentRound?.name}</h2>
        </div>

        {/* Podium — scaled for screen size */}
        <div className="flex items-end gap-2 sm:gap-4 justify-center w-full max-w-3xl">
          {top3[1] && (
            <div className="flex flex-col items-center gap-1 sm:gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="text-3xl sm:text-4xl">{top3[1].avatar}</span>
              <p className="text-white font-bold text-sm sm:text-lg text-center">{top3[1].playerName}</p>
              <p className="text-gray-300 font-display text-base sm:text-xl">{top3[1].score.toLocaleString()}</p>
              <div className="w-24 sm:w-36 h-16 sm:h-24 bg-gray-400 rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-4xl sm:text-5xl text-gray-900">2</span>
              </div>
            </div>
          )}
          {top3[0] && (
            <div className="flex flex-col items-center gap-1 sm:gap-3 animate-bounce-in">
              <span className="text-3xl sm:text-5xl">👑</span>
              <span className="text-4xl sm:text-5xl">{top3[0].avatar}</span>
              <p className="text-white font-bold text-base sm:text-xl text-center">{top3[0].playerName}</p>
              <p className="text-amber-300 font-display text-lg sm:text-2xl">{top3[0].score.toLocaleString()}</p>
              <div className="w-28 sm:w-44 h-24 sm:h-36 bg-amber-400 rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-5xl sm:text-6xl text-amber-900">1</span>
              </div>
            </div>
          )}
          {top3[2] && (
            <div className="flex flex-col items-center gap-1 sm:gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <span className="text-3xl sm:text-4xl">{top3[2].avatar}</span>
              <p className="text-white font-bold text-sm sm:text-lg text-center">{top3[2].playerName}</p>
              <p className="text-gray-300 font-display text-base sm:text-xl">{top3[2].score.toLocaleString()}</p>
              <div className="w-20 sm:w-32 h-12 sm:h-16 bg-amber-700 rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-3xl sm:text-4xl text-amber-900">3</span>
              </div>
            </div>
          )}
        </div>

        {rest.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
            {rest.map((p) => (
              <div key={p.playerId} className="flex items-center gap-2 bg-gray-900 border border-gray-700
                                               rounded-xl px-3 py-2 text-sm">
                <span className="text-gray-400 font-bold">#{p.rank}</span>
                <span className="text-lg">{p.avatar}</span>
                <span className="text-white font-bold">{p.playerName}</span>
                <span className="text-gray-300 font-display">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bonus / penalty */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-full max-w-lg">
          <p className="text-white font-bold text-sm uppercase tracking-widest text-center mb-3">
            ✨ Bonus &amp; Penalty Points
          </p>
          <div className="flex flex-col gap-3">
            {game.scores.map((p) => (
              <BonusRow key={p.playerId} p={p} onAdjust={adjustScore} isAdjusted={adjustedPlayerIds.includes(p.playerId)} />
            ))}
          </div>
        </div>

        <button
          onClick={advance}
          className="w-full max-w-md bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white
                     font-bold text-xl sm:text-3xl py-5 sm:py-6 rounded-2xl border-b-4 border-purple-800
                     active:border-b-0 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
        >
          {game.isLastRound ? '🏆 Final Results!' : 'Next Round →'}
        </button>
        <div className="h-2" />
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────────────────
  if (game.phase === 'game_over') {
    const winner = game.scores[0];
    const top3 = game.scores.slice(0, 3);
    const rest = game.scores.slice(3);

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center
                      p-4 sm:p-8 gap-5 sm:gap-8 overflow-y-auto">
        <AdjustmentToast adjustment={lastAdjustment} />
        <Confetti />

        <div className="text-center animate-bounce-in relative z-10">
          <div className="text-6xl sm:text-8xl mb-3">🏆</div>
          <h2 className="font-display text-5xl sm:text-7xl text-white mb-4">Game Over!</h2>
          {winner && (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl px-6 sm:px-8 py-4 inline-block">
              <p className="text-amber-300 font-bold uppercase tracking-widest text-xs sm:text-sm mb-2">
                Champion
              </p>
              <p className="font-display text-3xl sm:text-5xl text-white">
                {winner.avatar} {winner.playerName}
              </p>
              <p className="text-amber-300 font-display text-2xl sm:text-3xl mt-2">
                {winner.score.toLocaleString()} points
              </p>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 sm:gap-4 justify-center w-full max-w-3xl relative z-10">
          {top3[1] && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-3xl sm:text-4xl">{top3[1].avatar}</span>
              <p className="text-white font-bold text-sm sm:text-base text-center">{top3[1].playerName}</p>
              <p className="text-gray-300 font-display text-base sm:text-lg">{top3[1].score.toLocaleString()}</p>
              <div className="w-24 sm:w-36 h-16 sm:h-24 bg-gray-400 rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-4xl sm:text-5xl text-gray-900">2</span>
              </div>
            </div>
          )}
          {top3[0] && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-3xl sm:text-5xl">👑</span>
              <span className="text-4xl sm:text-5xl">{top3[0].avatar}</span>
              <p className="text-white font-bold text-base sm:text-xl text-center">{top3[0].playerName}</p>
              <p className="text-amber-300 font-display text-lg sm:text-2xl">{top3[0].score.toLocaleString()}</p>
              <div className="w-28 sm:w-44 h-24 sm:h-36 bg-amber-400 rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-5xl sm:text-6xl text-amber-900">1</span>
              </div>
            </div>
          )}
          {top3[2] && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-3xl sm:text-4xl">{top3[2].avatar}</span>
              <p className="text-white font-bold text-sm sm:text-base text-center">{top3[2].playerName}</p>
              <p className="text-gray-300 font-display text-base sm:text-lg">{top3[2].score.toLocaleString()}</p>
              <div className="w-20 sm:w-32 h-12 sm:h-16 bg-amber-700 rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-3xl sm:text-4xl text-amber-900">3</span>
              </div>
            </div>
          )}
        </div>

        {rest.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl relative z-10">
            {rest.map((p) => (
              <div key={p.playerId} className="flex items-center gap-2 bg-gray-900 border border-gray-700
                                               rounded-xl px-3 py-2 text-sm">
                <span className="text-gray-400 font-bold">#{p.rank}</span>
                <span className="text-lg">{p.avatar}</span>
                <span className="text-white font-bold">{p.playerName}</span>
                <span className="text-gray-300 font-display">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="w-full max-w-sm bg-purple-600 hover:bg-purple-500 text-white font-bold
                     text-xl sm:text-2xl py-5 rounded-2xl border-b-4 border-purple-800
                     active:scale-95 transition-all relative z-10"
        >
          🔄 Play Again
        </button>
        <div className="h-2" />
      </div>
    );
  }

  return null;
}
