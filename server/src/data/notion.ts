import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'fs';
import path from 'path';
import type { Round } from './questions';
import { DATA_DIR } from './customRoundsStore';

// Notion connector. Rounds and questions are typed into two Notion databases ("Rounds" and "Question bank",
// see the README) and the server reads them with the Notion API. The last good copy is saved to disk, so a
// Notion outage or a restart never leaves the game without rounds. Nothing here ever writes to Notion except
// the one-off "copy the built-in rounds" job.
//
// Environment:
//   NOTION_TOKEN          the secret of an internal Notion integration
//   NOTION_ROUNDS_DB      id (or URL) of the Rounds database
//   NOTION_QUESTIONS_DB   id (or URL) of the Question bank database
//   NOTION_API_BASE       only for tests: where to send API calls instead of https://api.notion.com
//   NOTION_REQUEST_GAP_MS only for tests: pause between calls (default 350 ms, Notion allows about 3 a second)

export interface NotionRound extends Round {
  enabled: boolean;   // the "On" checkbox
  notionUrl: string;  // the round's page, so the admin panel can link to it
}

export interface SeedProgress {
  running: boolean;
  done: number;
  total: number;
  error: string | null;
  finishedAt: number | null;
}

export interface NotionStatus {
  configured: boolean;
  syncedAt: number | null;
  rounds: number;
  questions: number;
  warningCount: number;
  error: string | null;
  seed: SeedProgress;
}

// The parts of a Notion page we read.
export interface NotionPage {
  id: string;
  url?: string;
  created_time?: string;
  archived?: boolean;
  in_trash?: boolean;
  properties?: Record<string, any>;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const ID_OK = /^[A-Za-z0-9_-]{1,60}$/;
const CACHE_PATH = path.join(DATA_DIR, 'notion-cache.json');
const SYNC_EVERY_MS = 5 * 60_000;

// ── Configuration ───────────────────────────────────────────────────────────
// Accepts an id with or without dashes, or a whole pasted Notion URL.
function cleanId(raw: string | undefined): string {
  const m = /[0-9a-f]{32}/i.exec((raw ?? '').replace(/-/g, ''));
  return m ? m[0].toLowerCase() : '';
}

function config() {
  return {
    token: (process.env.NOTION_TOKEN ?? '').trim(),
    roundsDb: cleanId(process.env.NOTION_ROUNDS_DB),
    questionsDb: cleanId(process.env.NOTION_QUESTIONS_DB),
  };
}

export function isConfigured(): boolean {
  const c = config();
  return !!(c.token && c.roundsDb && c.questionsDb);
}

const apiBase = () => (process.env.NOTION_API_BASE || 'https://api.notion.com').replace(/\/$/, '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const gap = () => {
  const ms = Number(process.env.NOTION_REQUEST_GAP_MS ?? 350);
  return ms > 0 ? sleep(ms) : Promise.resolve();
};

// ── Turning Notion pages into rounds (pure, so it is easy to test) ──────────
const text = (p: any): string => {
  const parts = p?.title ?? p?.rich_text;
  return Array.isArray(parts) ? parts.map((t: any) => t?.plain_text ?? '').join('').trim() : '';
};
const num = (p: any): number | null => (typeof p?.number === 'number' ? p.number : null);
const norm = (id: string) => id.replace(/-/g, '').toLowerCase();
const short = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);
const live = (p: NotionPage) => !p.archived && !p.in_trash;

interface Ranked<T> { item: T; order: number | null; created: string }
const byOrder = <T>(a: Ranked<T>, b: Ranked<T>) =>
  (a.order ?? Infinity) - (b.order ?? Infinity) || a.created.localeCompare(b.created);

