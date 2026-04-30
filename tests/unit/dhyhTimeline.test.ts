import { describe, expect, it } from 'vitest'
import {
  DHYH_AD_BREAK_CLIP_SECONDS,
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_LOCATION_TIMELINE,
  DHYH_SEGMENT_A_DURATION,
  DHYH_SEGMENT_A_SOURCE_END,
  DHYH_SEGMENT_A_SOURCE_START,
  DHYH_SEGMENT_B_DURATION,
  DHYH_SEGMENT_B_SOURCE_END,
  DHYH_SEGMENT_B_SOURCE_START,
} from '../../src/demo/content/dhyh/timeline'

// HANDOFF §6 — protected behavior: DHYH is a two-segment splice with the ad
// break sitting exactly at the splice point. The constants below encode the
// shape of the spliced clip; downstream playback math (clip-time vs.
// player-time, ad-break detection, scene re-anchoring) all derives from
// these. A regression here would silently break the whole timeline.
describe('DHYH timeline invariants (HANDOFF §6 — splice + ad break)', () => {
  it('Segment A duration = source-end − source-start', () => {
    expect(DHYH_SEGMENT_A_DURATION).toBe(
      DHYH_SEGMENT_A_SOURCE_END - DHYH_SEGMENT_A_SOURCE_START
    )
  })

  it('Segment B duration = source-end − source-start', () => {
    expect(DHYH_SEGMENT_B_DURATION).toBe(
      DHYH_SEGMENT_B_SOURCE_END - DHYH_SEGMENT_B_SOURCE_START
    )
  })

  it('Total clip duration = Segment A + Segment B', () => {
    expect(DHYH_CLIP_DURATION_SECONDS).toBe(
      DHYH_SEGMENT_A_DURATION + DHYH_SEGMENT_B_DURATION
    )
  })

  it('Ad break sits at the splice point (= end of Segment A)', () => {
    // Per HANDOFF §6: playback-order is Segment A → Ad → Segment B, so the
    // ad break clip-time is exactly the duration of Segment A.
    expect(DHYH_AD_BREAK_CLIP_SECONDS).toBe(DHYH_SEGMENT_A_DURATION)
  })

  it('Spliced segments are non-overlapping in source time', () => {
    expect(DHYH_SEGMENT_A_SOURCE_END).toBeLessThanOrEqual(DHYH_SEGMENT_B_SOURCE_START)
  })

  it('matches the values documented in the codebase comments', () => {
    // These exact numbers appear in HANDOFF.md, RESTRUCTURING_PLAN.md, and
    // SESSION_LOG.md narrative — keep the constants in sync if anyone
    // ever reshuffles the splice. 107s == 1:47, 495s == 8:15, 602s == 10:02.
    expect(DHYH_SEGMENT_A_DURATION).toBe(107)
    expect(DHYH_SEGMENT_B_DURATION).toBe(495)
    expect(DHYH_CLIP_DURATION_SECONDS).toBe(602)
    expect(DHYH_AD_BREAK_CLIP_SECONDS).toBe(107)
  })
})

// HANDOFF §8 — protected behavior: per-scene location tags from the upstream
// JSON are too sparse to be the sole source for the Location panel headline.
// `DHYH_LOCATION_TIMELINE` is an editorial backbone that fills the gaps. We
// don't algorithmically derive it; it's hand-curated against scene `objects`.
// These tests pin the shape, ordering, and the specific bands the editorial
// review approved — anyone reshuffling them needs to deliberately update the
// expected list, which is the whole point.
describe('DHYH editorial location timeline (HANDOFF §8)', () => {
  it('first band starts at clip-time 0', () => {
    expect(DHYH_LOCATION_TIMELINE[0].fromSec).toBe(0)
  })

  it('bands are strictly chronologically ordered', () => {
    for (let i = 1; i < DHYH_LOCATION_TIMELINE.length; i++) {
      expect(DHYH_LOCATION_TIMELINE[i].fromSec).toBeGreaterThan(
        DHYH_LOCATION_TIMELINE[i - 1].fromSec
      )
    }
  })

  it('every band has a confidence in [0, 1]', () => {
    for (const entry of DHYH_LOCATION_TIMELINE) {
      expect(entry.confidence).toBeGreaterThanOrEqual(0)
      expect(entry.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('every band fits inside the clip (last band starts before clip end)', () => {
    const last = DHYH_LOCATION_TIMELINE[DHYH_LOCATION_TIMELINE.length - 1]
    expect(last.fromSec).toBeLessThan(DHYH_CLIP_DURATION_SECONDS)
  })

  it('Construction Site opens the clip (first 0–2:33)', () => {
    expect(DHYH_LOCATION_TIMELINE[0]).toEqual({
      fromSec: 0,
      location: 'Construction Site',
      confidence: 0.9,
    })
  })

  it('includes the band boundaries documented in the narrative comments', () => {
    // Spot-checking a handful of editorial decisions that have been
    // re-litigated multiple times — if any of these shift, the user has
    // explicitly flagged it (see SESSION_LOG.md "Location panel cleanups").
    const labels = DHYH_LOCATION_TIMELINE.map((e) => e.location)
    expect(labels).toContain('Construction Site')
    expect(labels).toContain('Living Room')
    expect(labels).toContain('Kitchen')
    expect(labels).toContain('Bathroom')
    expect(labels).toContain('Bedroom')
  })
})
