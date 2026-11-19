import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';
import Podium from '../components/Podium';
import type { PlayerScore } from '../types';

const OPTION_STYLES = [
  { tile: 'bg-ans-a border-ans-a-d text-white', bar: 'bg-white', label: 'bg-black/20' },
  { tile: 'bg-ans-b border-ans-b-d text-white', bar: 'bg-white', label: 'bg-black/20' },
  { tile: 'bg-ans-c border-ans-c-d text-ink', bar: 'bg-ink', label: 'bg-ink/15' },
  { tile: 'bg-ans-d border-ans-d-d text-ink', bar: 'bg-ink', label: 'bg-ink/15' },
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
    <div className="bg-ink-3 rounded-2xl p-3 flex flex-col gap-2">
      {/* Player info */}
      <div className="flex items-center gap-2">
        <span className="text-2xl flex-shrink-0">{p.avatar}</span>
        <span className="flex-1 text-chalk font-bold text-base truncate">{p.playerName}</span>
        <span className="text-sun font-display text-lg flex-shrink-0">
          {p.score.toLocaleString()} pts
        </span>
        {isAdjusted && (
          <span className="text-xs font-bold text-soft uppercase tracking-wide flex-shrink-0">Done</span>
        )}
      </div>
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAdjust(p.playerId, -100)}
          disabled={isAdjusted}
          className={`flex items-center justify-center gap-1.5 text-chalk font-bold text-base
                     py-2.5 rounded-xl transition-all touch-manipulation border-b-2
                     ${isAdjusted
                       ? 'bg-ink-3 border-ink-4 opacity-40 cursor-not-allowed'
                       : 'bg-ans-a !text-white border-ans-a-d active:scale-95'}`}
        >
          <span className="text-lg">−</span>
          <span>100 pts</span>
        </button>
        <button
          onClick={() => onAdjust(p.playerId, 100)}
          disabled={isAdjusted}
          className={`flex items-center justify-center gap-1.5 text-chalk font-bold text-base
                     py-2.5 rounded-xl transition-all touch-manipulation border-b-2
                     ${isAdjusted
                       ? 'bg-ink-3 border-ink-4 opacity-40 cursor-not-allowed'
                       : 'bg-ans-d !text-ink border-ans-d-d active:scale-95'}`}
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
      <div className="bg-ink-3/60 rounded-xl px-3 py-2 text-center">
        <p className="text-soft font-bold text-xs uppercase tracking-widest">
          🏆 Scores &amp; Bonus Points
        </p>
      </div>

      {scores.map((p, i) => {
        const isAdjusted = adjustedIds.includes(p.playerId);
        return (
          <div key={p.playerId} className="bg-ink-3 rounded-2xl p-2.5 flex flex-col gap-2">
            {/* Rank + name + score */}
            <div className="flex items-center gap-2">
              <span className="text-base w-6 text-center flex-shrink-0">
                {RANK_ICONS[i] ?? `${i + 1}`}
              </span>
              <span className="text-xl flex-shrink-0">{p.avatar}</span>
              <span className="flex-1 text-chalk font-bold text-sm truncate">{p.playerName}</span>
              <span className="text-sun font-display text-sm flex-shrink-0">
                {p.score.toLocaleString()}
              </span>
              {isAdjusted && (
                <span className="text-xs font-bold text-soft uppercase tracking-wide flex-shrink-0">Done</span>
              )}
            </div>
            {/* Bonus / penalty buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onAdjust(p.playerId, -100)}
                disabled={isAdjusted}
                className={`flex items-center justify-center gap-1 text-chalk font-bold text-xs
                           py-2 rounded-lg transition-all touch-manipulation border-b-2
                           ${isAdjusted
                             ? 'bg-ink-3 border-ink-4 opacity-40 cursor-not-allowed'
                             : 'bg-ans-a !text-white border-ans-a-d active:scale-95'}`}
                title={`Remove 100 pts from ${p.playerName}`}
              >
                <span>−</span><span>100 pts</span>
              </button>
              <button
                onClick={() => onAdjust(p.playerId, 100)}
                disabled={isAdjusted}
                className={`flex items-center justify-center gap-1 text-chalk font-bold text-xs
                           py-2 rounded-lg transition-all touch-manipulation border-b-2
                           ${isAdjusted
                             ? 'bg-ink-3 border-ink-4 opacity-40 cursor-not-allowed'
                             : 'bg-ans-d !text-ink border-ans-d-d active:scale-95'}`}
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
                  px-5 py-3 rounded-2xl border-b-4 animate-bounce-in max-w-[92vw]
                  ${isBonus ? 'bg-ans-d text-ink border-ans-d-d' : 'bg-ans-a text-white border-ans-a-d'}`}
    >
      <span className="text-2xl sm:text-3xl">{adjustment.avatar}</span>
      <p className="font-extrabold text-base">
        {isBonus
          ? `${adjustment.playerName} just received 100 bonus points! 🎉`
          : `${adjustment.playerName} just lost 100 pts 😬`}
      </p>
    </div>
  );
}

// The one button that moves the game on. It sits where it always did when the screen has room,
// and stays pinned to the bottom of the window when the content is taller (long scoreboards and
// podiums used to push it below the fold, so the host had to scroll to find it).
function HostAdvance({
  onClick,
  className,
  children,
  hideOnLarge = false,
}: {
  onClick: () => void;
  className: string;
  children: React.ReactNode;
  hideOnLarge?: boolean;
}) {
  return (
    <div
      className={`sticky bottom-0 z-30 flex w-full justify-center px-2 pt-8 pointer-events-none
                  bg-gradient-to-t from-ink via-ink/90 to-transparent
                  ${hideOnLarge ? 'lg:hidden' : ''}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <button onClick={onClick} className={`pointer-events-auto ${className}`}>
        {children}
      </button>
    </div>
  );
}

// ── Host wrapper ──────────────────────────────────────────────────────────────
export default function HostGame() {
  const { state, advance, adjustScore, leaveGame } = useGame();
  const { game, players, answeredCount, answerDistribution, myName, lastAdjustment, adjustedPlayerIds } = state;

  // ── Round Intro ─────────────────────────────────────────────────────────
  if (game.phase === 'round_intro') {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center
                      p-4 sm:p-8 gap-5 sm:gap-8">
        <AdjustmentToast adjustment={lastAdjustment} />

        <span className="badge-sun">
          ⭐ Game Master: {myName}
        </span>

        {/* Round card */}
        <div className="bg-ink-2 border border-ink-4 rounded-3xl p-6 sm:p-12 lg:p-16
                        text-center shadow-2xl max-w-3xl w-full animate-bounce-in">
          <div className="text-6xl sm:text-8xl lg:text-9xl mb-4 sm:mb-6">
            {game.currentRound?.emoji}
          </div>
          <div className="inline-block bg-white/10 border border-ink-4 rounded-full
                          px-4 py-1.5 mb-4">
            <span className="text-soft font-bold text-xs sm:text-sm uppercase tracking-widest">
              Round {game.roundIndex + 1} of {game.totalRounds}
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl text-chalk mb-3">
            {game.currentRound?.name}
          </h1>
          <p className="text-soft text-base sm:text-xl lg:text-2xl font-bold">
            {game.currentRound?.description}
          </p>
          <p className="text-soft/70 text-sm sm:text-lg mt-2">
            {game.currentRound?.totalQuestions} questions
          </p>
        </div>

        {/* Bonus / penalty — always visible once players exist */}
        {game.scores.length > 0 && (
          <div className="bg-ink-2 border border-ink-4 rounded-2xl p-4 w-full max-w-lg">
            <p className="text-chalk font-bold text-sm uppercase tracking-widest text-center mb-3">
              ✨ Bonus &amp; Penalty Points
            </p>
            <div className="flex flex-col gap-3">
              {game.scores.map((p) => (
                <BonusRow key={p.playerId} p={p} onAdjust={adjustScore} isAdjusted={adjustedPlayerIds.includes(p.playerId)} />
              ))}
            </div>
          </div>
        )}

        <HostAdvance
          onClick={advance}
          className="w-full max-w-md bg-sun hover:bg-sun-soft text-ink font-extrabold text-xl sm:text-3xl py-5 sm:py-6 rounded-full border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 active:scale-[0.98] transition-all"
        >
          🚀 Begin Round!
        </HostAdvance>
      </div>
    );
  }

  // ── Question Active ──────────────────────────────────────────────────────
  if (game.phase === 'question_active') {
    const totalPlayers = players.length;
    const progressPct = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

    return (
      // scrollable on mobile, fixed-height on lg+
      <div className="bg-ink min-h-screen overflow-y-auto
                      lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="flex flex-col p-3 gap-3 lg:flex-1 lg:min-h-0">

          {/* Top bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-sun/15 border border-sun/40 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-sun font-bold text-xs sm:text-sm">⭐ {myName}</span>
            </div>
            <div className="bg-ink-2 border border-ink-4 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-chalk font-bold text-xs sm:text-sm">
                {game.currentRound?.emoji} Q{game.questionIndex + 1}/{game.totalQuestions}
              </span>
            </div>
            <div className="flex-1" />
            <div className="bg-ink-2 border border-ink-4 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-chalk font-bold text-xs sm:text-sm">
                {answeredCount}/{totalPlayers} ✓
              </span>
            </div>
            <Timer startTime={game.questionStartTime} timeLimit={game.timeLimit} />
          </div>

          {/* Two-column on lg+, stacked on mobile */}
          <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-3">

            {/* LEFT: question + tiles + progress */}
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
              <div className="bg-chalk text-ink border-b-[6px] border-chalk-edge rounded-2xl p-4 sm:p-6
                              text-center">
                <h1 className="font-display text-xl sm:text-3xl lg:text-4xl text-ink leading-tight">
                  {game.currentQuestion?.text}
                </h1>
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
                                        text-lg sm:text-2xl flex-shrink-0`}>
                          {opt.id}
                        </div>
                        <p className="font-extrabold text-xs sm:text-base lg:text-lg leading-tight flex-1">
                          {opt.text}
                        </p>
                      </div>
                      {count > 0 && (
                        <div className="relative flex justify-end">
                          <span className="bg-black/25 font-extrabold text-xs px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-ink-2 border border-ink-4 rounded-xl p-2 sm:p-3">
                <div className="h-2 bg-ink-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sun rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-soft text-xs font-bold text-center mt-1">
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
    const nextLabel = game.questionIndex + 1 >= game.totalQuestions
      ? '📊 Round Summary →'
      : `Next Question → (${game.questionIndex + 2}/${game.totalQuestions})`;
    const nextClass = `bg-sun hover:bg-sun-soft text-ink font-extrabold text-lg sm:text-xl py-4 rounded-full
                       border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 active:scale-[0.98] transition-all`;

    return (
      <div className="bg-ink min-h-screen
                      lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="flex flex-col p-3 gap-3 lg:flex-1 lg:min-h-0">

          {/* Top bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-sun/15 border border-sun/40 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-sun font-bold text-xs sm:text-sm">⭐ {myName}</span>
            </div>
            <div className="bg-ink-2 border border-ink-4 rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-chalk font-bold text-xs sm:text-sm">
                {game.currentRound?.emoji} Q{game.questionIndex + 1}/{game.totalQuestions} — Results
              </span>
            </div>
            <div className="flex-1" />
            <div className="bg-ans-d/20 border border-ans-d rounded-xl px-2 sm:px-3 py-1.5">
              <span className="text-ans-d font-extrabold text-xs sm:text-sm">
                {correct.length}/{players.length} correct
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-3">

            {/* LEFT: answer tiles + next button */}
            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
              <div className="bg-chalk text-ink border-b-[6px] border-chalk-edge rounded-2xl p-3 sm:p-5 text-center">
                <h1 className="font-display text-lg sm:text-3xl text-ink leading-tight">
                  {game.currentQuestion?.text}
                </h1>
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
                                    ? 'bg-ans-d border-ans-d-d text-ink ring-2 sm:ring-4 ring-chalk'
                                    : 'bg-ink-3 border-ink-4 opacity-50'}`}
                    >
                      <div
                        className={`absolute inset-0 ${isCorrect ? 'bg-white' : style.bar} opacity-20`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="relative flex items-center gap-2">
                        <div className={`rounded-lg w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
                                        font-display text-base sm:text-xl flex-shrink-0
                                        ${isCorrect ? 'bg-ink/20' : style.label}`}>
                          {isCorrect ? '✓' : opt.id}
                        </div>
                        <p className={`font-bold text-xs sm:text-sm lg:text-base leading-tight flex-1
                                       ${isCorrect ? 'text-ink' : 'text-soft'}`}>
                          {opt.text}
                        </p>
                        <span className={`font-display text-sm flex-shrink-0
                                          ${isCorrect ? 'text-ink' : 'text-soft/70'}`}>
                          {count}
                        </span>
                      </div>
                      {whoChose.length > 0 && (
                        <div className="relative flex flex-wrap content-start gap-1.5 min-h-0 overflow-y-auto">
                          {/* The right answer lists everyone who got it, quickest first, with their points. */}
                          {[...whoChose].sort((x, y) => x.answerOrder - y.answerOrder).map((a) =>
                            a.isCorrect ? (
                              <div
                                key={a.playerId}
                                className="flex items-center gap-1.5 max-w-full rounded-full bg-ink/20 text-ink
                                           pl-1.5 pr-2.5 py-1 text-sm sm:text-base font-extrabold"
                              >
                                <span aria-hidden="true">{a.avatar}</span>
                                <span className="truncate">{a.playerName}</span>
                                <span className="font-display tabular-nums flex-shrink-0">+{a.pointsEarned}</span>
                              </div>
                            ) : (
                              <div
                                key={a.playerId}
                                className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-bold bg-ink-3 text-soft"
                              >
                                <span>{a.avatar}</span>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Large screens: the button sits under the tiles. Smaller screens use the pinned one below. */}
              <button onClick={advance} className={`hidden lg:block ${nextClass}`}>
                {nextLabel}
              </button>
            </div>

            {/* RIGHT: leaderboard + bonus — ALWAYS visible, full width below on mobile */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 lg:overflow-y-auto lg:min-h-0">
              <LeaderboardSidebar scores={game.scores} onAdjust={adjustScore} adjustedIds={adjustedPlayerIds} />
            </div>
          </div>
        </div>

        <HostAdvance onClick={advance} className={`w-full max-w-md ${nextClass}`} hideOnLarge>
          {nextLabel}
        </HostAdvance>
      </div>
    );
  }

  // ── Round Summary ────────────────────────────────────────────────────────
  if (game.phase === 'round_summary') {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center
                      p-4 sm:p-8 gap-5 sm:gap-8">
        <AdjustmentToast adjustment={lastAdjustment} />

        <div className="text-center animate-bounce-in">
          <div className="text-5xl sm:text-7xl mb-3">{game.currentRound?.emoji}</div>
          <div className="inline-block bg-white/10 border border-ink-4 rounded-full px-4 py-1.5 mb-3">
            <span className="text-soft font-bold text-xs sm:text-sm uppercase tracking-widest">
              Round {game.roundIndex + 1} Complete!
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl text-chalk">{game.currentRound?.name}</h1>
        </div>

        <Podium scores={game.scores} />

        {/* Bonus / penalty */}
        <div className="bg-ink-2 border border-ink-4 rounded-2xl p-4 w-full max-w-lg">
          <p className="text-chalk font-bold text-sm uppercase tracking-widest text-center mb-3">
            ✨ Bonus &amp; Penalty Points
          </p>
          <div className="flex flex-col gap-3">
            {game.scores.map((p) => (
              <BonusRow key={p.playerId} p={p} onAdjust={adjustScore} isAdjusted={adjustedPlayerIds.includes(p.playerId)} />
            ))}
          </div>
        </div>

        <HostAdvance
          onClick={advance}
          className="w-full max-w-md bg-sun hover:bg-sun-soft text-ink font-extrabold text-xl sm:text-3xl py-5 sm:py-6 rounded-full border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 active:scale-[0.98] transition-all"
        >
          {game.isLastRound ? '🏆 Final Results!' : 'Next Round →'}
        </HostAdvance>
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────────────────
  if (game.phase === 'game_over') {
    const winner = game.scores[0];
    const top3 = game.scores.slice(0, 3);
    const rest = game.scores.slice(3);

    return (
      <div className="min-h-screen bg-ink flex flex-col items-center
                      p-4 sm:p-8 gap-5 sm:gap-8 overflow-y-auto">
        <AdjustmentToast adjustment={lastAdjustment} />
        <Confetti />

        <div className="text-center animate-bounce-in relative z-10">
          <div className="text-6xl sm:text-8xl mb-3">🏆</div>
          <h1 className="font-display text-5xl sm:text-7xl text-chalk mb-4">Game Over!</h1>
          {winner && (
            <div className="bg-sun text-ink border-b-[6px] border-sun-dark rounded-3xl px-6 sm:px-10 py-4 inline-block">
              <p className="font-extrabold uppercase tracking-widest text-xs sm:text-sm mb-2">
                Champion
              </p>
              <p className="font-display text-3xl sm:text-5xl">
                {winner.avatar} {winner.playerName}
              </p>
              <p className="font-display text-2xl sm:text-3xl mt-2">
                {winner.score.toLocaleString()} points
              </p>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 sm:gap-4 justify-center w-full max-w-3xl relative z-10">
          {top3[1] && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-3xl sm:text-4xl">{top3[1].avatar}</span>
              <p className="text-chalk font-bold text-sm sm:text-base text-center">{top3[1].playerName}</p>
              <p className="text-soft font-display text-base sm:text-lg">{top3[1].score.toLocaleString()}</p>
              <div className="w-24 sm:w-36 h-16 sm:h-24 bg-chalk-edge rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-4xl sm:text-5xl text-ink">2</span>
              </div>
            </div>
          )}
          {top3[0] && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-3xl sm:text-5xl">👑</span>
              <span className="text-4xl sm:text-5xl">{top3[0].avatar}</span>
              <p className="text-chalk font-bold text-base sm:text-xl text-center">{top3[0].playerName}</p>
              <p className="text-sun font-display text-lg sm:text-2xl">{top3[0].score.toLocaleString()}</p>
              <div className="w-28 sm:w-44 h-24 sm:h-36 bg-sun rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-5xl sm:text-6xl text-ink">1</span>
              </div>
            </div>
          )}
          {top3[2] && (
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-3xl sm:text-4xl">{top3[2].avatar}</span>
              <p className="text-chalk font-bold text-sm sm:text-base text-center">{top3[2].playerName}</p>
              <p className="text-soft font-display text-base sm:text-lg">{top3[2].score.toLocaleString()}</p>
              <div className="w-20 sm:w-32 h-12 sm:h-16 bg-sun-dark rounded-t-2xl flex items-center justify-center">
                <span className="font-display text-3xl sm:text-4xl text-ink">3</span>
              </div>
            </div>
          )}
        </div>

        {rest.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl relative z-10">
            {rest.map((p) => (
              <div key={p.playerId} className="flex items-center gap-2 bg-ink-2 border border-ink-4
                                               rounded-xl px-3 py-2 text-sm">
                <span className="text-soft font-bold">#{p.rank}</span>
                <span className="text-lg">{p.avatar}</span>
                <span className="text-chalk font-bold">{p.playerName}</span>
                <span className="text-soft font-display">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={leaveGame}
          className="w-full max-w-sm bg-sun hover:bg-sun-soft text-ink font-extrabold text-xl sm:text-2xl py-5 rounded-full border-[3px] border-sun border-b-[6px] border-b-sun-dark active:translate-y-0.5 active:scale-[0.98] transition-all relative z-10"
        >
          🔄 Play Again
        </button>
        <div className="h-2" />
      </div>
    );
  }

  return null;
}
