import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Button, Stack, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import type { PauseProductDetail as PauseProductDetailData } from './pauseOverlay.types'

type PauseProductDetailProps = {
  detail: PauseProductDetailData
  sponsorLabel: string
  sponsorLogoSrc: string | null
  // Optional campaign-supplied background painted behind the inner
  // card. When null the card stays opaque white per Figma; when set
  // the inner-card body tints toward the image and any text on top
  // tints lighter for legibility.
  cardBackgroundImageSrc: string | null
  // Click anywhere on the inner card → opens
  // `ProductDestinationDialog` (desktop-aspect, separate from the
  // Sync mobile-companion modal) pointed at the active product's QR
  // destination URL.
  onOpenProductDestination: (url: string) => void
  // Exit button returns to the carousel (still paused). The user
  // dismisses the overlay entirely by clicking the Play control in
  // the bottom bar — keeping the in-card button scoped to
  // navigation avoids a "did Exit just resume playback?" foot-gun.
  onBackToCarousel: () => void
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
  cardBackgroundImageSrc,
  onOpenProductDestination,
  onBackToCarousel,
}: PauseProductDetailProps) {
  const hasQrDestination = Boolean(detail.qrDestinationUrl)
  const handleCardClick = () => {
    if (detail.qrDestinationUrl) onOpenProductDestination(detail.qrDestinationUrl)
  }
  // When the campaign supplies a card background image we treat it as
  // a dark/branded image and flip product copy to white. When there's
  // no image, the card stays opaque white per Figma and copy is dark.
  // This bool gates every text-colour decision in the card body.
  const hasCardBgImage = Boolean(cardBackgroundImageSrc)
  const titleColor = hasCardBgImage ? '#FFFFFF' : '#1d1d1d'
  const bodyColor = hasCardBgImage ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.78)'

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
          1920×1080 frame. Without a bg image the body is opaque white;
          with one, the body shows the campaign image edge-to-edge with
          a dark fallback colour while the asset loads. White stroke +
          drop shadow are kept to preserve the lifted-card look. */}
      <Box
        role={hasQrDestination ? 'button' : undefined}
        tabIndex={hasQrDestination ? 0 : -1}
        aria-label={hasQrDestination ? `Shop ${detail.title}` : undefined}
        onClick={hasQrDestination ? handleCardClick : undefined}
        onKeyDown={
          hasQrDestination
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleCardClick()
                }
              }
            : undefined
        }
        sx={{
          position: 'absolute',
          // Inner card insets match the Figma 1540×900 inside the
          // 1920×1080 outer frame: top 54/1080 ≈ 5%, left/right 190
          // /1920 ≈ 10%, bottom 126/1080 ≈ 12% (bottom margin holds
          // the Exit button on the dim backdrop below).
          top: '5%',
          left: '10%',
          right: '10%',
          bottom: '12%',
          backgroundColor: hasCardBgImage ? '#1d1d1d' : '#FFFFFF',
          backgroundImage: hasCardBgImage
            ? `url(${cardBackgroundImageSrc})`
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '10px',
          border: '3px solid rgba(255,255,255,0.95)',
          boxShadow: '0 2px 25px rgba(255,255,255,0.45)',
          overflow: 'hidden',
          color: titleColor,
          // Whole card is the click target — opens the CompanionDialog
          // pointed at the active product's QR destination URL. The
          // pointer cursor advertises the affordance.
          cursor: hasQrDestination ? 'pointer' : 'default',
          outline: 'none',
          // `containerType: 'inline-size'` makes the inner card a
          // CSS container so child elements can size themselves with
          // `cqw` units (1cqw = 1% of the card's inline size). Lets
          // typography scale with the card's actual width rather
          // than the viewport — important when the player narrows
          // because side panels are open.
          containerType: 'inline-size',
        }}
      >
        {/* Layout uses absolute positioning per the Figma absolute
            coordinates (node 3083:42282). Each child is placed in
            percentages of the card so the rhythm matches Figma at
            any player size. Numbers in comments are the source-Figma
            pixel values inside the 1540×900 card. */}

        {/* Logo Area — Figma (293, 26) within 1540×900 → 19% left,
            2.9% top, 41.4%×13.3% size. Renders the campaign sponsor
            logo image when supplied; otherwise a "Sponsor Logo"
            placeholder block. */}
        <Box
          sx={{
            position: 'absolute',
            left: '19%',
            top: '2.9%',
            width: '41.4%',
            aspectRatio: '638 / 120',
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
                fontSize: 'clamp(11px, 1.4vw, 22px)',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: 0.4,
              }}
            >
              {sponsorLabel} · LOGO
            </Typography>
          )}
        </Box>

        {/* Image Area — Figma (54, 297) → 3.5% left, 33% top,
            23.6%×40.4% size, square aspect. Product hero image on
            the left side of the card. */}
        <Box
          sx={{
            position: 'absolute',
            left: '3.5%',
            top: '33%',
            width: '23.6%',
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
                fontSize: 'clamp(11px, 1.2vw, 16px)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.92)',
                letterSpacing: 0.4,
              }}
            >
              IMAGE AREA
            </Typography>
          )}
        </Box>

        {/* Text Area — Figma (470, 297) → 30.5% left, 33% top, 48%
            wide (Figma 740 / 1540 card). Height is fluid: Figma's
            374-px frame is just a guideline and a fixed height was
            causing visible bottom-clipping of the title strokes when
            full-Figma fonts overflowed it. The width is the firm
            constraint — 48% never expands past Figma's 740 px (with
            an extra `maxWidth` cap so it doesn't stretch beyond at
            very large player sizes either). The text frame ends at
            78.5% of the card, leaving a small horizontal gap before
            the Small QR which starts at 80.1%.
            Font sizes follow Figma's 1080p reference (title 46 px,
            description 26 px / 32 px line-height, price 46 px) via
            `clamp` against viewport width. */}
        <Stack
          sx={{
            position: 'absolute',
            left: '30.5%',
            top: '33%',
            width: '48%',
            maxWidth: 740,
            justifyContent: 'flex-start',
            // Figma stack gap is 36 px at 1540-px card. `cqw` resolves
            // against the card's inline size, so 36/1540 ≈ 2.34cqw
            // gives 36 px at the Figma reference and shrinks
            // proportionally when the card narrows.
            gap: 'clamp(8px, 2.34cqw, 36px)',
          }}
        >
          <Typography
            sx={{
              // Title 46 px @ 1540 card → 46/1540 ≈ 2.99cqw. Clamp
              // floor 16 px keeps it legible at very small cards.
              fontSize: 'clamp(16px, 2.99cqw, 46px)',
              fontWeight: 700,
              // 1.0 line-height per the Figma `line-height: normal`
              // spec keeps the visual gap between title and the next
              // element close to the Stack's 36-px gap. Open Sans
              // ascenders/descenders at lineHeight 1.0 fit comfortably
              // for short product names; if super-long titles wrap we
              // accept slight crowding rather than over-spacing the
              // whole frame.
              lineHeight: 1.05,
              color: titleColor,
              // Up to 3 lines for the longest titles (Figma's example
              // is two lines of "Yellowstone Dutton Ranch Logo Hat
              // Yellowstone Dutton Ranch Logo Hat"). Keeps short names
              // ("Product-1") on one line.
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {detail.title}
          </Typography>
          <Typography
            sx={{
              // Description 26 px @ 1540 card → 26/1540 ≈ 1.69cqw,
              // line-height 32 / 26 = 1.23 per the Figma spec.
              fontSize: 'clamp(11px, 1.69cqw, 26px)',
              lineHeight: 1.23,
              color: bodyColor,
              // 5 lines max — Figma's paragraph frame is 178 px / 32
              // line-height ≈ 5.5 lines, so 5 keeps it from spilling
              // into the QR / scan-message area when the description
              // is long.
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {detail.description}
          </Typography>
          <Typography
            sx={{
              fontSize: 'clamp(16px, 2.99cqw, 46px)',
              fontWeight: 700,
              lineHeight: 1.05,
              color: titleColor,
            }}
          >
            {detail.price}
          </Typography>
        </Stack>

        {/* Small QR Code Area — Figma (1424, 632) → within the inner
            card at (1234, 578), 250×250. As percentages: 80.1% left,
            64.2% top, 16.2% wide, square aspect. The QR fills the
            entire white square (no inner padding); `marginSize` on
            the SVG provides the required scannable quiet zone. */}
        <Box
          sx={{
            position: 'absolute',
            left: '80.1%',
            top: '64.2%',
            width: '16.2%',
            aspectRatio: '1 / 1',
            borderRadius: 1,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {detail.qrDestinationUrl ? (
            <QRCodeSVG
              value={detail.qrDestinationUrl}
              size={256}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="M"
              // 2 modules of quiet zone — slightly under the QR-spec
              // minimum of 4 but the demo cares more about the
              // pattern reading prominently inside the white square
              // than about scan-success at extreme distances. Bump
              // back to 4 if real-world scan reliability becomes a
              // concern.
              marginSize={2}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          ) : (
            <Typography
              sx={{
                fontSize: 'clamp(11px, 1.2vw, 16px)',
                fontWeight: 600,
                color: 'rgba(0,0,0,0.55)',
                letterSpacing: 0.5,
              }}
            >
              QR
            </Typography>
          )}
        </Box>

        {/* Scan QR Code Message — Figma (687, 685) → 44.6% left,
            76.1% top, 19.4%×8.9% size (299×80 inside the 1540×900
            card). Only rendered when the card has NO campaign
            background image; the partner artwork ships with the
            phone-icon + "SCAN OR CODE WITH YOUR CAMERA AND SHOP NOW"
            already baked into the bg image, so an extra overlay
            duplicates the CTA. When `cardBackgroundImageSrc` is
            null (placeholder content, organic-pause-without-data,
            etc.) the SVG provides the message instead. */}
        {!hasCardBgImage && (
          <Box
            sx={{
              position: 'absolute',
              left: '44.6%',
              top: '76.1%',
              width: '19.4%',
              aspectRatio: '299 / 80',
              // Native SVG colours are white. On a white placeholder
              // card we invert to dark so the message stays readable.
              filter: 'invert(1)',
            }}
          >
            <Box
              component="img"
              src="/assets/pause-overlay/scan-qr-message.svg"
              alt=""
              sx={{ display: 'block', width: '100%', height: '100%' }}
            />
          </Box>
        )}
      </Box>

      {/* Exit button sits on the black backdrop, outside the card.
          Figma places it at ~4% from left edge, ~4% from bottom —
          left-aligned so it doesn't compete with the centered card.
          The previous "Browse" sibling was redundant (both buttons
          went back to the carousel) and has been removed. */}
      <Box
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
          Exit
        </Button>
      </Box>
    </Box>
  )
}
