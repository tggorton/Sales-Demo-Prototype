import { Box } from '@mui/material'
import { useEffect, useState } from 'react'
import { PauseProductCarousel } from './PauseProductCarousel'
import { PauseProductDetail } from './PauseProductDetail'
import type { PauseOverlayPayload } from './pauseOverlay.types'

type PauseOverlayProps = {
  payload: PauseOverlayPayload
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
// Dismissal: there is no "close the overlay" button here. The overlay
// is unmounted when `isPauseOverlayActive` flips to false in
// `useDemoPlayback` — which happens the moment the user clicks Play
// in the bottom control bar. Detail-mode buttons (Exit, Browse) only
// navigate within the overlay (back to the carousel).
export function PauseOverlay({ payload }: PauseOverlayProps) {
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
          sponsorLogoSrc={payload.sponsorLogoSrc}
          onBackToCarousel={() => setSelectedTileId(null)}
        />
      ) : (
        <PauseProductCarousel payload={payload} onSelectTile={setSelectedTileId} />
      )}
    </Box>
  )
}
