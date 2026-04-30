import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
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
          width: 460,
          maxWidth: '95vw',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow:
            '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{ px: 3, pt: 2.25, pb: 1.75, color: 'text.primary', fontSize: 28, lineHeight: 1.2 }}
      >
        Schedule Report
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pt: 0.5, pb: 2, overflow: 'visible' }}>
        <FormControl fullWidth size="medium" sx={dropdownMagentaStyles}>
          <InputLabel id="json-download-select-label" shrink sx={{ px: 0.55, backgroundColor: '#fff', fontSize: 12 }}>
            Download Type
          </InputLabel>
          <Select
            labelId="json-download-select-label"
            value={selectedOption}
            label="Download Type"
            onChange={(event) => onOptionChange(event.target.value as JsonDownloadOption)}
            sx={{ minHeight: 52, fontSize: 16 }}
          >
            {jsonDownloadOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, justifyContent: 'flex-end', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            borderColor: '#ED005E80',
            color: 'primary.main',
            minWidth: 88,
            height: 32,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          CANCEL
        </Button>
        <Button
          variant="contained"
          onClick={onDownload}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
            minWidth: 119,
            height: 32,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          DOWNLOAD
        </Button>
      </DialogActions>
    </Dialog>
  )
}
