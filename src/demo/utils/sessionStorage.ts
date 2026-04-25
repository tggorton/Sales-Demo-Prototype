import type { AdPlaybackOption, CurrentView, TierOption } from '../types'

// Versioned key so we can safely evolve the persisted shape later without reading
// stale data from old browsers.
const STORAGE_KEY = 'sdp:session:v1'

// Only the "which page is the user on" keys are persisted across refresh. Page-
// local state (scrubber position, panels, mute, selected taxonomy, etc.) is
// intentionally dropped so a refresh feels like a fresh load of that page rather
// than a resume-where-you-left-off.
export type PersistedSession = {
  currentView: CurrentView
  selectedContentId: string | null
  selectedTier: TierOption
  selectedAdPlayback: AdPlaybackOption
}

export const loadPersistedSession = (): Partial<PersistedSession> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Partial<PersistedSession>
  } catch {
    // Corrupt JSON, storage disabled (private mode on some browsers), or a quota
    // error. Failing soft keeps the app bootable with defaults.
    return {}
  }
}

export const savePersistedSession = (session: PersistedSession): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* ignore write failures – treat storage as optional */
  }
}

export const clearPersistedSession = (): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
