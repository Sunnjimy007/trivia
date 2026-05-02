import { useEffect, useState } from 'react';

interface TimerProps {
  startTime: number;
  timeLimit: number;
  size?: 'sm' | 'md' | 'lg';
  onExpire?: () => void;
}

export default function Timer({ startTime, timeLimit, size = 'md', onExpire }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && onExpire) onExpire();
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [startTime, timeLimit, onExpire]);

  const seconds = Math.ceil(timeLeft / 1000);
  const progress = timeLeft / timeLimit;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#f59e0b' : '#ef4444';

  const dim = size === 'sm' ? 'w-14 h-14' : size === 'lg' ? 'w-32 h-32' : 'w-20 h-20 sm:w-28 sm:h-28';
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl sm:text-4xl';

  return (
    <div className={`relative flex-shrink-0 ${dim}`}>
      <svg className={`${dim} -rotate-90`} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-display ${textSize}`} style={{ color }}>{seconds}</span>
      </div>
    </div>
  );
}