export function parseNotion(roundPages: NotionPage[], questionPages: NotionPage[]): { rounds: NotionRound[]; warnings: string[] } {
  const warnings: string[] = [];

  // Questions first, grouped by the round (page id) they belong to.
  const buckets = new Map<string, Ranked<{ pageId: string; text: string; options: { id: string; text: string }[]; correctOptionId: string }>[]>();
  for (const page of questionPages.filter(live)) {
    const props = page.properties ?? {};
    const title = text(props.Question);
    const options = LETTERS.map((l) => text(props[l]));
    if (!title && options.every((o) => !o)) continue; // an empty row: ignore quietly

    const label = `Question "${short(title || '(no text)')}"`;
    const correct: string = props.Correct?.select?.name ?? '';
    const roundKeys: string[] = (props.Round?.relation ?? []).map((r: { id: string }) => norm(r.id));
    const problems: string[] = [];
    if (!title) problems.push('has no question text');
    options.forEach((o, i) => { if (!o) problems.push(`has no answer ${LETTERS[i]}`); });
    if (!LETTERS.includes(correct)) problems.push('needs a Correct answer picked');
    if (roundKeys.length === 0) problems.push('is not in a Round');
    if (problems.length) {
      warnings.push(`${label} is skipped: it ${problems.join(', ')}.`);
      continue;
    }

    const q = {
      pageId: norm(page.id),
      text: title,
      options: LETTERS.map((l, i) => ({ id: l, text: options[i] })),
      correctOptionId: correct,
    };
    for (const key of roundKeys) {
      const list = buckets.get(key) ?? [];
      list.push({ item: q, order: num(props.Order), created: page.created_time ?? '' });
      buckets.set(key, list);
    }
  }

  const ranked: Ranked<NotionPage>[] = roundPages.filter(live).map((p) => ({
    item: p, order: num(p.properties?.Order), created: p.created_time ?? '',
  }));
  ranked.sort(byOrder);

  const rounds: NotionRound[] = [];
  const usedIds = new Set<string>();
  for (const { item: page } of ranked) {
    const props = page.properties ?? {};
    const key = norm(page.id);
    const name = text(props.Name);
    const questions = (buckets.get(key) ?? []).sort(byOrder).map(({ item }) => item);

    if (!name) {
      if (questions.length) warnings.push('A round that has questions has no Name, so it is skipped.');
      continue;
    }
    if (questions.length === 0) {
      warnings.push(`Round "${name}" has no complete questions yet, so it is not in the game.`);
      continue;
    }

    // The Round ID lets a Notion round replace a built-in one (round3 and so on). New rounds get an id from the page.
    const fallback = `notion-${key.slice(0, 12)}`;
    let id = text(props['Round ID']);
    if (id && !ID_OK.test(id)) {
      warnings.push(`Round "${name}": the Round ID may only use letters, numbers, - and _. Using an automatic one instead.`);
      id = '';
    }
    if (!id) id = fallback;
    if (usedIds.has(id)) {
      warnings.push(`Round "${name}" repeats the Round ID "${id}". Using an automatic one instead.`);
      id = fallback;
    }
    usedIds.add(id);

    rounds.push({
      id,
      name,
      emoji: text(props.Emoji) || '🎯',
      description: text(props.Description),
      questions: questions.map((q) => ({
        id: `${id}-${q.pageId.slice(0, 8)}`,
        text: q.text,
        options: q.options,
        correctOptionId: q.correctOptionId,
      })),
      enabled: props.On?.checkbox === true,
      notionUrl: page.url ?? '',
    });
  }
  return { rounds, warnings };
}

// ── Talking to the Notion API ───────────────────────────────────────────────
function friendly(status: number, message: unknown): string {
  if (status === 401) return 'Notion rejected the token. Check NOTION_TOKEN.';
  if (status === 404) return 'Notion could not find a database. Check the database ids, and that the integration is connected to the Questions page.';
  return `Notion error ${status}${typeof message === 'string' && message ? `: ${message}` : ''}`;
}

