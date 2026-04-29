// Tiny helpers for reading Vite env overrides. Centralized so the same
// resolution rules (empty string -> fallback, non-numeric -> fallback)
// apply everywhere we expose a `VITE_*` swap point.
//
// Used by:
//   - src/demo/constants.ts (content-level video URLs)
//   - src/demo/ad-modes/modes/<id>/config.ts (per-mode ad creative URLs)

export const envString = (key: string, fallback: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return value && value.length > 0 ? value : fallback
}

export const envNumber = (key: string, fallback: number): number => {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
