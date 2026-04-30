import { describe, expect, it } from 'vitest'
import {
  buildPanelScrollTarget,
  createPanelManualScrollState,
  decidePanelScrollAction,
  PANEL_MAX_PX_PER_FRAME,
  PANEL_SNAP_THRESHOLD_PX,
  PANEL_TARGET_JUMP_THRESHOLD_PX,
  walkBackForRef,
} from '../../src/demo/hooks/panelScroll'

// HANDOFF §9 — protected behavior: the global "target-discontinuity"
// heuristic is the single rule that distinguishes natural playback drift
// (smooth-scroll) from state jumps (one-frame snap). Earlier code had a
// forest of explicit panel-snap flags ("snap on tier change", "snap on
// taxonomy change", etc.) that all got deleted in favor of this single
// rule. These tests pin the heuristic so any future refactor can't
// silently re-introduce the old "scroll aggressively to current"
// behavior the user reported.
describe('decidePanelScrollAction (HANDOFF §9 discontinuity heuristic)', () => {
  const target = (clamped: number, unclamped: number = clamped) => ({
    clamped,
    unclamped,
  })

  it('returns "paused" when manual.pauseUntil is in the future', () => {
    const manual = createPanelManualScrollState()
    manual.pauseUntil = 9_999_999_999_999
    const decision = decidePanelScrollAction(target(100), manual, 50, 1_000_000)
    expect(decision.kind).toBe('paused')
  })

  it('returns "snap" when needsSnapOnResume is set (resume after manual scroll)', () => {
    const manual = createPanelManualScrollState()
    manual.needsSnapOnResume = true
    manual.lastTarget = 100 // would otherwise be a smooth case
    const decision = decidePanelScrollAction(target(105), manual, 100, 0)
    expect(decision.kind).toBe('snap')
  })

  it('returns "snap" when lastTarget is the sentinel -1 (fresh mount)', () => {
    const manual = createPanelManualScrollState() // lastTarget = -1
    const decision = decidePanelScrollAction(target(200), manual, 0, 0)
    expect(decision.kind).toBe('snap')
  })

  it('returns "snap" when target jumps further than the threshold (state discontinuity)', () => {
    const manual = createPanelManualScrollState()
    manual.lastTarget = 100
    const big = 100 + PANEL_TARGET_JUMP_THRESHOLD_PX + 50
    const decision = decidePanelScrollAction(target(big), manual, 100, 0)
    expect(decision.kind).toBe('snap')
  })

  it('returns "smooth" when frame-over-frame target moves a normal playback amount', () => {
    const manual = createPanelManualScrollState()
    manual.lastTarget = 100
    // Playback drift: a few px per frame, well below the threshold.
    const decision = decidePanelScrollAction(target(105), manual, 100, 0)
    expect(decision.kind).toBe('smooth')
  })

  it('clamps the smooth step to MAX_PX_PER_FRAME on big drift', () => {
    const manual = createPanelManualScrollState()
    manual.lastTarget = 100
    // Big delta within the un-snap threshold, but `scrollTop` is far away —
    // the smooth step should hit the per-frame velocity cap.
    const decision = decidePanelScrollAction(target(150, 150), manual, 0, 0)
    expect(decision.kind).toBe('smooth')
    if (decision.kind === 'smooth') {
      expect(Math.abs(decision.step)).toBeLessThanOrEqual(PANEL_MAX_PX_PER_FRAME + 1e-6)
    }
  })

  it('returns "settle" when |delta to scrollTop| is below the snap threshold', () => {
    const manual = createPanelManualScrollState()
    manual.lastTarget = 100
    const decision = decidePanelScrollAction(target(100.1), manual, 100, 0)
    expect(decision.kind).toBe('settle')
  })

  it('treats a backward target jump (scrub-back) as a snap, not smooth', () => {
    const manual = createPanelManualScrollState()
    manual.lastTarget = 1000
    const farBack = 1000 - PANEL_TARGET_JUMP_THRESHOLD_PX - 50
    const decision = decidePanelScrollAction(target(farBack), manual, 1000, 0)
    expect(decision.kind).toBe('snap')
  })

  it('uses unclamped (not clamped) for jump detection — protects against scrollHeight grow', () => {
    // Scenario: scenes mount progressively after a backward scrub. The
    // CLAMPED target jumps in big steps as scrollHeight grows and the clamp
    // relaxes, but the UNCLAMPED target moves smoothly. The heuristic must
    // compare unclamped values so this isn't misclassified as a state jump.
    const manual = createPanelManualScrollState()
    manual.lastTarget = 100
    // Unclamped is a few px past prev (drift), but clamped is much higher
    // because the panel is short and the clamp just relaxed.
    const decision = decidePanelScrollAction(
      { clamped: 500, unclamped: 105 },
      manual,
      100,
      0
    )
    expect(decision.kind).not.toBe('snap')
    expect(['smooth', 'settle']).toContain(decision.kind)
  })

  it('does not mutate the manual state — caller owns side effects', () => {
    const manual = createPanelManualScrollState()
    manual.lastTarget = 100
    manual.needsSnapOnResume = true
    const before = { ...manual }
    decidePanelScrollAction(target(105), manual, 100, 0)
    expect(manual).toEqual(before)
  })
})

