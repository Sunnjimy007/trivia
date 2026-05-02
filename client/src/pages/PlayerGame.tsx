import { useGame } from '../context/GameContext';
import Scoreboard from '../components/Scoreboard';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';

const OPTION_COLORS = [
  { base: 'bg-rose-500 border-rose-700' },
  { base: 'bg-blue-500 border-blue-700' },
  { base: 'bg-amber-500 border-amber-700' },
  { base: 'bg-emerald-500 border-emerald-700' },
];

export default function PlayerGame() {
  const { state, submitAnswer } = useGame();
  const { game, myId, myAnswer } = state;

  const myAnswerResult = game.answers.find((a) => a.playerId === myId);
  const myPoints = myAnswerResult?.pointsEarned ?? 0;

  // ── Round intro ──────────────────────────────────────────────────────────
  if (game.phase === 'round_intro') {
    return (
      <div className="screen">
        <div className="w-full max-w-sm flex flex-col items-center gap-5 animate-bounce-in px-2">
          <div className="text-7xl sm:text-8xl">{game.currentRound?.emoji}</div>
          <div className="text-center">
            <div className="bg-white/20 text-white text-xs font-bold uppercase tracking-widest
                            px-4 py-1.5 rounded-full mb-3 inline-block">
              Round {game.roundIndex + 1} of {game.totalRounds}
            </div>
            <h2 className="font-display text-4xl sm:text-5xl text-white">
              {game.currentRound?.name}
            </h2>
            <p className="text-white/80 text-base sm:text-xl mt-2 px-4">
              {game.currentRound?.description}
            </p>
          </div>
          <div className="card w-full text-center py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <p className="font-bold text-gray-700 text-base">Waiting for host to start...</p>
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
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <div className="bg-white/15 rounded-xl px-3 py-2 text-white font-bold text-sm sm:text-base flex-1 min-w-0 truncate">
            {game.currentRound?.emoji} Q{game.questionIndex + 1}/{game.totalQuestions}
          </div>
          <Timer startTime={game.questionStartTime} timeLimit={game.timeLimit} />
        </div>

        {/* Question card */}
        <div className="card flex-shrink-0">
          <p className="font-display text-xl sm:text-2xl text-gray-800 text-center leading-snug">
            {game.currentQuestion?.text}
          </p>
        </div>

        {/* Answered state */}
        {hasAnswered ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-bounce-in px-2">
            <div className="text-5xl">⏳</div>
            <div className="card w-full text-center">
              <p className="font-display text-2xl sm:text-3xl text-purple-600 mb-1">Locked in!</p>
              <p className="text-gray-500 font-bold text-base">Waiting for others...</p>
              <div className="mt-3 bg-purple-50 rounded-xl p-3 border border-purple-100">
                <p className="text-purple-500 font-bold text-xs uppercase tracking-wide mb-1">Your answer</p>
                <p className="text-purple-800 font-bold text-base leading-snug">
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
                className={`btn-answer ${OPTION_COLORS[i].base} flex-1 animate-slide-up`}
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
          <p className="text-white/50 text-center text-xs font-bold flex-shrink-0 pb-1">
            Tap fast — first correct answer wins the most points! ⚡
          </p>
        )}
      </div>
    );
  }

  // ── Question results ─────────────────────────────────────────────────────
  if (game.phase === 'question_results') {
    const iGotIt = !!myAnswerResult && myAnswerResult.isCorrect;
    const iWasWrong = !!myAnswerResult && !myAnswerResult.isCorrect;

    return (
      <div className="game-screen overflow-y-auto">
        {/* Result banner */}
        <div
          className={`card flex-shrink-0 text-center py-5 animate-bounce-in
            ${iGotIt
              ? 'bg-green-50 border-2 border-green-300'
              : iWasWrong
              ? 'bg-red-50 border-2 border-red-300'
              : 'bg-gray-50'}`}
        >
          {iGotIt ? (
            <>
              <div className="text-4xl mb-1">🎉</div>
              <p className="font-display text-3xl text-green-700">Correct!</p>
              <p className="text-green-600 font-bold text-xl mt-1">+{myPoints.toLocaleString()} pts</p>
              {myAnswerResult.answerOrder === 1 && (
                <p className="text-amber-500 font-bold text-sm mt-1">⚡ First to answer!</p>
              )}
            </>
          ) : iWasWrong ? (
            <>
              <div className="text-4xl mb-1">😬</div>
              <p className="font-display text-3xl text-red-700">Oops!</p>
              <p className="text-red-500 font-bold text-base mt-1">Better luck next time!</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-1">⏰</div>
              <p className="font-display text-3xl text-gray-600">Time's up!</p>
              <p className="text-gray-500 font-bold text-base mt-1">Didn't answer in time</p>
            </>
          )}
        </div>

        {/* Correct answer */}
        <div className="card flex-shrink-0">
          <p className="text-gray-400 font-bold text-xs uppercase tracking-wide mb-2">Correct Answer</p>
          <div className="bg-green-50 rounded-xl p-3 border-2 border-green-200">
            <p className="font-bold text-green-800 text-base leading-snug">
              ✓ {game.currentQuestion?.options.find((o) => o.id === game.correctOptionId)?.text}
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="flex-1 min-h-0">
          <p className="text-white/60 font-bold text-xs uppercase tracking-wide mb-2">Leaderboard</p>
          <Scoreboard scores={game.scores} highlightId={myId} compact />
        </div>

        <div className="card flex-shrink-0 text-center py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <p className="font-bold text-gray-600 text-sm">Waiting for host...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Round summary ────────────────────────────────────────────────────────
  if (game.phase === 'round_summary') {
    const myRank = game.scores.find((s) => s.playerId === myId)?.rank ?? 0;
    return (
      <div className="screen overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col gap-4 animate-slide-up py-4">
          <div className="text-center">
            <div className="text-5xl mb-2">{game.currentRound?.emoji}</div>
            <h2 className="font-display text-4xl text-white">Round Complete!</h2>
            <p className="text-white/70 text-lg mt-1">You're #{myRank} 🏆</p>
          </div>
          <div className="card">
            <Scoreboard scores={game.scores} highlightId={myId} />
          </div>
          <div className="card text-center py-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              <p className="font-bold text-gray-600 text-sm">
                {game.isLastRound ? 'Waiting for final results...' : 'Waiting for next round...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Game over ────────────────────────────────────────────────────────────
  if (game.phase === 'game_over') {
    const myScore = game.scores.find((s) => s.playerId === myId);
    const isWinner = myScore?.rank === 1;

    return (
      <div className="screen overflow-y-auto">
        {isWinner && <Confetti />}
        <div className="w-full max-w-sm flex flex-col gap-4 animate-bounce-in relative z-10 py-4">
          <div className="text-center">
            <div className="text-6xl mb-2">{isWinner ? '🏆' : '🎉'}</div>
            <h2 className="font-display text-5xl text-white">Game Over!</h2>
            {myScore && (
              <div className="mt-3">
                <p className="text-white/70 text-base">Your final rank</p>
                <p className="font-display text-5xl text-yellow-300">#{myScore.rank}</p>
                <p className="text-white/80 text-xl font-bold">{myScore.score.toLocaleString()} pts</p>
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-bold text-gray-700 text-base mb-3 text-center">Final Scores</h3>
            <Scoreboard scores={game.scores} highlightId={myId} />
          </div>
          <button onClick={() => window.location.reload()} className="btn-secondary text-xl py-5">
            🔄 Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse-slow">🎮</div>
        <p className="font-bold text-white text-xl">Waiting for the game to start...</p>
      </div>
    </div>
  );
}
