import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import Scoreboard from '../components/Scoreboard';
import Podium from '../components/Podium';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';

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
    timerRef.current = setTimeout(() => setVisible(false), 3000);
  }, [adjustment]);

  if (!visible || !adjustment) return null;
  const isBonus = adjustment.amount > 0;
  return (
    <div
      role="status"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                  px-5 py-3 rounded-2xl border-b-4 animate-bounce-in max-w-[92vw]
                  ${isBonus ? 'bg-ans-d text-ink border-ans-d-d' : 'bg-ans-a text-white border-ans-a-d'}`}
    >
      <span className="text-2xl sm:text-3xl" aria-hidden="true">{adjustment.avatar}</span>
      <p className="font-extrabold text-base">
        {isBonus
          ? `${adjustment.playerName} just received 100 bonus points! 🎉`
          : `${adjustment.playerName} just lost 100 pts 😬`}
      </p>
    </div>
  );
}

// The four answer colours (see index.css), in answer order.
const OPTION_CLASSES = ['ans-a', 'ans-b', 'ans-c', 'ans-d'];

export default function PlayerGame() {
  const { state, submitAnswer, leaveGame } = useGame();
  const { game, myId, myAnswer, lastAdjustment } = state;

  const myAnswerResult = game.answers.find((a) => a.playerId === myId);
  const myPoints = myAnswerResult?.pointsEarned ?? 0;
  const myScore = game.scores.find((s) => s.playerId === myId);
  const myCurrentScore = myScore?.score ?? 0;

  const ScorePill = () => (
    <div className="bg-sun text-ink rounded-full px-3 py-1.5 font-extrabold text-sm flex-shrink-0 tabular-nums">
      {myCurrentScore.toLocaleString()} pts
    </div>
  );

  // "Waiting for the host" strip, ink on any ground.
  const WaitingStrip = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-ink text-chalk rounded-3xl text-center py-3 px-4 flex-shrink-0">
      <div className="flex items-center justify-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-sun animate-pulse" />
        <p className="font-extrabold text-sm">{children}</p>
      </div>
    </div>
  );

  // ── Round intro ──────────────────────────────────────────────────────────
  if (game.phase === 'round_intro') {
    return (
      <div className="screen">
        <AdjustmentToast adjustment={lastAdjustment} />
        <div className="w-full max-w-sm flex flex-col items-center gap-5 animate-bounce-in px-2">
          <div className="w-full flex justify-end">
            <ScorePill />
          </div>
          <div className="text-7xl sm:text-8xl" aria-hidden="true">{game.currentRound?.emoji}</div>
          <div className="text-center">
            <span className="chip mb-3 uppercase tracking-widest text-xs">
              Round {game.roundIndex + 1} of {game.totalRounds}
            </span>
            <h1 className="font-display text-4xl sm:text-5xl text-chalk">
              {game.currentRound?.name}
            </h1>
            <p className="text-soft text-base sm:text-xl font-bold mt-2 px-4">
              {game.currentRound?.description}
            </p>
          </div>
          <div className="card w-full text-center py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 rounded-full bg-ans-d animate-pulse flex-shrink-0" />
              <p className="font-extrabold text-ink text-base">Waiting for host to start...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Question active ──────────────────────────────────────────────────────
  if (game.phase === 'question_active') {
    const hasAnswered = !!myAnswer;

    return (
      <div className="game-screen">
        <AdjustmentToast adjustment={lastAdjustment} />
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <div className="chip flex-1 min-w-0 truncate text-sm sm:text-base">
            <span aria-hidden="true">{game.currentRound?.emoji}</span> Q{game.questionIndex + 1}/{game.totalQuestions}
          </div>
          <ScorePill />
          <Timer startTime={game.questionStartTime} timeLimit={game.timeLimit} />
        </div>

        {/* Question card */}
        <div className="card flex-shrink-0">
          <h1 className="font-display text-xl sm:text-2xl text-ink text-center leading-snug">
            {game.currentQuestion?.text}
          </h1>
        </div>

        {/* Answered state */}
        {hasAnswered ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-bounce-in px-2">
            <div className="text-5xl" aria-hidden="true">⏳</div>
            <div className="card w-full text-center">
              <p className="font-display text-2xl sm:text-3xl text-ink mb-1">Locked in!</p>
              <p className="text-[#4B3A7C] font-extrabold text-base">Waiting for others...</p>
              <div className="mt-3 bg-white rounded-2xl p-3 border-2 border-chalk-edge">
                <p className="text-[#4B3A7C] font-extrabold text-xs uppercase tracking-wide mb-1">Your answer</p>
                <p className="text-ink font-extrabold text-base leading-snug">
                  {game.currentQuestion?.options.find((o) => o.id === myAnswer)?.text}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Answer buttons — fill remaining height evenly */
          <div className="flex-1 flex flex-col gap-2.5 min-h-0">
            {game.currentQuestion?.options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => submitAnswer(opt.id)}
                className={`btn-answer ${OPTION_CLASSES[i]} flex-1 animate-slide-up`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="answer-label font-display text-2xl sm:text-3xl flex-shrink-0">
                  {opt.id}
                </div>
                <span className="text-base sm:text-lg leading-snug">{opt.text}</span>
              </button>
            ))}
          </div>
        )}

        {!hasAnswered && (
          <p className="text-soft text-center text-xs font-bold flex-shrink-0 pb-1">
            Tap fast: the first correct answer wins the most points! ⚡
          </p>
        )}
      </div>
    );
  }

  // ── Question results ─────────────────────────────────────────────────────
  // The whole screen takes the colour of the outcome: green, rose, or yellow for "no answer".
  if (game.phase === 'question_results') {
    const iGotIt = !!myAnswerResult && myAnswerResult.isCorrect;
    const iWasWrong = !!myAnswerResult && !myAnswerResult.isCorrect;
    const ground = iGotIt ? '!bg-ans-d !text-ink' : iWasWrong ? '!bg-ans-a !text-white' : '!bg-sun !text-ink';

    return (
      <div className={`game-screen overflow-y-auto ${ground}`}>
        <AdjustmentToast adjustment={lastAdjustment} />
        {/* Result banner */}
        <div className="card flex-shrink-0 text-center py-5 animate-bounce-in">
          {iGotIt ? (
            <>
              <div className="text-4xl mb-1" aria-hidden="true">🎉</div>
              <h1 className="font-display text-3xl text-[#047857]">Correct!</h1>
              <p className="text-ink font-extrabold text-xl mt-1 tabular-nums">+{myPoints.toLocaleString()} pts</p>
              {myAnswerResult.answerOrder === 1 && (
                <p className="text-[#7A4D00] font-extrabold text-sm mt-1">⚡ First to answer!</p>
              )}
            </>
          ) : iWasWrong ? (
            <>
              <div className="text-4xl mb-1" aria-hidden="true">😬</div>
              <h1 className="font-display text-3xl text-ans-a-d">Oops!</h1>
              <p className="text-[#4B3A7C] font-extrabold text-base mt-1">Better luck next time!</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-1" aria-hidden="true">⏰</div>
              <h1 className="font-display text-3xl text-ink">Time's up!</h1>
              <p className="text-[#4B3A7C] font-extrabold text-base mt-1">Didn't answer in time</p>
            </>
          )}
        </div>

        {/* Correct answer */}
        <div className="card flex-shrink-0">
          <p className="text-[#4B3A7C] font-extrabold text-xs uppercase tracking-wide mb-2">Correct answer</p>
          <div className="bg-[#CFF5E4] rounded-2xl p-3 border-2 border-ans-d-d">
            <p className="font-extrabold text-ink text-base leading-snug">
              ✓ {game.currentQuestion?.options.find((o) => o.id === game.correctOptionId)?.text}
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="flex-1 min-h-0">
          <h2 className="font-extrabold text-xs uppercase tracking-wide mb-2">Leaderboard</h2>
          <Scoreboard scores={game.scores} highlightId={myId} compact />
        </div>

        <WaitingStrip>Waiting for host...</WaitingStrip>
      </div>
    );
  }

  // ── Round summary ────────────────────────────────────────────────────────
  if (game.phase === 'round_summary') {
    const myRank = game.scores.find((s) => s.playerId === myId)?.rank ?? 0;
    // The same podium the host sees on the big screen, with the player's own spot marked "You".
    return (
      <div className="screen overflow-y-auto">
        <AdjustmentToast adjustment={lastAdjustment} />
        <div className="w-full max-w-sm flex flex-col items-center gap-5 py-4">
          <div className="text-center animate-bounce-in">
            <div className="text-5xl mb-3" aria-hidden="true">{game.currentRound?.emoji}</div>
            <div className="inline-block bg-white/10 border border-ink-4 rounded-full px-4 py-1.5 mb-3">
              <span className="text-soft font-bold text-xs uppercase tracking-widest">
                Round {game.roundIndex + 1} Complete!
              </span>
            </div>
            <h1 className="font-display text-4xl text-chalk">{game.currentRound?.name}</h1>
          </div>

          <Podium scores={game.scores} highlightId={myId} />

          {myScore && (
            <div className="card w-full text-center py-3">
              <p className="font-display text-2xl text-ink tabular-nums">
                You're #{myRank} · {myCurrentScore.toLocaleString()} pts
              </p>
            </div>
          )}

          <div className="w-full">
            <WaitingStrip>
              {game.isLastRound ? 'Waiting for final results...' : 'Waiting for next round...'}
            </WaitingStrip>
          </div>
        </div>
      </div>
    );
  }

  // ── Game over ────────────────────────────────────────────────────────────
  if (game.phase === 'game_over') {
    const isWinner = myScore?.rank === 1;

    return (
      <div className="screen ground-sun overflow-y-auto">
        <AdjustmentToast adjustment={lastAdjustment} />
        {isWinner && <Confetti />}
        <div className="w-full max-w-sm flex flex-col gap-4 animate-bounce-in relative z-10 py-4">
          <div className="text-center">
            <div className="text-6xl mb-2" aria-hidden="true">{isWinner ? '🏆' : '🎉'}</div>
            <h1 className="font-display text-5xl sm:text-6xl text-ink">Game over!</h1>
            {myScore && (
              <div className="mt-3">
                <p className="text-[#34206A] text-base font-extrabold">Your final rank</p>
                <p className="font-display text-6xl text-ink">#{myScore.rank}</p>
                <p className="text-[#34206A] text-xl font-extrabold tabular-nums">{myScore.score.toLocaleString()} pts</p>
              </div>
            )}
          </div>
          <h2 className="font-extrabold text-ink text-base text-center">Final scores</h2>
          <Scoreboard scores={game.scores} highlightId={myId} />
          <button onClick={leaveGame} className="btn-ink">
            🔄 Play again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse-slow" aria-hidden="true">🎮</div>
        <h1 className="font-display text-3xl text-chalk">Waiting for the game to start...</h1>
      </div>
    </div>
  );
}
