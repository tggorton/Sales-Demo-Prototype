import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { PauseProductTile } from './PauseProductTile'
import type { PauseOverlayPayload } from './pauseOverlay.types'

type PauseProductCarouselProps = {
  payload: PauseOverlayPayload
  onSelectTile: (tileId: string) => void
}

// Pause-overlay carousel. Layout mirrors the 1080p Figma reference but
// scales proportionally to the player area so the demo looks identical
// whether the player is full-bleed or squeezed under expanded panels.
//
// Scaling plan
// -----------
// All sizing is expressed as percentages of the player area (or, for
// per-tile typography, `cqw` against the tile's slot). Concretely:
//
//   carousel margin   left 11% (Figma anchor), right 4% (gives the 4th
//                     tile room to peek without falling off-screen)
//   tile slot         30% of carousel area — three slots fit fully and
//                     leave ~10% on the right for tile #4 to peek about
//                     a third of its width. Drives the "more tiles
//                     available" affordance the user asked for.
//   tile (default)    448 wide ≈ 89.6% of slot
//   tile (focused)    496 wide ≈ 99.2% of slot
//
// Slot vs. tile separation matters: by anchoring slot width and growing
// the tile within it, a focused tile never crosses into its neighbour's
// slot. The visible gap shrinks (~50 px → ~26 px Figma-equivalent) when
// a neighbour focuses, but no element ever overlaps another.
//
// Sponsor row uses an inline label + small chip rather than the full
// 490×80 Figma block — earlier feedback was that the smaller treatment
// reads as "of-a-piece with the tiles" rather than competing with them
// for visual weight. Sized via `vw` clamps so it tracks viewport without
// needing its own container scope.
export function PauseProductCarousel({ payload, onSelectTile }: PauseProductCarouselProps) {
  const [focusedTileId, setFocusedTileId] = useState<string | null>(null)

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        // Light wash so tiles read against any frame of the paused
        // video. Detail view applies a heavier wash; carousel keeps it
        // subtle so the underlying content stays present.
        backgroundColor: 'rgba(0,0,0,0.32)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '11%',
          right: '4%',
          bottom: '8%',
        }}
      >
        {/* Sponsor row — small inline label + logo chip. Anchored above
            the tile track, left-aligned with the leftmost tile slot. */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: 1, pl: 0.5 }}
        >
          <Typography
            sx={{
              fontSize: 'clamp(10px, 0.85vw, 14px)',
              color: 'rgba(255,255,255,0.88)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {payload.sponsorLabel}
          </Typography>
          <Box
            sx={{
              width: 'clamp(72px, 6.5vw, 120px)',
              aspectRatio: '5 / 1',
              borderRadius: '3px',
              backgroundColor: payload.sponsorLogoSrc
                ? 'transparent'
                : 'rgba(255,255,255,0.35)',
              backgroundImage: payload.sponsorLogoSrc
                ? `url(${payload.sponsorLogoSrc})`
                : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!payload.sponsorLogoSrc && (
              <Typography
                sx={{
                  fontSize: 'clamp(8px, 0.7vw, 11px)',
                  color: 'rgba(0,0,0,0.6)',
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                Sponsor Logo
              </Typography>
            )}
          </Box>
        </Stack>

        {/* Tile track. Slots are 30% of carousel area each — three fit
            with room left for the 4th tile to peek about a third of its
            width, signalling that more tiles are available. The
            container-query scope on each slot lets tile typography
            resolve against slot width. */}
        <Box
          sx={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'visible',
            scrollSnapType: 'x mandatory',
            // Hide native scrollbar; trackpad / mouse-wheel scroll still
            // works for revealing tiles 4-5.
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // Vertical breathing room so the focused tile's drop shadow
            // isn't clipped against the track edges.
            py: 0.75,
          }}
        >
          {payload.tiles.map((tile) => (
            <Box
              key={tile.id}
              sx={{
                flex: '0 0 30%',
                scrollSnapAlign: 'start',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Establish a containment context so the tile's `cqw`
                // typography resolves against this slot's width rather
                // than the viewport.
                containerType: 'inline-size',
              }}
            >
              <PauseProductTile
                tile={tile}
                isFocused={focusedTileId === tile.id}
                onSelect={() => onSelectTile(tile.id)}
                onFocus={() => setFocusedTileId(tile.id)}
                onBlur={() =>
                  setFocusedTileId((prev) => (prev === tile.id ? null : prev))
                }
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
