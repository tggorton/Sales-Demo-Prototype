import { Box, Typography } from '@mui/material'
import type { PauseProductTile as PauseProductTileData } from './pauseOverlay.types'

type PauseProductTileProps = {
  tile: PauseProductTileData
  // Whether this tile is the focus item (mouse hover OR keyboard focus).
  // Drives the size + colour-swap state defined in Figma — never the
  // tile's grid position, which is owned by the carousel slot.
  isFocused: boolean
  // Optional campaign-supplied background painted over the focused
  // tile (lets a campaign brand the highlighted state without losing
  // the white solid fallback for tiles without a bg image). Falls
  // through to the white-solid Figma look when null.
  focusedBackgroundImageSrc: string | null
  onSelect: () => void
  onFocus: () => void
  onBlur: () => void
}

// Single tile in the pause-overlay carousel. Two visual states share the
// same DOM:
//   - Default: 448 × 151 (Figma) → 89.6% of slot width
//   - Focused: 496 × 167 (Figma) → 99.2% of slot width
//
// Both states render inside the parent slot box, so a focused tile can
// never overlap or be overlapped by its neighbours.
//
// Internal layout follows Figma absolute coordinates rather than flex,
// because the source design positions title + CTA at fixed offsets that
// are easier to mirror directly. CSS percentages on `top`/`bottom` are
// resolved against the tile's height; on `left`/`right`/`width` against
// the tile's width — that asymmetry is what lets a uniform 5px Figma
// inset translate to two different percentages in CSS.
//
// Typography uses `cqw` (container-query width) units — the slot above
// applies `container-type: inline-size`, so 1cqw = 1% of slot width.
// `clamp()` floors and caps so very narrow or very wide players stay
// legible.
export function PauseProductTile({
  tile,
  isFocused,
  focusedBackgroundImageSrc,
  onSelect,
  onFocus,
  onBlur,
}: PauseProductTileProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      sx={{
        position: 'relative',
        // Default 448 / 500 = 89.6%, focused 496 / 500 = 99.2%. The slot
        // is the 500-equivalent (1/3-ish of track), so these percentages
        // keep the tile centred and never overflow.
        width: isFocused ? '99.2%' : '89.6%',
        aspectRatio: isFocused ? '496 / 167' : '448 / 151',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        backgroundColor: isFocused ? '#FFFFFF' : '#202020',
        // Campaign-supplied focused-state background image painted
        // over the white solid. Sized to cover so it reads regardless
        // of tile aspect, anchored centre. Hidden when not focused or
        // when the campaign supplies no asset.
        backgroundImage:
          isFocused && focusedBackgroundImageSrc
            ? `url(${focusedBackgroundImageSrc})`
            : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: isFocused ? '#000000' : '#FFFFFF',
        borderRadius: '5px',
        boxShadow: isFocused ? '0 0 10px 1px rgba(255,255,255,0.35)' : 'none',
        transition:
          'width 180ms ease, background-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
      }}
    >
      {/* Image area — square, Figma 5px (default) / 6px (focused) inset.
          Using `top` + `height` + aspect-ratio rather than top+bottom
          because CSS resolves `left:%` against width but `top:%` against
          height: a uniform-px Figma inset translates to *different*
          percentages on the two axes. Concretely: 5px / 151px tile-h =
          3.3% top, 5px / 448px tile-w = 1.1% left. */}
      <Box
        sx={{
          position: 'absolute',
          top: '3.3%',
          left: '1.1%',
          height: '93.4%',
          aspectRatio: '1 / 1',
          borderRadius: '5px',
          backgroundColor: '#838383',
          backgroundImage: tile.imageSrc ? `url(${tile.imageSrc})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Title — Figma default left=158/448=35.3%, top=13/151=8.6%, width
          272/448=60.7%. 3-line clamp matches the Figma's 96-px text box. */}
      <Typography
        sx={{
          position: 'absolute',
          left: '35.5%',
          right: '4%',
          top: '8.6%',
          fontSize: 'clamp(11px, 5.2cqw, 28px)',
          lineHeight: 1.18,
          fontWeight: 700,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {tile.title}
      </Typography>

      {/* CTA — Figma default left=158/448=35.3%, bottom=(151-133)/151
          =11.9%. Anchored to bottom rather than below the title so the
          spacing between title and CTA is visually consistent across
          short / long titles. */}
      <Typography
        sx={{
          position: 'absolute',
          left: '35.5%',
          bottom: '11.9%',
          fontSize: 'clamp(10px, 4.2cqw, 22px)',
          fontWeight: 600,
        }}
      >
        {tile.ctaText}
      </Typography>
    </Box>
  )
}
