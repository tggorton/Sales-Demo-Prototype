import { describe, expect, it } from 'vitest'
import { isInPauseWindow } from '../../src/demo/utils/pauseWindows'
import {
  DHYH_CTA_PAUSE_WINDOWS,
  DHYH_ORGANIC_PAUSE_CTA_END_SECONDS,
} from '../../src/demo/content/dhyh/timeline'

// Pin the pause-window helper's contract — both endpoints inclusive,
// gaps between windows excluded, empty list returns false. Also pin the
// concrete DHYH numbers so an editorial change to those windows surfaces
// as an explicit test diff rather than a silent behaviour shift.
describe('isInPauseWindow', () => {
  const windows = [
    { start: 77, end: 107 },
    { start: 153, end: 532 },
  ] as const

  it('returns true strictly inside any window', () => {
    expect(isInPauseWindow(80, windows)).toBe(true)
    expect(isInPauseWindow(100, windows)).toBe(true)
    expect(isInPauseWindow(200, windows)).toBe(true)
    expect(isInPauseWindow(500, windows)).toBe(true)
  })

  it('treats both endpoints as inclusive', () => {
    expect(isInPauseWindow(77, windows)).toBe(true)
    expect(isInPauseWindow(107, windows)).toBe(true)
    expect(isInPauseWindow(153, windows)).toBe(true)
    expect(isInPauseWindow(532, windows)).toBe(true)
  })

  it('returns false in the gap between two windows', () => {
    expect(isInPauseWindow(108, windows)).toBe(false)
    expect(isInPauseWindow(130, windows)).toBe(false)
    expect(isInPauseWindow(152, windows)).toBe(false)
  })

  it('returns false before the first window and after the last', () => {
    expect(isInPauseWindow(0, windows)).toBe(false)
    expect(isInPauseWindow(76, windows)).toBe(false)
    expect(isInPauseWindow(533, windows)).toBe(false)
    expect(isInPauseWindow(10000, windows)).toBe(false)
  })

  it('returns false for an empty windows list', () => {
    expect(isInPauseWindow(100, [])).toBe(false)
  })
})

describe('DHYH pause-window constants', () => {
  it('matches the editorial spec for CTA Pause (1:17–1:47, 2:33–8:52)', () => {
    expect(DHYH_CTA_PAUSE_WINDOWS).toEqual([
      { start: 77, end: 107 },
      { start: 153, end: 532 },
    ])
  })

  it('fades the Organic Pause CTA at 15 s', () => {
    expect(DHYH_ORGANIC_PAUSE_CTA_END_SECONDS).toBe(15)
  })
})
