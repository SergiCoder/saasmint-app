# SaaSmint App

Next.js 16 SaaS frontend paired with `SaaSmint Core`.

## Architecture

Strict hexagonal layers:

| Layer          | Location                        | Can import                                         |
| -------------- | ------------------------------- | -------------------------------------------------- |
| Domain         | `src/domain/`                   | nothing external                                   |
| Application    | `src/application/`              | `domain/` only                                     |
| Infrastructure | `src/infrastructure/`           | `domain/`, `application/ports/`                    |
| Presentation   | `src/presentation/`, `src/app/` | `domain/`, `application/ports/`, `infrastructure/` |

**Never** import from `infrastructure/` inside `domain/` or `application/`.

`src/application/` currently contains only `ports/`. Server actions and `_data/` fetchers call gateways directly via `src/infrastructure/registry.ts` — port interfaces still provide the type contract for swapping implementations.

## Domain Models

Core types in `src/domain/models/`. All fields `readonly` — treat domain objects as immutable.

- `User`, `Org`, `OrgMember` (role: `owner | admin | member`, `isBilling` flag), `Invitation`, `PhonePrefix`
- `Plan` — `(context: personal|team, tier: 1=free|2=basic|3=pro, interval: month|year)` + single `price`. Backend returns paid plans only; the personal-free card is synthesised client-side where needed.
- `PlanPrice`, `Product` (one-time), `ProductPrice`
- `Subscription` — Stripe-mirrored row. `GET /billing/subscriptions/me/` returns a paginated envelope with 0–2 rows. Use `findPersonalSubscription()` / `findTeamSubscription()` to pick a row. "Scheduled to cancel" UI = `cancelAt` is set; `canceledAt` only flips after the sub actually ends. Mutating endpoints accept `?context=personal|team` (required when both rows exist; backend defaults to `team` for org members, `personal` otherwise).
- `CreditBalance` — `{balance, scope: "user"|"org"}`. `GET /billing/credits/me/` returns `{balances:[...]}`, 0–2 rows. Render in backend-provided order without re-sorting.

Domain errors in `src/domain/errors/`: `AuthError`, `BillingError`, `ApiError` (carries `status`, `body`, `detail` getter), `NetworkError` (carries `cause`). All have a `code: string`. `ApiError.code` resolution: explicit arg → `body.code` → `HTTP_<status>`. Server actions translate thrown errors via `toActionError()`; clients resolve codes through `actionErrors.<code>` next-intl namespace via `useActionErrorMessage`.

## Infrastructure

`src/infrastructure/` organised by provider:

- `api/` — `DjangoApi*Gateway` classes calling Core via `apiFetch`
- `auth/cookies.ts` — JWT cookie management

Avatar uploads go through `POST /account/avatar/`; client-side compression via `src/lib/compressImage.ts` runs first.

Each gateway implements a port from `src/application/ports/`. **Import singletons from `src/infrastructure/registry.ts`** — never instantiate gateway classes directly.

### API client

`src/infrastructure/api/apiClient.ts` exposes four variants over a shared `raw()`:

- `apiFetch<T>` / `apiFetchVoid` — require token; throw `AuthError("NO_SESSION")` if none.
- `apiFetchOptional<T>` — send token if present, fall back to anonymous. If a sent token is rejected, retries once anonymously.
- `publicApiFetch<T>` / `publicApiFetchVoid` — never send a token.

Non-OK normalization: `401` on authenticated → `AuthError`; everything else → `ApiError(status, body)`. Network failures → friendly "unreachable" error.

### Response parsing

Gateways never cast raw JSON to domain types:

1. `apiFetch<Record<string, unknown>>(...)` for untyped JSON
2. `keysToCamel(raw)` (or `keysToCamelWithPrice` for Plan/Product, plus `flattenPhone` for User) in `caseTransform.ts`
3. `UserSchema.parse(...)` etc. from `schemas.ts` — Zod schemas `satisfies z.ZodType<DomainModel>`

Always validate through a schema for new endpoints; do not re-introduce generic casts.

### Env vars

