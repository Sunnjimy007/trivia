import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import path from 'path';
import type { Round } from './questions';

// Where custom rounds and enable/disable toggles are saved.
// Set DATA_DIR to a persistent location in production (e.g. a Railway volume mounted at /data),
// otherwise the file lives next to the server code and is lost when the container is rebuilt.
// The default (the server/ folder) is the same whether running from src/ (tsx) or dist/ (tsc).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '../..');

export const STORE_PATH = path.join(DATA_DIR, 'custom-rounds.json');

interface StoreData {
  customRounds: Round[];
  disabledRoundIds: string[];
}

function emptyStore(): StoreData {
  return { customRounds: [], disabledRoundIds: [] };
}

function load(): StoreData {
  if (!existsSync(STORE_PATH)) return emptyStore();
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    // Migrate old format (plain array) to new format
    if (Array.isArray(raw)) return { customRounds: raw, disabledRoundIds: [] };
    return {
      customRounds: Array.isArray(raw?.customRounds) ? raw.customRounds : [],
      disabledRoundIds: Array.isArray(raw?.disabledRoundIds) ? raw.disabledRoundIds : [],
    };
  } catch (err) {
    // Keep the unreadable file instead of silently overwriting it on the next save.
    const backup = `${STORE_PATH}.corrupt-${Date.now()}`;
    try { renameSync(STORE_PATH, backup); } catch { /* ignore */ }
    console.error(`[store] Could not read ${STORE_PATH} (${(err as Error).message}); moved to ${backup}`);
    return emptyStore();
  }
}

let store: StoreData = load();

// Write to a temp file then rename, so a crash mid-write can't leave a half-written file.
function persist(): void {
  try {
    mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
    renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.error(`[store] Failed to save ${STORE_PATH}:`, err);
    throw err; // surfaces as a 500 instead of reporting a save that did not happen
  }
}

export function getCustomRounds(): Round[] {
  return store.customRounds;
}

export function getDisabledRoundIds(): string[] {
  return store.disabledRoundIds;
}

export function isRoundEnabled(id: string): boolean {
  return !store.disabledRoundIds.includes(id);
}

export function toggleRound(id: string): boolean {
  const idx = store.disabledRoundIds.indexOf(id);
  if (idx === -1) {
    store.disabledRoundIds.push(id);   // disable
  } else {
    store.disabledRoundIds.splice(idx, 1); // enable
  }
  persist();
  return !store.disabledRoundIds.includes(id); // return new enabled state
}

export function addCustomRound(round: Round): void {
  store.customRounds.push(round);
  persist();
}

export function updateCustomRound(id: string, updated: Round): boolean {
  const idx = store.customRounds.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  store.customRounds[idx] = updated;
  persist();
  return true;
}

export function deleteCustomRound(id: string): boolean {
  const before = store.customRounds.length;
  store.customRounds = store.customRounds.filter((r) => r.id !== id);
  // Also remove from disabled list if present
  store.disabledRoundIds = store.disabledRoundIds.filter((rid) => rid !== id);
  if (store.customRounds.length < before) {
    persist();
    return true;
  }
  return false;
}
