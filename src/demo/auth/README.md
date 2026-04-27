# `src/demo/auth/`

Pluggable authentication abstraction. The app calls a single `authService`
that conforms to the `AuthService` interface; the concrete implementation is
selected at runtime by the `VITE_AUTH_PROVIDER` env var.

## Why this layer exists

The prototype was built with hardcoded credentials (`user@kerv.ai` /
`SalesDemoTest`) inlined into `App.tsx`. The team plans to migrate to AWS
Cognito once the User Pool is provisioned. Rather than wait for the migration
to do the refactor, the auth flow is already routed through a service
interface so the swap becomes a one-line env-var change plus filling in
`CognitoAuthService`.

## File map

| File | Purpose |
|---|---|
| `types.ts` | `AuthService` interface, `AuthenticatedUser`, `SignInResult` |
| `MockAuthService.ts` | Current prototype behavior — checks against the hardcoded credentials in `constants.ts` |
| `CognitoAuthService.ts` | Stub — throws on use until wired. Has integration checklist as a comment header. |
| `resolveAuthService.ts` | Reads `VITE_AUTH_PROVIDER` and instantiates the right service |
| `index.ts` | Barrel re-export so consumers do `import { authService } from '../auth'` |

## How to use it from app code

```ts
import { authService } from './demo/auth'

const result = await authService.signIn(email, password)
if (!result.ok) {
  setError(result.error)
  return
}
// result.user is the authenticated user
```

That's the entire integration surface. App.tsx only ever calls `signIn` and
`signOut`. View-state (login → selection → demo) and persisted session
storage continue to live in `App.tsx` because they're not auth-specific —
they're UI/UX concerns that survive across providers.

## Switching providers

```bash
# .env.local (or production build env)
VITE_AUTH_PROVIDER=mock      # default — current prototype behavior
VITE_AUTH_PROVIDER=cognito   # real Cognito (throws until wired)
```

The default is `mock` so a fresh `npm run dev` keeps working without any
configuration.

## Wiring up Cognito

1. **Choose an SDK.** Either `@aws-amplify/auth` (higher level, ships its own
   storage layer) or `@aws-sdk/client-cognito-identity-provider` (lower
   level, you control the session). Amplify is faster to integrate; the SDK
   is leaner if you don't want the rest of Amplify.
2. **Add env vars.** Likely candidates: `VITE_COGNITO_USER_POOL_ID`,
   `VITE_COGNITO_USER_POOL_CLIENT_ID`, `VITE_COGNITO_REGION`.
3. **Implement `CognitoAuthService.signIn` / `signOut`.** The `SignInResult`
   shape is meant to be a 1:1 mapping of what Cognito returns — translate
   `NotAuthorizedException`, `UserNotConfirmedException`, etc. into the
   user-facing `error` string. Don't swallow Cognito errors silently.
4. **Decide whether to extend the interface.** Cognito has session/refresh
   token concepts that aren't in the current interface. If the app needs to
   know "am I still authenticated" beyond view-state, add `getCurrentUser():
   AuthenticatedUser | null` (or a session) to the interface and implement
   it on both providers.
5. **Set `VITE_AUTH_PROVIDER=cognito`** in the v2 / production deploy env.
6. **Update this README** with the SDK choice and any quirks discovered.

## Constraints to preserve

- The mock's email comparison is **trim + case-insensitive**. Cognito does
  the same on the username field by default, so behavior stays consistent.
- Error messages are user-facing. Don't leak provider-specific verbs
  ("NotAuthorizedException") into them.
- Session persistence (sessionStorage) currently lives in
  `src/demo/utils/sessionStorage.ts` and is auth-agnostic. Don't move it
  here — the auth service's job is *who is logged in*, not *what view they
  were last on*.
