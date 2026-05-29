import { Box, Stack, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import type {
  PauseProductDestinationTarget,
  PauseProductDetail as PauseProductDetailData,
} from './pauseOverlay.types'

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
  // Sync mobile-companion modal) with the active product's full
  // context (URL + image/title/description/price) so the modal can
  // render an in-app product preview when the retailer blocks iframing.
  onOpenProductDestination: (target: PauseProductDestinationTarget) => void
  // Exit dismisses the overlay AND resumes playback (2026-05-29). The
  // semantic was previously "back to carousel (still paused)" but the
  // user explicitly wanted Exit to function as a second unpause path
  // alongside the Play button in the control bar. The carousel ↔ detail
  // sub-navigation is now entry-only (tile click → detail); leaving the
  // detail means leaving the overlay entirely.
  onExit: () => void
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
  onExit,
}: PauseProductDetailProps) {
  const hasQrDestination = Boolean(detail.qrDestinationUrl)
  const handleCardClick = () => {
    if (!detail.qrDestinationUrl) return
    onOpenProductDestination({
      url: detail.qrDestinationUrl,
      title: detail.title,
      imageSrc: detail.imageSrc,
      description: detail.description,
      price: detail.price,
    })
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
          // White stroke. Width is scaled, not fixed: Figma specs the stroke
          // as 3 px at the 1540-px-wide reference card. At smaller players
          // (panels open, narrower viewports) a flat 3 px reads way too
          // thick relative to the card body. Using `cqw` against the card's
          // own width (containerType: 'inline-size' below) keeps the stroke
          // proportional — 3 / 1540 ≈ 0.195cqw — and the clamp() floor of
          // 1 px keeps it visible at very small player sizes while the
          // ceiling of 3 px caps it at the Figma-ideal so it never *grows*
          // beyond spec at full 1080p.
          border: '3px solid rgba(255,255,255,0.95)',
          borderWidth: 'clamp(1px, 0.195cqw, 3px)',
          // No glow on the stroke per 2026-05-27 design direction — the
          // border is the entire "stroke" (Figma weight 3). The earlier
          // `0 2px 25px rgba(255,255,255,0.45)` glow visually thickened it.
          boxShadow: 'none',
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

        {/* Logo Area — campaign sponsor logo. Per 2026-05-27 design direction,
            horizontally aligned with the description column (`left: 30.5%`
            matches the copy `Stack` below); top 8.89%, width 41.4% (Figma).
            Per 2026-05-28 direction: render ONLY when the campaign actually
            supplies a logo URL. Missing logo → render nothing (no gray
            placeholder, no "Sponsor · LOGO" text). The system "uses it if
            it's there and ignores it otherwise." */}
        {sponsorLogoSrc && (
          <Box
            sx={{
              position: 'absolute',
              left: '30.5%',
              // 80px from the top of the inner card (Figma 1540×900) → 80/900 ≈ 8.89%.
              top: '8.89%',
              width: '41.4%',
              aspectRatio: '638 / 120',
              backgroundImage: `url(${sponsorLogoSrc})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              // Align the visible logo image with the box's left edge (and thus
              // the description column at 30.5%). With 'center', the contained
              // image inset from the left whenever its natural aspect ratio is
              // narrower than the box's, leaving an off-by-N gap.
              backgroundPosition: 'left center',
            }}
            aria-label={sponsorLabel}
          />
        )}

        {/* Image Area — per 2026-05-27 design direction: 54px from the card's
            left edge, 364×364 px, VERTICALLY CENTERED in the card. Against
            Figma 1540×900: left = 54/1540 = 3.51%, width = 364/1540 = 23.64%
            (square via aspectRatio), top = (900 − 364) / 2 / 900 = 268/900
            = 29.78% (the vertical-center offset). */}
        <Box
          sx={{
            position: 'absolute',
            left: '3.51%',
            top: '29.78%',
            width: '23.64%',
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
            // Title top aligns with the image's top (29.78%) per 2026-05-27
            // design direction so the two columns "lock up" at the same
            // horizon line.
            top: '29.78%',
            width: '48%',
            maxWidth: 740,
            justifyContent: 'flex-start',
            // Figma stack gap is 36 px at 1540-px card. `cqw` resolves
            // against the card's inline size, so 36/1540 ≈ 2.34cqw
            // gives 36 px at the Figma reference and shrinks
            // proportionally when the card narrows. Confirmed 2026-05-27:
            // 36px between title↔description and description↔price.
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
              // Per 2026-05-27 design direction: cap title at 2 lines, then
              // truncate with an ellipsis. The text frame is 740 px wide
              // (Stack width below).
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
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

        {/* Small QR Code Area — per 2026-05-27 design direction: 72px from
            the right edge AND 72px from the bottom edge of the inner card.
            Against the Figma 1540×900 frame, width stays 16.2% (250px), so
            left = 1218/1540 = 79.1% and top = 578/900 = 64.2% (which puts
            the bottom edge exactly 72px above the card bottom). The QR fills
            the entire white square (no inner padding); `marginSize` on the
            SVG provides the required scannable quiet zone. */}
        <Box
          sx={{
            position: 'absolute',
            left: '79.09%',
            top: '64.22%',
            // 250×250 px against Figma 1540×900 → 250/1540 = 16.23%; aspectRatio
            // keeps it square (height also 250 px).
            width: '16.23%',
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

        {/* Scan QR Code Message — per 2026-05-27 design direction: 58px to
            the left of the QR's left edge AND 81px from the card bottom.
            Against the Figma 1540×900 frame, width stays 19.4% (299px), so
            left = (1218 - 58 - 299) / 1540 = 861/1540 = 55.9% and
            top = (900 - 81 - 80) / 900 = 739/900 = 82.1%.
            NOTE — when a campaign `cardBackgroundImageSrc` is set (the partner
            artwork), that bg image typically has the phone-icon + "SCAN OR
            CODE WITH YOUR CAMERA AND SHOP NOW" already baked in; this SVG
            overlay is only rendered as a fallback for `null` bg (placeholder
            content / organic-pause-without-data). The Paramount detail-screen
            bg was updated 2026-05-28 to a "clean" version (no baked-in icon),
            so the overlay now renders unconditionally; the `invert(1)` filter
            stays scoped to the no-bg placeholder case where the asset's white
            glyphs would be invisible on a white card. */}
        <Box
          sx={{
            position: 'absolute',
            left: '55.9%',
            top: '82.1%',
            width: '19.4%',
            aspectRatio: '299 / 80',
            // Asset glyphs are white. Only invert on the no-bg placeholder
            // card (white background) so they read as dark there.
            filter: hasCardBgImage ? 'none' : 'invert(1)',
          }}
        >
          <Box
            component="img"
            src="/assets/pause-overlay/scan-qr-message.svg"
            alt=""
            sx={{ display: 'block', width: '100%', height: '100%' }}
          />
        </Box>
      </Box>

      {/* Exit button — dismisses the overlay AND resumes playback (the
          "I'm done shopping" path; equivalent to clicking Play in the
          control bar). Position is the original 29-px-below-card spec at
          the 1920×1080 reference, scaled proportionally for any player
          size. As of the 2026-05-29 evening layered fix, the overlay's
          content frame is bottom-inset by the control bar height — so
          `top: 90.69%` of THIS frame (which is `playerHeight - controlBarHeight`
          tall) naturally lands Exit in the safe band above the controls.
          No z-index gymnastics needed; this Box just inherits the overlay's
          stacking context. Math is unchanged in spirit (everything is a
          proportion of the active container, the active container just
          happens to exclude the control bar now). */}
      <Box
        component="button"
        type="button"
        onClick={onExit}
        aria-label="Exit and resume playback"
        sx={{
          position: 'absolute',
          top: '90.69%',
          left: '10%',
          width: '5.625%',
          aspectRatio: '108 / 48.5',
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        <Box
          component="img"
          src="/assets/pause-overlay/exit.svg"
          alt=""
          sx={{ display: 'block', width: '100%', height: '100%' }}
        />
      </Box>
    </Box>
  )
}
