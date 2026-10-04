import { supabase } from './supabase';
import {
  readSyncSnapshot,
  mergeLocalLogs,
  dropAnonLogs,
  historyGeneration,
  bumpHistoryGeneration,
  snapshotLocalIds,
  removeLocalLogs,
  type LocalLog,
} from './localHistory';
import type { EmotionId } from '../emotions/catalog';

// Deliberately minimal: no reconciliation engine, no offline queue. Just three
// plain operations — upload on sign-in, pull on sign-in, append-only per check-in.
// Every function is best-effort and never throws; local storage is the source
// of truth the user always sees.

type ServerRow = { id: string; emotion: string; created_at: string };

// Set while a signed-in Clear History runs. This phone starts no new uploads
// meanwhile, so a check-in saved after the clear began can't reach the server
// in time to be cleared with the old history; the next sync uploads it.
let clearInFlight: Promise<boolean> | null = null;

/**
 * Run once whenever a user becomes (or is restored as) signed in. Uploads any
 * device-local check-ins to the account, then pulls the full account history
 * into the per-user local cache. Idempotent (keyed on the stable check-in id),
 * so it's safe to call again on every app foreground.
 */
export async function syncOnSignIn(userId: string): Promise<void> {
  if (clearInFlight) return;
  try {
    // A clear, sign-out or account deletion after this point makes the rows
    // gathered below stale, and step 4 then writes nothing.
    const since = historyGeneration();

    // 1. Start from ALL device-local rows (anon pre-account + per-uid cache).
    //    These seed the merge so a local-only row can never be dropped.
    const { anon, cached } = await readSyncSnapshot(userId);
    const merged = new Map<string, LocalLog>();
    for (const l of [...cached, ...anon]) merged.set(l.id, l);
    const local = [...merged.values()];

    // 2. Upload device-local rows (idempotent; ignore rows already present).
    //    Best-effort — if this fails, the rows still survive locally (step 4)
    //    and will be retried on the next sync.
    if (local.length > 0) {
      await supabase.from('emotion_logs').upsert(
        local.map((l) => ({
          id: l.id,
          user_id: userId,
          emotion: l.emotion,
          created_at: l.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true },
      );
    }

    // 3. Pull server rows and UNION them in — never overwrite. Server rows are
    //    layered on top of the local seed, so local-only rows are preserved
    //    even if the pull (or the upload above) failed.
    const { data, error } = await supabase.from('emotion_logs').select('id, emotion, created_at');
    if (!error && data) {
      for (const r of data as ServerRow[]) {
        merged.set(r.id, { id: r.id, emotion: r.emotion as EmotionId, createdAt: r.created_at });
      }
    }

    // 4. Merge into the per-user cache as it is NOW, not the step-1 snapshot, so
    //    a check-in saved during the network calls above is kept.
    if (!(await mergeLocalLogs(userId, [...merged.values()], since))) return;

    // 5. Anon rows are now folded into the per-user cache (step 4) — and uploaded
    //    if online — so drop them from the anon store with no risk of loss.
    await dropAnonLogs(anon.map((l) => l.id));
  } catch {
    // best-effort; the local cache remains intact and usable offline
  }
}

/** Append-only: best-effort single insert for a new signed-in check-in. */
export async function pushCheckIn(userId: string, log: LocalLog): Promise<void> {
  // Paused during Clear History; the next sync uploads this check-in instead.
  if (clearInFlight) return;
  try {
    await supabase.from('emotion_logs').insert({
      id: log.id,
      user_id: userId,
      emotion: log.emotion,
      created_at: log.createdAt,
    });
  } catch {
    // fire-and-forget; it will be re-uploaded on the next sync
  }
}

const CLEAR_TIMEOUT_MS = 10_000;

/**
 * Signed-in "Clear history". The server (clear_history) records every cleared
 * id and deletes the account's rows in one step, so a late upload from this or
 * another phone can never bring them back. Only after it succeeds is the phone
 * cleared. Returns false, leaving the phone untouched, on failure or timeout.
 */
export function clearAccountHistory(userId: string): Promise<boolean> {
  if (!clearInFlight) {
    clearInFlight = runClear(userId).finally(() => {
      clearInFlight = null;
    });
  }
  return clearInFlight;
}

async function runClear(userId: string): Promise<boolean> {
  // A sync already running must not write the old rows back.
  bumpHistoryGeneration();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLEAR_TIMEOUT_MS);
  try {
    const localIds = await snapshotLocalIds(userId);
    if (!localIds) return false;
    const { data, error } = await supabase
      .rpc('clear_history', { local_ids: localIds })
      .abortSignal(controller.signal);
    if (error || !Array.isArray(data)) return false;
    await removeLocalLogs(userId, [...localIds, ...(data as string[])]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
