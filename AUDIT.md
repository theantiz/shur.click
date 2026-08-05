# Correctness and Reliability Audit

Scope: Spring Boot backend and React frontend for the shur.click URL shortener.

## Backend

### Critical

- [PublicUrlController.java](backend/src/main/java/xyz/antiz/urlShorter/controller/PublicUrlController.java#L65) - Masked redirect HTML is built by interpolating the destination URL directly into `src`, fallback `href`, and the `meta refresh` string.
  - Root cause: `normalize()` only prepends a scheme and does not escape or reject quotes/markup in the stored URL.
  - Fix direction: Escape the URL for HTML contexts or render through a template engine that escapes output by default; validate or restrict redirect targets before persistence.

### Medium

- [ShortUrlService.java](backend/src/main/java/xyz/antiz/urlShorter/service/ShortUrlService.java#L101) and [ShortUrlService.java](backend/src/main/java/xyz/antiz/urlShorter/service/ShortUrlService.java#L302) - Alias and generated code uniqueness checks are race-prone under concurrent creates.
  - Root cause: The code checks `existsByShortCode(...)` before insert, but another request can claim the same value before `save()` runs.
  - Fix direction: Catch unique-constraint failures and retry code generation, or use an allocation strategy that does not rely on a pre-check.

- [ShortUrlService.java](backend/src/main/java/xyz/antiz/urlShorter/service/ShortUrlService.java#L291) - Click tracking is fire-and-forget and swallows all exceptions.
  - Root cause: The redirect path returns before persistence completes, so executor or DB failures silently drop click increments and event rows.
  - Fix direction: Make tracking durable, or at minimum add logging/metrics and a retry path for background failures.

## Frontend

### High

- [Login.tsx](frontend/src/pages/Login.tsx#L58) and [App.tsx](frontend/src/App.tsx#L26) - JWT is stored in `localStorage` and treated as the client auth source.
  - Root cause: Any same-origin XSS can read the token, and UI-only auth checks do not protect the backend.
  - Fix direction: Move to an `httpOnly`, `Secure`, `SameSite` cookie flow or another server-managed session mechanism.

### Medium

- [TrackPage.tsx](frontend/src/components/TrackPage.tsx#L108) and [TrackPage.tsx](frontend/src/components/TrackPage.tsx#L115) - Auth is only checked once on mount and the polling loop keeps running after token loss or expiry.
  - Root cause: The effect does not react to auth-state changes, so an open page can keep hitting `/stats` with 401s.
  - Fix direction: Centralize auth state, redirect on token loss or 401, and stop polling when unauthenticated.

- [TerminalShortener.tsx](frontend/src/components/TerminalShortener.tsx#L198) - History updates close over stale state.
  - Root cause: Two shorten completions can read the same `history` array and one update can overwrite the other.
  - Fix direction: Use a functional state update and persist the computed next history inside that updater.

## Summary

| Layer | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|
| Backend | 1 | 0 | 2 | 0 |
| Frontend | 0 | 1 | 2 | 0 |

## Notes

- I did not mark the backend `@ControllerAdvice` handling as a bug because `GlobalExceptionHandler` is present and covers the common failure paths.
- I also did not flag a missing rate limit on `/api/urls`; the backend includes `RateLimitingFilter` and applies it to that route.