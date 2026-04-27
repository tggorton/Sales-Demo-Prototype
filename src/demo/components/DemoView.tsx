import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Tooltip,
  Typography,
  Button,
} from '@mui/material'
import type { MutableRefObject } from 'react'
import { PanelGlyph } from './PanelGlyph'
import {
  adPlaybackOptions,
  PRODUCT_PLACEHOLDER_IMAGE,
  TAXONOMY_DEDUPE_WINDOW_SECONDS,
  tierOptions,
} from '../constants'
import { formatTime } from '../utils/formatTime'
import { buildAdBreakJsonString, buildSceneJsonPayload } from '../utils/jsonExport'
import {
  dropdownMagentaStyles,
  navButtonStyles,
  panelHeaderActionIconSx,
  panelHeaderIconButtonDarkStyles,
  panelHeaderIconButtonStyles,
  panelPaperStyles,
  sceneAnchorStyles,
  tooltipStyles,
} from '../styles'
import { getTaxonomySceneData } from '../data/taxonomySceneData'
import type {
  AdDecisioningTailItem,
  AdPlaybackOption,
  DemoPanel,
  ProductEntry,
  SceneMetadata,
  SyncImpulseSegment,
  TaxonomyOption,
  TierOption,
  PlayerControlTokens,
} from '../types'

type DemoViewProps = {
  playbackLoadAreaRef: MutableRefObject<HTMLDivElement | null>
  isTitlePanelExpanded: boolean
  selectedTier: TierOption
  selectedAdPlayback: AdPlaybackOption
  titlePanelSummary: string
  activeDemoPanels: DemoPanel[]
  visiblePanels: DemoPanel[]
  selectedTaxonomy: TaxonomyOption
  playbackScenes: SceneMetadata[]
  activeScene: SceneMetadata
  productEntries: ProductEntry[]
  isVideoPlaying: boolean
  isVideoMuted: boolean
  videoCurrentSeconds: number
  playbackDurationSeconds: number
  displayedCurrentSeconds: number
  displayedDurationSeconds: number
  impulseSegments: readonly SyncImpulseSegment[]
  playerControlTokens: PlayerControlTokens
  isSyncImpulseMode: boolean
  isAdBreakPlayback: boolean
  activeAdBreakImage: string
  activeAdQrImage: string
  activeAdVideoUrl: string | null
  mainVideoSrc: string
  productsUnavailableMessage: string | null
  hasReachedFirstProduct: boolean
  taxonomyAvailability: Record<TaxonomyOption, boolean>
  availableTaxonomies: TaxonomyOption[]
  activeSceneIndex: number
  activeProductIndex: number
  shouldShowInContentCta: boolean
  activeAdBreakLabel: string
  adDecisionPayload: Record<string, unknown>
  adDecisioningTail: AdDecisioningTailItem[]
  contentVideoRef: MutableRefObject<HTMLVideoElement | null>
  adVideoRef: MutableRefObject<HTMLVideoElement | null>
  taxonomyRefs: MutableRefObject<Array<HTMLDivElement | null>>
  productRefs: MutableRefObject<Array<HTMLDivElement | null>>
  jsonRefs: MutableRefObject<Array<HTMLDivElement | null>>
  taxonomyScrollContainerRef: MutableRefObject<HTMLDivElement | null>
  productScrollContainerRef: MutableRefObject<HTMLDivElement | null>
  jsonScrollContainerRef: MutableRefObject<HTMLDivElement | null>
  onBackToSelection: () => void
  onToggleTitlePanel: () => void
  onTierChange: (value: TierOption) => void
  onAdPlaybackChange: (value: AdPlaybackOption) => void
  onTaxonomyChange: (value: TaxonomyOption) => void
  onToggleVideoPlaying: () => void
  onToggleVideoMuted: () => void
  onVideoTimeChange: (value: number) => void
  onVideoMetadataLoaded: (duration: number) => void
  onToggleDemoPanel: (panel: DemoPanel) => void
  onCloseDemoPanel: (panel: DemoPanel) => void
  onOpenExpandedPanel: (panel: DemoPanel) => void
  onOpenJsonDownload: () => void
  onOpenCompanionModal: () => void
}

