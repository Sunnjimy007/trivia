import { useCallback, useEffect, useRef, useState } from 'react';
import { enabledRounds, type EnabledRound } from './rounds';

// Same base URL the rest of the client uses: empty in dev (Vite proxies /api), the server's
// address when the client is hosted somewhere else.
const API = import.meta.env.VITE_SOCKET_URL || '';

// The rounds a game started right now would play.
// `rounds` is null until the list has loaded, or if the server could not be reached. Callers
// should then show nothing rather than a guess (the old screens guessed "7 rounds" and were wrong).
export function useEnabledRounds() {
  const [rounds, setRounds] = useState<EnabledRound[] | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/rounds`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = enabledRounds(await res.json());
      if (alive.current) setRounds(list);
    } catch {
      if (alive.current) setRounds(null);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => { alive.current = false; };
  }, [refresh]);

  return { rounds, refresh };
}
