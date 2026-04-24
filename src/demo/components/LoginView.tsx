import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'

type LoginViewProps = {
  loginUsername: string
  loginPassword: string
  loginError?: string | null
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onLogin: () => void
}

export function LoginView({
  loginUsername,
  loginPassword,
  loginError,
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
      {/* Left pane: matches the Figma export – px 120 / py 0 outer frame with
          gap-20 (80px) between header and login section. Typography uses the MUI
          theme variants (h4 / h6 / button) rather than custom pixel sizes so the
          lock-up stays in sync with the rest of the app. */}
      <Box
        sx={{
          px: { xs: 6, md: '120px' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '80px',
        }}
      >
        <Stack spacing={3} component="header">
          <Stack direction="row" alignItems="center" spacing="15px" sx={{ width: 356 }}>
            <Box component="img" src="/assets/kerv-logo.svg" alt="Kerv logo" sx={{ width: 40, height: 40 }} />
            <Typography variant="h6" color="text.primary" noWrap>
              |&nbsp;&nbsp;Sales Demo Tool
            </Typography>
          </Stack>
          <Typography variant="h4" component="h1" color="text.primary">
            Welcome&nbsp;&nbsp;back!
            <br />
            Log in to your account.
          </Typography>
        </Stack>

        <Stack spacing={3} component="section" aria-labelledby="login-heading">
          <Typography variant="h6" component="h2" id="login-heading" color="text.primary">
            Log in
          </Typography>
          <Stack
            component="form"
            spacing={3}
            onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              onLogin()
            }}
          >
            <Stack spacing={2}>
              <TextField
                size="small"
                value={loginUsername}
                onChange={(event) => onUsernameChange(event.target.value)}
                placeholder="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
                error={Boolean(loginError)}
                fullWidth
              />
              <TextField
                size="small"
                value={loginPassword}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Password"
                type="password"
                autoComplete="current-password"
                error={Boolean(loginError)}
                helperText={loginError || ' '}
                FormHelperTextProps={{ sx: { mx: 0 } }}
                fullWidth
              />
            </Stack>
            <Stack spacing={1.5}>
              <Button
                type="submit"
                variant="contained"
                sx={{ bgcolor: '#ED005E', '&:hover': { bgcolor: '#cf0052' } }}
              >
                LOG IN
              </Button>
              <Button
                type="button"
                variant="text"
                sx={{ color: '#ED005E', alignSelf: 'flex-start', px: 1, py: 0.75 }}
              >
                FORGOT YOUR PASSWORD?
              </Button>
            </Stack>
          </Stack>
        </Stack>
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