Public env vars validated once at module load in `src/lib/env.ts` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`). Validator is zod-free so `src/proxy.ts` can import it without pulling zod into the Edge bundle. Import `env` from `@/lib/env` rather than reading `process.env.NEXT_PUBLIC_*` directly.

## Authentication

Django issues JWTs directly — no third-party provider.

- **Tokens**: access (15 min) + refresh (7 days) in HTTP-only secure cookies.
- **Login/Signup**: server actions call `POST /auth/login/`, `POST /auth/register/`.
- **OAuth**: server action sets short-lived `oauth_in_progress` flow cookie + redirects to `GET /auth/oauth/{provider}/`. Django redirects back to `/auth/callback#code=<opaque>`. Client strips fragment via `history.replaceState` and calls `exchangeOAuthCode` server action → `POST /auth/oauth/exchange/`. Post-login redirect targets validated against an allowlist (`src/lib/oauthNext.ts`).
- **Middleware (`src/proxy.ts`)**: on routes that read the session user, decodes the access token JWT (base64 only), refreshes via `POST /auth/refresh/` when expired/missing. Anonymous-only routes skip the refresh. On 401, clears stale cookies on both request and response. Forwards pathname as `x-pathname` (`PATHNAME_HEADER` in `src/lib/pathname.ts`); read on the server via `getPathname()` / `getPathnameWithoutLocale()`.
- **API calls**: `apiClient.ts` reads `access_token` cookie, sends `Authorization: Bearer`.

## Component Design

Atomic structure in `src/presentation/components/`: `atoms/`, `molecules/`, `organisms/`, `templates/`. Flat files (`atoms/Button.tsx`, no folder-per-component); one barrel `index.ts` per level.

- Tailwind v4 utility classes only; design tokens in `src/app/globals.css` via `@theme`.
- Components receive all user-facing text as props — no hardcoded strings.
- Server Components by default; `"use client"` only for interactivity.

## Server Actions

In `src/app/actions/` (one file per area). Each action calls gateways directly from the registry and returns `ActionResult<T>` from `src/lib/actions/ActionResult.ts`:

- `ok()` / `ok(data)` — success.
- `fail(code, { message?, fieldErrors? })` — failure with stable string code.
- `toActionError(err)` — maps thrown gateway errors to `fail(...)`.

Form parsing uses `src/lib/actions/parseFormData.ts` (`getString`, `getNonEmptyString`, `getInt`, `getFile`).

Actions `console.error` the raw error (including `ApiError.body`) before returning so server logs retain backend payloads while clients only see stable codes.

Co-located `_data/` fetchers also call gateways directly and are wrapped in `React.cache()`.

## Route Groups

`src/app/[locale]/`:

- `(marketing)/` — public pages, `MarketingLayout`
- `(auth)/` — login/signup/etc., `AuthLayout`
- `(app)/` — authenticated, `AppLayout`
- `(public)/` — unauthenticated public (invitation acceptance)

Route-specific clients in co-located `_components/`; shared server fetchers in `_data/` (cached).

## Key Rules

- App Router only — no `pages/`.
- No raw `fetch` in components — go through a server action or `_data/` fetcher.
- Auth: Django JWT in `Authorization: Bearer` (read from HTTP-only cookie).
- Payments: Stripe-hosted Checkout redirect only — no embedded forms.
- All user-facing strings through next-intl.
- Brand color: teal `#0D9488` (`primary-600`).
- TS `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — narrow indexed access instead of using `!`.

## Committing

Always use `/commit`. Never commit manually.

## Running

```bash
pnpm install
pnpm dev         # https://localhost:3000 (Turbopack, --experimental-https)
```

Dev server reads root CA + localhost certs from `../saasmint-core/infra/certs/` — clone both repos side-by-side.

## Testing

```bash
pnpm test
pnpm test:coverage
```

Tests in `tests/` mirror `src/` (Vitest; config in `vitest.config.ts`).

### Global fixtures (`tests/setup.ts`)

- **`next-intl` stub** — `useTranslations()` echoes the i18n key when called without params, substitutes `{param}` placeholders with a params object (unused params appended). `useLocale()`→`"en"`, `useMessages()`→`{}`.
- **`@/lib/i18n/navigation` stub** — `Link` renders plain `<a>`; routing helpers are no-ops.
- **`console.error` silenced** via `vi.spyOn` in `beforeEach`. Read calls via `vi.mocked(console.error)` to assert on logging.
- **DOM cleanup** — `afterEach(cleanup)`.

### Component testing

- `Button` exposes `variant`/`size` as `data-variant` / `data-size` — prefer those over class-name matching.
- Assert on interpolated values from the i18n stub, not on key names.