async function notionFetch(pathname: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const { token } = config();
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res: Response;
    try {
      res = await fetch(`${apiBase()}${pathname}`, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(`Could not reach Notion (${(err as Error).message})`);
    } finally {
      clearTimeout(timer);
    }
    // Rate limited: wait as long as Notion asks, a few times at most.
    if (res.status === 429 && attempt < 3) {
      await sleep((Number(res.headers.get('retry-after')) || 1) * 1000);
      continue;
    }
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(friendly(res.status, data?.message));
    return data;
  }
}

async function queryAll(databaseId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const data = await notionFetch(`/v1/databases/${databaseId}/query`, {
      method: 'POST',
      body: { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
    });
    pages.push(...(data.results ?? []).filter((p: any) => p?.object === 'page'));
    cursor = data.has_more ? data.next_cursor : undefined;
    if (cursor) await gap();
  } while (cursor);
  return pages;
}

// ── What we last read from Notion ───────────────────────────────────────────
interface Cache {
  rounds: NotionRound[];
  warnings: string[];
  syncedAt: number | null;
  error: string | null;
}

function loadCache(): Cache {
  try {
    if (existsSync(CACHE_PATH)) {
      const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      if (Array.isArray(raw?.rounds)) {
        return { rounds: raw.rounds, warnings: Array.isArray(raw.warnings) ? raw.warnings : [], syncedAt: raw.syncedAt ?? null, error: null };
      }
    }
  } catch (err) {
    console.error(`[notion] Could not read ${CACHE_PATH}: ${(err as Error).message}`);
  }
  return { rounds: [], warnings: [], syncedAt: null, error: null };
}

function saveCache(): void {
  try {
    mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify({ rounds: cache.rounds, warnings: cache.warnings, syncedAt: cache.syncedAt }), 'utf-8');
    renameSync(tmp, CACHE_PATH);
  } catch (err) {
    console.error(`[notion] Could not save ${CACHE_PATH}: ${(err as Error).message}`);
  }
}

let cache: Cache = loadCache();
let lastAttemptAt = 0;
let inFlight: Promise<NotionStatus> | null = null;
let seed: SeedProgress = { running: false, done: 0, total: 0, error: null, finishedAt: null };

// Rounds from Notion. Empty when Notion is not connected, even if an old copy is saved.
export function getNotionRounds(): NotionRound[] {
  return isConfigured() ? cache.rounds : [];
}

export function getWarnings(): string[] {
  return isConfigured() ? cache.warnings : [];
}

export function getStatus(): NotionStatus {
  const configured = isConfigured();
  const rounds = configured ? cache.rounds : [];
  return {
    configured,
    syncedAt: configured ? cache.syncedAt : null,
    rounds: rounds.length,
    questions: rounds.reduce((n, r) => n + r.questions.length, 0),
    warningCount: configured ? cache.warnings.length : 0,
    error: configured ? cache.error : null,
    seed: { ...seed },
  };
}

// Reads Notion now. Never throws: on a failure the old rounds stay and the status carries the error.
export function sync(): Promise<NotionStatus> {
  if (!isConfigured()) return Promise.resolve(getStatus());
  inFlight ??= (async () => {
    lastAttemptAt = Date.now();
    try {
      const { roundsDb, questionsDb } = config();
      const roundPages = await queryAll(roundsDb);
      const questionPages = await queryAll(questionsDb);
      const { rounds, warnings } = parseNotion(roundPages, questionPages);
      cache = { rounds, warnings, syncedAt: Date.now(), error: null };
      saveCache();
    } catch (err) {
      cache = { ...cache, error: (err as Error).message };
      console.error(`[notion] Sync failed: ${(err as Error).message}`);
    }
    return getStatus();
  })().finally(() => { inFlight = null; });
  return inFlight;
}

// Called when someone opens the rounds list or a lobby: refresh in the background if it has been a minute.
export function refreshIfStale(maxAgeMs = 60_000): void {
  if (!isConfigured() || inFlight || Date.now() - lastAttemptAt < maxAgeMs) return;
  void sync();
}

