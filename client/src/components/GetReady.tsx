import { useEffect, useState } from 'react';

// The short "Ready? ... Go!" pause before a question appears. "Go!" shows for the last GO_MS of it.
export const GO_MS = 700;

export type LeadInStage = 'ready' | 'go' | 'live';

function stageAt(startTime: number): LeadInStage {
  const left = startTime - Date.now();
  return left > GO_MS ? 'ready' : left > 0 ? 'go' : 'live';
}

// Which part of the pause we are in for a question that opens at startTime (ms on this device's clock).
// Passing active=false (any other screen) returns 'live' so nothing is held back.
export function useLeadIn(startTime: number, active: boolean): LeadInStage {
  // The stage is worked out from the clock on every render (so the first frame of a new question is already
  // right, with no flash of the question). The timers only exist to trigger a render at each change.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const left = startTime - Date.now();
    const rerender = () => setTick((t) => t + 1);
    const timers: number[] = [];
    // A few ms of margin, so a timer that fires a hair early still lands on the right side of the line.
    if (left > GO_MS) timers.push(window.setTimeout(rerender, left - GO_MS + 5));
    if (left > 0) timers.push(window.setTimeout(rerender, left + 5));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [startTime, active]);

  return active ? stageAt(startTime) : 'live';
}

interface GetReadyProps {
  stage: 'ready' | 'go';
  emoji?: string;
  questionNumber: number;
  totalQuestions: number;
}

// Full-screen splash used on phones and on the host's screen.
export default function GetReady({ stage, emoji, questionNumber, totalQuestions }: GetReadyProps) {
  return (
    <div className="screen" role="status" aria-live="assertive">
      <div className="text-center flex flex-col items-center gap-5 sm:gap-8">
        <span className="chip text-sm sm:text-lg">
          <span aria-hidden="true">{emoji}</span> Question {questionNumber} of {totalQuestions}
        </span>
        {stage === 'ready' ? (
          <p key="ready" className="font-display text-6xl sm:text-9xl text-chalk animate-pop motion-reduce:animate-none">
            Ready?
          </p>
        ) : (
          <p key="go" className="font-display text-7xl sm:text-9xl text-sun animate-pop motion-reduce:animate-none">
            Go!
          </p>
        )}
      </div>
    </div>
  );
}
