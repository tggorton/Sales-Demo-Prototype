import { describe, expect, it } from 'vitest'
import {
  buildDhyhImpulseSegments,
  computeAdBreakProgress,
  findActiveImpulseSegment,
  isAdBreakSegment,
  mapPlayerToClipSeconds,
} from '../../src/demo/utils/adBreakMath'
import type { SyncImpulseSegment } from '../../src/demo/types'

// HANDOFF §6 — protected behavior: sync-style ad-break content has two
// timelines — the scrubber (player-time, includes ad-break duration) and
// the panels (clip-time, ignores ad-break duration). DHYH inserts the
// break at the mid-clip splice point (Segment A → Ad → Segment B);
// MasterChef anchors it at the tail (Content → Ad). The math below is
// the boundary between the two timelines for either layout. Pinning these
// tests so a future refactor can't silently re-introduce the "products
// from Segment B leak into Segment A" or "panel sticks at scene 1 during
// the ad break" bugs.

const dhyhDefaults = {
  isAdBreakMode: true,
  adBreakClipSeconds: 107, // DHYH splice point
  adBreakDurationSeconds: 30, // Sync: Impulse / L-Bar default
}

describe('mapPlayerToClipSeconds (player ↔ clip time conversion)', () => {
  it('returns playerSeconds unchanged for non-ad-break modes', () => {
    expect(
      mapPlayerToClipSeconds(50, { ...dhyhDefaults, isAdBreakMode: false })
    ).toBe(50)
  })

  it('returns playerSeconds unchanged inside Segment A (pre-ad-break)', () => {
    expect(mapPlayerToClipSeconds(50, dhyhDefaults)).toBe(50)
    expect(mapPlayerToClipSeconds(106.99, dhyhDefaults)).toBe(106.99)
  })

  it('pins clip-time just below the splice point during the ad-break window', () => {
    // At adBreakClipSeconds (107): we're entering the ad break — the
    // helper holds clip-time at 106.999 so panels stay anchored to the
    // last Segment A scene.
    expect(mapPlayerToClipSeconds(107, dhyhDefaults)).toBe(106.999)
    // Mid-break (122s): same hold.
    expect(mapPlayerToClipSeconds(122, dhyhDefaults)).toBe(106.999)
    // Just before exit (136.99s, when ad ends at 137): still held.
    expect(mapPlayerToClipSeconds(136.99, dhyhDefaults)).toBe(106.999)
  })

  it('subtracts adBreakDuration once playback is past the ad break', () => {
    // Player time 137s = clip time 107s (Segment B starts here).
    expect(mapPlayerToClipSeconds(137, dhyhDefaults)).toBe(107)
    // Player time 200s = clip time 170s.
    expect(mapPlayerToClipSeconds(200, dhyhDefaults)).toBe(170)
  })

  it('honors the per-mode adBreakDurationSeconds (Sync = 45s)', () => {
    const syncOpts = { ...dhyhDefaults, adBreakDurationSeconds: 45 }
    // During break: held just below splice.
    expect(mapPlayerToClipSeconds(140, syncOpts)).toBe(106.999)
    // Past break (152 = 107 + 45): clip-time = 107.
    expect(mapPlayerToClipSeconds(152, syncOpts)).toBe(107)
  })

  it('clamps the held clip-time at 0 (defensive — adBreakClipSeconds < 0.001 would underflow)', () => {
    expect(
      mapPlayerToClipSeconds(0, {
        ...dhyhDefaults,
        adBreakClipSeconds: 0,
      })
    ).toBe(0)
  })

  // MasterChef pattern: ad break sits at the END of the clip (no Segment B).
  // The same math applies: pre-ad is 1:1, in-break pins just below the
  // splice point, post-break subtracts the duration. There's nothing
  // *visible* past the ad for MC, but the math must still terminate cleanly.
  describe('tail-anchored break (MasterChef pattern)', () => {
    const mcDefaults = {
      isAdBreakMode: true,
      adBreakClipSeconds: 241.42, // = clip duration
      adBreakDurationSeconds: 45,
    }

    it('pre-ad: 1:1 mapping through the entire content', () => {
      expect(mapPlayerToClipSeconds(0, mcDefaults)).toBe(0)
      expect(mapPlayerToClipSeconds(100, mcDefaults)).toBe(100)
      expect(mapPlayerToClipSeconds(241.41, mcDefaults)).toBe(241.41)
    })

    it('in-break: pins clip-time just below the tail anchor', () => {
      expect(mapPlayerToClipSeconds(241.42, mcDefaults)).toBeCloseTo(241.419, 3)
      expect(mapPlayerToClipSeconds(260, mcDefaults)).toBeCloseTo(241.419, 3)
      expect(mapPlayerToClipSeconds(286.41, mcDefaults)).toBeCloseTo(241.419, 3)
    })

    it('post-break: clip-time lands at the tail anchor (where playback ends)', () => {
      expect(mapPlayerToClipSeconds(286.42, mcDefaults)).toBeCloseTo(241.42, 3)
    })
  })
})

