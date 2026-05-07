import { Box } from '@mui/material'

type PauseToShopCtaProps = {
  visible: boolean
  // Image URL extracted from the upstream `cta_url`'s `img=` query
  // parameter. The whole CTA component renders nothing when this is
  // null — there is intentionally no built-in styled fallback so the
  // visual stays driven by the partner JSON.
  imageSrc: string | null
  // Click handler — wired upstream to `onToggleVideoPlaying` so the
  // CTA acts as a literal pause button: clicking it pauses the video,
  // which surfaces the carousel via the existing `isPauseOverlayActive`
  // → `<PauseOverlay>` flow.
  onPause: () => void
}

// "PAUSE TO SHOP" hint shown during playback for the two pause-triggered
// ad modes. Sits in the bottom-right of the player, above the control
// bar, so it doesn't compete with the play / mute / scrubber chrome.
//
// Visibility is owned upstream (mode + clip-time window + hasStarted-
// Playback gate); this component only renders the visual + handles the
// fade. We render the element unconditionally (when an image URL is
// supplied) and toggle opacity rather than mounting/unmounting so the
// fade animates cleanly in both directions.
//
// When no image URL is supplied (placeholder content, organic-pause-
// without-data, etc.) the component renders nothing — the partner JSON
// is the source of truth for the visual.
export function PauseToShopCta({ visible, imageSrc, onPause }: PauseToShopCtaProps) {
  if (!imageSrc) return null

  return (
    <Box
      role="button"
      aria-hidden={!visible}
      aria-label="Pause to shop"
      tabIndex={visible ? 0 : -1}
      onClick={visible ? onPause : undefined}
      onKeyDown={
        visible
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPause()
              }
            }
          : undefined
      }
      sx={{
        position: 'absolute',
        // Anchored to the bottom-right of the player, matching Figma
        // node 3083:42122 (1920×1080 reference). Coordinates derive
        // from the Figma frame:
        //   right  = (1920 − 1460 − 363) / 1920 ≈ 5.05%
        //   bottom = (1080 − 898 − 100) / 1080 ≈ 7.59%
        // Both percentages keep the CTA proportionally placed across
        // any player size.
        bottom: '7.59%',
        right: '5.05%',
        // Sized via a viewport clamp so the CTA scales with the
        // player without making the image artwork too tall on big
        // displays. Image's intrinsic aspect ratio is preserved by
        // `height: auto`.
        width: 'clamp(140px, 14vw, 260px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 320ms ease, transform 320ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: visible ? 'pointer' : 'default',
        zIndex: 5,
        userSelect: 'none',
        filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.25))',
        '&:focus-visible': {
          outline: '2px solid #FFFFFF',
          outlineOffset: 4,
        },
      }}
    >
      <Box
        component="img"
        src={imageSrc}
        alt=""
        sx={{
          display: 'block',
          width: '100%',
          height: 'auto',
        }}
      />
    </Box>
  )
}
