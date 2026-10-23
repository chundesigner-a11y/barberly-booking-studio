export type SlotRow = { id: string; starts_at: string; ends_at: string };

/**
 * Start slots that have N back-to-back FREE slots (itself + the next N-1).
 * `free` must already exclude held slots (the available_slots anti-join), sorted by starts_at.
 * Contiguity: each next slot starts exactly where the previous one ended — a held slot
 * or a gap in the schedule breaks the run.
 */
export function validStarts(free: SlotRow[], n: number): Map<string, SlotRow[]> {
  const out = new Map<string, SlotRow[]>();
  if (n < 1) return out;
  for (let i = 0; i < free.length; i++) {
    const run: SlotRow[] = [free[i]!];
    for (let j = i + 1; j < free.length && run.length < n; j++) {
      const prev = run[run.length - 1]!;
      const next = free[j]!;
      if (new Date(next.starts_at).getTime() !== new Date(prev.ends_at).getTime()) break;
      run.push(next);
    }
    if (run.length === n) out.set(free[i]!.id, run);
  }
  return out;
}
