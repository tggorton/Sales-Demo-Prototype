import {
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_NAME,
  DEMO_LOGIN_EMAIL,
  DEMO_LOGIN_PASSWORD,
} from '../constants'
import type { AuthService, SignInResult } from './types'

// Prototype auth: the only accepted credentials are the autofilled pair from
// constants.ts. Trim + case-insensitive email match so trivial whitespace/case
// tweaks still pass, but anything actually different is rejected. This
// preserves the exact behavior the original inline handleLogin had.
export class MockAuthService implements AuthService {
  async signIn(email: string, password: string): Promise<SignInResult> {
    const emailMatches = email.trim().toLowerCase() === DEMO_LOGIN_EMAIL.toLowerCase()
    const passwordMatches = password === DEMO_LOGIN_PASSWORD
    if (!emailMatches || !passwordMatches) {
      return { ok: false, error: 'Invalid email or password. Please try again.' }
    }
    return {
      ok: true,
      user: {
        id: 'mock-user',
        email: DEMO_LOGIN_EMAIL,
        name: DEFAULT_USER_NAME,
      },
    }
  }

  async signOut(): Promise<void> {
    // No-op for the mock. App.tsx still owns view-state and persisted session;
    // when we swap to Cognito this is where the real session teardown happens.
  }
}

// Re-exported here so consumers that want the constants for display purposes
// (e.g. the login form's autofill) don't have to dual-import.
export const MOCK_PROFILE_EMAIL = DEFAULT_USER_EMAIL
