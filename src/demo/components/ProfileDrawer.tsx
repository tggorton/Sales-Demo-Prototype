import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Box, Button, Divider, Drawer, IconButton, Stack, TextField, Typography } from '@mui/material'

type ProfileDrawerProps = {
  open: boolean
  profileNameDraft: string
  profileEmailDraft: string
  isProfileEmailVerified: boolean
  onClose: () => void
  onSave: () => void
  onOpenVerifyEmail: () => void
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  inputStyles: object
}

export function ProfileDrawer({
  open,
  profileNameDraft,
  profileEmailDraft,
  isProfileEmailVerified,
  onClose,
  onSave,
  onOpenVerifyEmail,
  onNameChange,
  onEmailChange,
  inputStyles,
}: ProfileDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 430,
          maxWidth: '92vw',
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.4 }}>
          <Typography sx={{ fontSize: 26, fontWeight: 600, color: 'text.primary' }}>
            Profile
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: '#8b8b8b' }}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
        <Divider />

        <Stack spacing={2.4} sx={{ pt: 2.2 }}>
          <TextField
            fullWidth
            label="Name"
            size="small"
            value={profileNameDraft}
            onChange={(event) => onNameChange(event.target.value)}
            sx={inputStyles}
          />
          <Box>
            <Stack direction="row" spacing={1.2} alignItems="flex-start">
              <TextField
                fullWidth
                label="Email"
                size="small"
                value={profileEmailDraft}
                onChange={(event) => onEmailChange(event.target.value)}
                sx={inputStyles}
              />
              {!isProfileEmailVerified && (
                <Button
                  variant="outlined"
                  onClick={onOpenVerifyEmail}
                  sx={{
                    borderColor: '#ED005E80',
                    color: 'primary.main',
                    minWidth: 166,
                    height: 40,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(237,0,94,0.04)' },
                  }}
                >
                  RESEND EMAIL
                </Button>
              )}
            </Stack>
            {!isProfileEmailVerified && (
              <Typography sx={{ mt: 0.9, ml: 0.25, fontSize: 12, color: '#B0004D', fontWeight: 600 }}>
                Email not verified
              </Typography>
            )}
          </Box>
        </Stack>

        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Divider sx={{ mb: 1.2 }} />
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button variant="text" onClick={onClose} sx={{ color: 'rgba(0,0,0,0.54)', minWidth: 80 }}>
              CANCEL
            </Button>
            <Button variant="contained" onClick={onSave} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, minWidth: 80 }}>
              SAVE
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}
