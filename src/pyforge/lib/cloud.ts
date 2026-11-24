/**
 * Platform capabilities on DeepSpace.
 *
 * - Progress sync lives in ../ProgressSync.tsx (records: `progress` collection).
 * - AI goes through the `askCoach` / `gradeDesign` server actions, which call
 *   Claude via DeepSpace's AI proxy. The browser never holds a provider key;
 *   the original site asked people to paste one into localStorage.
 */
import { getAuthToken } from 'deepspace';

export type SampleFn = ((input: string | { role: string; content: string }[], opts?: Record<string, unknown>) => Promise<{ text: string }>);

/** Mirrors the server caps in src/actions/grading.ts (display only; the server enforces). */
export const DAILY_GRADES = 15;
export const DAILY_ASKS = 25;

export const aiName = (): string | null => 'Claude';

export async function callAction<T>(name: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string };
  if (!res.ok || !j.success) {
    const msg = j.error ?? `Request failed (${res.status})`;
    throw Object.assign(new Error(msg), { code: /limit/i.test(msg) ? 'rate_limited' : 'api_error' });
  }
  return j.data as T;
}

export async function getSample(): Promise<SampleFn | null> {
  return async (input, opts) => {
    const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    const { text } = await callAction<{ text: string }>('askCoach', { messages }, opts?.signal as AbortSignal | undefined);
    (opts?.onText as ((x: { text: string }) => void) | undefined)?.({ text });
    return { text };
  };
}

/** The NeetCode cloud feed only existed on the claude.ai copy; on DeepSpace the bookmarklet sync is used. */
export interface NeetcodeStatus { solved: string[]; updatedAt: string; source?: string }
export const getDB = async () => null;
export async function watchNeetcode(_cb: (s: NeetcodeStatus | null) => void): Promise<() => void> { return () => {}; }
