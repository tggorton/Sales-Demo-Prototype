import { Box } from '@mui/material'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { AD_MODE_REGISTRY, ENABLED_AD_MODE_IDS } from '../../ad-modes'
import { PlayerControls } from './PlayerControls'
import { PauseOverlay, PauseToShopCta } from './pause-overlay'
import type { PauseOverlayPayload } from './pause-overlay'
import { PauseAdOverlay } from './PauseAdOverlay'
import type { PlayerControlTokens, SyncImpulseSegment } from '../../types'

type VideoPlayerProps = {
  // Layout
  visiblePanelCount: number

  // Video element refs (parent-owned; the playback hook drives them
  // imperatively via these handles)
  contentVideoRef: MutableRefObject<HTMLVideoElement | null>
  adVideoRef: MutableRefObject<HTMLVideoElement | null>

  // Sources / state
  mainVideoSrc: string
  activeAdVideoUrl: string | null
  activeAdBreakImage: string
  activeAdQrImage: string
  isVideoPlaying: boolean
  isVideoMuted: boolean
  isAdBreakPlayback: boolean
  isSyncImpulseMode: boolean
  /** True when the player is paused AND the active ad mode is `CTA Pause`
   *  or `Organic Pause`. Drives the pause-overlay carousel/detail surface. */
  isPauseOverlayActive: boolean
  /** True when the "PAUSE TO SHOP" hint should be shown during playback
   *  (per-mode time windows + first-play gate; see `useDemoPlayback`). */
  isPauseToShopCtaVisible: boolean
  /** Live payload that fills the carousel + detail when the overlay is
   *  mounted. Resolved upstream against the active scene's products
   *  (CTA Pause) or the static placeholder (Organic Pause for now). */
  activePauseOverlayPayload: PauseOverlayPayload
  /** Pause Ad mode: surfaces a centred ad creative every time the user
   *  pauses (under `Pause Ad`). Distinct from the carousel/detail
   *  pause overlay above — single static creative, no scene-keying.
   *  Dismissal happens by clicking the dim backdrop or the X button;
   *  both paths call `onToggleVideoPlaying` to resume playback. */
  isPauseAdActive: boolean
  pauseAdImageSrc: string | null

  // Times
  videoCurrentSeconds: number
  playbackDurationSeconds: number
  displayedCurrentSeconds: number
  displayedDurationSeconds: number

  // Sizing tokens
  impulseSegments: readonly SyncImpulseSegment[]
  ctaPauseSegments: readonly { start: number; end: number }[]
  playerControlTokens: PlayerControlTokens

  // Callbacks
  onToggleVideoPlaying: () => void
  onToggleVideoMuted: () => void
  onVideoTimeChange: (value: number) => void
  onVideoMetadataLoaded: (durationSeconds: number) => void
  onOpenCompanionModal: () => void
  /** Pause-overlay-only — opens the desktop-aspect product
   *  destination dialog pointed at the active product's QR URL.
   *  Distinct from `onOpenCompanionModal` (which is the Sync
   *  mobile-companion modal) so the two playback experiences stay
   *  fully isolated. */
  onOpenProductDestination: (url: string) => void
}

/**
 * The full demo-player surface: ad creative grid (all enabled DHYH ad
 * creatives mounted concurrently and switched via opacity — keeps decoders
 * warm so mid-break mode switches are instant), main content video,
 * Sync: Impulse visual treatments (radial gradients, QR code, full-area
 * companion click target), the pause-mode pair (in-playback "Pause to
 * Shop" CTA + paused-state carousel/detail overlay for `CTA Pause` /
 * `Organic Pause` modes), and the bottom control bar.
 *
 * The ad-creative parallel-playback logic lives entirely inside this
 * component:
 *   - `adVideoElementsRef` (Map<url, HTMLVideoElement>) tracks every mounted
 *     ad video by its src URL.
 *   - Effect 1 forwards whichever element is currently active to the parent's
 *     adVideoRef so the playback hook's seek effect targets the right one.
 *   - Effect 2 drives play/pause for ALL preloaded ad creatives in parallel
 *     during the break (decoders warm); pauses + resets on break end.
 *
 * See HANDOFF §6 for ad-break splice context. The protected behavior here is
 * that switching ad mode mid-break must remain a pure opacity flip — never
 * remount the visible <video> element or pause the inactive elements during
 * the break.
 */
