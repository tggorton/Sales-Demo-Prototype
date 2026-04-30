import { Box, Typography } from '@mui/material'
import { formatTime } from '../../utils/formatTime'
import { buildSceneJsonPayload } from '../../utils/jsonExport'
import type { SceneMetadata } from '../../types'

type JsonSceneCardProps = {
  scene: SceneMetadata
  sceneIndex: number
  /** Override the default `scene.sceneLabel` (collapsed view passes a group
   *  label when adjacent same-fingerprint scenes are merged into one card). */
  label?: string
  /** Override the default `scene.start` (collapsed view passes the merged
   *  group's start). */
  startSec?: number
  /** When set, the header renders as `start–end` to indicate a merged
   *  multi-scene group. Collapsed view only — expanded never merges. */
  endSec?: number
  dataSceneAnchorId?: string
  containerRef?: (el: HTMLDivElement | null) => void
}

/**
 * A single scene's JSON card (dark-themed). Used by both the inline
 * collapsed JSON panel and the expanded JSON dialog.
 *
 * The two views share the rendered markup; the only difference is that the
 * collapsed view groups adjacent same-fingerprint scenes into one card and
 * renders a range header (`start–end`), while the expanded view always
 * renders one card per meaningful scene with a single timestamp.
 */
export function JsonSceneCard({
  scene,
  sceneIndex,
  label,
  startSec,
  endSec,
  dataSceneAnchorId,
  containerRef,
}: JsonSceneCardProps) {
  const headerLabel = label ?? scene.sceneLabel
  const headerStart = startSec ?? scene.start
  return (
    <Box
      ref={containerRef}
      data-scene-anchor={dataSceneAnchorId}
      sx={{
        p: 0.85,
        borderRadius: 1,
        backgroundColor: 'transparent',
        border: '1px solid transparent',
      }}
    >
      <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.4 }}>
        {headerLabel} @ {formatTime(headerStart)}
        {endSec !== undefined ? `–${formatTime(endSec)}` : ''}
      </Typography>
      <Typography
        component="pre"
        sx={{
          m: 0,
          whiteSpace: 'pre-wrap',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 10.4,
          lineHeight: 1.4,
          color: '#f3f7fd',
        }}
      >
        {JSON.stringify(buildSceneJsonPayload(scene, sceneIndex), null, 2)}
      </Typography>
    </Box>
  )
}
