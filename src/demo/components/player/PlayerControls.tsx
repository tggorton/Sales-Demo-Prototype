import { Box, IconButton, Slider, Stack, Tooltip, Typography } from '@mui/material'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import { formatTime } from '../../utils/formatTime'
import type { PlayerControlTokens, SyncImpulseSegment } from '../../types'

type PlayerControlsProps = {
  isVideoPlaying: boolean
  isVideoMuted: boolean
  isSyncImpulseMode: boolean
  videoCurrentSeconds: number
  playbackDurationSeconds: number
  displayedCurrentSeconds: number
  displayedDurationSeconds: number
  impulseSegments: readonly SyncImpulseSegment[]
  playerControlTokens: PlayerControlTokens
  onToggleVideoPlaying: () => void
  onToggleVideoMuted: () => void
  onVideoTimeChange: (value: number) => void
}

/**
 * Bottom control bar of the demo player: play/pause, time readout, scrubber,
 * mute toggle. Rendered as an absolutely-positioned overlay at the bottom of
 * the VideoPlayer's container Box.
 *
 * Sync: Impulse mode renders a segmented scrubber visualization (red content
 * blocks + cyan ad slot); other modes render a single-color progress bar.
 * The MUI Slider sits on top of either visualization to capture interaction.
 */
export function PlayerControls({
  isVideoPlaying,
  isVideoMuted,
  isSyncImpulseMode,
  videoCurrentSeconds,
  playbackDurationSeconds,
  displayedCurrentSeconds,
  displayedDurationSeconds,
  impulseSegments,
  playerControlTokens,
  onToggleVideoPlaying,
  onToggleVideoMuted,
  onVideoTimeChange,
}: PlayerControlsProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        px: playerControlTokens.overlayPx,
        py: playerControlTokens.overlayPy,
        background: 'linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.15))',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.4}>
        <IconButton
          onClick={onToggleVideoPlaying}
          sx={{ color: '#fff', p: playerControlTokens.controlButtonPadding }}
        >
          {isVideoPlaying ? (
            <PauseRoundedIcon sx={{ fontSize: playerControlTokens.playIconSize }} />
          ) : (
            <PlayArrowRoundedIcon sx={{ fontSize: playerControlTokens.playIconSize }} />
          )}
        </IconButton>
        <Typography
          sx={{
            color: '#fff',
            fontSize: playerControlTokens.timeFontSize,
            width: playerControlTokens.timeWidth,
          }}
        >
          {formatTime(displayedCurrentSeconds)} / {formatTime(displayedDurationSeconds)}
        </Typography>

        <Box
          sx={{
            flex: 1,
            position: 'relative',
            height: playerControlTokens.sliderContainerHeight,
          }}
        >
          {isSyncImpulseMode ? (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  top: playerControlTokens.timelineTop,
                  left: 0,
                  right: 0,
                  height: playerControlTokens.timelineHeight,
                  bgcolor: '#404040',
                }}
              />
              {impulseSegments.map((segment, idx) => (
                <Box
                  key={`${segment.kind}-${idx}`}
                  sx={{
                    position: 'absolute',
                    top: playerControlTokens.timelineTop,
                    left: `${(segment.start / playbackDurationSeconds) * 100}%`,
                    width: `${((segment.end - segment.start) / playbackDurationSeconds) * 100}%`,
                    height: playerControlTokens.timelineHeight,
                    bgcolor: segment.kind === 'content' ? '#D7283B' : '#18D1E5',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </>
          ) : (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  top: playerControlTokens.timelineTop,
                  left: 0,
                  right: 0,
                  height: playerControlTokens.timelineHeight,
                  bgcolor: '#404040',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: playerControlTokens.timelineTop,
                  left: 0,
                  height: playerControlTokens.timelineHeight,
                  width: `${(videoCurrentSeconds / playbackDurationSeconds) * 100}%`,
                  bgcolor: '#1a9ee9',
                }}
              />
            </>
          )}
          <Slider
            min={0}
            max={playbackDurationSeconds}
            value={videoCurrentSeconds}
            onChange={(_, value) => onVideoTimeChange(Array.isArray(value) ? value[0] : value)}
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: playerControlTokens.timelineTop,
              height: playerControlTokens.timelineHeight,
              p: 0,
              color: '#1a9ee9',
              '& .MuiSlider-rail': { opacity: 0 },
              '& .MuiSlider-track': { opacity: 0 },
              '& .MuiSlider-thumb': {
                width: playerControlTokens.thumbSize,
                height: playerControlTokens.thumbSize,
                top: '50%',
                bgcolor: '#1a9ee9',
                border: 'none',
                boxShadow: 'none',
                '&:hover, &.Mui-focusVisible': { boxShadow: 'none' },
              },
            }}
          />
        </Box>

        <Tooltip title={isVideoMuted ? 'Unmute' : 'Mute'} arrow>
          <IconButton
            onClick={onToggleVideoMuted}
            aria-label={isVideoMuted ? 'Unmute' : 'Mute'}
            sx={{ color: '#fff', p: playerControlTokens.controlButtonPadding }}
          >
            {isVideoMuted ? (
              <VolumeOffRoundedIcon sx={{ fontSize: playerControlTokens.secondaryIconSize }} />
            ) : (
              <VolumeUpRoundedIcon sx={{ fontSize: playerControlTokens.secondaryIconSize }} />
            )}
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}