export function DemoView({
  playbackLoadAreaRef,
  isTitlePanelExpanded,
  selectedTier,
  selectedAdPlayback,
  titlePanelSummary,
  activeDemoPanels,
  visiblePanels,
  selectedTaxonomy,
  playbackScenes,
  activeScene,
  productEntries,
  isVideoPlaying,
  isVideoMuted,
  videoCurrentSeconds,
  playbackDurationSeconds,
  displayedCurrentSeconds,
  displayedDurationSeconds,
  impulseSegments,
  playerControlTokens,
  isSyncImpulseMode,
  isAdBreakPlayback,
  activeAdBreakImage,
  activeAdQrImage,
  activeAdVideoUrl,
  mainVideoSrc,
  productsUnavailableMessage,
  hasReachedFirstProduct,
  taxonomyAvailability,
  availableTaxonomies,
  activeSceneIndex,
  activeProductIndex,
  shouldShowInContentCta,
  activeAdBreakLabel,
  adDecisionPayload,
  adDecisioningTail,
  contentVideoRef,
  adVideoRef,
  taxonomyRefs,
  productRefs,
  jsonRefs,
  taxonomyScrollContainerRef,
  productScrollContainerRef,
  jsonScrollContainerRef,
  onBackToSelection,
  onToggleTitlePanel,
  onTierChange,
  onAdPlaybackChange,
  onTaxonomyChange,
  onToggleVideoPlaying,
  onToggleVideoMuted,
  onVideoTimeChange,
  onVideoMetadataLoaded,
  onToggleDemoPanel,
  onCloseDemoPanel,
  onOpenExpandedPanel,
  onOpenJsonDownload,
  onOpenCompanionModal,
}: DemoViewProps) {
  return (
    <Stack spacing={2}>
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'rgba(255,255,255,0.5)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
        }}
      >
        <Stack spacing={isTitlePanelExpanded ? 1.75 : 0}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Button
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={onBackToSelection}
                sx={{ color: '#ED005E', width: 'fit-content', p: 0 }}
              >
                Back to Content Selection
              </Button>
              <Typography sx={{ color: 'rgba(0,0,0,0.38)' }}>|</Typography>
              <Typography sx={{ color: 'rgba(0,0,0,0.87)', fontWeight: 500, letterSpacing: 0.2 }}>
                {titlePanelSummary}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={onToggleTitlePanel} sx={{ color: 'rgba(0,0,0,0.56)' }}>
              {isTitlePanelExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>

          {isTitlePanelExpanded && (
            <Stack direction="row" spacing={2} sx={{ maxWidth: 636 }}>
              <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                <InputLabel id="tier-page-select-label">Tier Selection</InputLabel>
                <Select
                  labelId="tier-page-select-label"
                  value={selectedTier}
                  label="Tier Selection"
                  onChange={(event) => onTierChange(event.target.value as TierOption)}
                >
                  {tierOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                <InputLabel id="ad-page-select-label">Ad Playback Mode</InputLabel>
                <Select
                  labelId="ad-page-select-label"
                  value={selectedAdPlayback}
                  label="Ad Playback Mode"
                  onChange={(event) => onAdPlaybackChange(event.target.value as AdPlaybackOption)}
                >
                  {adPlaybackOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper
        ref={playbackLoadAreaRef}
        sx={{
          p: 3,
          minHeight: 650,
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'rgba(255,255,255,0.5)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
        }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns:
                visiblePanels.length === 0
                  ? 'minmax(0, 1fr)'
                  : `minmax(0, 1fr) ${visiblePanels.map(() => '324px').join(' ')}`,
              height: 549,
              gap: 1,
              alignItems: 'stretch',
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                display: 'flex',
                justifyContent: visiblePanels.length === 0 ? 'center' : 'flex-start',
                alignSelf: 'start',
              }}
            >
              <Box
                sx={{
                  width: visiblePanels.length <= 1 ? 'min(100%, 976px)' : '100%',
                  maxWidth: '100%',
                  height: 'auto',
                  aspectRatio: '16 / 9',
                  alignSelf: 'start',
                  position: 'relative',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: '#00152A',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: '#1a1a1a',
                    backgroundImage: activeAdVideoUrl || !activeAdBreakImage ? 'none' : `url(${activeAdBreakImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: isAdBreakPlayback ? 1 : 0,
                    transition: 'opacity 320ms ease-in-out',
                  }}
                >
                  {activeAdVideoUrl && (
                    <Box
                      component="video"
                      ref={adVideoRef}
                      src={activeAdVideoUrl}
                      muted={isVideoMuted}
                      playsInline
                      preload="auto"
                      key={activeAdVideoUrl}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        backgroundColor: '#000',
                      }}
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    opacity: isAdBreakPlayback ? 0 : 1,
                    transition: 'opacity 320ms ease-in-out',
                  }}
                >
                  <Box
                    component="video"
                    ref={contentVideoRef}
                    src={mainVideoSrc}
                    key={mainVideoSrc}
                    muted={isVideoMuted}
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration
                      if (!Number.isNaN(duration)) {
                        onVideoMetadataLoaded(duration)
                      }
                    }}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      backgroundColor: '#1a1a1a',
                      '@keyframes contentFadeIn': {
                        from: { opacity: 0 },
                        to: { opacity: 1 },
                      },
                      animation: 'contentFadeIn 1100ms ease-out',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: isSyncImpulseMode ? 'rgba(255,0,40,0.14)' : 'rgba(0,0,0,0.3)',
                      pointerEvents: 'none',
                    }}
                  />
                </Box>
                {isSyncImpulseMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      background:
                        'radial-gradient(circle at 18% 35%, rgba(0,255,255,0.12), transparent 36%), radial-gradient(circle at 80% 20%, rgba(255,40,90,0.16), transparent 34%), radial-gradient(circle at 65% 78%, rgba(255,80,120,0.14), transparent 40%)',
                      mixBlendMode: 'screen',
                      opacity: isAdBreakPlayback ? 0 : 1,
                      transition: 'opacity 320ms ease-in-out',
                    }}
                  />
                )}
                {isSyncImpulseMode && isAdBreakPlayback && !activeAdVideoUrl && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '83.9%',
                      transform: 'translateX(-50%)',
                      bottom: '8.9%',
                      width: '19.1%',
                      aspectRatio: '1 / 1',
                      zIndex: 3,
                      borderRadius: 0.5,
                      overflow: 'hidden',
                      backgroundColor: '#fff',
                      p: '0.1%',
                      boxSizing: 'border-box',
                      pointerEvents: 'none',
                    }}
                  >
                    <Box component="img" src={activeAdQrImage} alt="Ad QR code" sx={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#fff' }} />
                  </Box>
                )}
                {/* Whole-ad click target. Covers the full player area except the control
                    bar along the bottom, so clicking anywhere on the ad opens the
                    companion experience without us having to track per-creative QR
                    placements. */}
                {isSyncImpulseMode && isAdBreakPlayback && (
                  <Box
                    role="button"
                    aria-label="Open companion experience"
                    onClick={onOpenCompanionModal}
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: `${playerControlTokens.controlBarHeight}px`,
                      cursor: 'pointer',
                      zIndex: 4,
                      backgroundColor: 'transparent',
                    }}
                  />
                )}

                {shouldShowInContentCta && (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: '35px',
                      bottom: `${playerControlTokens.controlBarHeight + 10}px`,
                      px: 2.25,
                      py: 1.1,
                      borderRadius: 0.75,
                      bgcolor: 'rgba(255,255,255,0.92)',
                    }}
                  >
                    <Typography sx={{ fontSize: 15, fontWeight: 500, color: '#1d1d1d' }}>
                      {activeScene.cta}
                    </Typography>
                  </Box>
                )}

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
                    <IconButton onClick={onToggleVideoPlaying} sx={{ color: '#fff', p: playerControlTokens.controlButtonPadding }}>
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
              </Box>
            </Box>

            {visiblePanels.includes('taxonomy') && (
              <Paper elevation={0} sx={{ ...panelPaperStyles, height: visiblePanels.length === 1 ? 549 : '100%' }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1, py: 0.75, borderBottom: '0.73px solid rgba(0,0,0,0.18)' }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <Box component="img" src="/assets/elements/taxo-btn.svg" alt="" aria-hidden sx={{ width: 16, height: 16, opacity: 0.8 }} />
                    <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
                      Taxonomies
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.25}>
                    <IconButton size="small" sx={panelHeaderIconButtonStyles} onClick={() => onOpenExpandedPanel('taxonomy')}>
                      <PanelGlyph variant="expand" color="#ED005E" />
                    </IconButton>
                    <IconButton size="small" sx={panelHeaderIconButtonStyles} onClick={() => onCloseDemoPanel('taxonomy')}>
                      <CloseOutlinedIcon sx={panelHeaderActionIconSx} />
                    </IconButton>
                  </Stack>
                </Stack>
                <Box sx={{ px: 1.25, pt: 1.05, pb: 0.9 }}>
                  <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                    <InputLabel id="taxonomy-playback-mode-label">Taxonomies</InputLabel>
                    <Select
                      labelId="taxonomy-playback-mode-label"
                      value={selectedTaxonomy}
                      label="Taxonomies"
                      onChange={(event) => onTaxonomyChange(event.target.value as TaxonomyOption)}
                      sx={{ height: 40 }}
                    >
                      {availableTaxonomies.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box ref={taxonomyScrollContainerRef} sx={{ px: 1.05, pb: 1, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {!taxonomyAvailability[selectedTaxonomy] ? (
                    <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
                        {`No ${selectedTaxonomy.toLowerCase()} information currently`}
                      </Typography>
                    </Box>
                  ) : (
                  <Stack spacing={0.7}>
                    {(() => {
                      // Time-windowed dedupe (mirrors the products policy):
                      // suppress consecutive scenes whose taxonomy headline
                      // matches the previously emitted one, until the gap
                      // exceeds TAXONOMY_DEDUPE_WINDOW_SECONDS. Done inline
                      // with closure variables so we keep one source of truth
                      // for "what scene index does each rendered card map
                      // to" – `taxonomyRefs[index]` stays scene-indexed which
                      // the autoscroll's `walkBackForRef` already handles.
                      let lastHeadline: string | null = null
                      let lastEmittedAt = -Infinity
                      return playbackScenes.map((scene, index) => {
                        if (index > activeSceneIndex) {
                          taxonomyRefs.current[index] = null
                          return null
                        }
                        const taxonomyData = getTaxonomySceneData(scene, index, selectedTaxonomy)
                        if (!taxonomyData) {
                          taxonomyRefs.current[index] = null
                          return null
                        }
                        if (
                          TAXONOMY_DEDUPE_WINDOW_SECONDS > 0 &&
                          lastHeadline === taxonomyData.headline &&
                          scene.start - lastEmittedAt < TAXONOMY_DEDUPE_WINDOW_SECONDS
                        ) {
                          taxonomyRefs.current[index] = null
                          return null
                        }
                        lastHeadline = taxonomyData.headline
                        lastEmittedAt = scene.start
                        return (
                        <Box
                          key={scene.id}
                          ref={(el: HTMLDivElement | null) => {
                            taxonomyRefs.current[index] = el
                          }}
                          sx={{
                            p: 0.9,
                            borderRadius: 1,
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                          }}
                        >
                          <Typography sx={sceneAnchorStyles}>
                            {scene.sceneLabel} · {formatTime(scene.start)}
                          </Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>
                            {selectedTaxonomy}
                          </Typography>
                          <Chip
                            label={`${taxonomyData.headline} (${taxonomyData.chip})`}
                            size="small"
                            sx={{
                              height: 25.27,
                              borderRadius: '104.48px',
                              mt: 0.4,
                              mb: 0.8,
                              fontSize: 11.5,
                            }}
                          />
                          {taxonomyData.sections.map((section) => (
                            <Box key={`${scene.id}-${selectedTaxonomy}-${section.label}`}>
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
                      })
                    })()}
                  </Stack>
                  )}
                </Box>
              </Paper>
            )}

            {visiblePanels.includes('product') && (
              <Paper elevation={0} sx={{ ...panelPaperStyles, height: visiblePanels.length === 1 ? 549 : '100%' }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1, py: 0.75, borderBottom: '0.73px solid rgba(0,0,0,0.18)' }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <ShoppingCartOutlinedIcon sx={{ fontSize: 16, color: '#4f4f4f' }} />
                    <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
                      Products
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.25}>
                    <IconButton size="small" sx={panelHeaderIconButtonStyles} onClick={() => onOpenExpandedPanel('product')}>
                      <PanelGlyph variant="expand" color="#ED005E" />
                    </IconButton>
                    <IconButton size="small" sx={panelHeaderIconButtonStyles} onClick={() => onCloseDemoPanel('product')}>
                      <CloseOutlinedIcon sx={panelHeaderActionIconSx} />
                    </IconButton>
                  </Stack>
                </Stack>
                <Box ref={productScrollContainerRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 0.9 }}>
                  {productsUnavailableMessage ? (
                    <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
                        {productsUnavailableMessage}
                      </Typography>
                    </Box>
                  ) : productEntries.length === 0 ? (
                    <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
                        No product matches detected yet.
                      </Typography>
                    </Box>
                  ) : !hasReachedFirstProduct ? (
                    <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
                        Waiting for the first product match…
                      </Typography>
                    </Box>
                  ) : (
                    productEntries.map((entry, index) => {
                      // Progressive reveal: the collapsed panel only renders
                      // products whose scene has already been reached on the
                      // playback timeline (i.e. index <= activeProductIndex).
                      // Without this gate, every segment-A product is mounted
                      // up front and the user can scroll – or simply see in
                      // the viewport – products from scenes far ahead of
                      // playback (e.g. Scene 26 visible while playback is on
                      // Scene 4). This mirrors the Taxonomy panel's
                      // `index > activeSceneIndex` gate so both collapsed
                      // panels reveal in lockstep with the timeline. The
                      // Expanded dialog renders everything regardless.
                      if (index > activeProductIndex) {
                        productRefs.current[index] = null
                        return null
                      }
                      // First product of each scene gets the shared scene anchor
                      // rendered inside the same wrapper as the product card.
                      // The wrapper is what `productRefs` points at, so the
                      // RAF auto-scroll naturally lands on the anchor (when
                      // present) instead of the card – this keeps the header
                      // visible as we cross into a new scene group.
                      const isFirstOfScene =
                        index === 0 || productEntries[index - 1].sceneId !== entry.sceneId
                      return (
                        <Box
                          key={`${entry.sceneId}-${entry.id}`}
                          ref={(el: HTMLDivElement | null) => {
                            productRefs.current[index] = el
                          }}
                          sx={{
                            px: 0.75,
                            pt: isFirstOfScene ? 1.05 : 0.6,
                            pb: 1.05,
                            borderBottom: '1px solid #e6e6e6',
                            backgroundColor: 'transparent',
                            borderLeft: '3px solid transparent',
                          }}
                        >
                          {isFirstOfScene && (
                            <Typography sx={sceneAnchorStyles}>
                              {entry.sceneLabel} · {formatTime(entry.sceneStart)}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1.2}>
                            <Box
                              component="img"
                              src={entry.image}
                              alt={entry.name}
                              onError={(event) => {
                                const img = event.currentTarget as HTMLImageElement
                                if (img.src !== window.location.origin + PRODUCT_PLACEHOLDER_IMAGE) {
                                  img.src = PRODUCT_PLACEHOLDER_IMAGE
                                }
                              }}
                              sx={{
                                width: 54,
                                height: 54,
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
                    })
                  )}
                </Box>
              </Paper>
            )}

            {visiblePanels.includes('json') && (
              <Paper
                elevation={0}
                sx={{
                  ...panelPaperStyles,
                  height: visiblePanels.length === 1 ? 549 : '100%',
                  backgroundColor: '#303841',
                  color: '#fff',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1, py: 0.75, borderBottom: '0.73px solid rgba(255,255,255,0.22)' }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <DataObjectOutlinedIcon sx={{ fontSize: 16, color: '#d8e3f1' }} />
                    <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
                      JSON
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.25}>
                    <IconButton size="small" sx={panelHeaderIconButtonDarkStyles} onClick={() => onOpenExpandedPanel('json')}>
                      <PanelGlyph variant="expand" color="#ffffff" />
                    </IconButton>
                    <IconButton size="small" sx={panelHeaderIconButtonDarkStyles} onClick={onOpenJsonDownload}>
                      <DownloadOutlinedIcon sx={panelHeaderActionIconSx} />
                    </IconButton>
                    <IconButton size="small" sx={panelHeaderIconButtonDarkStyles} onClick={() => onCloseDemoPanel('json')}>
                      <CloseOutlinedIcon sx={panelHeaderActionIconSx} />
                    </IconButton>
                  </Stack>
                </Stack>
                <Box ref={jsonScrollContainerRef} sx={{ px: 1.05, pt: 0.8, pb: 1.1, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {isSyncImpulseMode && isAdBreakPlayback ? (
                    <Box sx={{ p: 0.85 }}>
                      <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.5 }}>
                        {activeScene.sceneLabel} @ {formatTime(videoCurrentSeconds)}
                      </Typography>
                      <Typography
                        component="pre"
                        sx={{
                          m: 0,
                          mb: 0.4,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 10.4,
                          lineHeight: 1.45,
                          color: '#f3f7fd',
                        }}
                      >
                        {`{
  "${activeAdBreakLabel}"
}
:`}
                      </Typography>
                      <Typography
                        component="pre"
                        sx={{
                          m: 0,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 10.4,
                          lineHeight: 1.45,
                          color: '#F05BB8',
                        }}
                      >
                        {buildAdBreakJsonString(activeAdBreakLabel, adDecisionPayload, adDecisioningTail)}
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={0.9}>
                      {playbackScenes.map((scene, index) => {
                        if (index > activeSceneIndex || scene.isEmpty) {
                          jsonRefs.current[index] = null
                          return null
                        }
                        return (
                        <Box
                          key={scene.id}
                          ref={(el: HTMLDivElement | null) => {
                            jsonRefs.current[index] = el
                          }}
                          sx={{
                            p: 0.85,
                            borderRadius: 1,
                            backgroundColor: 'transparent',
                            border: '1px solid transparent',
                          }}
                        >
                          <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.4 }}>
                            {scene.sceneLabel} @ {formatTime(scene.start)}
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
                            {JSON.stringify(buildSceneJsonPayload(scene, index), null, 2)}
                          </Typography>
                        </Box>
                      )
                      })}
                    </Stack>
                  )}
                </Box>
              </Paper>
            )}
          </Box>

          <Box sx={{ pt: 2, pb: 2 }}>
            <Box
              sx={{
                width: 'fit-content',
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.25,
              }}
            >
              <Tooltip
                title="Taxonomies"
                arrow
                placement="bottom"
                slotProps={{
                  tooltip: { sx: tooltipStyles },
                  arrow: { sx: { color: '#666' } },
                }}
              >
                <Box
                  role="button"
                  onClick={() => onToggleDemoPanel('taxonomy')}
                  sx={navButtonStyles(activeDemoPanels.includes('taxonomy'))}
                >
                  <Box component="img" src="/assets/elements/taxo-btn.svg" alt="Taxonomy panel" sx={{ width: 22, height: 22 }} />
                </Box>
              </Tooltip>

              <Box component="img" src="/assets/elements/divider-vertical.svg" alt="" aria-hidden sx={{ width: 1, height: 28, opacity: 0.85 }} />

              <Tooltip
                title="Product Match"
                arrow
                placement="bottom"
                slotProps={{
                  tooltip: { sx: tooltipStyles },
                  arrow: { sx: { color: '#666' } },
                }}
              >
                <Box
                  role="button"
                  onClick={() => onToggleDemoPanel('product')}
                  sx={navButtonStyles(activeDemoPanels.includes('product'))}
                >
                  <Box component="img" src="/assets/elements/product-btn.svg" alt="Product panel" sx={{ width: 22, height: 22 }} />
                </Box>
              </Tooltip>

              <Box component="img" src="/assets/elements/divider-vertical.svg" alt="" aria-hidden sx={{ width: 1, height: 28, opacity: 0.85 }} />

              <Tooltip
                title="JSON Response"
                arrow
                placement="bottom"
                slotProps={{
                  tooltip: { sx: tooltipStyles },
                  arrow: { sx: { color: '#666' } },
                }}
              >
                <Box
                  role="button"
                  onClick={() => onToggleDemoPanel('json')}
                  sx={navButtonStyles(activeDemoPanels.includes('json'))}
                >
                  <Box component="img" src="/assets/elements/json-btn.svg" alt="JSON panel" sx={{ width: 22, height: 22 }} />
                </Box>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  )
}
