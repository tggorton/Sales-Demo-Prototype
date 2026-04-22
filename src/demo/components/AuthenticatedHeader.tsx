import { Box, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import type { MouseEvent as ReactMouseEvent } from 'react'

type AuthenticatedHeaderProps = {
  profileMenuAnchorEl: HTMLElement | null
  onOpenProfileMenu: (event: ReactMouseEvent<HTMLElement>) => void
  onCloseProfileMenu: () => void
  onOpenProfileDrawer: () => void
  onSignOut: () => void
}

export function AuthenticatedHeader({
  profileMenuAnchorEl,
  onOpenProfileMenu,
  onCloseProfileMenu,
  onOpenProfileDrawer,
  onSignOut,
}: AuthenticatedHeaderProps) {
  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            role="button"
            component="img"
            src="/assets/kerv-logo.svg"
            alt="Kerv logo"
            sx={{ width: 40, height: 40, cursor: 'pointer' }}
          />
          <Typography
            color="text.primary"
            sx={{ fontWeight: 500, fontSize: 22, lineHeight: '32px', opacity: 0.87 }}
          >
            | Sales Demo Tool
          </Typography>
        </Stack>

        <IconButton sx={{ color: '#ED005E' }} onClick={onOpenProfileMenu}>
          <PersonIcon />
        </IconButton>
      </Stack>

      <Menu
        anchorEl={profileMenuAnchorEl}
        open={Boolean(profileMenuAnchorEl)}
        onClose={onCloseProfileMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: 1.1,
              mt: 0.8,
            },
          },
        }}
      >
        <MenuItem onClick={onOpenProfileDrawer} sx={{ fontSize: 14 }}>
          Profile
        </MenuItem>
        <MenuItem onClick={onSignOut} sx={{ fontSize: 14, color: '#9A1B52' }}>
          Sign Out
        </MenuItem>
      </Menu>
    </>
  )
}
