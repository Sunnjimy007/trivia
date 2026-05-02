import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import type { Round } from './questions';

const STORE_PATH = path.join(__dirname, '../../custom-rounds.json');

interface StoreData {
  customRounds: Round[];
  disabledRoundIds: string[];
}

function load(): StoreData {
  if (!existsSync(STORE_PATH)) return { customRounds: [], disabledRoundIds: [] };
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    // Migrate old format (plain array) to new format
    if (Array.isArray(raw)) return { customRounds: raw, disabledRoundIds: [] };
    return raw as StoreData;
  } catch {
    return { customRounds: [], disabledRoundIds: [] };
  }
}

let store: StoreData = load();

function persist(): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
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