export function VideoPlayer({
  visiblePanelCount,
  contentVideoRef,
  adVideoRef,
  mainVideoSrc,
  activeAdVideoUrl,
  activeAdBreakImage,
  activeAdQrImage,
  isVideoPlaying,
  isVideoMuted,
  isAdBreakPlayback,
  isSyncImpulseMode,
  isPauseOverlayActive,
  isPauseToShopCtaVisible,
  activePauseOverlayPayload,
  isPauseAdActive,
  pauseAdImageSrc,
  videoCurrentSeconds,
  playbackDurationSeconds,
  displayedCurrentSeconds,
  displayedDurationSeconds,
  impulseSegments,
  ctaPauseSegments,
  playerControlTokens,
  onToggleVideoPlaying,
  onToggleVideoMuted,
  onVideoTimeChange,
  onVideoMetadataLoaded,
  onOpenCompanionModal,
  onOpenProductDestination,
}: VideoPlayerProps) {
  // Map of mounted ad-video elements keyed by src URL. All enabled DHYH ad
  // creatives mount concurrently below and play in parallel while the ad
  // break is active — only the active one is visible (opacity 1) and unmuted.
  // Mounting them all keeps every decoder warm; switching ad mode mid-break
  // is then a pure opacity + mute flip with no play() startup cost.
  const adVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map())

  // Hover state for the YouTube/Netflix-style auto-hide control bar. The
  // bar fades out when the user's mouse leaves the player AND playback
  // is in progress; it stays visible while paused so first-load users
  // always see the play button. Any explicit interaction with the bar
  // (clicking play/pause, dragging the scrubber) keeps the mouse inside
  // the player so the hover state stays true throughout — no separate
  // "interaction lock" needed.
  const [isHovered, setIsHovered] = useState(false)
  const controlsVisible = isHovered || !isVideoPlaying

  // Effect 1: forward whichever element is currently active to the parent's
  // adVideoRef so the playback hook's seek effect targets the right one.
  useEffect(() => {
    if (activeAdVideoUrl) {
      const el = adVideoElementsRef.current.get(activeAdVideoUrl) ?? null
      adVideoRef.current = el
    } else {
      adVideoRef.current = null
    }
    // adVideoRef is a stable mutable ref; not a reactive dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAdVideoUrl])

  // Effect 2: drive parallel play/pause for every preloaded ad creative.
  useEffect(() => {
    const elements = adVideoElementsRef.current
    if (!isAdBreakPlayback) {
      for (const el of elements.values()) {
        if (!el.paused) el.pause()
        try {
          el.currentTime = 0
        } catch {
          /* ignore seek errors on unloaded element */
        }
      }
      return
    }
    if (isVideoPlaying) {
      for (const el of elements.values()) {
        if (el.ended) {
          try {
            el.currentTime = 0
          } catch {
            /* ignore */
          }
        }
        if (el.paused) {
          const p = el.play()
          if (p && typeof p.catch === 'function') p.catch(() => {})
        }
      }
    } else {
      for (const el of elements.values()) {
        if (!el.paused) el.pause()
      }
    }
  }, [isAdBreakPlayback, isVideoPlaying, activeAdVideoUrl])

  return (
    <Box
      sx={{
        minWidth: 0,
        display: 'flex',
        justifyContent: visiblePanelCount === 0 ? 'center' : 'flex-start',
        alignSelf: 'start',
      }}
    >
      <Box
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          width: visiblePanelCount <= 1 ? 'min(100%, 976px)' : '100%',
          maxWidth: '100%',
          height: 'auto',
          aspectRatio: '16 / 9',
          alignSelf: 'start',
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#00152A',
          boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
        }}
      >
        {/* Ad break overlay layer — opacity 1 during break, 0 otherwise. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#1a1a1a',
            backgroundImage:
              activeAdVideoUrl || !activeAdBreakImage ? 'none' : `url(${activeAdBreakImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isAdBreakPlayback ? 1 : 0,
            transition: 'opacity 320ms ease-in-out',
          }}
        >
          {/* Render every enabled DHYH ad creative concurrently in the same
              absolute frame; switch which one is visible via opacity, not src.
              Inactive videos remain mounted, buffered, and playing (muted) so
              switching ad mode mid-break is a pure opacity flip. */}
          {ENABLED_AD_MODE_IDS.map((modeId) => {
            const modeUrl = AD_MODE_REGISTRY[modeId].dhyhAdVideoUrl
            if (!modeUrl) return null
            const isActive = modeUrl === activeAdVideoUrl
            return (
              <Box
                key={modeId}
                component="video"
                ref={(el: HTMLVideoElement | null) => {
                  const elements = adVideoElementsRef.current
                  if (el) {
                    elements.set(modeUrl, el)
                  } else {
                    elements.delete(modeUrl)
                  }
                }}
                src={modeUrl}
                muted={isActive ? isVideoMuted : true}
                playsInline
                preload="auto"
                aria-hidden={!isActive}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  backgroundColor: '#000',
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              />
            )
          })}
        </Box>

        {/* Main content video — opacity 0 during ad break, 1 otherwise. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: isAdBreakPlayback ? 0 : 1,
            transition: 'opacity 320ms ease-in-out',
          }}
        >
          <Box
            component="video"
            ref={contentVideoRef}
            src={mainVideoSrc}
            key={mainVideoSrc}
            muted={isVideoMuted}
            playsInline
            // `auto` (vs the default `metadata`) tells the browser to
            // download bytes ahead of play, not just the moov atom.
            // Reduces the cold-start scrub-and-play latency the user
            // flagged on Vercel — with `metadata` the player has zero
            // buffered video at the moment of first play, so seeks
            // require a full re-buffer; with `auto` the buffer is
            // already growing by the time the user clicks play.
            preload="auto"
            onLoadedMetadata={(event) => {
              const duration = event.currentTarget.duration
              if (!Number.isNaN(duration)) {
                onVideoMetadataLoaded(duration)
              }
            }}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: '#1a1a1a',
              '@keyframes contentFadeIn': {
                from: { opacity: 0 },
                to: { opacity: 1 },
              },
              animation: 'contentFadeIn 1100ms ease-out',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: isSyncImpulseMode ? 'rgba(255,0,40,0.14)' : 'rgba(0,0,0,0.3)',
              pointerEvents: 'none',
            }}
          />
        </Box>

        {/* Sync: Impulse radial-gradient overlays — only outside the ad break. */}
        {isSyncImpulseMode && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 18% 35%, rgba(0,255,255,0.12), transparent 36%), radial-gradient(circle at 80% 20%, rgba(255,40,90,0.16), transparent 34%), radial-gradient(circle at 65% 78%, rgba(255,80,120,0.14), transparent 40%)',
              mixBlendMode: 'screen',
              opacity: isAdBreakPlayback ? 0 : 1,
              transition: 'opacity 320ms ease-in-out',
            }}
          />
        )}

        {/* QR code, only when the ad break uses a static image (legacy
            placeholder content path — DHYH plays a video instead). */}
        {isSyncImpulseMode && isAdBreakPlayback && !activeAdVideoUrl && (
          <Box
            sx={{
              position: 'absolute',
              left: '83.9%',
              transform: 'translateX(-50%)',
              bottom: '8.9%',
              width: '19.1%',
              aspectRatio: '1 / 1',
              zIndex: 3,
              borderRadius: 0.5,
              overflow: 'hidden',
              backgroundColor: '#fff',
              p: '0.1%',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            <Box
              component="img"
              src={activeAdQrImage}
              alt="Ad QR code"
              sx={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#fff' }}
            />
          </Box>
        )}

        {/* Whole-ad click target. Covers the full player area except the
            control bar along the bottom, so clicking anywhere on the ad opens
            the companion experience without per-creative QR placement
            tracking. */}
        {isSyncImpulseMode && isAdBreakPlayback && (
          <Box
            role="button"
            aria-label="Open companion experience"
            onClick={onOpenCompanionModal}
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: `${playerControlTokens.controlBarHeight}px`,
              cursor: 'pointer',
              zIndex: 4,
              backgroundColor: 'transparent',
            }}
          />
        )}

        {/* "PAUSE TO SHOP" hint — visible only during playback, only
            during the pause-mode-specific time windows, only after the
            user has started playback at least once. Always mounted so
            the fade animates cleanly in both directions; visibility
            governs opacity + pointer-events. Clicking pauses the
            video, which surfaces the carousel via the overlay below. */}
        <PauseToShopCta
          visible={isPauseToShopCtaVisible}
          imageSrc={activePauseOverlayPayload.pauseToShopCtaImageSrc}
          onPause={onToggleVideoPlaying}
        />

        {/* Pause overlay — pause-triggered product carousel + detail, only
            mounted while the user is paused in `CTA Pause` / `Organic Pause`
            modes (Tier 3) AND has started playback at least once (so the
            initial pre-roll frame stays clean). Sits above the click-to-
            play layer (z-index 5) but inside the bottom-control padding
            so the user can still hit Play to dismiss. */}
        {isPauseOverlayActive && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: `${playerControlTokens.controlBarHeight}px`,
            }}
          >
            <PauseOverlay
              payload={activePauseOverlayPayload}
              onOpenProductDestination={onOpenProductDestination}
            />
          </Box>
        )}

        {/* Pause Ad overlay — distinct from the carousel-style pause
            overlay above. Surfaces every time the user pauses while
            `Pause Ad` is the active mode. Single static creative + a
            close (X) that dismisses for the current pause session
            only; resuming play resets the dismiss flag upstream so
            the next pause re-shows. Sits inside the same control-bar
            inset so play / scrubber stay clickable. */}
        {pauseAdImageSrc && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: `${playerControlTokens.controlBarHeight}px`,
            }}
          >
            <PauseAdOverlay
              visible={isPauseAdActive}
              imageSrc={pauseAdImageSrc}
              onResume={onToggleVideoPlaying}
            />
          </Box>
        )}

        {/* Bottom control bar — extracted into its own component for clarity. */}
        <PlayerControls
          isVideoPlaying={isVideoPlaying}
          isVideoMuted={isVideoMuted}
          isSyncImpulseMode={isSyncImpulseMode}
          videoCurrentSeconds={videoCurrentSeconds}
          playbackDurationSeconds={playbackDurationSeconds}
          displayedCurrentSeconds={displayedCurrentSeconds}
          displayedDurationSeconds={displayedDurationSeconds}
          impulseSegments={impulseSegments}
          ctaPauseSegments={ctaPauseSegments}
          playerControlTokens={playerControlTokens}
          controlsVisible={controlsVisible}
          onToggleVideoPlaying={onToggleVideoPlaying}
          onToggleVideoMuted={onToggleVideoMuted}
          onVideoTimeChange={onVideoTimeChange}
        />
      </Box>
    </Box>
  )
}
