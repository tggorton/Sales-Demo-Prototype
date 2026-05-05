import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ViewCarouselOutlinedIcon from '@mui/icons-material/ViewCarouselOutlined'
import { Box, Button, Stack, Typography } from '@mui/material'
import type { PauseProductDetail as PauseProductDetailData } from './pauseOverlay.types'

type PauseProductDetailProps = {
  detail: PauseProductDetailData
  sponsorLabel: string
  sponsorLogoSrc: string | null
  // Browse = back to the carousel (still paused). Exit = close the
  // overlay entirely and resume playback. The split lets the sales rep
  // narrate "show another product" vs "close the shop and keep watching"
  // without leaving the demo.
  onBackToCarousel: () => void
  onExitOverlay: () => void
}

// Two-layer surface: a semi-transparent black backdrop fills the player area
// (matching the dim used when expanded panels are open) and an *opaque* inner
// card hovers on top with the product copy. The card sizes proportionally to
// the Figma reference (1540×900 inner inside a 1920×1080 outer — ~80%×83%
// with ~10% horizontal / 5% top inset). Browse + Exit buttons sit on the
// black backdrop below the card so they never crowd the product copy.
//
// Figma source: node 3083:42282 (entire element) / 3083:42283 (inner card).
// Note: Figma's inner card uses a 50%-white wash; per design direction we
// keep it fully opaque so the product details read clearly against any
// frame of the paused video.
export function PauseProductDetail({
  detail,
  sponsorLabel,
  sponsorLogoSrc,
  onBackToCarousel,
  onExitOverlay,
}: PauseProductDetailProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        // Semi-transparent black backdrop. Matches the wash used when
        // expanded panels open over the rest of the demo, so paused
        // overlays feel of-a-piece with the existing modal language.
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
    >
      {/* Inner card. Inset proportions mirror Figma's 1540×900 within the
          1920×1080 frame. Background is opaque white so product copy reads
          regardless of the underlying paused frame. White stroke + drop
          shadow are kept to preserve the lifted-card look. */}
      <Box
        sx={{
          position: 'absolute',
          top: '5%',
          left: '10%',
          right: '10%',
          bottom: '15%',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '3px solid rgba(255,255,255,0.95)',
          boxShadow: '0 2px 25px rgba(255,255,255,0.45)',
          overflow: 'hidden',
          color: '#1d1d1d',
        }}
      >
        <Stack
          sx={{
            height: '100%',
            // Padding mirrors the Figma's 54px inset (~3.5% of inner card
            // width) so we don't cram against the rounded corners.
            px: '3.5%',
            py: '4%',
            gap: 2,
          }}
        >
          {/* Sponsor row at the top. Figma places the logo block ~31% in
              from the left of the card (not centered) — we match that so
              the QR area stays visually balanced on the right edge. */}
          <Box sx={{ pl: '20%' }}>
            <Box
              sx={{
                width: '40%',
                aspectRatio: '638 / 120',
                maxWidth: 320,
                borderRadius: 0.75,
                backgroundColor: sponsorLogoSrc ? 'transparent' : '#c4c4c4',
                backgroundImage: sponsorLogoSrc ? `url(${sponsorLogoSrc})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!sponsorLogoSrc && (
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.85)',
                    letterSpacing: 0.4,
                  }}
                >
                  {sponsorLabel} · LOGO
                </Typography>
              )}
            </Box>
          </Box>

          {/* Image | Copy | QR row. Aligns by flex with proportions taken
              from the Figma absolute layout. */}
          <Stack
            direction="row"
            spacing={3}
            sx={{
              flex: '1 1 auto',
              minHeight: 0,
              alignItems: 'stretch',
            }}
          >
            {/* Image area — ~24% of inner-card width, square aspect. */}
            <Box
              sx={{
                flex: '0 0 24%',
                aspectRatio: '1 / 1',
                borderRadius: 1,
                backgroundColor: '#c4c4c4',
                backgroundImage: detail.imageSrc ? `url(${detail.imageSrc})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!detail.imageSrc && (
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.92)',
                    letterSpacing: 0.4,
                  }}
                >
                  IMAGE AREA
                </Typography>
              )}
            </Box>

            {/* Copy column. Title → description → price. min-width:0 lets
                the description wrap inside the flex parent. */}
            <Stack
              spacing={1.5}
              sx={{
                flex: '1 1 auto',
                minWidth: 0,
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: 'clamp(18px, 2.2vw, 26px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: '#1d1d1d',
                }}
              >
                {detail.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: 'clamp(12px, 1.1vw, 15px)',
                  lineHeight: 1.45,
                  color: 'rgba(0,0,0,0.78)',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {detail.description}
              </Typography>
              <Typography
                sx={{
                  fontSize: 'clamp(16px, 1.6vw, 22px)',
                  fontWeight: 700,
                  color: '#1d1d1d',
                }}
              >
                {detail.price}
              </Typography>
            </Stack>

            {/* QR column — large QR square + caption underneath. Hides on
                very narrow players so the copy column doesn't squeeze. */}
            <Stack
              spacing={1}
              sx={{
                flex: '0 0 20%',
                alignItems: 'center',
                justifyContent: 'center',
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 1,
                  backgroundColor: '#c4c4c4',
                  backgroundImage: detail.qrLargeSrc ? `url(${detail.qrLargeSrc})` : 'none',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!detail.qrLargeSrc && (
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.92)',
                      letterSpacing: 0.5,
                    }}
                  >
                    QR
                  </Typography>
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(0,0,0,0.72)',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  lineHeight: 1.25,
                  maxWidth: 140,
                }}
              >
                Scan QR Code with your camera and shop now
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {/* Bottom controls sit on the black backdrop, outside the card.
          Figma places them at ~4% from left edge, ~5% from bottom — left-
          aligned so they don't compete with the centered card. */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          position: 'absolute',
          bottom: '4%',
          left: '4%',
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={onExitOverlay}
          sx={{
            color: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.7)',
            '&:hover': {
              borderColor: '#FFFFFF',
              backgroundColor: 'rgba(255,255,255,0.08)',
            },
            textTransform: 'uppercase',
            fontSize: 12,
            letterSpacing: 0.5,
            fontWeight: 600,
            px: 2,
          }}
        >
          Exit
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ViewCarouselOutlinedIcon sx={{ fontSize: 18 }} />}
          onClick={onBackToCarousel}
          sx={{
            color: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.7)',
            '&:hover': {
              borderColor: '#FFFFFF',
              backgroundColor: 'rgba(255,255,255,0.08)',
            },
            textTransform: 'uppercase',
            fontSize: 12,
            letterSpacing: 0.5,
            fontWeight: 600,
            px: 2,
          }}
        >
          Browse
        </Button>
      </Stack>
    </Box>
  )
}
