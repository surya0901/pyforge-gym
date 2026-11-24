/**
 * Syncs the spaced-repetition state to the signed-in user's `progress` record.
 *
 * - First sign-in on a device: if the user has no record yet, the progress
 *   already in this browser (from the old static site) becomes their record.
 * - Every answer: the record is patched, debounced, so a burst of answers is
 *   one write.
 * - Another device or tab writes: the record arrives over the WebSocket and
 *   replaces local state if its `savedAt` is newer. Last writer wins, by time.
 *
 * localStorage stays as an offline cache only.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutations, useQuery } from 'deepspace';
import type { Progress } from './types';

type Row = { state: Progress; savedAt: number };
export type SyncState = 'loading' | 'synced' | 'saving' | 'error';

const at = (p: Progress) => (p as Progress & { savedAt?: number }).savedAt ?? 0;

export function useProgressSync(progress: Progress, setProgress: (p: Progress) => void): SyncState {
  // RBAC is read: 'own', so this only ever returns the caller's rows.
  const { records, status } = useQuery<Row>('progress');
  const { create, put } = useMutations<Row>('progress');
  const [saving, setSaving] = useState(false);
  const created = useRef(false);
  const latest = useRef(progress);
  latest.current = progress;

  // If two devices raced to create a row, the newest one is canonical.
  const row = useMemo(
    () => [...records].sort((a, b) => (b.data.savedAt ?? 0) - (a.data.savedAt ?? 0))[0],
    [records],
  );
  const remoteAt = row?.data.savedAt ?? 0;

  // Remote is newer (first load, or another device answered): adopt it.
  useEffect(() => {
    if (!row?.data.state) return;
    if (remoteAt > at(latest.current)) setProgress({ ...row.data.state, savedAt: remoteAt } as Progress);
  }, [row?.recordId, remoteAt]);  

  // No record yet: seed it from whatever this browser already has.
  useEffect(() => {
    if (status !== 'ready' || row || created.current) return;
    created.current = true;
    const p = latest.current;
    create({ state: p, savedAt: at(p) || Date.now() });
  }, [status, row, create]);

  // Local is newer: push it (debounced).
  useEffect(() => {
    if (!row) return;
    const local = at(progress);
    if (local <= remoteAt) return;
    setSaving(true);
    const t = setTimeout(() => {
      put(row.recordId, { state: progress, savedAt: local });
      setSaving(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [progress, row, remoteAt, put]);

  if (status === 'error') return 'error';
  if (status === 'loading') return 'loading';
  return saving ? 'saving' : 'synced';
}
