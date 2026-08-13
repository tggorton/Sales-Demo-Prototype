import { Box, Chip, Typography } from '@mui/material'
import { sceneAnchorStyles } from '../../styles'
import { formatTime } from '../../utils/formatTime'
import type { TaxonomyOption, TaxonomySceneData } from '../../types'

export type TaxonomyRow = {
  taxonomy: TaxonomyOption
  data: TaxonomySceneData
}

type TaxonomySceneCardProps = {
  sceneLabel: string
  sceneStart: number
  rows: readonly TaxonomyRow[]
  variant: 'collapsed' | 'expanded'
  dataSceneAnchorId?: string
  containerRef?: (el: HTMLDivElement | null) => void
}

/**
 * A single scene's taxonomy card. Used by both the inline collapsed panel
 * (one row, the currently-selected taxonomy) and the expanded dialog
 * (multiple rows, one per selected taxonomy).
 *
 * Variant differences are pure layout — the collapsed view uses tighter
 * outer padding to fit inside the 324px-wide rail; the expanded view
 * gives each row its own bottom margin so multiple rows separate cleanly.
 *
 * `dataSceneAnchorId` stamps the wrapper with `data-scene-anchor` so the
 * expanded dialog's open-time scroll can locate the active scene by query
 * selector. The collapsed view doesn't need this (it uses refs instead).
 */
export function TaxonomySceneCard({
  sceneLabel,
  sceneStart,
  rows,
  variant,
  dataSceneAnchorId,
  containerRef,
}: TaxonomySceneCardProps) {
  const isCollapsed = variant === 'collapsed'
  return (
    <Box
      ref={containerRef}
      data-scene-anchor={dataSceneAnchorId}
      sx={{
        p: isCollapsed ? 0.9 : 1.1,
        borderRadius: 1,
        border: '1px solid transparent',
        backgroundColor: 'transparent',
      }}
    >
      <Typography sx={sceneAnchorStyles}>
        {sceneLabel} · {formatTime(sceneStart)}
      </Typography>
      {rows.flatMap(({ taxonomy, data }, idx) =>
        // A row may carry several primary entries (see `extraGroups`); each
        // renders as the same heading + pill + sections unit, repeated.
        [{ headline: data.headline, chip: data.chip, sections: data.sections }, ...(data.extraGroups ?? [])].map(
          (group, groupIdx) => (
            <Box
              key={`${taxonomy}-${idx}-${groupIdx}`}
              sx={isCollapsed ? undefined : { mb: 1.05 }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>
                {taxonomy}
              </Typography>
              <Chip
                label={`${group.headline} (${group.chip})`}
                size="small"
                sx={{
                  height: 25.27,
                  borderRadius: '104.48px',
                  mt: 0.4,
                  mb: 0.8,
                  fontSize: 11.5,
                }}
              />
              {group.sections.map((section) => (
                <Box key={`${taxonomy}-${idx}-${groupIdx}-${section.label}`}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>
                    {section.label}
                  </Typography>
                  <Typography sx={{ fontSize: 12, mb: 0.7, lineHeight: 1.35, opacity: 0.87 }}>
                    {section.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )
        )
      )}
    </Box>
  )
}
