import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
  Button,
} from '@mui/material'
import { useMemo, type MutableRefObject } from 'react'
import { PanelGlyph } from './primitives/PanelGlyph'
import { VideoPlayer } from './player/VideoPlayer'
import { TaxonomySceneCard } from './cards/TaxonomySceneCard'
import { ProductCard } from './cards/ProductCard'
import { JsonSceneCard } from './cards/JsonSceneCard'
import {
  TAXONOMY_DEDUPE_WINDOW_SECONDS,
  tierOptions,
} from '../constants'
import { ENABLED_AD_MODE_IDS } from '../ad-modes'
import { formatTime } from '../utils/formatTime'
import { buildAdBreakJsonString } from '../utils/jsonExport'
import { groupJsonScenes, type JsonSceneGroup } from '../utils/jsonPanelGroups'
import {
  dropdownMagentaStyles,
  navButtonStyles,
  panelHeaderActionIconSx,
  panelHeaderIconButtonDarkStyles,
  panelHeaderIconButtonStyles,
  panelPaperStyles,
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
  // (Ad-creative parallel-playback logic moved into player/VideoPlayer.tsx
  // as part of Phase 4b. The Map of mounted ad-video elements + the two
  // effects that forward the active element to adVideoRef and drive
  // play/pause for all elements during the break now live entirely in that
  // component.)

  // Group adjacent scenes with the same content fingerprint into a single
  // JSON-panel card. Scenes in DHYH are emitted at scene-cut granularity (often
  // 1–3s) and adjacent cuts within the same beat carry near-identical signal
  // values, which historically made the JSON panel render a flood of
  // near-duplicate blocks. The fingerprint excludes sentiment so subtle
  // host-reaction shifts don't fragment the panel; the merged card's JSON
  // still includes the underlying sentiment values. See
  // src/demo/utils/jsonPanelGroups.ts for the fingerprint definition.
  const jsonGroups = useMemo(
    () => groupJsonScenes(playbackScenes, activeSceneIndex),
    [playbackScenes, activeSceneIndex]
  )
  // Map each scene index → its group, so the JSON-panel render below can
  // skip non-lead scenes in O(1) (the lead scene's ref callback claims all
  // its sibling indices and the others return null).
  const jsonGroupBySceneIndex = useMemo(() => {
    const map = new Map<number, JsonSceneGroup>()
    for (const group of jsonGroups) {
      for (const idx of group.sceneIndices) map.set(idx, group)
    }
    return map
  }, [jsonGroups])

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
                sx={{ color: 'primary.main', width: 'fit-content', p: 0 }}
              >
                Back to Content Selection
              </Button>
              <Typography sx={{ color: 'rgba(0,0,0,0.38)' }}>|</Typography>
              <Typography sx={{ color: 'text.primary', fontWeight: 500, letterSpacing: 0.2 }}>
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
                  {ENABLED_AD_MODE_IDS.map((option) => (
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
            <VideoPlayer
              visiblePanelCount={visiblePanels.length}
              contentVideoRef={contentVideoRef}
              adVideoRef={adVideoRef}
              mainVideoSrc={mainVideoSrc}
              activeAdVideoUrl={activeAdVideoUrl}
              activeAdBreakImage={activeAdBreakImage}
              activeAdQrImage={activeAdQrImage}
              isVideoPlaying={isVideoPlaying}
              isVideoMuted={isVideoMuted}
              isAdBreakPlayback={isAdBreakPlayback}
              isSyncImpulseMode={isSyncImpulseMode}
              shouldShowInContentCta={shouldShowInContentCta}
              inContentCtaText={activeScene.cta}
              videoCurrentSeconds={videoCurrentSeconds}
              playbackDurationSeconds={playbackDurationSeconds}
              displayedCurrentSeconds={displayedCurrentSeconds}
              displayedDurationSeconds={displayedDurationSeconds}
              impulseSegments={impulseSegments}
              playerControlTokens={playerControlTokens}
              onToggleVideoPlaying={onToggleVideoPlaying}
              onToggleVideoMuted={onToggleVideoMuted}
              onVideoTimeChange={onVideoTimeChange}
              onVideoMetadataLoaded={onVideoMetadataLoaded}
              onOpenCompanionModal={onOpenCompanionModal}
            />

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
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
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
                          <TaxonomySceneCard
                            key={scene.id}
                            sceneLabel={scene.sceneLabel}
                            sceneStart={scene.start}
                            rows={[{ taxonomy: selectedTaxonomy, data: taxonomyData }]}
                            variant="collapsed"
                            containerRef={(el) => {
                              taxonomyRefs.current[index] = el
                            }}
                          />
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
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
                        {productsUnavailableMessage}
                      </Typography>
                    </Box>
                  ) : productEntries.length === 0 ? (
                    <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
                        No product matches detected yet.
                      </Typography>
                    </Box>
                  ) : !hasReachedFirstProduct ? (
                    <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
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
                        <ProductCard
                          key={`${entry.sceneId}-${entry.id}`}
                          entry={entry}
                          showSceneAnchor={isFirstOfScene}
                          variant="collapsed"
                          containerRef={(el) => {
                            productRefs.current[index] = el
                          }}
                        />
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
                        const group = jsonGroupBySceneIndex.get(index)
                        if (!group) {
                          // Past activeSceneIndex or scene.isEmpty — not in any group.
                          jsonRefs.current[index] = null
                          return null
                        }
                        if (group.leadIndex !== index) {
                          // Non-lead scene in a group — the lead's ref callback
                          // claims this index, no card renders here.
                          return null
                        }
                        const isMerged = group.sceneIndices.length > 1
                        return (
                          <JsonSceneCard
                            key={scene.id}
                            scene={group.leadScene}
                            sceneIndex={group.leadIndex}
                            label={group.label}
                            startSec={group.startSec}
                            endSec={isMerged ? group.endSec : undefined}
                            containerRef={(el) => {
                              for (const idx of group.sceneIndices) {
                                jsonRefs.current[idx] = el
                              }
                            }}
                          />
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
