import type { AbcRow } from "./types";

export const abcMarginTargets = { A: 10, B: 15, C: 20 } as const;

/** Minimum meaningful high-volume level within the seller's current catalog. */
export function highVolumeThreshold(rows: AbcRow[]): number | null {
  const sales = rows.map(row => row.sales).filter((value): value is number =>
    value !== null && value > 0).sort((a,b) => a-b);
  if (!sales.length) return null;
  return sales[Math.floor(0.75*(sales.length-1))];
}

export function abcStrategy(row: AbcRow, threshold: number | null) {
  const target = row.abcClass ? abcMarginTargets[row.abcClass] : null;
  const complete = target !== null && row.margin !== null;
  const attraction = Boolean(
    row.abcClass === "A" &&
    row.margin !== null && row.margin >= 0 && row.margin < (target ?? 0) &&
    row.sales !== null && threshold !== null && row.sales >= threshold,
  );
  const state = !complete ? "incomplete" : row.margin! < 0 ? "loss" :
    row.margin! < target! ? "below-target" : "healthy";
  return { target, state, attraction };
}
