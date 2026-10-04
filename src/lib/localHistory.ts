import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmotionId } from '../emotions/catalog';
import { clearSupportPrompt } from '../features/safety/supportPrompt';

// Emotion history is local-first. Signed-out check-ins live under the anon key;
// signed-in check-ins live under a per-user key. The local store is always the
// primary read source; the server is a backup/sync target only when signed in.
const ANON_KEY = 'silentsupport.history.v1';

export type LocalLog = {
  id: string;
  emotion: EmotionId;
  createdAt: string; // ISO 8601
};

export function historyKey(userId: string | null): string {
  return userId ? `silentsupport.history.${userId}` : ANON_KEY;
}

// In-memory mirror of the last-touched store, so strength scoring can read
// recent history SYNCHRONOUSLY at frame 0 (AsyncStorage is async). Warmed by any
// read/write; cold (different key / first launch) safely yields [].
let cache: { key: string; logs: LocalLog[] } | null = null;
function setCache(key: string, logs: LocalLog[]) {
  cache = { key, logs };
}

/** Synchronous best-effort read of the current store for scoring. May be empty. */
export function getCachedLogsSync(userId: string | null): LocalLog[] {
  const key = historyKey(userId);
  return cache && cache.key === key ? cache.logs : [];
}

// Every read-modify-write of a history store runs through this queue, one at a
// time, so a sync's merge can't overwrite a check-in saved alongside it. Only
// on-device storage work is ever queued, never a network call.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

// Bumped whenever history is cleared (Clear History, sign-out, account
// deletion). A sync that started before a bump must not write its rows back.
let generation = 0;
export function historyGeneration(): number {
  return generation;
}
export function bumpHistoryGeneration(): void {
  generation += 1;
}

// Not security-sensitive — just a unique local row id.
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Reads a store without touching the in-memory mirror. Null if unreadable. */
async function readRaw(key: string): Promise<LocalLog[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalLog[]) : [];
  } catch {
    return null;
  }
}

async function readKey(key: string): Promise<LocalLog[]> {
  const logs = await readRaw(key);
  if (!logs) return [];
  setCache(key, logs);
  return logs;
}

export async function getLocalLogs(userId: string | null): Promise<LocalLog[]> {
  return readKey(historyKey(userId));
}

export async function appendLocalLog(
  userId: string | null,
  emotion: EmotionId,
  createdAt?: string,
): Promise<LocalLog> {
  const log: LocalLog = { id: uuidv4(), emotion, createdAt: createdAt ?? new Date().toISOString() };
  await serial(async () => {
    try {
      const key = historyKey(userId);
      const logs = await readKey(key);
      logs.push(log);
      await AsyncStorage.setItem(key, JSON.stringify(logs));
      setCache(key, logs);
    } catch {
      // best-effort — never block the experience
    }
  });
  return log;
}

/** Sync step 1: both stores as they are now, without moving the in-memory mirror. */
export function readSyncSnapshot(userId: string): Promise<{ anon: LocalLog[]; cached: LocalLog[] }> {
  return serial(async () => ({
    anon: (await readRaw(ANON_KEY)) ?? [],
    cached: (await readRaw(historyKey(userId))) ?? [],
  }));
}

function newestFirst(a: LocalLog, b: LocalLog): number {
  const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return t !== 0 ? t : a.id.localeCompare(b.id);
}

/**
 * Sync: union `rows` into this user's store as it is NOW (not as it was when the
 * sync started), so a check-in saved while the sync was on the network is kept.
 * Writes nothing and returns false if history was cleared after `since`.
 */
export function mergeLocalLogs(userId: string, rows: LocalLog[], since: number): Promise<boolean> {
  return serial(async () => {
    if (generation !== since) return false;
    const key = historyKey(userId);
    const current = await readRaw(key);
    if (!current) return false;
    const merged = new Map<string, LocalLog>();
    for (const l of [...current, ...rows]) merged.set(l.id, l);
    const logs = [...merged.values()].sort(newestFirst);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(logs));
    } catch {
      return false;
    }
    setCache(key, logs);
    return true;
  });
}

