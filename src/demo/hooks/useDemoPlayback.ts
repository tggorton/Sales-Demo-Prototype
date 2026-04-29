import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adDecisionPayload, adDecisioningTail } from '../data/adFixtures'
import { AD_MODE_REGISTRY, isSyncAdBreakMode } from '../ad-modes'
import {
  AD_BREAK_1_IMAGE,
  AD_BREAK_2_IMAGE,
  AD_QR_DESTINATION_1,
  AD_QR_DESTINATION_2,
  AD_QR_IMAGE_1,
  AD_QR_IMAGE_2,
  DEFAULT_START_SECONDS,
  DHYH_AD_BREAK_CLIP_SECONDS,
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_VIDEO_SOURCE_OFFSET_SECONDS,
  DHYH_CONTENT_ID,
  HIDDEN_TAXONOMIES_BY_CONTENT,
  DHYH_IMPULSE_AD_COMPANION_URL,
  PANEL_AUTOSCROLL_MAX_VELOCITY_PX_PER_SEC,
  PANEL_MANUAL_SCROLL_PAUSE_MS,
  PLACEHOLDER_VIDEO_URL,
  PRODUCT_DEDUPE_WINDOW_SECONDS,
  SYNC_IMPULSE_DURATION_SECONDS,
  SYNC_IMPULSE_SEGMENTS,
  TAXONOMIES_AVAILABLE_BY_TIER,
  taxonomyOptions,
  TOTAL_DURATION_SECONDS,
} from '../constants'
import { getTaxonomySceneData } from '../data/taxonomySceneData'
import { getDhyhScenesForTier, type DhyhSceneBundle } from '../data/dhyhScenes'
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
  // Manual-scroll state is tracked PER PANEL so interacting with one panel
  // doesn't freeze the others. `pauseUntil` is an epoch timestamp (ms) – while
  // Date.now() is below it the RAF leaves that panel's scrollTop alone. Once
  // the pause expires, `needsSnapOnResume` tells the RAF to jump straight to
  // the current live target in a single frame (no animated catch-up), after
  // which normal smooth tracking resumes.
  //
  // `lastTarget` is the scroll-position target we computed the *previous* RAF
  // frame. It powers the global "target-discontinuity" snap rule in
  // applyScroll: if the target jumps by more than one frame of natural
  // playback drift could account for, we one-shot snap instead of smooth-
  // scrolling. That makes smooth scroll apply ONLY to natural playback (the
  // user's explicit ask) and auto-handles every non-playback cause of target
  // change – taxonomy switch, tier switch, content swap, ad-break flip, panel
  // re-open, window resize, slider scrub – without us having to flag each
  // trigger individually. `-1` is a sentinel meaning "no previous target yet,
  // snap on the first write" (used on fresh mount or after a state reset).
  type PanelManualScrollState = {
    pauseUntil: number
    needsSnapOnResume: boolean
    lastTarget: number
  }
  const createManualState = (): PanelManualScrollState => ({
    pauseUntil: 0,
    needsSnapOnResume: false,
    lastTarget: -1,
  })
  const taxonomyManualScrollRef = useRef<PanelManualScrollState>(createManualState())
  const productManualScrollRef = useRef<PanelManualScrollState>(createManualState())
  const jsonManualScrollRef = useRef<PanelManualScrollState>(createManualState())
  // Previous `panelTimelineSeconds`. Used by the scrub-detection effect below
  // to spot timeline discontinuities (any scrub – forward or backward – or a
  // large forward jump that isn't natural playback) and flag all three panels
  // to "load" to the new position using the same one-frame snap path that
  // resume-from-manual-scroll uses.
  const previousPanelTimelineRef = useRef<number | null>(null)

  const orderedPanels: DemoPanel[] = ['taxonomy', 'product', 'json']
  const visiblePanels = orderedPanels.filter((panel) => activeDemoPanels.includes(panel))

  const isDhyhContent = selectedContent?.id === DHYH_CONTENT_ID

  const [dhyhBundle, setDhyhBundle] = useState<DhyhSceneBundle | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!isDhyhContent) {
      setDhyhBundle(null)
      return
    }
    getDhyhScenesForTier(selectedTier).then((bundle) => {
      if (!cancelled) setDhyhBundle(bundle)
    })
    return () => {
      cancelled = true
    }
  }, [isDhyhContent, selectedTier])

  // Sync-style ad breaks (colored scrubber + ad creative overlay) fire for any mode
  // that supplies a `dhyhAdDurationSeconds` in the registry — currently `Sync`,
  // `Sync: L-Bar`, and `Sync: Impulse`. Each registry entry owns its own creative,
  // duration, and ad-compliance JSON; see src/demo/ad-modes/.
  //
  // Placeholder content retains the legacy tier-gated `Sync: Impulse`-only behavior
  // because no other mode has a placeholder code path.
  const isExactProductMatch = selectedTier === 'Exact Product Match'
  const activeMode = AD_MODE_REGISTRY[selectedAdPlayback]
  const isSyncImpulseModeSelected = selectedAdPlayback === 'Sync: Impulse'

  // Broadened sync-ad-break flag used pervasively below. Historically named
  // `isSyncImpulseMode`; kept to minimize churn in downstream files.
  const isSyncImpulseMode = isDhyhContent
    ? isSyncAdBreakMode(selectedAdPlayback)
    : isExactProductMatch && isSyncImpulseModeSelected

  const titlePanelSummary = `VOD: ${selectedTier.toUpperCase()} - ${selectedAdPlayback.toUpperCase()}`
  const shouldShowInContentCta =
    selectedAdPlayback === 'CTA Pause' || selectedAdPlayback === 'Organic Pause'

  // Per-mode DHYH ad-break duration sourced from the registry (30s for Impulse/L-Bar,
  // 45s for Sync). Placeholder content always falls back to Impulse's duration.
  const dhyhAdBreakDurationSeconds = useMemo(() => {
    const fallback = AD_MODE_REGISTRY['Sync: Impulse'].dhyhAdDurationSeconds ?? 30
    if (!isDhyhContent) return fallback
    return activeMode.dhyhAdDurationSeconds ?? fallback
  }, [isDhyhContent, activeMode])

  // DHYH scrubber segments are recomputed per-mode so the cyan ad slot matches the
  // actual ad duration (Impulse/L-Bar = 30s, Sync = 45s). All three use a single break
  // anchored at 3:32 of the clip.
  const dhyhImpulseSegments = useMemo(() => {
    const adStart = DHYH_AD_BREAK_CLIP_SECONDS
    const adEnd = adStart + dhyhAdBreakDurationSeconds
    const total = DHYH_CLIP_DURATION_SECONDS + dhyhAdBreakDurationSeconds
    return [
      { start: 0, end: adStart, kind: 'content' as const },
      { start: adStart, end: adEnd, kind: 'ad-break-1' as const },
      { start: adEnd, end: total, kind: 'content' as const },
    ]
  }, [dhyhAdBreakDurationSeconds])

  // `playbackDurationSeconds` is the *internal* scrubber length used by the MUI slider.
  // For DHYH sync-ad-break modes this includes the per-mode ad block (30-45s) so the
  // slider has a visible cyan segment in the middle that the user can drag across. The
  // time readout in the player chrome uses a separate clip-adjusted value
  // (displayedCurrentSeconds / displayedDurationSeconds) so the content still "feels"
  // like a 7-minute clip.
  const playbackDurationSeconds =
    isDhyhContent && dhyhBundle
      ? isSyncImpulseMode
        ? DHYH_CLIP_DURATION_SECONDS + dhyhAdBreakDurationSeconds
        : DHYH_CLIP_DURATION_SECONDS
      : isSyncImpulseMode
        ? SYNC_IMPULSE_DURATION_SECONDS
        : TOTAL_DURATION_SECONDS

  // DHYH plays the real MP4 in all modes, so the <video> element's currentTime drives state.
  // The synthetic tick is only used for placeholder content or to walk through ad breaks.
  const usesNativeTimeline = isDhyhContent

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

  // For DHYH sync-ad-break modes, map the internal scrubber position (which includes a
  // 30-45s ad block at the Segment A / Segment B splice point) back onto the spliced
  // clip timeline (0 .. DHYH_CLIP_DURATION_SECONDS). Inside the ad block the helper
  // freezes just *before* the splice point – that keeps the Taxonomy / Product / JSON
  // panels anchored to the last Segment A scene for the duration of the ad instead
  // of flipping to Segment B the instant the scrubber enters the break (Segment B
  // scenes start at clip-time === DHYH_AD_BREAK_CLIP_SECONDS, so even a 0-length nudge
  // matters for scene-window selection).
  const dhyhClipSeconds = useMemo(() => {
    if (!isDhyhContent) return videoCurrentSeconds
    if (!isSyncImpulseMode) return videoCurrentSeconds
    if (videoCurrentSeconds < DHYH_AD_BREAK_CLIP_SECONDS) return videoCurrentSeconds
    if (videoCurrentSeconds < DHYH_AD_BREAK_CLIP_SECONDS + dhyhAdBreakDurationSeconds) {
      return Math.max(0, DHYH_AD_BREAK_CLIP_SECONDS - 0.001)
    }
    return videoCurrentSeconds - dhyhAdBreakDurationSeconds
  }, [isDhyhContent, isSyncImpulseMode, videoCurrentSeconds, dhyhAdBreakDurationSeconds])

  const panelTimelineSeconds = isDhyhContent
    ? dhyhClipSeconds
    : usesNativeTimeline || isSyncImpulseMode
      ? videoCurrentSeconds
      : nonImpulsePanelProgress * TOTAL_DURATION_SECONDS

  const playbackScenes = useMemo(() => {
    if (isDhyhContent && dhyhBundle) {
      // Real DHYH scenes are used across all modes, including Sync: Impulse.
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
  }, [isDhyhContent, dhyhBundle, isSyncImpulseMode])

  const activeImpulseSegment = useMemo(() => {
    if (!isSyncImpulseMode) return null
    const segments = isDhyhContent ? dhyhImpulseSegments : SYNC_IMPULSE_SEGMENTS
    return (
      segments.find(
        (segment) => videoCurrentSeconds >= segment.start && videoCurrentSeconds < segment.end
      ) ?? segments[segments.length - 1]
    )
  }, [isSyncImpulseMode, isDhyhContent, videoCurrentSeconds, dhyhImpulseSegments])

  const isAdBreakPlayback =
    isSyncImpulseMode &&
    (activeImpulseSegment?.kind === 'ad-break-1' || activeImpulseSegment?.kind === 'ad-break-2')

  // For DHYH, both ad breaks share the new ad creative + the same companion URL.
  const activeAdBreakImage = isDhyhContent
    ? '' // DHYH uses a video ad; no static image is rendered
    : activeImpulseSegment?.kind === 'ad-break-1'
      ? AD_BREAK_1_IMAGE
      : AD_BREAK_2_IMAGE
  const activeAdQrDestination = isDhyhContent
    ? DHYH_IMPULSE_AD_COMPANION_URL
    : activeImpulseSegment?.kind === 'ad-break-1'
      ? AD_QR_DESTINATION_1
      : AD_QR_DESTINATION_2
  const activeAdQrImage = isDhyhContent
    ? ''
    : activeImpulseSegment?.kind === 'ad-break-1'
      ? AD_QR_IMAGE_1
      : AD_QR_IMAGE_2
  const activeAdBreakLabel =
    activeImpulseSegment?.kind === 'ad-break-1' ? '_AdBreak-1 Response' : '_AdBreak-2 Response'

  // DHYH ad creative + compliance JSON come from the active mode's registry entry.
  // Placeholder content still runs with no video ad and the legacy compliance payload.
  const activeAdVideoUrl = isDhyhContent ? activeMode.dhyhAdVideoUrl ?? null : null

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
    if (!isDhyhContent || !isAdBreakPlayback) return
    if (previous === null || activeAdVideoUrl === null) return
    setVideoCurrentSeconds(DHYH_AD_BREAK_CLIP_SECONDS)
  }, [activeAdVideoUrl, isAdBreakPlayback, isDhyhContent, setVideoCurrentSeconds])

  const activeAdDecisionPayload: Record<string, unknown> =
    isDhyhContent && isSyncImpulseMode
      ? activeMode.dhyhCompliancePayload ?? adDecisionPayload
      : adDecisionPayload

  const hasPlaybackEnded = videoCurrentSeconds >= playbackDurationSeconds

  const adBreakSegmentProgress = useMemo(() => {
    if (!isSyncImpulseMode || !isAdBreakPlayback || !activeImpulseSegment) return 0
    const duration = Math.max(1, activeImpulseSegment.end - activeImpulseSegment.start)
    const elapsed = videoCurrentSeconds - activeImpulseSegment.start
    return Math.min(1, Math.max(0, elapsed / duration))
  }, [isSyncImpulseMode, isAdBreakPlayback, activeImpulseSegment, videoCurrentSeconds])

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
        isSyncImpulseMode,
      }),
    [playbackScenes, selectedTier, selectedAdPlayback, playbackDurationSeconds, isSyncImpulseMode]
  )

  const activeSceneIndex = useMemo(() => {
    if (playbackScenes.length === 0) return -1
    // Fast path: time lies inside a scene window.
    const foundIndex = playbackScenes.findIndex(
      (scene) => panelTimelineSeconds >= scene.start && panelTimelineSeconds < scene.end
    )
    if (foundIndex >= 0) return foundIndex
    // Before the first scene: no active scene yet (panel stays at top).
    if (panelTimelineSeconds < playbackScenes[0].start) return -1
    // In a gap between scenes, or past the end of the clip: pick the last scene
    // that has already started. The previous fallback (playbackScenes.length - 1)
    // snapped to the very last scene of the clip any time the timeline landed in
    // a gap, which is what caused the panels to lurch to the bottom and then
    // snap back when the next real scene kicked in.
    for (let i = playbackScenes.length - 1; i >= 0; i--) {
      if (playbackScenes[i].start <= panelTimelineSeconds) return i
    }
    return -1
  }, [playbackScenes, panelTimelineSeconds])

  const activeScene = playbackScenes[activeSceneIndex] ?? playbackScenes[0]

  // Segment-gated product lists.
  //
  // DHYH in Sync:Impulse mode plays two stitched content segments (pre-ad and
  // post-ad) with an ad break between them. The product panel should ONLY
  // expose products from the segment the viewer is currently in – otherwise
  // the post-ad items leak into the tail of the pre-ad viewport (and vice
  // versa), and scrubbing across the ad boundary can leave the panel parked
  // on the wrong segment's products.
  //
  // We build two independent lists (each with its own dedupe state so a
  // product that appears in both segments gets to show up once per segment)
  // and pick whichever matches the current clip time below. For content
  // without an ad break (e.g. non-DHYH, or modes other than Sync:Impulse)
  // everything lives in `preAdProductEntries` and `postAdProductEntries`
  // stays empty.
  //
  // Time-windowed dedupe: within a segment, if a product already emitted
  // within the last PRODUCT_DEDUPE_WINDOW_SECONDS (on the playback timeline),
  // skip subsequent occurrences. A gap larger than the window lets the
  // product reappear so recurring on-screen items still show up naturally
  // later in the clip. Set PRODUCT_DEDUPE_WINDOW_SECONDS to 0 in
  // constants.ts to disable.
  const { preAdProductEntries, postAdProductEntries } = useMemo<{
    preAdProductEntries: ProductEntry[]
    postAdProductEntries: ProductEntry[]
  }>(() => {
    const windowSeconds = PRODUCT_DEDUPE_WINDOW_SECONDS
    const buildList = (scenes: SceneMetadata[]): ProductEntry[] => {
      const result: ProductEntry[] = []
      const lastEmittedAt = new Map<string, number>()
      for (const scene of scenes) {
        for (const product of scene.products) {
          const previous = lastEmittedAt.get(product.productKey)
          if (
            windowSeconds > 0 &&
            previous !== undefined &&
            scene.start - previous < windowSeconds
          ) {
            continue
          }
          result.push({
            ...product,
            sceneId: scene.id,
            sceneLabel: scene.sceneLabel,
            sceneStart: scene.start,
          })
          lastEmittedAt.set(product.productKey, scene.start)
        }
      }
      return result
    }

    const hasAdBreak = isDhyhContent && isSyncImpulseMode
    if (!hasAdBreak) {
      return { preAdProductEntries: buildList(playbackScenes), postAdProductEntries: [] }
    }
    const boundary = DHYH_AD_BREAK_CLIP_SECONDS
    const preAdScenes = playbackScenes.filter((scene) => scene.start < boundary)
    const postAdScenes = playbackScenes.filter((scene) => scene.start >= boundary)
    return {
      preAdProductEntries: buildList(preAdScenes),
      postAdProductEntries: buildList(postAdScenes),
    }
  }, [playbackScenes, isDhyhContent, isSyncImpulseMode])

  // Full product list across BOTH segments – used by the expanded panel
  // dialog, which shows everything regardless of where the viewer is in the
  // timeline. Dedupe is applied once across the whole clip (same window as
  // the per-segment lists) so recurring items don't pile up, but no segment
  // boundary is enforced. The collapsed inline panel uses the segment-gated
  // `productEntries` below instead so the scroll viewport only ever surfaces
  // products from the currently-playing segment.
  const allProductEntries = useMemo<ProductEntry[]>(() => {
    const windowSeconds = PRODUCT_DEDUPE_WINDOW_SECONDS
    const result: ProductEntry[] = []
    const lastEmittedAt = new Map<string, number>()
    for (const scene of playbackScenes) {
      for (const product of scene.products) {
        const previous = lastEmittedAt.get(product.productKey)
        if (
          windowSeconds > 0 &&
          previous !== undefined &&
          scene.start - previous < windowSeconds
        ) {
          continue
        }
        result.push({
          ...product,
          sceneId: scene.id,
          sceneLabel: scene.sceneLabel,
          sceneStart: scene.start,
        })
        lastEmittedAt.set(product.productKey, scene.start)
      }
    }
    return result
  }, [playbackScenes])

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
    isDhyhContent && dhyhBundle && !dhyhBundle.hasProductData
      ? 'No product match data is associated with this Tier'
      : null

  // Which taxonomies have zero data across all scenes of the current content? Used to
  // render a "No … information currently" empty state for real-content (DHYH) tiers
  // that don't emit certain fields (e.g. music_emotion on Exact Product Match).
  //
  // We also honor the per-content hide list (`HIDDEN_TAXONOMIES_BY_CONTENT`)
  // so individual pieces of content can opt out of taxonomies that exist in
  // the JSON but aren't curated yet. A hidden taxonomy is treated as
  // unavailable, which removes it from the dropdown and triggers the same
  // auto-correct path that fires when a tier genuinely lacks data.
  const taxonomyAvailability = useMemo(() => {
    const availability: Record<TaxonomyOption, boolean> = {
      IAB: false,
      Location: false,
      Sentiment: false,
      'Brand Safety': false,
      Faces: false,
      Emotion: false,
      Object: false,
    }
    const hidden = selectedContent
      ? HIDDEN_TAXONOMIES_BY_CONTENT[selectedContent.id] ?? []
      : []
    // Per-tier whitelist (TAXONOMIES_AVAILABLE_BY_TIER) is the source of truth
    // for which taxonomies the upstream JSON conceptually owns at this tier.
    // It runs BEFORE the per-scene data-presence check so retrofits like the
    // editorial DHYH_LOCATION_TIMELINE can't sneak Location into Basic Scene.
    const tierWhitelist = TAXONOMIES_AVAILABLE_BY_TIER[selectedTier] ?? []
    for (const option of taxonomyOptions) {
      if (hidden.includes(option)) {
        availability[option] = false
        continue
      }
      if (!tierWhitelist.includes(option)) {
        availability[option] = false
        continue
      }
      if (!isDhyhContent) {
        availability[option] = true
        continue
      }
      availability[option] = playbackScenes.some(
        (scene, index) => getTaxonomySceneData(scene, index, option) !== null
      )
    }
    return availability
  }, [isDhyhContent, playbackScenes, selectedContent, selectedTier])

  // Taxonomy options filtered down to only those that actually have data for
  // the currently-selected tier / content. Drives both the collapsed <Select>
  // in DemoView and the expanded Autocomplete in ExpandedPanelDialog so users
  // never see a dropdown entry that would immediately render an empty state.
  // Preserves the canonical order defined in `taxonomyOptions`.
  const availableTaxonomies = useMemo<TaxonomyOption[]>(
    () => taxonomyOptions.filter((option) => taxonomyAvailability[option]),
    [taxonomyAvailability]
  )

  // Returns -1 when no product has been reached yet on the timeline (e.g. the DHYH color-bar
  // intro). When the current scene itself has no products, we keep the last past scene's
  // products visible so the panel doesn't jump back to the top of the list.
  //
  // Important: we match against `playbackScenes[activeSceneIndex]` (guarded by the
  // activeSceneIndex >= 0 check) rather than the `activeScene ?? playbackScenes[0]`
  // fallback — using the fallback would make the product panel jump to Scene 1's
  // products any time the activeSceneIndex fallback kicks in.
  const activeProductIndex = useMemo(() => {
    if (productEntries.length === 0) return -1
    if (activeSceneIndex < 0) return -1
    const currentScene = playbackScenes[activeSceneIndex]
    if (currentScene) {
      const firstMatch = productEntries.findIndex(
        (entry) => entry.sceneId === currentScene.id
      )
      if (firstMatch >= 0) return firstMatch
    }
    for (let i = productEntries.length - 1; i >= 0; i--) {
      if (productEntries[i].sceneStart <= panelTimelineSeconds) return i
    }
    return -1
  }, [activeSceneIndex, playbackScenes, productEntries, panelTimelineSeconds])

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

    const TOP_PADDING = 12
    // Exponential catch-up factor per frame. Combined with the velocity cap below,
    // this gives us a smooth ease at 60fps: small deltas close quickly, big deltas
    // are paced by the cap so nothing darts across the panel.
    const SMOOTH_FACTOR = 0.14
    // Threshold below which we just write the final value to clean up sub-pixel residue.
    const SNAP_THRESHOLD_PX = 0.25
    // Per-frame velocity cap derived from the user-facing px/sec setting. Assumes
    // ~60fps; cheaper and simpler than measuring real frame delta.
    const MAX_PX_PER_FRAME = PANEL_AUTOSCROLL_MAX_VELOCITY_PX_PER_SEC / 60

    // Global "target-discontinuity" threshold.
    //
    // Natural playback advances `panelTimelineSeconds` in small per-frame
    // increments, which `resolveSceneTarget` / `resolveProductTarget`
    // translate into small per-frame deltas in the pixel target (normally
    // well under MAX_PX_PER_FRAME). Any frame-over-frame target change that
    // blows past this threshold is NOT playback drift – it's a state jump
    // (taxonomy switch, tier/content swap, scene reindex, ad-break flip,
    // panel re-open, window resize, or a slider scrub). We treat every one
    // of those uniformly by snapping straight to the new target in one frame
    // instead of smooth-scrolling through the intermediate range.
    //
    // The multiplier (8) is generous on purpose: normal playback produces
    // per-frame deltas of ~2-8px, so 8 * MAX_PX_PER_FRAME (~66px at default
    // settings) comfortably covers scene-boundary smoothing while still
    // catching every legitimate discontinuity.
    const TARGET_JUMP_THRESHOLD_PX = MAX_PX_PER_FRAME * 8

    // Scroll target = the pixel position the panel "wants" to be at this
    // frame. We carry two values so the smooth-vs-snap heuristic doesn't get
    // confused by `maxScroll` clamping:
    //   * `unclamped` is the raw interpolated offset (how far down the active
    //     scene actually sits from the top of the rendered list). This is
    //     what we compare frame-over-frame to detect real state jumps.
    //   * `clamped` is `unclamped` clamped to [0, scrollHeight - clientHeight]
    //     and is what we actually write to `scrollTop`.
    // After a backward scrub (e.g. clip 2 → clip 1) only a small subset of
    // scenes is mounted, so the panel is short and `maxScroll` is small.
    // Each new scene that mounts on autoplay grows `scrollHeight`, which
    // suddenly relaxes the clamp – the *clamped* target jumps in big steps
    // even though the *unclamped* one is moving smoothly. Using the clamped
    // value for jump detection misclassified that as a state discontinuity
    // and snapped on every new scene mount, which read as "auto-scroll
    // doesn't work". Tracking the unclamped value fixes that without
    // changing snap behavior for true state changes (taxonomy swap, content
    // swap, scrub, etc.) – their unclamped deltas are still huge.
    type ScrollTargetValue = { clamped: number; unclamped: number }

    const applyScroll = (
      el: HTMLDivElement,
      target: ScrollTargetValue,
      manual: PanelManualScrollState
    ) => {
      // During the manual-scroll pause we don't touch scrollTop at all – the
      // user owns the panel. The RAF keeps running so the next frame after the
      // pause expires can snap straight to the current live target.
      if (Date.now() < manual.pauseUntil) {
        // Keep `lastTarget` tracking the live target even while paused so
        // the target-jump heuristic doesn't spuriously fire on the very
        // first frame after the pause expires (by then the target has
        // typically drifted further than the jump threshold, but that's
        // playback drift we intentionally slept through – not a state
        // discontinuity worth snapping for). The explicit
        // `needsSnapOnResume` path below still handles the resume-from-
        // manual-scroll case exactly the same way it always did.
        manual.lastTarget = target.unclamped
        return
      }
      if (manual.needsSnapOnResume) {
        // "Load to current" on resume: one-frame jump, no animated catch-up.
        // This is what the user wants when they finish browsing – the panel
        // should reappear at the live playback spot instantly, then track
        // smoothly from there.
        manual.needsSnapOnResume = false
        manual.lastTarget = target.unclamped
        el.scrollTop = target.clamped
        return
      }
      // Global target-discontinuity snap: if the target itself moved further
      // than one playback frame could plausibly move it, the cause is a
      // state change, not drift. Snap. This is the single rule that
      // eliminates "aggressive scroll to current" across the entire app –
      // every non-playback trigger (taxonomy change, tier swap, scene
      // reindex, ad-break flip, panel open, scrub, etc.) produces a target
      // discontinuity and is handled here uniformly, without us having to
      // enumerate each trigger.
      const prevTarget = manual.lastTarget
      manual.lastTarget = target.unclamped
      if (
        prevTarget < 0 ||
        Math.abs(target.unclamped - prevTarget) > TARGET_JUMP_THRESHOLD_PX
      ) {
        el.scrollTop = target.clamped
        return
      }
      const delta = target.clamped - el.scrollTop
      const absDelta = Math.abs(delta)
      if (absDelta < SNAP_THRESHOLD_PX) {
        if (delta !== 0) el.scrollTop = target.clamped
        return
      }
      // Exponential ease, then clamp the per-frame step so normal scene-to-
      // scene advancement glides smoothly. Smooth scroll is now reserved
      // exclusively for natural playback drift – anything else has already
      // snapped above.
      const eased = delta * SMOOTH_FACTOR
      const step =
        eased > 0
          ? Math.min(eased, MAX_PX_PER_FRAME)
          : Math.max(eased, -MAX_PX_PER_FRAME)
      el.scrollTop += step
    }

    // Walk backward through a refs array to find the most recent populated ref at
    // or before `upToIdx`. Taxonomy and JSON panels skip scenes that don't emit
    // data for the current selection (e.g. scenes without `music_emotion`), so the
    // refs array is sparse. Without this walk-back, interpolation would fall back
    // to offset 0 (the top of the container), causing the scroll to snap to the
    // top every time a scene with no data became active – a big source of the
    // "stall then aggressively catch up" behavior.
    const walkBackForRef = (
      refs: Array<HTMLDivElement | null>,
      upToIdx: number
    ): HTMLDivElement | null => {
      for (let i = upToIdx; i >= 0; i--) {
        const node = refs[i]
        if (node) return node
      }
      return null
    }

    // Target position for scene-based panels (Taxonomy, JSON). Interpolates from
    // the nearest rendered scene BEFORE the active one to the active scene's own
    // card, using the active scene's duration as the time window. If the active
    // scene has no rendered ref (no data for the current selection) we stay
    // parked on the previous rendered ref until the timeline reaches a new one.
    const buildTarget = (raw: number, maxScroll: number): ScrollTargetValue => {
      const safe = Math.max(0, raw)
      return { clamped: Math.min(maxScroll, safe), unclamped: safe }
    }

    const resolveSceneTarget = (
      container: HTMLDivElement | null,
      refs: Array<HTMLDivElement | null>,
      scenes: SceneMetadata[],
      activeIdx: number,
      time: number
    ): ScrollTargetValue | null => {
      if (!container || scenes.length === 0 || activeIdx < 0) return null
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)

      const currentRef = refs[activeIdx] ?? null
      // If the current scene has no rendered ref, hold on the most recent one we
      // have (or the top, if none). This prevents the panel from resetting to 0.
      if (!currentRef) {
        const fallback = walkBackForRef(refs, activeIdx - 1)
        if (!fallback) return { clamped: 0, unclamped: 0 }
        return buildTarget(fallback.offsetTop - TOP_PADDING, maxScroll)
      }

      const prevRef = walkBackForRef(refs, activeIdx - 1)
      const activeScene = scenes[activeIdx]
      const sceneDuration = Math.max(0.001, activeScene.end - activeScene.start)
      const progress = Math.min(
        1,
        Math.max(0, (time - activeScene.start) / sceneDuration)
      )
      const startOffset = prevRef ? prevRef.offsetTop : 0
      const endOffset = currentRef.offsetTop
      const interpolated = startOffset + (endOffset - startOffset) * progress
      return buildTarget(interpolated - TOP_PADDING, maxScroll)
    }

    // Products are always all rendered (no null gaps), so we can use a tighter
    // interpolation driven by the adjacent products' sceneStart times.
    const resolveProductTarget = (
      container: HTMLDivElement | null,
      products: ProductEntry[],
      activeIdx: number,
      time: number,
      fallbackSceneProgress: number
    ): ScrollTargetValue | null => {
      if (!container || products.length === 0 || activeIdx < 0) return null
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
      const currentRef = productRefs.current[activeIdx]
      if (!currentRef) return null
      const prevIdx = activeIdx - 1
      const prevRef = prevIdx >= 0 ? productRefs.current[prevIdx] : null
      const currentProduct = products[activeIdx]
      const prevProduct = prevIdx >= 0 ? products[prevIdx] : null

      let progress = fallbackSceneProgress
      if (prevProduct && currentProduct.sceneStart > prevProduct.sceneStart) {
        progress =
          (time - prevProduct.sceneStart) /
          (currentProduct.sceneStart - prevProduct.sceneStart)
      }
      progress = Math.min(1, Math.max(0, progress))
      const startOffset = prevRef ? prevRef.offsetTop : 0
      const endOffset = currentRef.offsetTop
      const interpolated = startOffset + (endOffset - startOffset) * progress
      return buildTarget(interpolated - TOP_PADDING, maxScroll)
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
        const target = resolveSceneTarget(
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
          const target = resolveSceneTarget(
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
          const target = resolveProductTarget(
            productScrollContainerRef.current,
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
  }, [currentView, visiblePanels.join(',')])

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
  // was always meant for: natural playback drift.
  const flagPanelScrub = useCallback(() => {
    for (const manual of [
      taxonomyManualScrollRef.current,
      productManualScrollRef.current,
      jsonManualScrollRef.current,
    ]) {
      manual.pauseUntil = 0
      manual.needsSnapOnResume = true
    }
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
    const target = Math.max(0, videoCurrentSeconds - DHYH_AD_BREAK_CLIP_SECONDS)
    if (Math.abs(adEl.currentTime - target) > 0.75) {
      try {
        adEl.currentTime = Math.min(target, (adEl.duration || target) - 0.05)
      } catch {
        /* ignore seek errors on unloaded element */
      }
    }
    // activeAdVideoUrl in deps so this re-runs when mode switches mid-break
    // and re-anchors the (now-different) active element to the scrubber.
  }, [currentView, isAdBreakPlayback, videoCurrentSeconds, activeAdVideoUrl])

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
          Math.min(DHYH_CLIP_DURATION_SECONDS, t - DHYH_VIDEO_SOURCE_OFFSET_SECONDS)
        )
        if (isSyncImpulseMode) {
          const adStart = DHYH_AD_BREAK_CLIP_SECONDS
          const adEnd = adStart + dhyhAdBreakDurationSeconds
          const internalTotal = DHYH_CLIP_DURATION_SECONDS + dhyhAdBreakDurationSeconds
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
        if (t >= DHYH_VIDEO_SOURCE_OFFSET_SECONDS + DHYH_CLIP_DURATION_SECONDS) videoEl.pause()
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
    isSyncImpulseMode,
    dhyhAdBreakDurationSeconds,
    setVideoCurrentSeconds,
  ])

  const mainVideoSrc = selectedContent?.videoUrl ?? PLACEHOLDER_VIDEO_URL

  // Values used by the time readout in the player chrome. For DHYH the display should
  // always read "X:XX / 7:00" even though the internal slider is 7:30 long when in
  // Sync:Impulse, so subtract ad time from the displayed current/total.
  const displayedCurrentSeconds = isDhyhContent ? dhyhClipSeconds : videoCurrentSeconds
  const displayedDurationSeconds = isDhyhContent ? DHYH_CLIP_DURATION_SECONDS : playbackDurationSeconds

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
    shouldShowInContentCta,
    playbackDurationSeconds,
    playbackScenes,
    activeImpulseSegment,
    isAdBreakPlayback,
    activeAdBreakImage,
    activeAdQrDestination,
    activeAdQrImage,
    activeAdVideoUrl,
    activeAdBreakLabel,
    hasPlaybackEnded,
    adBreakSegmentProgress,
    adDecisionPayload: activeAdDecisionPayload,
    adDecisioningTail,
    activeSceneIndex,
    activeScene,
    productEntries,
    allProductEntries,
    activeProductIndex,
    originalJsonDownloadString,
    summaryJsonDownloadString,
    mainVideoSrc,
    isDhyhContent,
    productsUnavailableMessage,
    hasReachedFirstProduct,
    taxonomyAvailability,
    availableTaxonomies,
    flagPanelScrub,
    displayedCurrentSeconds,
    displayedDurationSeconds,
    impulseSegments: isDhyhContent ? dhyhImpulseSegments : SYNC_IMPULSE_SEGMENTS,
  }
}
