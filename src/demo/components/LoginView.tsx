import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'

type LoginViewProps = {
  loginUsername: string
  loginPassword: string
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onLogin: () => void
}

export function LoginView({
  loginUsername,
  loginPassword,
  onUsernameChange,
  onPasswordChange,
  onLogin,
}: LoginViewProps) {
  return (
    <Paper
      sx={{
        width: 'min(100%, 1280px)',
        height: 'min(82vh, 760px)',
        mx: 'auto',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      <Box sx={{ p: { xs: 4, md: 6 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4.5 }}>
          <Box component="img" src="/assets/kerv-logo.svg" alt="Kerv logo" sx={{ width: 40, height: 40 }} />
          <Typography color="text.primary" sx={{ fontWeight: 500, fontSize: 34, lineHeight: 1, opacity: 0.87 }}>
            | Sales Demo Tool
          </Typography>
        </Stack>

        <Typography sx={{ fontSize: { xs: 42, md: 50 }, lineHeight: 1.2, color: 'rgba(0,0,0,0.87)', mb: 6 }}>
          Welcome back!
          <br />
          Log in to your account.
        </Typography>

        <Box sx={{ width: 'min(100%, 420px)' }}>
          <Typography sx={{ fontWeight: 600, fontSize: 36, color: 'rgba(0,0,0,0.87)', mb: 2.5 }}>
            Log in
          </Typography>
          <Stack spacing={1.4}>
            <TextField
              size="small"
              value={loginUsername}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="Email"
              fullWidth
            />
            <TextField
              size="small"
              value={loginPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Password"
              type="password"
              fullWidth
            />
            <Button
              variant="contained"
              onClick={onLogin}
              sx={{ mt: 1.2, bgcolor: '#ED005E', '&:hover': { bgcolor: '#cf0052' }, height: 42, fontWeight: 600 }}
            >
              LOG IN
            </Button>
            <Button
              variant="text"
              sx={{ mt: 0.2, color: '#A0245D', p: 0, justifyContent: 'flex-start', width: 'fit-content', fontWeight: 700 }}
            >
              FORGOT YOUR PASSWORD?
            </Button>
          </Stack>
        </Box>
      </Box>
      <Box
        component="img"
        src="/assets/login-hero.png"
        alt=""
        aria-hidden
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'calc(100% + 250px) center',
          display: 'block',
        }}
      />
    </Paper>
  )
}
