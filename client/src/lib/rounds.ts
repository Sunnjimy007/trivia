export interface EnabledRound {
  id: string;
  name: string;
  emoji: string;
}

// The public rounds list says which rounds a new game would play. Keep only the switched-on
// ones, and ignore anything that is not shaped like a round, so a bad response can't break a screen.
export function enabledRounds(list: unknown): EnabledRound[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((r): EnabledRound[] => {
    if (!r || typeof r !== 'object') return [];
    const { id, name, emoji, enabled } = r as Record<string, unknown>;
    if (enabled !== true || typeof id !== 'string' || typeof name !== 'string') return [];
    return [{ id, name, emoji: typeof emoji === 'string' ? emoji : '' }];
  });
}

export function roundCountText(count: number): string {
  return `${count} ${count === 1 ? 'round' : 'rounds'}`;
}
