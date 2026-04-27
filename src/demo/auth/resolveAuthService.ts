import { CognitoAuthService } from './CognitoAuthService'
import { MockAuthService } from './MockAuthService'
import type { AuthProviderKind, AuthService } from './types'

// Resolves the active auth provider once at module load. The default is
// 'mock' so a fresh checkout / `npm run dev` keeps working without any env
// configuration. Setting VITE_AUTH_PROVIDER=cognito at build time switches
// to the real provider (which currently throws — see CognitoAuthService).
function readProviderKind(): AuthProviderKind {
  const raw = (import.meta.env as Record<string, string | undefined>).VITE_AUTH_PROVIDER
  if (raw === 'cognito') return 'cognito'
  return 'mock'
}

function buildAuthService(kind: AuthProviderKind): AuthService {
  switch (kind) {
    case 'cognito':
      return new CognitoAuthService()
    case 'mock':
    default:
      return new MockAuthService()
  }
}

export const activeAuthProvider: AuthProviderKind = readProviderKind()
export const authService: AuthService = buildAuthService(activeAuthProvider)
