import CloseIcon from '@mui/icons-material/Close'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material'
import { tierOptions } from '../../constants'
import { ENABLED_AD_MODE_IDS } from '../../ad-modes'
import { dropdownMagentaStyles } from '../../styles'
import type { AdPlaybackOption, TierOption } from '../../types'

type SelectorDialogProps = {
  open: boolean
  selectedTier: TierOption
  selectedAdPlayback: AdPlaybackOption
  onClose: () => void
  onStart: () => void
  onTierChange: (value: TierOption) => void
  onAdPlaybackChange: (value: AdPlaybackOption) => void
}

export function SelectorDialog({
  open,
  selectedTier,
  selectedAdPlayback,
  onClose,
  onStart,
  onTierChange,
  onAdPlaybackChange,
}: SelectorDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 762,
          maxWidth: '95vw',
          borderRadius: 2,
          border: '2px solid rgba(255,255,255,0.9)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ position: 'relative', p: 0, minHeight: 52 }}>
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 20, top: 20, color: 'primary.main' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 6, pt: 7, pb: 5.5, flex: '0 0 auto' }}>
        <Stack spacing={0} alignItems="center">
          <Typography
            variant="h4"
            color="text.primary"
            textAlign="center"
            sx={{ maxWidth: 760, fontSize: 26, lineHeight: 1.28, mb: 5.5 }}
          >
            Please select the Tier-level and
            <br />
            Ad Playback mode to start your Demo:
          </Typography>

          <Stack direction="row" spacing={2} width="100%">
            <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
              <InputLabel id="tier-select-label">Tier Selection</InputLabel>
              <Select
                labelId="tier-select-label"
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
              <InputLabel id="ad-playback-select-label">Ad Playback Mode</InputLabel>
              <Select
                labelId="ad-playback-select-label"
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
        <Button variant="outlined" onClick={onClose} sx={{ borderColor: '#ED005E80', color: 'primary.main', minWidth: 88 }}>
          CANCEL
        </Button>
        <Button variant="contained" onClick={onStart} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, minWidth: 76 }}>
          START
        </Button>
      </DialogActions>
    </Dialog>
  )
}