describe('buildPanelScrollTarget', () => {
  it('floors raw at 0 (no negative scrollTop)', () => {
    expect(buildPanelScrollTarget(-50, 1000)).toEqual({ clamped: 0, unclamped: 0 })
  })

  it('clamps to maxScroll', () => {
    expect(buildPanelScrollTarget(1500, 1000)).toEqual({
      clamped: 1000,
      unclamped: 1500,
    })
  })

  it('preserves raw value when in range', () => {
    expect(buildPanelScrollTarget(500, 1000)).toEqual({
      clamped: 500,
      unclamped: 500,
    })
  })

  it('keeps unclamped distinct from clamped — important for the discontinuity heuristic', () => {
    // After a backward scrub, panels render only past scenes, so maxScroll
    // is small but the *target* offset (unclamped) is still legitimately
    // small. The two-value shape preserves the distinction so the
    // heuristic can compare un-clamped frame-over-frame.
    const t = buildPanelScrollTarget(2000, 100)
    expect(t.clamped).toBe(100)
    expect(t.unclamped).toBe(2000)
  })
})

describe('walkBackForRef', () => {
  const makeRef = (offsetTop: number) =>
    ({ offsetTop } as unknown as HTMLDivElement)

  it('returns the ref at upToIdx when populated', () => {
    const refs = [null, null, makeRef(100)]
    expect(walkBackForRef(refs, 2)?.offsetTop).toBe(100)
  })

  it('walks backward past nulls to the most recent populated ref', () => {
    const refs = [makeRef(20), makeRef(40), null, null]
    expect(walkBackForRef(refs, 3)?.offsetTop).toBe(40)
  })

  it('returns null when no ref is populated up to the given index', () => {
    const refs = [null, null, null]
    expect(walkBackForRef(refs, 2)).toBeNull()
  })

  it('returns null when upToIdx is negative', () => {
    expect(walkBackForRef([makeRef(0)], -1)).toBeNull()
  })

  it('does not walk past upToIdx forward', () => {
    const refs = [null, null, makeRef(100), makeRef(200)]
    // index 1 is the upper bound; refs at index 2 and 3 should be ignored
    expect(walkBackForRef(refs, 1)).toBeNull()
  })
})

describe('createPanelManualScrollState', () => {
  it('creates a fresh state with the sentinel lastTarget = -1', () => {
    const s = createPanelManualScrollState()
    expect(s).toEqual({ pauseUntil: 0, needsSnapOnResume: false, lastTarget: -1 })
  })

  it('returns a new object each time (no shared mutable singleton)', () => {
    const a = createPanelManualScrollState()
    const b = createPanelManualScrollState()
    expect(a).not.toBe(b)
  })
})

describe('SNAP_THRESHOLD_PX is small enough to count as sub-pixel residue', () => {
  // Sanity check on the constant — if anyone ever bumps this above 1px the
  // settle-vs-smooth boundary will visibly change.
  it('is well below 1 pixel', () => {
    expect(PANEL_SNAP_THRESHOLD_PX).toBeLessThan(1)
    expect(PANEL_SNAP_THRESHOLD_PX).toBeGreaterThan(0)
  })
})
