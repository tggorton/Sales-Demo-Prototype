import { Box, Button, Dialog, DialogContent, Stack, Typography } from '@mui/material'

type VerifyEmailDialogProps = {
  open: boolean
  onClose: () => void
}

export function VerifyEmailDialog({ open, onClose }: VerifyEmailDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 444,
          maxWidth: '95vw',
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow:
            '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogContent sx={{ px: 3, pt: 3.2, pb: 2.4 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography sx={{ fontSize: 42, lineHeight: 1, color: 'primary.main' }}>✉</Typography>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 500, color: 'text.primary' }}>
              Verify your new email
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.8 }}>
              We sent you an email verification request.
            </Typography>
          </Box>
          <Stack spacing={1} sx={{ width: '100%', maxWidth: 300 }}>
            <Button variant="contained" onClick={onClose} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 600 }}>
              CHECK EMAIL APP
            </Button>
            <Button variant="outlined" onClick={onClose} sx={{ borderColor: '#ED005E80', color: 'primary.main', fontWeight: 600 }}>
              RESEND EMAIL
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
