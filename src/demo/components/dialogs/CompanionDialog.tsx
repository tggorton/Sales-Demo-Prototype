import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Box, Dialog, IconButton } from '@mui/material'

type CompanionDialogProps = {
  open: boolean
  selectedCompanionUrl: string
  onClose: () => void
}

export function CompanionDialog({ open, selectedCompanionUrl, onClose }: CompanionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 340,
          maxWidth: '92vw',
          height: 760,
          maxHeight: '90vh',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          boxShadow:
            '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
        },
      }}
    >
      <IconButton
        aria-label="close companion modal"
        onClick={onClose}
        sx={{ position: 'absolute', right: 10, top: 8, color: 'primary.main', zIndex: 2 }}
      >
        <CloseOutlinedIcon />
      </IconButton>
      <Box sx={{ p: 2, pt: 5, height: '100%' }}>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            border: '1px solid rgba(0,0,0,0.16)',
            bgcolor: '#fff',
            overflow: 'hidden',
          }}
        >
          <Box
            component="iframe"
            src={selectedCompanionUrl}
            title="Companion mobile experience"
            sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        </Box>
      </Box>
    </Dialog>
  )
}
