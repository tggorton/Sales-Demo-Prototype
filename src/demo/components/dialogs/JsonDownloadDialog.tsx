import CloseIcon from '@mui/icons-material/Close'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { jsonDownloadOptions } from '../../constants'
import { dropdownMagentaStyles } from '../../styles'
import type { JsonDownloadOption } from '../../types'

type JsonDownloadDialogProps = {
  open: boolean
  selectedOption: JsonDownloadOption
  onClose: () => void
  onDownload: () => void
  onOptionChange: (value: JsonDownloadOption) => void
}

/**
 * Restyled to match `SelectorDialog`'s visual treatment:
 *   - white glass border + softer shadow
 *   - empty title slot with a top-right close button
 *   - centered heading + dropdown rendered as DialogContent
 *   - centered DialogActions with a top-border separator
 *
 * The original implementation used a `<InputLabel shrink>` with a hard-
 * coded `backgroundColor: '#fff'` to mask the input border underneath
 * the floating label — which rendered as a misaligned solid-white pill
 * over the otherwise translucent modal. Removed; standard MUI floating
 * label sits cleanly on the dialog's solid `Paper` surface.
 */
export function JsonDownloadDialog({
  open,
  selectedOption,
  onClose,
  onDownload,
  onOptionChange,
}: JsonDownloadDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 480,
          maxWidth: '95vw',
          borderRadius: 2,
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ position: 'relative', p: 0, minHeight: 52 }}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 20, top: 20, color: 'primary.main' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 6, pt: 4, pb: 4.5, flex: '0 0 auto' }}>
        <Stack spacing={3.5} alignItems="center">
          <Typography
            variant="h4"
            color="text.primary"
            textAlign="center"
            sx={{ fontSize: 26, lineHeight: 1.28 }}
          >
            Download JSON
          </Typography>

          <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
            <InputLabel id="json-download-select-label">Download Type</InputLabel>
            <Select
              labelId="json-download-select-label"
              value={selectedOption}
              label="Download Type"
              onChange={(event) => onOptionChange(event.target.value as JsonDownloadOption)}
            >
              {jsonDownloadOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: 'center',
          gap: 1,
          px: 3,
          py: 2,
          borderTop: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ borderColor: '#ED005E80', color: 'primary.main', minWidth: 88 }}
        >
          CANCEL
        </Button>
        <Button
          variant="contained"
          onClick={onDownload}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
            minWidth: 110,
          }}
        >
          DOWNLOAD
        </Button>
      </DialogActions>
    </Dialog>
  )
}
