import type { AuthService, SignInResult } from './types'

// Stub for the future Cognito integration. The real implementation will
// likely use either `@aws-amplify/auth` or the lower-level
// `@aws-sdk/client-cognito-identity-provider` against the User Pool the team
// stands up. The interface here is intentionally identical to MockAuthService
// so swapping providers is a one-line env-var change.
//
// To wire this up:
//   1. npm install @aws-amplify/auth (or @aws-sdk/client-cognito-identity-provider)
//   2. Configure the pool ID + client ID via VITE_COGNITO_* env vars
//   3. Replace the throw blocks below with real calls
//   4. Set VITE_AUTH_PROVIDER=cognito in the deploy environment
//   5. Update src/demo/auth/README.md with the wiring details
//
// Until then, this class throws on use so a misconfigured env caught at
// runtime instead of silently falling back to the mock.

export class CognitoAuthService implements AuthService {
  async signIn(_email: string, _password: string): Promise<SignInResult> {
    throw new Error(
      'CognitoAuthService.signIn is not yet implemented. ' +
        'Set VITE_AUTH_PROVIDER=mock or wire up Cognito (see auth/README.md).'
    )
  }

  async signOut(): Promise<void> {
    throw new Error(
      'CognitoAuthService.signOut is not yet implemented. ' +
        'See auth/README.md for the integration checklist.'
    )
  }
}
