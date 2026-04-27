// Auth service interface shared between the mock (current prototype behavior)
// and the real Cognito implementation that will land once the AWS pool is
// wired up. Keeping signIn async even in the mock means the call site doesn't
// change shape when we swap providers.

export type AuthenticatedUser = {
  id: string
  email: string
  name: string
}

export type SignInResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; error: string }

export interface AuthService {
  signIn(email: string, password: string): Promise<SignInResult>
  signOut(): Promise<void>
}

export type AuthProviderKind = 'mock' | 'cognito'
