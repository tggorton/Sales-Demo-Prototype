import PauseIcon from '@mui/icons-material/Pause'
import { Box, Typography } from '@mui/material'

type PauseToShopCtaProps = {
  visible: boolean
  // Click handler — wired upstream to `onToggleVideoPlaying` so the
  // CTA acts as a literal pause button: clicking it pauses the video,
  // which surfaces the carousel via the existing `isPauseOverlayActive`
  // → `<PauseOverlay>` flow.
  onPause: () => void
}

// "PAUSE TO SHOP" hint shown during playback for the two pause-triggered
// ad modes. Sits in the bottom-left of the player, above the control
// bar, so it doesn't compete with the play / mute / scrubber chrome.
//
// Visibility is owned upstream (mode + clip-time window + hasStarted-
// Playback gate), this component only renders the visual + handles the
// fade. We render the element unconditionally and toggle opacity rather
// than mounting/unmounting so the fade animates cleanly in both
// directions.
export function PauseToShopCta({ visible, onPause }: PauseToShopCtaProps) {
  return (
    <Box
      role="button"
      aria-hidden={!visible}
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
        // Anchored to the bottom-left of the player, sitting above
        // the control bar so the controls stay clickable.
        bottom: '14%',
        left: '4%',
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        // Pill shape with white pause icon + white caps text on the
        // KERV magenta brand ground (theme `primary.main`). Hover
        // bumps to `primary.dark` to match the rest of the demo's
        // magenta-on-white-and-grey aesthetic.
        backgroundColor: 'primary.main',
        color: '#FFFFFF',
        borderRadius: '999px',
        px: 'clamp(10px, 1.4vw, 22px)',
        py: 'clamp(6px, 0.6vw, 10px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        userSelect: 'none',
        // Visual fade. Pointer events follow opacity so the invisible
        // element doesn't intercept clicks on the underlying click-to-
        // play layer.
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 320ms ease, transform 320ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: visible ? 'pointer' : 'default',
        zIndex: 5,
        '&:hover': {
          backgroundColor: 'primary.dark',
        },
        '&:focus-visible': {
          outline: '2px solid #FFFFFF',
          outlineOffset: 2,
        },
      }}
    >
      <PauseIcon sx={{ fontSize: 'clamp(14px, 1.4vw, 22px)' }} />
      <Typography
        sx={{
          fontSize: 'clamp(11px, 1vw, 16px)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          lineHeight: 1,
        }}
      >
        Pause to Shop
      </Typography>
    </Box>
  )
}