/**
 * Sync: these signed-out check-ins now live in the account, so drop them from
 * the anon store. Unlike clearAnonLogs, this keeps the support-nudge cooldown
 * (nothing was cleared) and leaves the in-memory mirror on the account.
 */
export function dropAnonLogs(ids: string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  const drop = new Set(ids);
  return serial(async () => {
    const current = await readRaw(ANON_KEY);
    if (!current) return;
    const remaining = current.filter((l) => !drop.has(l.id));
    try {
      if (remaining.length === 0) await AsyncStorage.removeItem(ANON_KEY);
      else await AsyncStorage.setItem(ANON_KEY, JSON.stringify(remaining));
      if (cache?.key === ANON_KEY) setCache(ANON_KEY, remaining);
    } catch {
      // best-effort; folded rows are deduped by id on the next sync
    }
  });
}

/** Signed-in Clear History: every check-in id on this phone right now (null if unreadable). */
export function snapshotLocalIds(userId: string): Promise<string[] | null> {
  return serial(async () => {
    const own = await readRaw(historyKey(userId));
    const anon = await readRaw(ANON_KEY);
    if (!own || !anon) return null;
    return [...own, ...anon].map((l) => l.id);
  });
}

/**
 * Signed-in Clear History succeeded on the server: remove exactly these
 * check-ins from the phone. A check-in saved after the clear began is kept.
 */
export async function removeLocalLogs(userId: string, ids: string[]): Promise<void> {
  const drop = new Set(ids);
  generation += 1;
  await serial(async () => {
    // Anon store first, so the in-memory mirror ends on the account.
    for (const key of [ANON_KEY, historyKey(userId)]) {
      try {
        const remaining = ((await readRaw(key)) ?? []).filter((l) => !drop.has(l.id));
        if (remaining.length === 0) await AsyncStorage.removeItem(key);
        else await AsyncStorage.setItem(key, JSON.stringify(remaining));
        if (key !== ANON_KEY || cache?.key === ANON_KEY) setCache(key, remaining);
      } catch {
        // ignore
      }
    }
  });
  // The support-nudge cooldown is derived from history, so clear it too.
  void clearSupportPrompt();
}

export async function clearLocalLogs(userId: string | null): Promise<void> {
  // A sync that started before this clear must not write its rows back.
  generation += 1;
  await serial(async () => {
    try {
      const key = historyKey(userId);
      await AsyncStorage.removeItem(key);
      setCache(key, []);
    } catch {
      // ignore
    }
  });
  // The support-nudge cooldown is derived from history, so clear it too.
  void clearSupportPrompt();
}

// A per-account store's key ends in the account id (a uuid); ANON_KEY never matches.
const ACCOUNT_KEY = /^silentsupport\.history\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An account's history stays on this phone only while that account is signed
 * in here. Removes every account's copy except `keepUserId`'s (null: all of
 * them), e.g. after the session ended without a sign-out on this phone (account
 * deleted on another phone, session revoked). Signed-out check-ins are kept.
 */
export async function dropAccountCaches(keepUserId: string | null): Promise<void> {
  // A sync that started before this must not write its rows back.
  generation += 1;
  let dropped = false;
  await serial(async () => {
    try {
      const keep = keepUserId ? historyKey(keepUserId) : null;
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => ACCOUNT_KEY.test(k) && k !== keep);
      if (keys.length === 0) return;
      await AsyncStorage.multiRemove(keys);
      if (cache && keys.includes(cache.key)) setCache(cache.key, []);
      dropped = true;
    } catch {
      // best-effort; tried again at the next start or sign-out
    }
  });
  // The support-nudge cooldown is derived from history, so clear it too.
  if (dropped) void clearSupportPrompt();
}

export async function clearAnonLogs(): Promise<void> {
  await serial(async () => {
    try {
      await AsyncStorage.removeItem(ANON_KEY);
      setCache(ANON_KEY, []);
    } catch {
      // ignore
    }
  });
  void clearSupportPrompt();
}
