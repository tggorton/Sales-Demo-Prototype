import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useRef } from 'react'
import { PanelGlyph } from '../primitives/PanelGlyph'
import { TaxonomySceneCard, type TaxonomyRow } from '../cards/TaxonomySceneCard'
import { ProductCard } from '../cards/ProductCard'
import { JsonSceneCard } from '../cards/JsonSceneCard'
import { TAXONOMY_DEDUPE_WINDOW_SECONDS } from '../../constants'
import { buildAdBreakJsonString } from '../../utils/jsonExport'
import {
  panelHeaderActionIconSx,
  panelHeaderIconButtonDarkStyles,
  panelHeaderIconButtonStyles,
  taxonomyAutocompleteStyles,
} from '../../styles'
import { getTaxonomySceneData } from '../../data/taxonomySceneData'
import type {
  AdDecisioningTailItem,
  ExpandedPanel,
  ProductEntry,
  SceneMetadata,
  TaxonomyOption,
} from '../../types'
import { formatTime } from '../../utils/formatTime'

type ExpandedPanelDialogProps = {
  expandedPanel: ExpandedPanel
  expandedSelectedTaxonomies: TaxonomyOption[]
  playbackScenes: SceneMetadata[]
  /** Segment-isolated product list — same array the inline collapsed
   *  panel uses, so `activeProductIndex` lines up across both views. */
  productEntries: ProductEntry[]
  /** Index into `productEntries` of the product the inline panel is
   *  currently centered on. Drives the open-time scroll target so the
   *  expanded view lands on the EXACT same product, not just the first
   *  product of the active scene. */
  activeProductIndex: number
  productsUnavailableMessage: string | null
  hasReachedFirstProduct: boolean
  taxonomyAvailability: Record<TaxonomyOption, boolean>
  availableTaxonomies: TaxonomyOption[]
  activeSceneIndex: number
  isSyncImpulseMode: boolean
  isAdBreakPlayback: boolean
  activeScene: SceneMetadata
  activeAdBreakLabel: string
  adDecisionPayload: Record<string, unknown>
  adDecisioningTail: AdDecisioningTailItem[]
  videoCurrentSeconds: number
  onClose: () => void
  onOpenJsonDownload: () => void
  onExpandedTaxonomiesChange: (value: TaxonomyOption[]) => void
}