describe('buildDhyhImpulseSegments', () => {
  it('builds three segments in order: content / ad-break-1 / content', () => {
    const segments = buildDhyhImpulseSegments({
      adBreakClipSeconds: 107,
      adBreakDurationSeconds: 30,
      clipDurationSeconds: 602,
    })
    expect(segments).toHaveLength(3)
    expect(segments[0].kind).toBe('content')
    expect(segments[1].kind).toBe('ad-break-1')
    expect(segments[2].kind).toBe('content')
  })

  it('Segment A spans 0 to the splice point', () => {
    const [segA] = buildDhyhImpulseSegments({
      adBreakClipSeconds: 107,
      adBreakDurationSeconds: 30,
      clipDurationSeconds: 602,
    })
    expect(segA).toEqual({ start: 0, end: 107, kind: 'content' })
  })

  it('Ad-break spans the configured duration starting at the splice point', () => {
    const [, ad] = buildDhyhImpulseSegments({
      adBreakClipSeconds: 107,
      adBreakDurationSeconds: 30,
      clipDurationSeconds: 602,
    })
    expect(ad).toEqual({ start: 107, end: 137, kind: 'ad-break-1' })
  })

  it('Segment B spans from ad-break end to clip+adBreak duration', () => {
    const [, , segB] = buildDhyhImpulseSegments({
      adBreakClipSeconds: 107,
      adBreakDurationSeconds: 30,
      clipDurationSeconds: 602,
    })
    expect(segB).toEqual({ start: 137, end: 632, kind: 'content' })
  })

  it('updates segment boundaries with per-mode ad-break duration (Sync = 45s)', () => {
    const segments = buildDhyhImpulseSegments({
      adBreakClipSeconds: 107,
      adBreakDurationSeconds: 45,
      clipDurationSeconds: 602,
    })
    expect(segments[1]).toEqual({ start: 107, end: 152, kind: 'ad-break-1' })
    expect(segments[2]).toEqual({ start: 152, end: 647, kind: 'content' })
  })

  // Tail-anchored content (MasterChef): adBreakClipSeconds === clipDuration,
  // so the trailing content segment would be zero-length — the builder must
  // collapse it so the scrubber renders as [content, ad-break-1] only.
  it('collapses the trailing zero-length content segment for tail-anchored breaks', () => {
    const segments = buildDhyhImpulseSegments({
      adBreakClipSeconds: 241.42,
      adBreakDurationSeconds: 45,
      clipDurationSeconds: 241.42,
    })
    expect(segments).toHaveLength(2)
    expect(segments[0]).toEqual({ start: 0, end: 241.42, kind: 'content' })
    expect(segments[1].kind).toBe('ad-break-1')
    expect(segments[1].start).toBe(241.42)
    expect(segments[1].end).toBeCloseTo(286.42, 5)
  })
})

describe('findActiveImpulseSegment', () => {
  const segments: SyncImpulseSegment[] = [
    { start: 0, end: 60, kind: 'content' },
    { start: 60, end: 90, kind: 'ad-break-1' },
    { start: 90, end: 150, kind: 'content' },
    { start: 150, end: 180, kind: 'ad-break-2' },
    { start: 180, end: 240, kind: 'content' },
  ]

  it('returns the segment containing the player-time value', () => {
    expect(findActiveImpulseSegment(segments, 30)?.kind).toBe('content')
    expect(findActiveImpulseSegment(segments, 75)?.kind).toBe('ad-break-1')
    expect(findActiveImpulseSegment(segments, 120)?.kind).toBe('content')
    expect(findActiveImpulseSegment(segments, 165)?.kind).toBe('ad-break-2')
  })

  it('uses half-open intervals — start inclusive, end exclusive', () => {
    expect(findActiveImpulseSegment(segments, 60)?.kind).toBe('ad-break-1')
    // 60 = end of content[0], start of ad-break-1 → ad-break-1 wins
    expect(findActiveImpulseSegment(segments, 0)?.kind).toBe('content')
  })

  it('past the last segment, returns the last segment (sticks at the end)', () => {
    expect(findActiveImpulseSegment(segments, 1000)).toBe(segments[segments.length - 1])
  })

  it('returns null for an empty segments array', () => {
    expect(findActiveImpulseSegment([], 50)).toBeNull()
  })
})

describe('isAdBreakSegment', () => {
  it('returns true for ad-break-1 and ad-break-2', () => {
    expect(isAdBreakSegment({ start: 0, end: 30, kind: 'ad-break-1' })).toBe(true)
    expect(isAdBreakSegment({ start: 0, end: 30, kind: 'ad-break-2' })).toBe(true)
  })

  it('returns false for content segments', () => {
    expect(isAdBreakSegment({ start: 0, end: 30, kind: 'content' })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAdBreakSegment(null)).toBe(false)
  })
})

describe('computeAdBreakProgress', () => {
  const adSegment: SyncImpulseSegment = { start: 100, end: 130, kind: 'ad-break-1' }

  it('returns 0 when not in an ad break', () => {
    expect(computeAdBreakProgress(adSegment, 110, false)).toBe(0)
    expect(computeAdBreakProgress(null, 110, true)).toBe(0)
  })

  it('returns 0 at the segment start', () => {
    expect(computeAdBreakProgress(adSegment, 100, true)).toBe(0)
  })

  it('returns 0.5 at the segment midpoint', () => {
    expect(computeAdBreakProgress(adSegment, 115, true)).toBe(0.5)
  })

  it('approaches 1 at the segment end', () => {
    expect(computeAdBreakProgress(adSegment, 129.99, true)).toBeCloseTo(0.9997, 3)
  })

  it('clamps to [0, 1] outside the segment bounds', () => {
    expect(computeAdBreakProgress(adSegment, 50, true)).toBe(0) // before start
    expect(computeAdBreakProgress(adSegment, 200, true)).toBe(1) // past end
  })
})
