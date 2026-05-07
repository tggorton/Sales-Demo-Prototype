import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton } from '@mui/material'

type PauseAdOverlayProps = {
  visible: boolean
  imageSrc: string | null
  altText?: string
  /** Called when the user wants to leave the ad — clicking the close
   *  (X) button OR anywhere on the dim backdrop outside the ad image.
   *  The parent wires this to `onToggleVideoPlaying` so dismissal
   *  resumes playback in one click (the overlay then auto-hides
   *  because its `visible` gate includes `!isVideoPlaying`). */
  onResume: () => void
}

// Pause Ad overlay — surfaces every time the user pauses content while
// the `Pause Ad` mode is selected. Distinct from `<PauseOverlay>` (the
// CTA / Organic Pause carousel + detail surface) because the Pause Ad
// is a single static creative, not a scene-keyed shoppable.
//
// Layout (Figma node 3116:38941):
//   - Semi-transparent black wash fills the player frame, matching the
//     dim used by the carousel-style pause overlays so paused-state
//     visuals feel of-a-piece.
//   - Ad creative sits centred with a small inset on every edge so the
//     player chrome (play / time / scrubber) stays visible underneath.
//   - Close (X) button hovers in the top-right corner of the creative.
//
// Dismissal contract:
//   - Click anywhere on the dim backdrop (outside the ad image) → resume.
//   - Click the X button → resume.
//   - Click the ad image itself → no-op (stopPropagation prevents the
//     click from bubbling to the backdrop).
//   - Both paths invoke `onResume`, which the parent maps to
//     `onToggleVideoPlaying`. Once the video resumes, the upstream
//     gating flips `visible` to false and the overlay fades out.
//
// `visible` is owned upstream (paused + first-play + Pause Ad mode).
// We render unconditionally (when an image URL is supplied) and toggle
// opacity rather than mounting/unmounting so the fade animates cleanly
// in both directions. When no image URL is supplied (mode disabled,
// asset missing) the component renders nothing.
export function PauseAdOverlay({
  visible,
  imageSrc,
  altText = 'Pause Ad',
  onResume,
}: PauseAdOverlayProps) {
  if (!imageSrc) return null

  return (
    <Box
      role="button"
      aria-label="Dismiss pause ad and resume playback"
      aria-hidden={!visible}
      onClick={visible ? onResume : undefined}
      sx={{
        position: 'absolute',
        inset: 0,
        // Heavier wash than the carousel overlay (0.32) — the static
        // ad needs higher contrast against varied frame backgrounds
        // and the Figma reference uses ~50% black.
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 240ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        // Pointer cursor on the dim makes "click anywhere to resume"
        // discoverable. The ad image inside swaps to the default
        // cursor since clicking it is a no-op.
        cursor: visible ? 'pointer' : 'default',
        // Sits below the bottom-bar control chrome (z 4) so play /
        // mute / scrubber stay clickable through the dim.
        zIndex: 3,
      }}
    >
      {/* Ad-creative wrapper. Centred with small player-edge insets
          per the Figma; the image inside fits the wrapper's box and
          maintains its native aspect ratio via `object-fit: contain`.
          `stopPropagation` on this wrapper means clicks on the ad
          image (or its surrounding flex padding) don't bubble to the
          backdrop — only the dim area outside the ad triggers resume. */}
      <Box
        onClick={(event) => event.stopPropagation()}
        sx={{
          position: 'absolute',
          // Inner card insets mirror the Figma 3116:38941 reference:
          // the ad takes ~97% of the player width and ~80% of the
          // height, sitting just above the bottom controls.
          top: '4%',
          left: '1%',
          right: '1%',
          bottom: '14%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
        }}
      >
        <Box
          component="img"
          src={imageSrc}
          alt={altText}
          sx={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            // Subtle rounding + drop shadow so the creative reads as a
            // lifted card rather than a bleed-to-edge poster.
            borderRadius: 1,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            userSelect: 'none',
          }}
        />

        {/* Close (X) — explicit dismiss affordance for users who
            prefer a labelled control to clicking on the dim. Behaviour
            is identical to clicking the backdrop: both call
            `onResume`. Positioned at the top-right of the creative
            wrapper rather than the player so it tracks the ad's
            position when the player resizes. */}
        <IconButton
          aria-label="Dismiss pause ad and resume playback"
          onClick={(event) => {
            event.stopPropagation()
            onResume()
          }}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 32,
            height: 32,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.75)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}