export function ExpandedPanelDialog({
  expandedPanel,
  expandedSelectedTaxonomies,
  playbackScenes,
  productEntries,
  activeProductIndex,
  productsUnavailableMessage,
  hasReachedFirstProduct,
  taxonomyAvailability,
  availableTaxonomies,
  activeSceneIndex,
  isSyncImpulseMode,
  isAdBreakPlayback,
  activeScene,
  activeAdBreakLabel,
  adDecisionPayload,
  adDecisioningTail,
  videoCurrentSeconds,
  onClose,
  onOpenJsonDownload,
  onExpandedTaxonomiesChange,
}: ExpandedPanelDialogProps) {
  // Single scroll container ref – only one panel is rendered at a time, so we
  // bind whichever panel's outer scroll Box is currently mounted.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Phase 9a — compute the open-time scroll anchor. Two anchor families:
  //
  //   - `targetProductAnchorId` for the Products panel: pinpoints the
  //     EXACT product entry the inline panel is centered on. Every
  //     expanded ProductCard carries `data-product-anchor={entry.id}`,
  //     so the scroll lands on the exact card regardless of how many
  //     products share its scene. Resolved via `activeProductIndex`,
  //     which is computed against the same segment-isolated list both
  //     panels render — so the indices line up by construction.
  //
  //   - `targetSceneAnchorId` for the Taxonomy + JSON panels and as a
  //     fallback for Products when the index is out of range. Each
  //     scene wrapper carries `data-scene-anchor={scene.id}`.
  let targetProductAnchorId: string | null = null
  let targetSceneAnchorId: string | null = null
  if (expandedPanel === 'taxonomy' || expandedPanel === 'json') {
    targetSceneAnchorId = activeScene?.id ?? null
  } else if (expandedPanel === 'product' && productEntries.length > 0) {
    const activeEntry =
      activeProductIndex >= 0 && activeProductIndex < productEntries.length
        ? productEntries[activeProductIndex]
        : null
    if (activeEntry) {
      targetProductAnchorId = activeEntry.id
      targetSceneAnchorId = activeEntry.sceneId
    } else {
      // Pre-product stretch (DHYH color-bar intro). Fall back to the
      // first product so the panel doesn't render mid-list with the
      // user disoriented.
      targetSceneAnchorId = productEntries[0].sceneId
    }
  }

  // Scroll to the active anchor on open. We run after layout via rAF so
  // the dialog's transition has had a tick to render its content
  // (otherwise offsetTop is 0 and we'd no-op). Re-runs on subsequent
  // scrubs are wired in Phase 9b; for now this fires once per open.
  useEffect(() => {
    if (!expandedPanel) return
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const container = scrollContainerRef.current
        if (!container) return
        // Prefer the per-product anchor (Products panel only); fall back
        // to the per-scene anchor for Taxonomy + JSON, and for the
        // Products pre-product stretch where there's no entry yet.
        const productSelector = targetProductAnchorId
          ? `[data-product-anchor="${targetProductAnchorId}"]`
          : null
        const sceneSelector = targetSceneAnchorId
          ? `[data-scene-anchor="${targetSceneAnchorId}"]`
          : null
        const target =
          (productSelector
            ? container.querySelector<HTMLElement>(productSelector)
            : null) ??
          (sceneSelector
            ? container.querySelector<HTMLElement>(sceneSelector)
            : null)
        if (!target) return
        container.scrollTop = Math.max(0, target.offsetTop - 12)
      })
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
    // Keyed on `expandedPanel` only — the scroll fires once per open.
    // Phase 9b will add scrub-driven re-syncs alongside this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedPanel])

  const renderExpandedPanelContent = () => {
    if (expandedPanel === 'taxonomy') {
      return (
        <Box sx={{ px: 2.5, py: 2, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ px: 0.5, pb: 1.25 }}>
            {/* Expanded-mode taxonomy picker.
                Unlike the collapsed inline panel (which is a single-value <Select>),
                the expanded view is an MUI Autocomplete in `multiple` mode so
                testers can stack several taxonomies at once. Each selected
                taxonomy appears as a removable chip inside the input, and the
                dropdown shows a checkbox next to every option so the selected
                state is always obvious. `disableCloseOnSelect` keeps the menu
                open while multiple items are toggled, and `isOptionEqualToValue`
                keeps identity correct when the array state swaps references. */}
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={availableTaxonomies}
              value={expandedSelectedTaxonomies}
              onChange={(_, value) => onExpandedTaxonomiesChange(value)}
              isOptionEqualToValue={(option, value) => option === value}
              getOptionLabel={(option) => option}
              sx={taxonomyAutocompleteStyles}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{ height: 25.27, borderRadius: '104.48px', fontSize: 11.5 }}
                  />
                ))
              }
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                    size="small"
                    checked={selected}
                    sx={{
                      mr: 1,
                      p: 0.5,
                      color: 'rgba(0,0,0,0.54)',
                      '&.Mui-checked': { color: 'primary.main' },
                    }}
                  />
                  <Typography sx={{ fontSize: 13 }}>{option}</Typography>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Taxonomies"
                  placeholder={
                    expandedSelectedTaxonomies.length === 0
                      ? 'Select one or more taxonomies…'
                      : ''
                  }
                />
              )}
            />
          </Box>
          <Box ref={scrollContainerRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}>
            {expandedSelectedTaxonomies.length > 0 &&
            expandedSelectedTaxonomies.every((taxonomy) => !taxonomyAvailability[taxonomy]) ? (
              <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
                  {expandedSelectedTaxonomies.length === 1
                    ? `No ${expandedSelectedTaxonomies[0].toLowerCase()} information currently`
                    : 'No information currently for the selected taxonomies'}
                </Typography>
              </Box>
            ) : (
            <Stack spacing={0.9}>
              {(() => {
                // Per-taxonomy time-windowed dedupe (mirrors the collapsed
                // view and the products policy). We track the most recently
                // emitted headline + scene start *per taxonomy* so suppressing
                // an Emotion duplicate doesn't suppress a Sentiment row that
                // happens to live on the same scene. A scene that ends up
                // with zero rows after dedupe is dropped entirely.
                const lastHeadline = new Map<TaxonomyOption, string>()
                const lastEmittedAt = new Map<TaxonomyOption, number>()
                return playbackScenes.map((scene, index) => {
                  if (index > activeSceneIndex) return null
                  const rows: TaxonomyRow[] = expandedSelectedTaxonomies
                    .map((taxonomy) => ({
                      taxonomy,
                      data: getTaxonomySceneData(scene, index, taxonomy),
                    }))
                    .filter(
                      (
                        row
                      ): row is TaxonomyRow =>
                        row.data !== null
                    )
                    .filter(({ taxonomy, data }) => {
                      if (TAXONOMY_DEDUPE_WINDOW_SECONDS <= 0) return true
                      const prevHeadline = lastHeadline.get(taxonomy)
                      const prevAt = lastEmittedAt.get(taxonomy) ?? -Infinity
                      if (
                        prevHeadline === data.headline &&
                        scene.start - prevAt < TAXONOMY_DEDUPE_WINDOW_SECONDS
                      ) {
                        return false
                      }
                      lastHeadline.set(taxonomy, data.headline)
                      lastEmittedAt.set(taxonomy, scene.start)
                      return true
                    })
                  if (expandedSelectedTaxonomies.length > 0 && rows.length === 0) return null
                  return (
                    <Box key={`expanded-${scene.id}`}>
                      <TaxonomySceneCard
                        sceneLabel={scene.sceneLabel}
                        sceneStart={scene.start}
                        rows={rows}
                        variant="expanded"
                        dataSceneAnchorId={scene.id}
                      />
                      {expandedSelectedTaxonomies.length === 0 && (
                        <Typography
                          sx={{ fontSize: 12, color: 'rgba(0,0,0,0.54)', mt: 0.8, px: 1.1 }}
                        >
                          Select one or more taxonomies to view scene details.
                        </Typography>
                      )}
                    </Box>
                  )
                })
              })()}
            </Stack>
            )}
          </Box>
        </Box>
      )
    }

    if (expandedPanel === 'product') {
      if (productsUnavailableMessage) {
        return (
          <Box sx={{ px: 4, py: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 16, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
              {productsUnavailableMessage}
            </Typography>
          </Box>
        )
      }
      if (productEntries.length === 0) {
        return (
          <Box sx={{ px: 4, py: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 16, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
              No product matches detected yet.
            </Typography>
          </Box>
        )
      }
      if (!hasReachedFirstProduct) {
        return (
          <Box sx={{ px: 4, py: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 16, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
              Waiting for the first product match…
            </Typography>
          </Box>
        )
      }
      return (
        <Box ref={scrollContainerRef} sx={{ px: 2, py: 1.25, height: '100%', overflowY: 'auto' }}>
          {productEntries.map((entry, index) => {
            const isFirstOfScene =
              index === 0 || productEntries[index - 1].sceneId !== entry.sceneId
            return (
              <ProductCard
                key={`expanded-${entry.sceneId}-${entry.id}`}
                entry={entry}
                showSceneAnchor={isFirstOfScene}
                variant="expanded"
                // Per-scene anchor only on the first product of each
                // scene group (matches the inline panel and feeds the
                // dialog's scene-level fallback selector).
                dataSceneAnchorId={isFirstOfScene ? entry.sceneId : undefined}
                // Per-product anchor on EVERY card so the open-time
                // scroll can land on the exact product the inline panel
                // was centered on, not just the first product of its
                // scene (Phase 9a sync hardening).
                dataProductAnchorId={entry.id}
              />
            )
          })}
        </Box>
      )
    }

    return (
      <Box
        ref={scrollContainerRef}
        sx={{ px: 1.6, pt: 1.2, pb: 1.4, height: '100%', overflowY: 'auto', backgroundColor: '#303841' }}
      >
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
          // Expanded dialog renders every meaningful scene's full JSON
          // ungrouped — this is the "drill-down" view, where the audience
          // wants to see actual per-scene data. Grouping (merging adjacent
          // same-beat scenes into single cards) only applies to the inline
          // collapsed panel where compactness matters more than completeness.
          <Stack spacing={0.9}>
            {playbackScenes.map((scene, index) => {
              if (index > activeSceneIndex || scene.isEmpty) return null
              return (
                <JsonSceneCard
                  key={`expanded-${scene.id}`}
                  scene={scene}
                  sceneIndex={index}
                  dataSceneAnchorId={scene.id}
                />
              )
            })}
          </Stack>
        )}
      </Box>
    )
  }

  return (
    <Dialog
      open={expandedPanel !== null}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 980,
          maxWidth: '94vw',
          height: 760,
          maxHeight: '88vh',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1,
          borderBottom:
            expandedPanel === 'json' ? '0.73px solid rgba(255,255,255,0.22)' : '0.73px solid rgba(0,0,0,0.18)',
          bgcolor: expandedPanel === 'json' ? '#303841' : '#fff',
          color: expandedPanel === 'json' ? '#fff' : 'inherit',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.8}>
          {expandedPanel === 'taxonomy' && (
            <Box component="img" src="/assets/elements/taxo-btn.svg" alt="" aria-hidden sx={{ width: 16, height: 16, opacity: 0.8 }} />
          )}
          {expandedPanel === 'product' && (
            <ShoppingCartOutlinedIcon sx={{ fontSize: 16, color: '#4f4f4f' }} />
          )}
          {expandedPanel === 'json' && (
            <DataObjectOutlinedIcon sx={{ fontSize: 16, color: '#d8e3f1' }} />
          )}
          <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
            {expandedPanel === 'taxonomy'
              ? 'Taxonomies'
              : expandedPanel === 'product'
                ? 'Products'
                : 'JSON'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.25}>
          {expandedPanel === 'json' && (
            <IconButton size="small" onClick={onOpenJsonDownload} sx={panelHeaderIconButtonDarkStyles}>
              <DownloadOutlinedIcon sx={panelHeaderActionIconSx} />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            sx={expandedPanel === 'json' ? panelHeaderIconButtonDarkStyles : panelHeaderIconButtonStyles}
          >
            <PanelGlyph variant="collapse" color={expandedPanel === 'json' ? '#ffffff' : '#ED005E'} />
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, bgcolor: expandedPanel === 'json' ? '#303841' : '#fff' }}>
        {renderExpandedPanelContent()}
      </Box>
    </Dialog>
  )
}
