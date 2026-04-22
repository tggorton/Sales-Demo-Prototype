import { useEffect, useMemo, useRef, useState } from 'react'
import { adDecisionPayload, adDecisioningTail } from './adFixtures'
import impulseAdCompliancePayload from './data/ad-compliance-results-impulse.json'
import lbarAdCompliancePayload from './data/ad-compliance-results-l-bar.json'
import syncAdCompliancePayload from './data/ad-compliance-results-sync.json'
import {
  AD_BREAK_1_IMAGE,
  AD_BREAK_2_IMAGE,
  AD_QR_DESTINATION_1,
  AD_QR_DESTINATION_2,
  AD_QR_IMAGE_1,
  AD_QR_IMAGE_2,
  DEFAULT_START_SECONDS,
  DHYH_AD_BREAK_CLIP_SECONDS,
  DHYH_AD_BREAK_DURATIONS_SECONDS,
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_VIDEO_SOURCE_OFFSET_SECONDS,
  DHYH_CONTENT_ID,
  DHYH_IMPULSE_AD_COMPANION_URL,
  DHYH_IMPULSE_AD_VIDEO_URL,
  DHYH_LBAR_AD_VIDEO_URL,
  DHYH_SYNC_AD_VIDEO_URL,
  PLACEHOLDER_VIDEO_URL,
  SYNC_IMPULSE_DURATION_SECONDS,
  SYNC_IMPULSE_SEGMENTS,
  taxonomyOptions,
  TOTAL_DURATION_SECONDS,
} from './constants'
import { getTaxonomySceneData } from './taxonomySceneData'
import { getDhyhScenesForTier, type DhyhSceneBundle } from './dhyhScenes'
import { buildOriginalJsonString, buildSummaryJsonString } from './jsonExport'
import { SCENE_METADATA } from './sceneMetadata'
import { getPlayerControlTokens } from './styles'
import type {
  AdPlaybackOption,
  ContentItem,
  CurrentView,
  DemoPanel,
  ProductEntry,
  SceneMetadata,
  TaxonomyOption,
  TierOption,
} from './types'

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

  // Sync-style ad breaks (colored scrubber + ad creative overlay) fire in three modes
  // for DHYH – "Sync: Impulse", "Sync: L-Bar", and "Sync". Each has its own creative,
  // duration, and ad-compliance JSON. For placeholder content only "Sync: Impulse"
  // still triggers the legacy two-break scrubber, so this flag preserves that behavior
  // when DHYH isn't the selected piece of content.
  const isExactProductMatch = selectedTier === 'Exact Product Match'
  const isSyncImpulseModeSelected = selectedAdPlayback === 'Sync: Impulse'
  const isSyncLbarModeSelected = selectedAdPlayback === 'Sync: L-Bar'
  const isSyncModeSelected = selectedAdPlayback === 'Sync'
  const isSyncAdBreakModeSelected =
    isSyncImpulseModeSelected || isSyncLbarModeSelected || isSyncModeSelected

  // Broadened sync-ad-break flag used pervasively below. Historically named
  // `isSyncImpulseMode`; kept to minimize churn in downstream files.
  //
  // DHYH: any of the three supported sync modes triggers the ad break regardless of
  // tier, so the demo surfaces the new creative + compliance JSON on any combination.
  // Placeholder content retains the original tier-gated Sync:Impulse-only behavior.
  const isSyncImpulseMode = isDhyhContent
    ? isSyncAdBreakModeSelected
    : isExactProductMatch && isSyncImpulseModeSelected

  const titlePanelSummary = `VOD: ${selectedTier.toUpperCase()} - ${selectedAdPlayback.toUpperCase()}`
  const shouldShowInContentCta =
    selectedAdPlayback === 'CTA Pause' || selectedAdPlayback === 'Organic Pause'

  // Per-mode DHYH ad-break duration (30s for Impulse/L-Bar, 45s for Sync).
  const dhyhAdBreakDurationSeconds = useMemo(() => {
    if (!isDhyhContent) return DHYH_AD_BREAK_DURATIONS_SECONDS['Sync: Impulse']
    if (isSyncModeSelected) return DHYH_AD_BREAK_DURATIONS_SECONDS.Sync
    if (isSyncLbarModeSelected) return DHYH_AD_BREAK_DURATIONS_SECONDS['Sync: L-Bar']
    return DHYH_AD_BREAK_DURATIONS_SECONDS['Sync: Impulse']
  }, [isDhyhContent, isSyncModeSelected, isSyncLbarModeSelected])

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
  // 30-45s ad block anchored at 3:32) back to a clip-relative content position
  // (0..420s). Inside the ad block the helper freezes at 3:32; after it, content
  // advances 1:1.
  const dhyhClipSeconds = useMemo(() => {
    if (!isDhyhContent) return videoCurrentSeconds
    if (!isSyncImpulseMode) return videoCurrentSeconds
    if (videoCurrentSeconds <= DHYH_AD_BREAK_CLIP_SECONDS) return videoCurrentSeconds
    if (videoCurrentSeconds <= DHYH_AD_BREAK_CLIP_SECONDS + dhyhAdBreakDurationSeconds) {
      return DHYH_AD_BREAK_CLIP_SECONDS
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

  // DHYH ad creative + compliance JSON are selected per playback mode. Placeholder
  // content still runs with no video ad.
  const activeAdVideoUrl = isDhyhContent
    ? isSyncModeSelected
      ? DHYH_SYNC_AD_VIDEO_URL
      : isSyncLbarModeSelected
        ? DHYH_LBAR_AD_VIDEO_URL
        : DHYH_IMPULSE_AD_VIDEO_URL
    : null

  const activeAdDecisionPayload: Record<string, unknown> =
    isDhyhContent && isSyncImpulseMode
      ? isSyncModeSelected
        ? (syncAdCompliancePayload as Record<string, unknown>)
        : isSyncLbarModeSelected
          ? (lbarAdCompliancePayload as Record<string, unknown>)
          : (impulseAdCompliancePayload as Record<string, unknown>)
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
    const foundIndex = playbackScenes.findIndex(
      (scene) => panelTimelineSeconds >= scene.start && panelTimelineSeconds < scene.end
    )
    if (foundIndex >= 0) return foundIndex
    return Math.max(0, playbackScenes.length - 1)
  }, [playbackScenes, panelTimelineSeconds])

  const activeScene = playbackScenes[activeSceneIndex] ?? playbackScenes[0]

  const productEntries = useMemo<ProductEntry[]>(
    () =>
      playbackScenes.flatMap((scene) =>
        scene.products.map((product) => ({
          ...product,
          sceneId: scene.id,
          sceneLabel: scene.sceneLabel,
          sceneStart: scene.start,
        }))
      ),
    [playbackScenes]
  )

  const productsUnavailableMessage =
    isDhyhContent && dhyhBundle && !dhyhBundle.hasProductData
      ? 'No product match data is associated with this Tier'
      : null

  // Which taxonomies have zero data across all scenes of the current content? Used to
  // render a "No … information currently" empty state for real-content (DHYH) tiers
  // that don't emit certain fields (e.g. music_emotion on Exact Product Match).
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
    for (const option of taxonomyOptions) {
      if (!isDhyhContent) {
        availability[option] = true
        continue
      }
      availability[option] = playbackScenes.some(
        (scene, index) => getTaxonomySceneData(scene, index, option) !== null
      )
    }
    return availability
  }, [isDhyhContent, playbackScenes])

  // Returns -1 when no product has been reached yet on the timeline (e.g. the DHYH color-bar
  // intro). When the current scene itself has no products, we keep the last past scene's
  // products visible so the panel doesn't jump back to the top of the list.
  const activeProductIndex = useMemo(() => {
    if (!activeScene || productEntries.length === 0) return -1
    const firstMatch = productEntries.findIndex((entry) => entry.sceneId === activeScene.id)
    if (firstMatch >= 0) return firstMatch
    for (let i = productEntries.length - 1; i >= 0; i--) {
      if (productEntries[i].sceneStart <= panelTimelineSeconds) return i
    }
    return -1
  }, [activeScene, productEntries, panelTimelineSeconds])

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
    // Exponential catch-up factor per frame. Tuned so scrubs/jumps ease in without
    // feeling laggy (roughly 95% of remaining distance closes in ~16 frames at 60fps).
    const SMOOTH_FACTOR = 0.16
    // Threshold below which we just write the final value to clean up sub-pixel residue.
    const SNAP_THRESHOLD_PX = 0.25

    const applyScroll = (el: HTMLDivElement, target: number) => {
      const delta = target - el.scrollTop
      if (Math.abs(delta) < SNAP_THRESHOLD_PX) {
        if (delta !== 0) el.scrollTop = target
        return
      }
      el.scrollTop += delta * SMOOTH_FACTOR
    }

    // Target position interpolated between the PREVIOUS anchor and the CURRENT anchor.
    // This works even when future scenes aren't rendered yet (the Taxonomy/JSON panels
    // only reveal scenes up to `activeSceneIndex`, so `refs[activeSceneIndex + 1]` is
    // always null). As the current scene plays we progressively reveal it by scrolling
    // from its predecessor's offset toward its own offset.
    const resolveTarget = (
      container: HTMLDivElement | null,
      prevNode: HTMLDivElement | null | undefined,
      currentNode: HTMLDivElement | null | undefined,
      progress: number
    ): number | null => {
      if (!container || !currentNode) return null
      const startOffset = prevNode ? prevNode.offsetTop : 0
      const endOffset = currentNode.offsetTop
      const clamped = Math.min(1, Math.max(0, progress))
      const interpolated = startOffset + (endOffset - startOffset) * clamped
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
      return Math.max(0, Math.min(maxScroll, interpolated - TOP_PADDING))
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
        if (videoEl && !Number.isNaN(videoEl.currentTime)) {
          const raw = videoEl.currentTime - DHYH_VIDEO_SOURCE_OFFSET_SECONDS
          if (raw > 0 && raw < DHYH_CLIP_DURATION_SECONDS) {
            liveTimeline = raw
          }
        }
      }

      const scene = ctx.scenes[ctx.activeSceneIndex]
      const sceneDuration = scene ? Math.max(0.001, scene.end - scene.start) : 1
      const sceneProgress = scene
        ? Math.min(1, Math.max(0, (liveTimeline - scene.start) / sceneDuration))
        : 0

      const prevSceneIdx = ctx.activeSceneIndex - 1

      if (ctx.visible.taxonomy && taxonomyScrollContainerRef.current) {
        const prevNode = prevSceneIdx >= 0 ? taxonomyRefs.current[prevSceneIdx] : null
        const currentNode = taxonomyRefs.current[ctx.activeSceneIndex]
        const target = resolveTarget(
          taxonomyScrollContainerRef.current,
          prevNode,
          currentNode,
          sceneProgress
        )
        if (target !== null) applyScroll(taxonomyScrollContainerRef.current, target)
      }

      if (ctx.visible.json && jsonScrollContainerRef.current) {
        if (ctx.inAdBreak) {
          // Ad-decisioning JSON is a single block that reveals linearly as the ad plays.
          const container = jsonScrollContainerRef.current
          const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
          applyScroll(container, maxScroll * ctx.adProgress)
        } else {
          const prevNode = prevSceneIdx >= 0 ? jsonRefs.current[prevSceneIdx] : null
          const currentNode = jsonRefs.current[ctx.activeSceneIndex]
          const target = resolveTarget(
            jsonScrollContainerRef.current,
            prevNode,
            currentNode,
            sceneProgress
          )
          if (target !== null) applyScroll(jsonScrollContainerRef.current, target)
        }
      }

      // Products are always all rendered, so we can interpolate from the PREVIOUS
      // product's card to the CURRENT one using the gap between their scene starts.
      // When the product hasn't changed for a while (e.g. one scene has multiple) we
      // fall back to scene progress so the panel still drifts smoothly.
      if (ctx.visible.product && productScrollContainerRef.current) {
        if (ctx.inAdBreak) {
          // Hold position during the ad break – product data is tied to content scenes.
        } else if (!ctx.hasReachedFirstProduct) {
          applyScroll(productScrollContainerRef.current, 0)
        } else {
          const currentProduct = ctx.products[ctx.activeProductIndex]
          const prevProductIdx = ctx.activeProductIndex - 1
          const prevProduct = prevProductIdx >= 0 ? ctx.products[prevProductIdx] : null
          const currentNode = productRefs.current[ctx.activeProductIndex]
          const prevNode = prevProductIdx >= 0 ? productRefs.current[prevProductIdx] : null

          let productProgress = sceneProgress
          if (prevProduct && currentProduct && currentProduct.sceneStart > prevProduct.sceneStart) {
            productProgress =
              (liveTimeline - prevProduct.sceneStart) /
              (currentProduct.sceneStart - prevProduct.sceneStart)
          }
          const target = resolveTarget(
            productScrollContainerRef.current,
            prevNode,
            currentNode,
            productProgress
          )
          if (target !== null) applyScroll(productScrollContainerRef.current, target)
        }
      }

      panelScrollRafRef.current = window.requestAnimationFrame(animate)
    }

    panelScrollRafRef.current = window.requestAnimationFrame(animate)
    return () => {
      if (panelScrollRafRef.current !== null) {
        window.cancelAnimationFrame(panelScrollRafRef.current)
        panelScrollRafRef.current = null
      }
    }
  }, [currentView])

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
  }, [currentView, isAdBreakPlayback, isVideoPlaying])

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
  }, [currentView, isAdBreakPlayback, videoCurrentSeconds])

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
    activeProductIndex,
    originalJsonDownloadString,
    summaryJsonDownloadString,
    mainVideoSrc,
    isDhyhContent,
    productsUnavailableMessage,
    hasReachedFirstProduct,
    taxonomyAvailability,
    displayedCurrentSeconds,
    displayedDurationSeconds,
    impulseSegments: isDhyhContent ? dhyhImpulseSegments : SYNC_IMPULSE_SEGMENTS,
  }
}
