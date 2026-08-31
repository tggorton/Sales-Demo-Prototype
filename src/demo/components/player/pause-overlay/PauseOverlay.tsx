import { Box } from '@mui/material'
import { useEffect, useState } from 'react'
import { PauseProductCarousel } from './PauseProductCarousel'
import { PauseProductDetail } from './PauseProductDetail'
import type {
  PauseOverlayPayload,
  PauseProductDestinationTarget,
} from './pauseOverlay.types'

type PauseOverlayProps = {
  payload: PauseOverlayPayload
  // Forwarded down to the detail card. When the user clicks the
  // active product's detail surface, the demo opens its own
  // desktop-aspect `ProductDestinationDialog` with the product's full
  // context. Deliberately separate from the Sync ad-break
  // `CompanionDialog` (mobile-aspect) so the two playback experiences
  // stay fully isolated.
  onOpenProductDestination: (target: PauseProductDestinationTarget) => void
  // Resume the underlying playback. Wired to VideoPlayer's
  // `onToggleVideoPlaying` so clicking Exit on the detail card dismisses
  // the overlay AND unpauses the video (the natural "I'm done shopping"
  // semantic). Distinct from the Play button in the control bar only in
  // location — they have the same effect.
  onResumePlayback: () => void
}

// Top-level pause-overlay container. Routes between the carousel state
// (initial — picking among 5 tiles) and the detail state (one tile
// expanded into a full product card). State is local because the
// carousel ↔ detail transition is purely UI; nothing else in the app
// cares which tile the user is hovering on.
//
// Layout: position-absolute fill of the parent player container. The
// parent has its own positioning context inside VideoPlayer.
//
// Dismissal: the user has two equivalent ways to dismiss + resume —
// the Play button in the bottom control bar (always-visible since
// 2026-05-29) or the Exit button on the detail card. Both call
// `onResumePlayback` which flips `isPauseOverlayActive` to false and
// unmounts this component. There is no "back to carousel without
// resuming" path anymore; Exit always means "I'm done here."
export function PauseOverlay({
  payload,
  onOpenProductDestination,
  onResumePlayback,
}: PauseOverlayProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)

  // If the payload changes underneath us (e.g. content swap), reset the
  // detail state so we don't show a tile that no longer exists. Stays a
  // simple effect rather than a derived render so the carousel ↔ detail
  // toggle is a single source of truth.
  useEffect(() => {
    if (selectedTileId && !payload.detailsById[selectedTileId]) {
      setSelectedTileId(null)
    }
  }, [payload, selectedTileId])

  const detail = selectedTileId ? payload.detailsById[selectedTileId] ?? null : null

  return (
    <Box
      // Stop pointer events from leaking through to the click-to-play
      // capture layer in VideoPlayer underneath. The overlay handles
      // its own state changes; clicks on the dimmed video frame are
      // ignored so the user can't accidentally resume playback when
      // aiming for a tile.
      onClick={(event) => event.stopPropagation()}
      sx={{
        position: 'absolute',
        inset: 0,
        // Sit above the click-capture layer (z-index 4) but below the
        // bottom controls bar so the user can still hit Play to resume.
        zIndex: 5,
        pointerEvents: 'auto',
      }}
    >
      {detail ? (
        <PauseProductDetail
          detail={detail}
          sponsorLabel={payload.sponsorLabel}
          // Detail card prefers the campaign's detail-specific
          // sponsor logo; falls back to the carousel sponsor if the
          // campaign only supplies one.
          sponsorLogoSrc={payload.detailSponsorLogoSrc ?? payload.sponsorLogoSrc}
          cardBackgroundImageSrc={payload.detailBackgroundImageSrc}
          cardBackgroundColor={payload.cardBackgroundColor}
          onOpenProductDestination={onOpenProductDestination}
          // Exit on the detail card resumes playback (which unmounts the
          // whole overlay). We also clear `selectedTileId` defensively so
          // that if the overlay re-mounts in the same window (user pauses
          // again immediately) it starts at the carousel rather than the
          // last detail.
          onExit={() => {
            setSelectedTileId(null)
            onResumePlayback()
          }}
        />
      ) : (
        <PauseProductCarousel payload={payload} onSelectTile={setSelectedTileId} />
      )}
    </Box>
  )
}
