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
import { PanelGlyph } from './PanelGlyph'
import { PRODUCT_PLACEHOLDER_IMAGE } from '../constants'
import { buildAdBreakJsonString, buildSceneJsonPayload } from '../utils/jsonExport'
import { panelHeaderActionIconSx, panelHeaderIconButtonDarkStyles, panelHeaderIconButtonStyles, taxonomyAutocompleteStyles } from '../styles'
import { getTaxonomySceneData } from '../data/taxonomySceneData'
import type {
  AdDecisioningTailItem,
  ExpandedPanel,
  ProductEntry,
  SceneMetadata,
  TaxonomyOption,
} from '../types'
import { formatTime } from '../utils/formatTime'

type ExpandedPanelDialogProps = {
  expandedPanel: ExpandedPanel
  expandedSelectedTaxonomies: TaxonomyOption[]
  playbackScenes: SceneMetadata[]
  productEntries: ProductEntry[]
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
                      '&.Mui-checked': { color: '#ED005E' },
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
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}>
            {expandedSelectedTaxonomies.length > 0 &&
            expandedSelectedTaxonomies.every((taxonomy) => !taxonomyAvailability[taxonomy]) ? (
              <Box sx={{ px: 1.5, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ fontSize: 14, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
                  {expandedSelectedTaxonomies.length === 1
                    ? `No ${expandedSelectedTaxonomies[0].toLowerCase()} information currently`
                    : 'No information currently for the selected taxonomies'}
                </Typography>
              </Box>
            ) : (
            <Stack spacing={0.9}>
              {playbackScenes.map((scene, index) => {
                if (index > activeSceneIndex) return null
                const rows = expandedSelectedTaxonomies
                  .map((taxonomy) => ({ taxonomy, data: getTaxonomySceneData(scene, index, taxonomy) }))
                  .filter((row): row is { taxonomy: typeof row.taxonomy; data: NonNullable<typeof row.data> } => row.data !== null)
                if (expandedSelectedTaxonomies.length > 0 && rows.length === 0) return null
                return (
                  <Box key={`expanded-${scene.id}`} sx={{ p: 1.1 }}>
                    <Typography sx={{ fontSize: 28, color: '#A1A1A1', lineHeight: 1, mb: 0.35, opacity: 0.95 }}>
                      {scene.sceneLabel}
                    </Typography>
                    {rows.map(({ taxonomy, data }) => (
                      <Box key={`${scene.id}-${taxonomy}`} sx={{ mb: 1.05 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>{taxonomy}</Typography>
                        <Chip
                          label={`${data.headline} (${data.chip})`}
                          size="small"
                          sx={{ height: 25.27, borderRadius: '104.48px', mt: 0.4, mb: 0.8, fontSize: 11.5 }}
                        />
                        {data.sections.map((section) => (
                          <Box key={`${scene.id}-${taxonomy}-${section.label}`}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>{section.label}</Typography>
                            <Typography sx={{ fontSize: 12, mb: 0.7, lineHeight: 1.35, opacity: 0.87 }}>
                              {section.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ))}
                    {expandedSelectedTaxonomies.length === 0 && (
                      <Typography sx={{ fontSize: 12, color: 'rgba(0,0,0,0.54)', mt: 0.8 }}>
                        Select one or more taxonomies to view scene details.
                      </Typography>
                    )}
                  </Box>
                )
              })}
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
            <Typography sx={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
              {productsUnavailableMessage}
            </Typography>
          </Box>
        )
      }
      if (productEntries.length === 0) {
        return (
          <Box sx={{ px: 4, py: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
              No product matches detected yet.
            </Typography>
          </Box>
        )
      }
      if (!hasReachedFirstProduct) {
        return (
          <Box sx={{ px: 4, py: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 1.4 }}>
              Waiting for the first product match…
            </Typography>
          </Box>
        )
      }
      return (
        <Box sx={{ px: 2, py: 1.25, height: '100%', overflowY: 'auto' }}>
          {productEntries.map((entry) => (
            <Box key={`expanded-${entry.sceneId}-${entry.id}`} sx={{ px: 0.9, py: 1.2, borderBottom: '1px solid #e6e6e6' }}>
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
                  sx={{ width: 64, height: 64, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17, lineHeight: 1.1 }}>{entry.name}</Typography>
                  <Typography
                    sx={{
                      color: '#666',
                      fontSize: 12.5,
                      mt: 0.2,
                      lineHeight: 1.3,
                      opacity: 0.87,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {entry.description}
                  </Typography>
                  <Typography sx={{ color: '#A1A1A1', fontSize: 11, mt: 0.25 }}>
                    {entry.sceneLabel} · {formatTime(entry.sceneStart)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      )
    }

    return (
      <Box sx={{ px: 1.6, pt: 1.2, pb: 1.4, height: '100%', overflowY: 'auto', backgroundColor: '#303841' }}>
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
              if (index > activeSceneIndex || scene.isEmpty) return null
              return (
              <Box key={`expanded-${scene.id}`} sx={{ p: 0.85 }}>
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