// Read Notion at startup, then every few minutes.
export function start(): void {
  const c = config();
  if (!isConfigured()) {
    if (c.token || c.roundsDb || c.questionsDb) {
      console.warn('   ⚠️  Notion is only partly set up: NOTION_TOKEN, NOTION_ROUNDS_DB and NOTION_QUESTIONS_DB are all needed.');
    }
    return;
  }
  console.log('   Notion is connected: rounds and questions are read from Notion.');
  void sync();
  setInterval(() => void sync(), SYNC_EVERY_MS).unref();
}

// ── Copying the built-in rounds into Notion (a one-off, safe to run again) ──
const rich = (s: string) => ({ rich_text: s ? [{ text: { content: s.slice(0, 2000) } }] : [] });

export function startSeed(items: { round: Round; enabled: boolean }[]): 'started' | 'running' | 'not-configured' {
  if (!isConfigured()) return 'not-configured';
  if (seed.running) return 'running';
  seed = { running: true, done: 0, total: 0, error: null, finishedAt: null };
  void runSeed(items);
  return 'started';
}

async function runSeed(items: { round: Round; enabled: boolean }[]): Promise<void> {
  const created: string[] = []; // pages made for the round in progress, so an interrupted round can be tidied away
  try {
    const { roundsDb, questionsDb } = config();

    // A round that is already in Notion is never touched, so edits made there are safe.
    const existing = new Set(
      (await queryAll(roundsDb)).filter(live).map((p) => text(p.properties?.['Round ID'])).filter(Boolean),
    );
    const todo = items.map((item, index) => ({ ...item, index })).filter(({ round }) => !existing.has(round.id));
    seed.total = todo.reduce((n, { round }) => n + 1 + round.questions.length, 0);

    for (const { round, enabled, index } of todo) {
      created.length = 0;
      const page = await notionFetch('/v1/pages', {
        method: 'POST',
        body: {
          parent: { database_id: roundsDb },
          properties: {
            Name: { title: [{ text: { content: round.name.slice(0, 200) } }] },
            Emoji: rich(round.emoji),
            Description: rich(round.description),
            On: { checkbox: enabled },
            Order: { number: index + 1 },
            'Round ID': rich(round.id),
          },
        },
      });
      created.push(page.id as string);
      seed.done++;
      await gap();

      for (const [i, q] of round.questions.entries()) {
        const made = await notionFetch('/v1/pages', {
          method: 'POST',
          body: {
            parent: { database_id: questionsDb },
            properties: {
              Question: { title: [{ text: { content: q.text.slice(0, 2000) } }] },
              Round: { relation: [{ id: page.id }] },
              A: rich(q.options.find((o) => o.id === 'A')?.text ?? ''),
              B: rich(q.options.find((o) => o.id === 'B')?.text ?? ''),
              C: rich(q.options.find((o) => o.id === 'C')?.text ?? ''),
              D: rich(q.options.find((o) => o.id === 'D')?.text ?? ''),
              Correct: { select: { name: q.correctOptionId } },
              Order: { number: i + 1 },
            },
          },
        });
        created.push(made.id as string);
        seed.done++;
        await gap();
      }
      created.length = 0; // this round is complete
    }

    seed = { ...seed, running: false, finishedAt: Date.now() };
    await sync(); // pick the new rows up straight away
  } catch (err) {
    // Archive the half-copied round (best effort) so running the copy again starts that round fresh.
    for (const id of created) {
      try { await notionFetch(`/v1/pages/${id}`, { method: 'PATCH', body: { archived: true } }); } catch { /* ignore */ }
    }
    seed = { ...seed, running: false, error: (err as Error).message, finishedAt: Date.now() };
    console.error(`[notion] Copy to Notion failed: ${(err as Error).message}`);
  }
}
