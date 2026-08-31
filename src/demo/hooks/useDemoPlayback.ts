import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adDecisionPayload, adDecisioningTail } from '../data/adFixtures'
import { AD_MODE_REGISTRY, isSyncAdBreakMode } from '../ad-modes'
import {
  BUNDLED_CONTENT_IDS,
  getAvailableAdModes,
  getContentConfig,
  getPauseMomentsForContent,
} from '../content'
import {
  DHYH_AD_BREAK_CLIP_SECONDS,
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_CONTENT_ID,
  DHYH_IMPULSE_AD_COMPANION_URL,
  DHYH_VIDEO_SOURCE_OFFSET_SECONDS,
} from '../content/dhyh/timeline'
import { isInPauseWindow } from '../utils/pauseWindows'
import type { PauseMomentScene } from '../content/_shared/pauseMoments'
import { PAUSE_OVERLAY_PLACEHOLDER } from '../components/player/pause-overlay'
import {
  AD_BREAK_1_IMAGE,
  AD_BREAK_2_IMAGE,
  AD_QR_DESTINATION_1,
  AD_QR_DESTINATION_2,
  AD_QR_IMAGE_1,
  AD_QR_IMAGE_2,
  DEFAULT_START_SECONDS,
  PANEL_MANUAL_SCROLL_PAUSE_MS,
  PLACEHOLDER_VIDEO_URL,
  PRODUCT_DEDUPE_WINDOW_SECONDS,
  SYNC_IMPULSE_DURATION_SECONDS,
  SYNC_IMPULSE_SEGMENTS,
  TAXONOMIES_AVAILABLE_BY_TIER,
  taxonomyOptions,
  TOTAL_DURATION_SECONDS,
} from '../constants'
import {
  createPanelManualScrollState,
  decidePanelScrollAction,
  resolveProductScrollTarget,
  resolveSceneScrollTarget,
  type PanelManualScrollState,
  type PanelScrollTarget,
} from './panelScroll'
import {
  buildDhyhImpulseSegments,
  computeAdBreakProgress,
  findActiveImpulseSegment,
  isAdBreakSegment,
  mapPlayerToClipSeconds,
} from '../utils/adBreakMath'
import {
  resolveActiveProductIndex,
  splitProductEntriesAroundAdBreak,
} from '../utils/productEntries'
import {
  resolveActiveSceneIndex,
  resolveTaxonomyAvailability,
} from '../utils/sceneState'
import { getTaxonomySceneData } from '../data/taxonomySceneData'
import { getDhyhScenesForTier } from '../content/dhyh/scenes'
import { getMasterchefScenesForTier } from '../content/masterchef/scenes'
import { getRhwScenesForTier } from '../content/rhw/scenes'
import { getShScenesForTier } from '../content/sh/scenes'
import { getBbScenesForTier } from '../content/bb/scenes'
import { getAbbotScenesForTier } from '../content/abbot/scenes'
import { type SceneBundle } from '../content/_shared/sceneBuilder'

// Per-content scene-loader registry. Each content tile's `scenes.ts`
// wrapper plugs into here so the hook stays content-agnostic — adding a
// new bundled content is a new entry, not a new branch in the effect
// below. Returning `undefined` for an unknown content id lets the
// `hasBundledContent` guard upstream short-circuit cleanly.
const SCENE_LOADERS: Record<string, ((tier: TierOption) => Promise<SceneBundle>) | undefined> = {
  [DHYH_CONTENT_ID]: getDhyhScenesForTier,
  masterchef: getMasterchefScenesForTier,
  rhw: getRhwScenesForTier,
  sh: getShScenesForTier,
  bb: getBbScenesForTier,
  abbot: getAbbotScenesForTier,
}
import { buildOriginalJsonString, buildSummaryJsonString } from '../utils/jsonExport'
import { SCENE_METADATA } from '../data/sceneMetadata'
import { getPlayerControlTokens } from '../styles'
import type {
  AdPlaybackOption,
  ContentItem,
  CurrentView,
  DemoPanel,
  ProductEntry,
  SceneMetadata,
  TaxonomyOption,
  TierOption,
} from '../types'

type UseDemoPlaybackParams = {
  currentView: CurrentView
  selectedContent: ContentItem | null
  selectedTier: TierOption
  selectedAdPlayback: AdPlaybackOption
  activeDemoPanels: DemoPanel[]
  videoCurrentSeconds: number
  setVideoCurrentSeconds: React.Dispatch<React.SetStateAction<number>>
  videoElementDuration: number
  isVideoPlaying: boolean
}

