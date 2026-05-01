import { Box, Stack, Typography } from '@mui/material'
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../constants'
import { sceneAnchorStyles } from '../../styles'
import { formatTime } from '../../utils/formatTime'
import type { ProductEntry } from '../../types'

type ProductCardProps = {
  entry: ProductEntry
  showSceneAnchor: boolean
  variant: 'collapsed' | 'expanded'
  /** Stamps the wrapper with `data-scene-anchor`. Used by the expanded
   *  dialog's per-scene scroll fallback. */
  dataSceneAnchorId?: string
  /** Stamps the wrapper with `data-product-anchor` (per Phase 9a sync
   *  hardening — every product card in the expanded view carries one
   *  so the open-time scroll lands on the EXACT product the collapsed
   *  panel was centered on, not just the first product of its scene). */
  dataProductAnchorId?: string
  containerRef?: (el: HTMLDivElement | null) => void
}

/**
 * A single product entry card. Used by both the inline collapsed Products
 * panel and the expanded Products dialog.
 *
 * Variant differences:
 * - Image size: 54×54 (collapsed, fits the 324px rail) vs 64×64 (expanded).
 * - Outer padding: collapsed pads tighter; expanded uses a more comfortable
 *   pl/pr around the wider dialog body.
 *
 * `showSceneAnchor` is on for the first product in a scene group so the
 * scene-anchor row renders once per group (callers compare adjacent
 * entries' sceneId to decide).
 */
export function ProductCard({
  entry,
  showSceneAnchor,
  variant,
  dataSceneAnchorId,
  dataProductAnchorId,
  containerRef,
}: ProductCardProps) {
  const isCollapsed = variant === 'collapsed'
  const imageSize = isCollapsed ? 54 : 64
  return (
    <Box
      ref={containerRef}
      data-scene-anchor={dataSceneAnchorId}
      data-product-anchor={dataProductAnchorId}
      sx={{
        px: isCollapsed ? 0.75 : 0.9,
        pt: showSceneAnchor ? (isCollapsed ? 1.05 : 1.2) : (isCollapsed ? 0.6 : 0.7),
        pb: isCollapsed ? 1.05 : 1.2,
        borderBottom: '1px solid #e6e6e6',
        backgroundColor: 'transparent',
        ...(isCollapsed ? { borderLeft: '3px solid transparent' } : {}),
      }}
    >
      {showSceneAnchor && (
        <Typography sx={sceneAnchorStyles}>
          {entry.sceneLabel} · {formatTime(entry.sceneStart)}
        </Typography>
      )}
      <Stack direction="row" spacing={1.2}>
        <Box
          component="img"
          src={entry.image}
          alt={entry.name}
          // `lazy` defers fetching until the image is near the viewport
          // — without it, the panel races to load every product the
          // moment it mounts (50+ parallel requests for DHYH Tier 3),
          // which blocks the network for the more important assets.
          // `async` lets the browser decode off the main thread so a
          // batch of decodes doesn't stall scroll/render.
          loading="lazy"
          decoding="async"
          onError={(event) => {
            const img = event.currentTarget as HTMLImageElement
            if (img.src !== window.location.origin + PRODUCT_PLACEHOLDER_IMAGE) {
              img.src = PRODUCT_PLACEHOLDER_IMAGE
            }
          }}
          sx={{
            width: imageSize,
            height: imageSize,
            borderRadius: 0.5,
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1.1 }}>
            {entry.name}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              mt: 0.2,
              lineHeight: 1.35,
              opacity: 0.87,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entry.description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
