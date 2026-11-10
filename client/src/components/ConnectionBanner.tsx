import { useEffect } from 'react';
import { useGame } from '../context/GameContext';

// Small strip across the top that explains connection problems instead of leaving the screen frozen.
export default function ConnectionBanner() {
  const { state, clearNotice } = useGame();

  // A one-off notice (for example "That game has ended.") disappears by itself.
  useEffect(() => {
    if (!state.notice) return;
    const t = setTimeout(clearNotice, 6000);
    return () => clearTimeout(t);
  }, [state.notice, clearNotice]);

  let text = '';
  if (state.connection === 'offline') {
    text = 'Connection lost. Reconnecting…';
  } else if (!state.isHost && state.view !== 'home' && !state.hostConnected) {
    text = 'The host lost connection. Waiting for them to come back…';
  } else if (state.notice) {
    text = state.notice;
  }

  if (!text) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-gray-900 text-center
                 font-bold text-sm py-2 px-4 shadow-lg"
    >
      {text}
    </div>
  );
}