export function useDemoPlayback({
  currentView,
  selectedContent,
  selectedTier,
  selectedAdPlayback,
  activeDemoPanels,
  videoCurrentSeconds,
  setVideoCurrentSeconds,
  videoElementDuration,
  isVideoPlaying,
}: UseDemoPlaybackParams) {
  const contentVideoRef = useRef<HTMLVideoElement | null>(null)
  const adVideoRef = useRef<HTMLVideoElement | null>(null)
  const taxonomyRefs = useRef<Array<HTMLDivElement | null>>([])
  const productRefs = useRef<Array<HTMLDivElement | null>>([])
  const jsonRefs = useRef<Array<HTMLDivElement | null>>([])
  const taxonomyScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const productScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const jsonScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const panelScrollRafRef = useRef<number | null>(null)
  // Per-panel manual-scroll override state. See `./panelScroll.ts` for the
  // shape and the discontinuity heuristic that consumes it.
  const taxonomyManualScrollRef = useRef<PanelManualScrollState>(createPanelManualScrollState())
  const productManualScrollRef = useRef<PanelManualScrollState>(createPanelManualScrollState())
  const jsonManualScrollRef = useRef<PanelManualScrollState>(createPanelManualScrollState())
  // Previous `panelTimelineSeconds`. Used by the scrub-detection effect below
  // to spot timeline discontinuities (any scrub – forward or backward – or a
  // large forward jump that isn't natural playback) and flag all three panels
  // to "load" to the new position using the same one-frame snap path that
  // resume-from-manual-scroll uses.
  const previousPanelTimelineRef = useRef<number | null>(null)

  const orderedPanels: DemoPanel[] = ['taxonomy', 'product', 'json']
  const visiblePanels = orderedPanels.filter((panel) => activeDemoPanels.includes(panel))
  // Stable string key for the visible-panels set — used as a useEffect
  // dep below. Extracted to a variable so the deps array stays
  // statically analyzable (otherwise eslint warns about the inline
  // `.join(',')`).
  const visiblePanelsKey = visiblePanels.join(',')

  const isDhyhContent = selectedContent?.id === DHYH_CONTENT_ID
  // Any content registered in `CONTENT_REGISTRY` with bundled tier JSONs
  // drives the Taxonomy / Product / JSON panels from real data. Derived
  // from the registry so adding a new content does NOT require editing
  // this hook — just register the config + tier loader.
  const hasBundledContent =
    !!selectedContent?.id && BUNDLED_CONTENT_IDS.has(selectedContent.id)

  // Per-content clip + ad-break geometry. Sourced from the active content's
  // `ContentConfig` so the ad-break math below stays generic across DHYH's
  // mid-clip splice and MasterChef's tail-anchored ad. Falls back to DHYH's
  // constants when no content is selected (preserves the original behavior
  // for the pre-selection / placeholder code path).
  const activeContentConfig = selectedContent?.id
    ? getContentConfig(selectedContent.id)
    : null
  const activeClipDurationSeconds =
    activeContentConfig?.clipDurationSeconds ?? DHYH_CLIP_DURATION_SECONDS
  const activeAdBreakClipSeconds =
    activeContentConfig?.adBreakClipSeconds ?? DHYH_AD_BREAK_CLIP_SECONDS
  // True when the active content's ad break sits at the very end of the
  // clip (Content → Ad), false for mid-clip splices (Content → Ad → Content).
  // Drives small behavior differences below (no post-ad scene flipping,
  // playback ends after the ad, the trailing content segment collapses).
  const isTailAnchoredAdBreak =
    activeAdBreakClipSeconds >= activeClipDurationSeconds - 0.001
  // Per-content pause-moments module (CTA + Organic resolvers + the editorial
  // CTA windows). Null when the active content has no pause-moments wiring.
  // Routed via the registry so adding a new content with pause moments is a
  // PAUSE_MOMENTS_REGISTRY entry, not a hook change.
  const pauseMomentsModule = getPauseMomentsForContent(selectedContent?.id)

  const [dhyhBundle, setDhyhBundle] = useState<SceneBundle | null>(null)

  // Tracks whether the user has clicked Play at least once during the
  // current demo session. The pause-overlay surfaces and the
  // "Pause to Shop" CTA both gate on this — before first play, the
  // demo's initial paused frame should look like a clean pre-roll
  // state, not as if the carousel were already active. Resets when the
  // user navigates away from the demo view or swaps content; flips
  // true the first time `isVideoPlaying` becomes true.
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false)
  useEffect(() => {
    setHasStartedPlayback(false)
  }, [currentView, selectedContent?.id])
  useEffect(() => {
    if (isVideoPlaying && !hasStartedPlayback) setHasStartedPlayback(true)
  }, [isVideoPlaying, hasStartedPlayback])

  useEffect(() => {
    let cancelled = false
    const contentId = selectedContent?.id
    if (!hasBundledContent || !contentId) {
      setDhyhBundle(null)
      return
    }
    // Per-content scene-loader: each content tile owns a thin wrapper
    // (`<id>/scenes.ts`) around the shared `_shared/sceneBuilder` engine.
    // The wrappers register themselves in `SCENE_LOADERS` (above), so
    // adding a new bundled content tile is a single entry + a new
    // wrapper file — no edit needed in this effect.
    const loadScenes = SCENE_LOADERS[contentId]
    if (!loadScenes) {
      setDhyhBundle(null)
      return
    }
    loadScenes(selectedTier).then((bundle) => {
      if (!cancelled) setDhyhBundle(bundle)
    })
    return () => {
      cancelled = true
    }
  }, [hasBundledContent, selectedContent?.id, selectedTier])

  // Sync-style ad breaks (colored scrubber + ad creative overlay) fire for any
  // mode classified as `kind: 'sync-ad-break'` AND for which the active content
  // ships per-mode `adAssets` (video + duration). The per-content `ContentConfig.
  // adAssets[mode]` map is the single source of truth as of 2026-06-15 — ad-mode
  // configs themselves are pure metadata now.
  //
  // Placeholder content retains the legacy tier-gated `Sync: Impulse`-only
  // behavior because no other mode has a placeholder code path.
  const isExactProductMatch = selectedTier === 'Exact Product Match'
  const isSyncImpulseModeSelected = selectedAdPlayback === 'Sync: Impulse'

  // Per-content ad-mode assets for the currently selected mode. `undefined`
  // when (a) no content is selected, (b) the active content doesn't have
  // this mode wired in its `adAssets`, or (c) the active mode hasn't been
  // wired for any content yet. Downstream code reads creative URLs,
  // compliance payloads, durations, and labels from here — never from
  // mode-level configs.
  const contentAdAssets = selectedContent?.id
    ? getContentConfig(selectedContent.id)?.adAssets?.[selectedAdPlayback]
    : undefined

  // Broadened sync-ad-break flag used pervasively below. Historically named
  // `isSyncImpulseMode`; kept to minimize churn in downstream files.
  const isSyncImpulseMode = hasBundledContent
    ? isSyncAdBreakMode(selectedAdPlayback) && Boolean(contentAdAssets?.videoUrl)
    : isExactProductMatch && isSyncImpulseModeSelected

  const titlePanelSummary = `VOD: ${selectedTier.toUpperCase()} - ${selectedAdPlayback.toUpperCase()}`

  // Per-mode ad-break duration sourced from the active content's adAssets.
  // Falls back to 30s (legacy Impulse default) for placeholder content or
  // when the active content+mode pair has no duration wired.
  const dhyhAdBreakDurationSeconds = useMemo(
    () => contentAdAssets?.durationSeconds ?? 30,
    [contentAdAssets]
  )

  // Scrubber segments are recomputed per-mode so the cyan ad slot matches the
  // actual ad duration (Impulse/L-Bar = 30s, Sync = 45s). DHYH has a single
  // break at the mid-clip splice point; MasterChef has a single break at the
  // tail. The builder collapses the trailing zero-length segment automatically
  // for tail-anchored content. See `utils/adBreakMath.ts`.
  const dhyhImpulseSegments = useMemo(
    () =>
      buildDhyhImpulseSegments({
        adBreakClipSeconds: activeAdBreakClipSeconds,
        adBreakDurationSeconds: dhyhAdBreakDurationSeconds,
        clipDurationSeconds: activeClipDurationSeconds,
      }),
    [activeAdBreakClipSeconds, activeClipDurationSeconds, dhyhAdBreakDurationSeconds]
  )

  // Pause-window markers shown on the scrubber while CTA Pause is the
  // active mode. Empty in any other mode (or non-DHYH content) so the
  // scrubber stays clean for the Sync ad-break modes that already
  // render their own coloured segments. Coordinates live on the same
  // clip-time axis as the impulse segments (no ad-break splicing
  // applies to CTA Pause).
  const dhyhCtaPauseSegments = useMemo(() => {
    if (selectedAdPlayback !== 'CTA Pause') return []
    if (!pauseMomentsModule) return []
    return pauseMomentsModule.ctaPauseWindows
  }, [pauseMomentsModule, selectedAdPlayback])

  // `playbackDurationSeconds` is the *internal* scrubber length used by the MUI slider.
  // For DHYH sync-ad-break modes this includes the per-mode ad block (30-45s) so the
  // slider has a visible cyan segment in the middle that the user can drag across. The
  // time readout in the player chrome uses a separate clip-adjusted value
  // (displayedCurrentSeconds / displayedDurationSeconds) so the content still "feels"
  // like a 7-minute clip.
  const playbackDurationSeconds = hasBundledContent && dhyhBundle
    ? isSyncImpulseMode
      ? activeClipDurationSeconds + dhyhAdBreakDurationSeconds
      : activeClipDurationSeconds
    : isSyncImpulseMode
      ? SYNC_IMPULSE_DURATION_SECONDS
      : TOTAL_DURATION_SECONDS

  // Real-mp4-playback content uses <video>.currentTime as the source of truth.
  // The synthetic tick is only for placeholder content; both DHYH (with ad-
  // break math layered on top) and MasterChef (clip-native, no ad break)
  // qualify.
  const usesNativeTimeline = hasBundledContent

  const nonImpulsePanelProgress = useMemo(() => {
    if (isSyncImpulseMode) return 0
    if (usesNativeTimeline) {
      if (playbackDurationSeconds <= 0) return 0
      return Math.min(1, Math.max(0, videoCurrentSeconds / playbackDurationSeconds))
    }
    const effectiveDuration = Math.max(1, videoElementDuration || 0)
    const elapsedSinceStart = Math.max(0, videoCurrentSeconds - DEFAULT_START_SECONDS)
    return Math.min(1, elapsedSinceStart / effectiveDuration)
  }, [
    isSyncImpulseMode,
    usesNativeTimeline,
    videoCurrentSeconds,
    videoElementDuration,
    playbackDurationSeconds,
  ])

  // Player-time → clip-time mapping (HANDOFF §6). See utils/adBreakMath.ts.
  // Works generically for any bundled content with a sync-style ad break —
  // DHYH (mid-clip splice) and MC (tail-anchored) both flow through here.
  const dhyhClipSeconds = useMemo(
    () =>
      mapPlayerToClipSeconds(videoCurrentSeconds, {
        isAdBreakMode: isSyncImpulseMode,
        adBreakClipSeconds: activeAdBreakClipSeconds,
        adBreakDurationSeconds: dhyhAdBreakDurationSeconds,
      }),
    [
      isSyncImpulseMode,
      videoCurrentSeconds,
      activeAdBreakClipSeconds,
      dhyhAdBreakDurationSeconds,
    ]
  )

  const panelTimelineSeconds = hasBundledContent
    ? dhyhClipSeconds
    : isSyncImpulseMode
      ? videoCurrentSeconds // sync-impulse placeholder content
      : nonImpulsePanelProgress * TOTAL_DURATION_SECONDS

  // ---------- Pause-mode visibility (CTA + overlay) ----------------------
  //
  // Two booleans that drive the two pause-triggered ad surfaces:
  //   - `isPauseToShopCtaVisible`: the blue "PAUSE TO SHOP" hint shown
  //     during playback to invite the viewer to pause.
  //   - `isPauseOverlayActive`: the carousel + detail surface shown
  //     while paused.
  //
  // Both gate on `hasStartedPlayback` so neither surfaces in the demo's
  // pre-roll state (user just selected tier/mode and hasn't played yet).
  // CTA only shows during playback; overlay only shows during pause —
  // they're mutually exclusive and one transitions to the other.
  //
  // CTA Pause windows are also enforced on the *overlay* side: pausing
  // outside one of the active content's `ctaPauseWindows` leaves the player
  // in normal (carousel-less) paused state, matching the editorial intent
  // that pause-to-shop is only available during specific moments.
  // (Variable names keep their "Dhyh" prefix as a legacy artifact — they're
  //  now content-agnostic, driven by the routed `pauseMomentsModule`.)
  const isInDhyhCtaPauseWindow = pauseMomentsModule
    ? isInPauseWindow(panelTimelineSeconds, pauseMomentsModule.ctaPauseWindows)
    : false
  const isInDhyhOrganicCtaWindow = pauseMomentsModule
    ? panelTimelineSeconds < pauseMomentsModule.organicPauseCtaEndSeconds
    : false

  const isPauseToShopCtaVisible =
    hasStartedPlayback &&
    isVideoPlaying &&
    ((selectedAdPlayback === 'Organic Pause' && isInDhyhOrganicCtaWindow) ||
      (selectedAdPlayback === 'CTA Pause' && isInDhyhCtaPauseWindow))

  const isPauseOverlayActive =
    hasStartedPlayback &&
    !isVideoPlaying &&
    (selectedAdPlayback === 'Organic Pause' ||
      (selectedAdPlayback === 'CTA Pause' && isInDhyhCtaPauseWindow))

  // Live payload that drives the carousel + detail when the overlay
  // is mounted. Each pause mode reads from its own JSON source per
  // the playback-mode-isolation rule:
  //   - CTA Pause → `content/dhyh/ads/cta-pause.json` (partner-curated
  //     editorial moments at fixed windows).
  //   - Organic Pause → `content/dhyh/ads/organic-pause.json` (auto-
  //     derived from Tier 3 scenes; covers the entire clip so any
  //     pause resolves to an active moment).
  // The two `useMemo` blocks return null when their mode isn't
  // active so the chained `??` below picks the right one without
  // either path running unnecessarily. Falls through to
  // `PAUSE_OVERLAY_PLACEHOLDER` only as a last-resort safeguard
  // (e.g. mode-flag mismatch — shouldn't happen in practice).
  const dhyhCtaPausePayload = useMemo(() => {
    if (selectedAdPlayback !== 'CTA Pause') return null
    if (!pauseMomentsModule) return null
    return pauseMomentsModule.getActivePauseOverlayPayload(panelTimelineSeconds)
  }, [pauseMomentsModule, selectedAdPlayback, panelTimelineSeconds])

  const dhyhOrganicPausePayload = useMemo(() => {
    if (selectedAdPlayback !== 'Organic Pause') return null
    if (!pauseMomentsModule) return null
    return pauseMomentsModule.getActiveOrganicOverlayPayload(panelTimelineSeconds)
  }, [pauseMomentsModule, selectedAdPlayback, panelTimelineSeconds])

  const activePauseOverlayPayload =
    dhyhCtaPausePayload ?? dhyhOrganicPausePayload ?? PAUSE_OVERLAY_PLACEHOLDER

  // Active pause-moment scene displayed in the JSON panel while the
  // user is paused. Distinct from the overlay payload above because
  // the JSON panel wants the raw upstream scene shape (nested
  // objects/products) rather than the adapter-flattened payload.
  // Routed per mode: CTA Pause → editorial moments fixture; Organic
  // Pause → tier3-derived moments. Resolves to null on resume or
  // outside any moment so the panel auto-falls-back to the normal
  // per-scene JSON cards.
  const activePauseMomentScene = useMemo<PauseMomentScene | null>(() => {
    if (!pauseMomentsModule) return null
    if (!isPauseOverlayActive) return null
    if (selectedAdPlayback === 'CTA Pause') {
      return pauseMomentsModule.getActivePauseMomentScene(panelTimelineSeconds)?.scene ?? null
    }
    if (selectedAdPlayback === 'Organic Pause') {
      return pauseMomentsModule.getActiveOrganicMomentScene(panelTimelineSeconds)?.scene ?? null
    }
    return null
  }, [pauseMomentsModule, selectedAdPlayback, isPauseOverlayActive, panelTimelineSeconds])

  // ─── Pause Ad mode ────────────────────────────────────────────────
  //
  // Distinct from CTA Pause / Organic Pause: a single static creative
  // (today an image, eventually possibly a video CTV ad) shown every
  // time the user pauses content under the `Pause Ad` mode. No
  // scene-keying, no editorial windows — pause anywhere → ad shows.
  //
  // Dismissal: clicking either the dim backdrop or the X button on
  // the overlay calls `onToggleVideoPlaying` to resume playback. The
  // overlay then auto-hides because `isPauseAdActive` includes
  // `!isVideoPlaying`. No separate dismiss state is needed — pausing
  // again at any later point re-shows the ad naturally.
  const isPauseAdMode = selectedAdPlayback === 'Pause Ad'
  const isPauseAdActive = hasStartedPlayback && !isVideoPlaying && isPauseAdMode

  // Pause Ad creative image, compliance payload, and JSON-panel response
  // label all flow from the active content's `adAssets['Pause Ad']`. No
  // cross-content references; if the active content doesn't have Pause Ad
  // wired, these stay null and the overlay is suppressed by `isPauseAdActive`.
  const pauseAdImageSrc = isPauseAdMode ? contentAdAssets?.imageUrl ?? null : null
  const pauseAdCompliancePayload = isPauseAdMode
    ? contentAdAssets?.compliancePayload ?? null
    : null
  const pauseAdResponseLabel = isPauseAdMode
    ? contentAdAssets?.responseLabel ?? '_PauseAd Response'
    : '_PauseAd Response'

  const playbackScenes = useMemo(() => {
    // Any tier-bundled content (DHYH, MasterChef, …) uses its real scenes
    // across every ad mode. Placeholder content keeps the synthetic
    // SCENE_METADATA + the legacy Sync:Impulse-only branch below.
    if (hasBundledContent && dhyhBundle) {
      return dhyhBundle.scenes
    }
    if (!isSyncImpulseMode) return SCENE_METADATA
    return Array.from({ length: 12 }, (_, index) => {
      const baseScene = SCENE_METADATA[index % SCENE_METADATA.length]
      return {
        ...baseScene,
        id: `impulse-scene-${index + 1}`,
        sceneLabel: `Scene ${index + 1}`,
        start: index * 20,
        end: (index + 1) * 20,
        cta: index % 2 === 0 ? 'In-Content-CTA' : 'Scan to Shop',
        products: baseScene.products.map((product) => ({
          ...product,
          id: `${product.id}-impulse-${index + 1}`,
        })),
      }
    })
  }, [hasBundledContent, dhyhBundle, isSyncImpulseMode])

  const activeImpulseSegment = useMemo(() => {
    if (!isSyncImpulseMode) return null
    // Bundled content uses its own per-content segments (built from
    // `adBreakClipSeconds` + `clipDurationSeconds`). Placeholder content
    // falls back to the legacy static `SYNC_IMPULSE_SEGMENTS` layout.
    const segments = hasBundledContent ? dhyhImpulseSegments : SYNC_IMPULSE_SEGMENTS
    return findActiveImpulseSegment(segments, videoCurrentSeconds)
  }, [isSyncImpulseMode, hasBundledContent, videoCurrentSeconds, dhyhImpulseSegments])

  const isAdBreakPlayback = isSyncImpulseMode && isAdBreakSegment(activeImpulseSegment)

  // Bundled content (DHYH, MC) uses video creatives — no static image / QR
  // overlay layer is rendered. Placeholder content keeps the legacy
  // image + QR-card path keyed to which of the two ad-break-N segments is
  // active. (DHYH/MC each have a SINGLE break, so only `ad-break-1` ever
  // surfaces for bundled content; the legacy placeholder keeps both.)
  const activeAdBreakImage = hasBundledContent
    ? ''
    : activeImpulseSegment?.kind === 'ad-break-1'
      ? AD_BREAK_1_IMAGE
      : AD_BREAK_2_IMAGE
  const activeAdQrDestination = hasBundledContent
    ? DHYH_IMPULSE_AD_COMPANION_URL
    : activeImpulseSegment?.kind === 'ad-break-1'
      ? AD_QR_DESTINATION_1
      : AD_QR_DESTINATION_2
  const activeAdQrImage = hasBundledContent
    ? ''
    : activeImpulseSegment?.kind === 'ad-break-1'
      ? AD_QR_IMAGE_1
      : AD_QR_IMAGE_2
  // Default label is derived from the active impulse segment kind
  // (`'_AdBreak-1 Response' | '_AdBreak-2 Response'`). Per-mode override
  // via the active content's `adAssets[mode].responseLabel` lets future
  // ad formats supply their own response label without touching the core
  // hook.
  const defaultAdBreakLabel =
    activeImpulseSegment?.kind === 'ad-break-1' ? '_AdBreak-1 Response' : '_AdBreak-2 Response'
  const activeAdBreakLabel = contentAdAssets?.responseLabel ?? defaultAdBreakLabel

  // Sync-style ad creative URL — sourced from the active content's adAssets.
  // Null when no content/mode pair has a creative wired (e.g. MasterChef
  // hasn't wired Sync modes yet → null → no ad video plays during the break).
  const activeAdVideoUrl = contentAdAssets?.videoUrl ?? null

  // When the user switches ad mode WHILE an ad break is playing, the new
  // <video src=…> element re-mounts (its `key` is the URL) and starts from 0s,
  // but the scrubber has been ticking forward against the old mode's duration.
  // Without intervention the two are out of sync until useVideoSync forces a
  // catch-up seek, which visibly stutters. Snapping the scrubber back to the
  // start of the ad block on URL change keeps the new creative aligned with
  // the slider.
  const previousAdVideoUrlRef = useRef(activeAdVideoUrl)
  useEffect(() => {
    const previous = previousAdVideoUrlRef.current
    previousAdVideoUrlRef.current = activeAdVideoUrl
    if (previous === activeAdVideoUrl) return
    if (!hasBundledContent || !isAdBreakPlayback) return
    if (previous === null || activeAdVideoUrl === null) return
    setVideoCurrentSeconds(activeAdBreakClipSeconds)
  }, [
    activeAdVideoUrl,
    isAdBreakPlayback,
    hasBundledContent,
    activeAdBreakClipSeconds,
    setVideoCurrentSeconds,
  ])

  // Sync-style ad-break compliance JSON from the active content's adAssets.
  // Placeholder content (no adAssets) still gets the legacy `adDecisionPayload`
  // fixture so the JSON panel renders something during the synthetic break.
  const activeAdDecisionPayload: Record<string, unknown> =
    isSyncImpulseMode
      ? contentAdAssets?.compliancePayload ?? adDecisionPayload
      : adDecisionPayload

  const hasPlaybackEnded = videoCurrentSeconds >= playbackDurationSeconds

  const adBreakSegmentProgress = useMemo(
    () => computeAdBreakProgress(activeImpulseSegment, videoCurrentSeconds, isAdBreakPlayback),
    [activeImpulseSegment, videoCurrentSeconds, isAdBreakPlayback]
  )

  const originalJsonDownloadString = useMemo(
    () =>
      buildOriginalJsonString({
        isSyncImpulseMode,
        isAdBreakPlayback,
        activeAdBreakLabel,
        adDecisionPayload: activeAdDecisionPayload,
        adDecisioningTail,
        playbackScenes,
      }),
    [isSyncImpulseMode, isAdBreakPlayback, activeAdBreakLabel, activeAdDecisionPayload, playbackScenes]
  )

  const summaryJsonDownloadString = useMemo(
    () =>
      buildSummaryJsonString({
        playbackScenes,
        selectedTier,
        selectedAdPlayback,
        playbackDurationSeconds,
        contentTitle: selectedContent?.title ?? 'Untitled',
        contentId: selectedContent?.id ?? 'unknown',
      }),
    [
      playbackScenes,
      selectedTier,
      selectedAdPlayback,
      playbackDurationSeconds,
      selectedContent,
    ]
  )

  const activeSceneIndex = useMemo(
    () => resolveActiveSceneIndex(playbackScenes, panelTimelineSeconds),
    [playbackScenes, panelTimelineSeconds]
  )

  const activeScene = playbackScenes[activeSceneIndex] ?? playbackScenes[0]

  // Segment-gated product lists for HANDOFF §6 segment isolation.
  // See `utils/productEntries.ts` for the dedupe + split logic.
  const { preAdProductEntries, postAdProductEntries } = useMemo(
    () =>
      splitProductEntriesAroundAdBreak(playbackScenes, {
        hasAdBreak: isDhyhContent && isSyncImpulseMode,
        boundarySeconds: DHYH_AD_BREAK_CLIP_SECONDS,
        dedupeWindowSeconds: PRODUCT_DEDUPE_WINDOW_SECONDS,
      }),
    [playbackScenes, isDhyhContent, isSyncImpulseMode]
  )


  // Pick the segment-appropriate list for the current clip time. During the
  // ad break itself `panelTimelineSeconds` is pinned just below the boundary
  // (see `dhyhClipSeconds`), so pre-ad products are held in view for the
  // whole break – the panel resumes motion on Segment B products only after
  // playback crosses into Segment B. For non-DHYH / non-Sync:Impulse content
  // there is no boundary and we always return the full list.
  //
  // The boundary is derived from `panelTimelineSeconds` but we memoize on the
  // resolved *boolean* (not the raw time) so `productEntries` only swaps
  // references when the segment actually flips. Without that, the memo would
  // churn on every timeupdate tick and invalidate downstream memos that
  // compare by reference.
  const isPostAdSegment =
    isDhyhContent && isSyncImpulseMode && panelTimelineSeconds >= DHYH_AD_BREAK_CLIP_SECONDS
  const productEntries = useMemo<ProductEntry[]>(() => {
    const hasAdBreak = isDhyhContent && isSyncImpulseMode
    if (!hasAdBreak) return preAdProductEntries
    return isPostAdSegment ? postAdProductEntries : preAdProductEntries
  }, [preAdProductEntries, postAdProductEntries, isDhyhContent, isSyncImpulseMode, isPostAdSegment])

  const productsUnavailableMessage =
    hasBundledContent && dhyhBundle && !dhyhBundle.hasProductData
      ? 'No product match data is associated with this Tier'
      : null

  // Three-layer taxonomy gating (per-content hides → per-tier whitelist →
  // per-scene data presence for tier-bundled content). See `utils/sceneState.ts`.
  const taxonomyAvailability = useMemo(
    () =>
      resolveTaxonomyAvailability({
        hiddenTaxonomies: selectedContent
          ? getContentConfig(selectedContent.id)?.hiddenTaxonomies ?? []
          : [],
        tierWhitelist: TAXONOMIES_AVAILABLE_BY_TIER[selectedTier] ?? [],
        allTaxonomies: taxonomyOptions,
        isContentDataDriven: hasBundledContent,
        hasDataForOption: (option) =>
          playbackScenes.some(
            (scene, index) => getTaxonomySceneData(scene, index, option) !== null
          ),
      }),
    [hasBundledContent, playbackScenes, selectedContent, selectedTier]
  )

  // Taxonomy options filtered down to only those that actually have data for
  // the currently-selected tier / content. Drives both the collapsed <Select>
  // in DemoView and the expanded Autocomplete in ExpandedPanelDialog so users
  // never see a dropdown entry that would immediately render an empty state.
  // Preserves the canonical order defined in `taxonomyOptions`.
  const availableTaxonomies = useMemo<TaxonomyOption[]>(
    () => taxonomyOptions.filter((option) => taxonomyAvailability[option]),
    [taxonomyAvailability]
  )

  // Per-content × per-tier ad-mode availability. Empty `selectedContent`
  // falls back to the global enabled list. See `src/demo/content/index.ts`
  // for the resolver — `defaultAdModes` for the content, narrowed by any
  // `adModesByTier` override, intersected with the globally-enabled set.
  const availableAdModes = useMemo<AdPlaybackOption[]>(
    () => getAvailableAdModes(selectedContent?.id ?? null, selectedTier),
    [selectedContent, selectedTier]
  )

  // Resolve the "current" product index. The `activeScene ?? playbackScenes[0]`
  // fallback is intentionally NOT used here — the resolver matches against the
  // scene at the active index directly so the panel stays at the top during
  // the pre-product intro instead of leaping to Scene 1's products. See
  // `utils/productEntries.ts`.
  const activeProductIndex = useMemo(
    () =>
      resolveActiveProductIndex(productEntries, {
        activeSceneIndex,
        activeScene: playbackScenes[activeSceneIndex] ?? null,
        panelTimelineSeconds,
      }),
    [activeSceneIndex, playbackScenes, productEntries, panelTimelineSeconds]
  )

  const hasReachedFirstProduct = activeProductIndex >= 0

  const playerControlTokens = getPlayerControlTokens(visiblePanels.length)

  // --- Panel scroll engine -------------------------------------------------------------
  // Each frame the RAF loop computes a *live*, time-interpolated target scroll position
  // for every visible panel and nudges the real scrollTop toward it. Because the target
  // is derived from the live playback time (not just the active scene index), it moves
  // continuously as time advances – the panels scroll at a steady pace instead of
  // sitting still for a whole scene and then snapping to the next one.
  //
  // The RAF loop runs whenever the demo view is mounted, regardless of play/pause state,
  // so scrubbing while paused also animates smoothly and the panels settle naturally.
  type PanelScrollCtx = {
    timelineSeconds: number
    scenes: SceneMetadata[]
    activeSceneIndex: number
    products: ProductEntry[]
    activeProductIndex: number
    hasReachedFirstProduct: boolean
    visible: { taxonomy: boolean; product: boolean; json: boolean }
    inAdBreak: boolean
    adProgress: number
    isDhyhContent: boolean
  }
  const panelScrollCtxRef = useRef<PanelScrollCtx>({
    timelineSeconds: 0,
    scenes: [],
    activeSceneIndex: 0,
    products: [],
    activeProductIndex: -1,
    hasReachedFirstProduct: false,
    visible: { taxonomy: false, product: false, json: false },
    inAdBreak: false,
    adProgress: 0,
    isDhyhContent: false,
  })

  useEffect(() => {
    panelScrollCtxRef.current = {
      timelineSeconds: panelTimelineSeconds,
      scenes: playbackScenes,
      activeSceneIndex,
      products: productEntries,
      activeProductIndex,
      hasReachedFirstProduct,
      visible: {
        taxonomy: visiblePanels.includes('taxonomy'),
        product: visiblePanels.includes('product'),
        json: visiblePanels.includes('json'),
      },
      inAdBreak: isSyncImpulseMode && isAdBreakPlayback,
      adProgress: adBreakSegmentProgress,
      isDhyhContent,
    }
  }, [
    panelTimelineSeconds,
    playbackScenes,
    activeSceneIndex,
    productEntries,
    activeProductIndex,
    hasReachedFirstProduct,
    visiblePanels,
    isSyncImpulseMode,
    isAdBreakPlayback,
    adBreakSegmentProgress,
    isDhyhContent,
  ])

  useEffect(() => {
    if (currentView !== 'demo') return

    // Apply one frame of scroll updates for a single panel. The decision
    // logic (snap vs. smooth vs. settle vs. paused) lives in the pure
    // function `decidePanelScrollAction` (./panelScroll); this thin
    // wrapper performs the side effects (`scrollTop` write + `manual`
    // ref bookkeeping) on the chosen action.
    const applyScroll = (
      el: HTMLDivElement,
      target: PanelScrollTarget,
      manual: PanelManualScrollState
    ) => {
      const decision = decidePanelScrollAction(target, manual, el.scrollTop, Date.now())
      switch (decision.kind) {
        case 'paused':
          // Keep `lastTarget` tracking the live target even while paused so
          // the target-jump heuristic doesn't spuriously fire on the first
          // frame after the pause expires (by then the target has typically
          // drifted further than the jump threshold, but that's playback
          // drift we intentionally slept through — not a state
          // discontinuity worth snapping for).
          manual.lastTarget = target.unclamped
          return
        case 'snap':
          manual.needsSnapOnResume = false
          manual.lastTarget = target.unclamped
          el.scrollTop = target.clamped
          return
        case 'settle':
          manual.lastTarget = target.unclamped
          if (target.clamped !== el.scrollTop) el.scrollTop = target.clamped
          return
        case 'smooth':
          manual.lastTarget = target.unclamped
          el.scrollTop += decision.step
          return
      }
    }

    const animate = () => {
      const ctx = panelScrollCtxRef.current

      // Prefer the video element's currentTime for DHYH: React state only updates on
      // `timeupdate` events (~4Hz), which leaves the RAF reading a stale ctx between
      // events and causes visible stall-then-catch-up. Reading the element directly
      // gives us a true 60fps timeline, with only a tiny ad-break mapping applied.
      let liveTimeline = ctx.timelineSeconds
      if (ctx.isDhyhContent && !ctx.inAdBreak) {
        const videoEl = contentVideoRef.current
        if (videoEl && !videoEl.seeking && !Number.isNaN(videoEl.currentTime)) {
          const raw = videoEl.currentTime - DHYH_VIDEO_SOURCE_OFFSET_SECONDS
          // Only prefer the element's currentTime when it's already close to the
          // scrubber state – that's the "normal playback drift" case where the
          // element gives us a true 60fps signal. During scrubs the state jumps
          // immediately to the new slider value while the <video> is still
          // seeking to it; in that case we stay on state so panels jump with the
          // scrubber instead of stalling until the seek completes.
          if (
            raw > 0 &&
            raw < DHYH_CLIP_DURATION_SECONDS &&
            Math.abs(raw - ctx.timelineSeconds) < 1
          ) {
            liveTimeline = raw
          }
        }
      }

      const scene = ctx.scenes[ctx.activeSceneIndex]
      const sceneDuration = scene ? Math.max(0.001, scene.end - scene.start) : 1
      const sceneProgress = scene
        ? Math.min(1, Math.max(0, (liveTimeline - scene.start) / sceneDuration))
        : 0

      if (ctx.visible.taxonomy && taxonomyScrollContainerRef.current) {
        const target = resolveSceneScrollTarget(
          taxonomyScrollContainerRef.current,
          taxonomyRefs.current,
          ctx.scenes,
          ctx.activeSceneIndex,
          liveTimeline
        )
        if (target !== null)
          applyScroll(taxonomyScrollContainerRef.current, target, taxonomyManualScrollRef.current)
      }

      if (ctx.visible.json && jsonScrollContainerRef.current) {
        if (ctx.inAdBreak) {
          // Ad-decisioning JSON is a single block that reveals linearly as the ad plays.
          const container = jsonScrollContainerRef.current
          const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
          const adTarget = maxScroll * ctx.adProgress
          applyScroll(
            container,
            { clamped: adTarget, unclamped: adTarget },
            jsonManualScrollRef.current
          )
        } else {
          const target = resolveSceneScrollTarget(
            jsonScrollContainerRef.current,
            jsonRefs.current,
            ctx.scenes,
            ctx.activeSceneIndex,
            liveTimeline
          )
          if (target !== null)
            applyScroll(jsonScrollContainerRef.current, target, jsonManualScrollRef.current)
        }
      }

      if (ctx.visible.product && productScrollContainerRef.current) {
        if (ctx.inAdBreak) {
          // Hold position during the ad break – product data is tied to content scenes.
        } else if (!ctx.hasReachedFirstProduct) {
          applyScroll(
            productScrollContainerRef.current,
            { clamped: 0, unclamped: 0 },
            productManualScrollRef.current
          )
        } else {
          const target = resolveProductScrollTarget(
            productScrollContainerRef.current,
            productRefs.current,
            ctx.products,
            ctx.activeProductIndex,
            liveTimeline,
            sceneProgress
          )
          if (target !== null)
            applyScroll(productScrollContainerRef.current, target, productManualScrollRef.current)
        }
      }

      panelScrollRafRef.current = window.requestAnimationFrame(animate)
    }

    panelScrollRafRef.current = window.requestAnimationFrame(animate)

    // Manual-scroll override is per-panel: touching the Taxonomy panel pauses
    // auto-scroll on Taxonomy only. The Product and JSON panels keep tracking
    // the live playback position. Once a panel's pause expires, the next RAF
    // frame jumps that panel straight to the current live target (see the
    // `needsSnapOnResume` branch in applyScroll) – no animated catch-up.
    //
    // We only listen for input events that actually scroll the list – `wheel`,
    // `touchstart`, `touchmove`. `pointerdown` was intentionally removed; it
    // fires on every click and would pause auto-scroll any time the user so
    // much as tapped inside a panel. `keydown` is kept for accessibility
    // (arrow keys / page down can scroll a focused panel).
    const interactionEvents: Array<keyof HTMLElementEventMap> = [
      'wheel',
      'touchstart',
      'touchmove',
      'keydown',
    ]
    const markPanelInteraction = (manual: PanelManualScrollState) => () => {
      manual.pauseUntil = Date.now() + PANEL_MANUAL_SCROLL_PAUSE_MS
      manual.needsSnapOnResume = true
    }
    const panelBindings: Array<{
      el: HTMLDivElement
      handler: () => void
    }> = []
    const registerPanel = (
      el: HTMLDivElement | null,
      manual: PanelManualScrollState
    ) => {
      if (!el) return
      const handler = markPanelInteraction(manual)
      panelBindings.push({ el, handler })
      for (const evt of interactionEvents) {
        el.addEventListener(evt, handler, { passive: true })
      }
    }
    registerPanel(taxonomyScrollContainerRef.current, taxonomyManualScrollRef.current)
    registerPanel(productScrollContainerRef.current, productManualScrollRef.current)
    registerPanel(jsonScrollContainerRef.current, jsonManualScrollRef.current)

    return () => {
      if (panelScrollRafRef.current !== null) {
        window.cancelAnimationFrame(panelScrollRafRef.current)
        panelScrollRafRef.current = null
      }
      for (const { el, handler } of panelBindings) {
        for (const evt of interactionEvents) {
          el.removeEventListener(evt, handler)
        }
      }
    }
  }, [currentView, visiblePanelsKey])

  // Scrub detection.
  //
  // Fires whenever `panelTimelineSeconds` changes. Normal playback advances this
  // value in small increments (~0.017s/frame from the native <video> timeupdate
  // loop, or 0.1s/tick from the synthetic ad-break timer). Anything bigger than
  // that – a forward jump > 0.4s or any backward movement at all > 0.05s – is a
  // seek/scrub and every panel should "load" to the new spot on the next frame
  // rather than animating through everything in between.
  //
  // Running this in a useEffect (instead of inside the RAF) means detection
  // fires exactly once per timeline change, AFTER React has committed the new
  // `activeSceneIndex` / `activeProductIndex`, so the RAF that applies the snap
  // is guaranteed to read up-to-date indices. Previously this lived in the RAF
  // and compared frame-to-frame `liveTimeline` values, which could fire before
  // the ctx update useEffect had propagated the new product index – producing
  // the "scrub back on Products doesn't land on the right spot" glitch.
  useEffect(() => {
    if (currentView !== 'demo') {
      previousPanelTimelineRef.current = null
      // Reset each panel's last-known target so the first RAF frame after a
      // re-entry into the demo view always takes the snap path in
      // applyScroll, regardless of whatever stale target was cached from a
      // previous session. Without this, a user who signs out / re-enters /
      // switches content could momentarily see smooth-scroll between two
      // unrelated target positions on the very first frame.
      for (const manual of [
        taxonomyManualScrollRef.current,
        productManualScrollRef.current,
        jsonManualScrollRef.current,
      ]) {
        manual.lastTarget = -1
      }
      return
    }
    const prev = previousPanelTimelineRef.current
    previousPanelTimelineRef.current = panelTimelineSeconds
    if (prev === null) return
    const delta = panelTimelineSeconds - prev
    const SCRUB_FORWARD_THRESHOLD = 0.4
    const SCRUB_BACKWARD_THRESHOLD = 0.05
    if (delta > SCRUB_FORWARD_THRESHOLD || delta < -SCRUB_BACKWARD_THRESHOLD) {
      for (const manual of [
        taxonomyManualScrollRef.current,
        productManualScrollRef.current,
        jsonManualScrollRef.current,
      ]) {
        // Clear any in-progress manual-scroll pause so the scrub always wins –
        // the user has explicitly asked the video to jump, so panels follow
        // immediately regardless of prior state.
        manual.pauseUntil = 0
        manual.needsSnapOnResume = true
      }
    }
  }, [panelTimelineSeconds, currentView])

  // Phase 9b — `scrubVersion` is a monotonic counter that increments
  // every time `flagPanelScrub` is called. It's exposed from the hook
  // so the expanded panel dialog can re-fire its open-time scroll
  // when the user scrubs while the dialog is open. Natural playback
  // drift does NOT bump this — only explicit scrub events do — which
  // preserves the "let the user browse the expanded view freely
  // between scrubs" UX. See `ExpandedPanelDialog`'s scroll effect.
  const [scrubVersion, setScrubVersion] = useState(0)

  // Imperative "the user is scrubbing" signal.
  //
  // The threshold-based scrub detection above only fires when the timeline
  // delta exceeds ~0.4s forward / 0.05s backward. That works for big seeks
  // (click-and-jump on the scrubber), but a slow drag produces many small
  // state updates that individually fall below the threshold – the panels
  // then fall back to velocity-capped smooth scroll, which is exactly the
  // "scroll aggressively to the new spot" feel we removed everywhere else.
  //
  // Exposing this imperative flagger lets the slider's onChange handler
  // mark every user-initiated seek as a scrub unconditionally, regardless
  // of magnitude, so the next RAF frame hard-snaps all three panels to
  // their current-live targets. Smooth scroll is then reserved for what it
  // was always meant for: natural playback drift. Also bumps `scrubVersion`
  // so an open expanded-panel dialog re-anchors itself.
  const flagPanelScrub = useCallback(() => {
    for (const manual of [
      taxonomyManualScrollRef.current,
      productManualScrollRef.current,
      jsonManualScrollRef.current,
    ]) {
      manual.pauseUntil = 0
      manual.needsSnapOnResume = true
    }
    setScrubVersion((prev) => prev + 1)
  }, [])

  // Segment-flip snap for the product panel.
  //
  // The scrub-detection effect above catches user-initiated jumps, but it
  // doesn't fire when playback naturally rolls from the ad break into
  // Segment B (the pre-ad pinned time AD_BREAK-0.001 → post-ad time AD_BREAK
  // is only a 0.001s delta, below the threshold). We still need the product
  // panel to hard-snap to the new segment's target – otherwise it would
  // smooth-scroll from the old Segment A scroll position to the Segment B
  // target, which looks wrong because the list has fully swapped out
  // underneath it. This effect fires whenever `isPostAdSegment` flips (in
  // either direction) and flags the product panel for a one-frame snap.
  useEffect(() => {
    if (currentView !== 'demo') return
    productManualScrollRef.current.pauseUntil = 0
    productManualScrollRef.current.needsSnapOnResume = true
  }, [isPostAdSegment, currentView])

  // Synthetic timeline advance – used when not riding the native element time. For DHYH
  // this fires during the ad break (scrubber 212..242) so the ad segment progresses in
  // real time, with the play/pause button naturally gating it via `isVideoPlaying`.
  useEffect(() => {
    if (!isVideoPlaying || currentView !== 'demo' || hasPlaybackEnded) return
    if (usesNativeTimeline && !isAdBreakPlayback) return
    const timer = window.setTimeout(() => {
      setVideoCurrentSeconds((prev) => Math.min(prev + 0.1, playbackDurationSeconds))
    }, 100)
    return () => window.clearTimeout(timer)
  }, [
    isVideoPlaying,
    currentView,
    hasPlaybackEnded,
    playbackDurationSeconds,
    videoCurrentSeconds,
    setVideoCurrentSeconds,
    usesNativeTimeline,
    isAdBreakPlayback,
  ])

  useEffect(() => {
    setVideoCurrentSeconds((prev) => Math.min(prev, playbackDurationSeconds))
  }, [playbackDurationSeconds, setVideoCurrentSeconds])

  useEffect(() => {
    if (currentView !== 'demo') return
    const videoEl = contentVideoRef.current
    if (!videoEl) return

    if (isAdBreakPlayback || !isVideoPlaying || hasPlaybackEnded) {
      videoEl.pause()
      return
    }

    const playPromise = videoEl.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }, [currentView, isAdBreakPlayback, isVideoPlaying, hasPlaybackEnded])

  // Drive the ad-creative <video> element directly. `autoPlay` only fires on the first
  // mount, so toggling it mid-session won't restart playback. When the scrubber enters
  // the ad segment we explicitly align the ad element to the scrubber-relative position
  // and play; when it leaves we pause and reset so a future re-entry starts fresh.
  //
  // Note: DemoView also drives play/pause for ALL preloaded ad creatives in parallel
  // (so switching ad mode mid-break stays smooth — the inactive creatives' decoders
  // stay warm). This effect handles the active element specifically, and including
  // activeAdVideoUrl in deps lets it re-fire on mode switch — if the new active
  // element was paused (e.g. previously ended), play() is called here.
  useEffect(() => {
    if (currentView !== 'demo') return
    const adEl = adVideoRef.current
    if (!adEl) return
    if (isAdBreakPlayback) {
      if (isVideoPlaying) {
        if (adEl.paused) {
          const playPromise = adEl.play()
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {})
          }
        }
      } else {
        adEl.pause()
      }
    } else {
      adEl.pause()
      try {
        adEl.currentTime = 0
      } catch {
        /* ignore seek errors on unloaded element */
      }
    }
  }, [currentView, isAdBreakPlayback, isVideoPlaying, activeAdVideoUrl])

  // Keep the ad-creative element's `currentTime` aligned with the scrubber while in the
  // ad break. Natural forward playback is handled by the browser (the ad plays 1x and
  // the synthetic scrubber advances 1x, so drift stays small). This effect exists to
  // catch *scrubs* – either jumping into the ad for the first time, or re-entering it
  // after it has already played once. If the element's time drifts from the expected
  // position by more than ~0.75s we re-seek.
  useEffect(() => {
    if (currentView !== 'demo') return
    if (!isAdBreakPlayback) return
    const adEl = adVideoRef.current
    if (!adEl) return
    const target = Math.max(0, videoCurrentSeconds - activeAdBreakClipSeconds)
    if (Math.abs(adEl.currentTime - target) > 0.75) {
      try {
        adEl.currentTime = Math.min(target, (adEl.duration || target) - 0.05)
      } catch {
        /* ignore seek errors on unloaded element */
      }
    }
    // activeAdVideoUrl in deps so this re-runs when mode switches mid-break
    // and re-anchors the (now-different) active element to the scrubber.
  }, [currentView, isAdBreakPlayback, videoCurrentSeconds, activeAdVideoUrl, activeAdBreakClipSeconds])

  // Keep the native <video> aligned with the scrubber. For DHYH the scrubber spans the
  // 7-minute clip (0..420s) and maps 1:1 onto the 18:00 – 25:00 window of the source.
  useEffect(() => {
    if (currentView !== 'demo' || isAdBreakPlayback) return
    const videoEl = contentVideoRef.current
    if (!videoEl) return

    const duration = videoElementDuration || videoEl.duration || 0
    if (!duration || Number.isNaN(duration)) return

    let targetTime: number
    if (isDhyhContent) {
      // Map the scrubber (or, in Sync:Impulse, the clip-adjusted position) into the
      // shipped video file. The shipped file is pre-clipped to 0..420s so the offset is 0;
      // see DHYH_VIDEO_SOURCE_OFFSET_SECONDS if we ever switch back to the full-length render.
      targetTime = Math.min(duration - 0.05, DHYH_VIDEO_SOURCE_OFFSET_SECONDS + dhyhClipSeconds)
    } else if (usesNativeTimeline) {
      targetTime = Math.min(videoCurrentSeconds, duration - 0.05)
    } else {
      targetTime = videoCurrentSeconds % duration
    }
    if (Math.abs(videoEl.currentTime - targetTime) > 0.6) {
      videoEl.currentTime = targetTime
    }
  }, [
    currentView,
    isAdBreakPlayback,
    videoCurrentSeconds,
    videoElementDuration,
    usesNativeTimeline,
    isDhyhContent,
    dhyhClipSeconds,
  ])

  // When the native timeline is active, pull the element's currentTime into state via the
  // native `timeupdate` event (fires ~4x/sec). This avoids re-rendering the whole DemoView
  // on every animation frame, which was causing visibly choppy playback.
  useEffect(() => {
    if (!usesNativeTimeline || currentView !== 'demo') return
    const videoEl = contentVideoRef.current
    if (!videoEl) return
    const handleTimeUpdate = () => {
      const t = videoEl.currentTime
      if (Number.isNaN(t)) return
      if (isDhyhContent) {
        const clipPos = Math.max(
          0,
          Math.min(activeClipDurationSeconds, t - DHYH_VIDEO_SOURCE_OFFSET_SECONDS)
        )
        if (isSyncImpulseMode) {
          const adStart = activeAdBreakClipSeconds
          const adEnd = adStart + dhyhAdBreakDurationSeconds
          const internalTotal = activeClipDurationSeconds + dhyhAdBreakDurationSeconds
          // Use the functional setter so we can branch on the live scrubber value and
          // distinguish "content reaching the break for the first time" from "content
          // resuming after the break". Three outcomes:
          //  1. Scrubber already inside [adStart, adEnd) → synthetic timer owns it,
          //     ignore this tick.
          //  2. Content naturally crossed adStart while the scrubber was still in the
          //     pre-break region → snap scrubber to adStart (activating the ad break)
          //     and pin the content element on the 3:32 frame so it waits for resume.
          //  3. Content playing post-resume → 1:1 map plus ad-duration offset.
          setVideoCurrentSeconds((prev) => {
            if (prev >= adStart && prev < adEnd) return prev
            if (clipPos < adStart - 0.05) return clipPos
            if (prev < adStart) {
              videoEl.pause()
              try {
                videoEl.currentTime = DHYH_VIDEO_SOURCE_OFFSET_SECONDS + adStart
              } catch {
                /* ignore seek errors */
              }
              return adStart
            }
            return Math.min(internalTotal, clipPos + dhyhAdBreakDurationSeconds)
          })
        } else {
          setVideoCurrentSeconds(clipPos)
        }
        if (t >= DHYH_VIDEO_SOURCE_OFFSET_SECONDS + activeClipDurationSeconds) videoEl.pause()
      } else if (hasBundledContent && isSyncImpulseMode && isTailAnchoredAdBreak) {
        // Tail-anchored ad-break content (MasterChef): the MP4 plays
        // through `[0, clipDuration]` and the ad block runs after. The
        // <video> element's time is the clip-time directly (no source
        // offset, no segment splice). Two cases:
        //  1. Content still playing → forward t to the scrubber.
        //  2. Content reached the end → snap scrubber into the ad block
        //     and pause the content element so the synthetic ad timer
        //     can take over for the duration of the break.
        const adStart = activeAdBreakClipSeconds
        const adEnd = adStart + dhyhAdBreakDurationSeconds
        setVideoCurrentSeconds((prev) => {
          if (prev >= adStart && prev < adEnd) return prev
          if (t < adStart - 0.05) return t
          if (prev < adStart) {
            videoEl.pause()
            return adStart
          }
          return Math.min(adEnd, prev)
        })
        if (t >= activeClipDurationSeconds) videoEl.pause()
      } else {
        setVideoCurrentSeconds(t)
      }
    }
    videoEl.addEventListener('timeupdate', handleTimeUpdate)
    return () => videoEl.removeEventListener('timeupdate', handleTimeUpdate)
  }, [
    usesNativeTimeline,
    currentView,
    isDhyhContent,
    hasBundledContent,
    isSyncImpulseMode,
    isTailAnchoredAdBreak,
    activeAdBreakClipSeconds,
    activeClipDurationSeconds,
    dhyhAdBreakDurationSeconds,
    setVideoCurrentSeconds,
  ])

  const mainVideoSrc = selectedContent?.videoUrl ?? PLACEHOLDER_VIDEO_URL

  // Values used by the time readout in the player chrome. Bundled content
  // (DHYH, MasterChef) always reads as `"X:XX / clipDuration"` even when the
  // internal slider is longer (it includes the ad block for sync modes), so
  // we surface the clip-time / clip-duration values directly. Placeholder
  // content shows the raw scrubber position / its own internal length.
  const displayedCurrentSeconds = hasBundledContent
    ? dhyhClipSeconds
    : videoCurrentSeconds
  const displayedDurationSeconds = hasBundledContent
    ? activeClipDurationSeconds
    : playbackDurationSeconds

  return {
    contentVideoRef,
    adVideoRef,
    taxonomyRefs,
    productRefs,
    jsonRefs,
    taxonomyScrollContainerRef,
    productScrollContainerRef,
    jsonScrollContainerRef,
    visiblePanels,
    playerControlTokens,
    isSyncImpulseMode,
    titlePanelSummary,
    isPauseOverlayActive,
    isPauseToShopCtaVisible,
    activePauseOverlayPayload,
    activePauseMomentScene,
    playbackDurationSeconds,
    playbackScenes,
    activeImpulseSegment,
    isAdBreakPlayback,
    activeAdBreakImage,
    activeAdQrDestination,
    activeAdQrImage,
    activeAdVideoUrl,
    // List of all sync-style ad creatives the active content has wired,
    // used by VideoPlayer to mount + buffer every video concurrently
    // (so switching ad mode mid-break is a pure opacity flip instead of
    // a fresh load). Derived from the content's `adAssets` map — no
    // cross-content references.
    syncAdCreatives: (() => {
      const config = selectedContent?.id ? getContentConfig(selectedContent.id) : null
      if (!config?.adAssets) return [] as Array<{ modeId: AdPlaybackOption; videoUrl: string }>
      return (Object.entries(config.adAssets) as Array<
        [AdPlaybackOption, NonNullable<typeof config.adAssets>[AdPlaybackOption]]
      >)
        .filter(([modeId, assets]) => {
          const mode = AD_MODE_REGISTRY[modeId]
          return mode?.enabled && mode.kind === 'sync-ad-break' && !!assets?.videoUrl
        })
        .map(([modeId, assets]) => ({ modeId, videoUrl: assets!.videoUrl! }))
    })(),
    activeAdBreakLabel,
    hasPlaybackEnded,
    adBreakSegmentProgress,
    adDecisionPayload: activeAdDecisionPayload,
    adDecisioningTail,
    activeSceneIndex,
    activeScene,
    productEntries,
    activeProductIndex,
    originalJsonDownloadString,
    summaryJsonDownloadString,
    mainVideoSrc,
    isDhyhContent,
    productsUnavailableMessage,
    hasReachedFirstProduct,
    taxonomyAvailability,
    availableTaxonomies,
    availableAdModes,
    flagPanelScrub,
    scrubVersion,
    displayedCurrentSeconds,
    displayedDurationSeconds,
    // Bundled content (DHYH, MC) gets its per-content scrubber layout —
    // a single ad break sized to the active mode's duration, anchored at
    // the content's `adBreakClipSeconds`. Placeholder content keeps the
    // legacy two-break demo layout.
    impulseSegments: hasBundledContent ? dhyhImpulseSegments : SYNC_IMPULSE_SEGMENTS,
    ctaPauseSegments: dhyhCtaPauseSegments,
    isPauseAdActive,
    pauseAdImageSrc,
    pauseAdCompliancePayload,
    pauseAdResponseLabel,
  }
}
