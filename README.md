# shur.click

shur.click is a full-stack URL shortener with a Spring Boot API and a React/Vite frontend. It supports guest link creation, account-based link management, OTP auth flows, Google sign-in, click tracking, basic geo analytics for Pro users, Razorpay billing, and feedback emails.

This repository is public. Do not commit real secrets, private database URLs, API keys, JWT secrets, payment keys, or production-only credentials.

## Features

- Create short links as a guest or signed-in user.
- Optional custom aliases using `a-z`, `A-Z`, `0-9`, `_`, and `-`, from 3 to 20 characters.
- Automatic URL normalization: URLs without `http://` or `https://` are stored as `https://...`.
- Short-code redirects at `/{code}`.
- Click counting and last-accessed timestamps.
- Country click analytics for Pro users.
- Dashboard for creating, listing, copying, deleting, and tracking links.
- Two guest-created links before signup; those links are moved into the user's account after signup or sign-in.
- QR code display for generated links.
- JWT authentication.
- OTP-based signup, password reset, and profile email-change verification.
- Google Identity sign-in.
- Profile update, password change, and account deletion.
- Free and Pro plan enforcement.
- Razorpay checkout and payment verification.
- Resend-powered OTP and feedback email delivery.
- Public legal/info pages, SEO metadata, sitemap, robots file, and app icons.
- In-memory rate limiting for selected endpoints.
- Optional Redis lookup cache for hot short-code redirects.
- Swagger/OpenAPI UI from springdoc.

## Plan Limits

Current backend constants:

- Guest links before signup: `2` per anonymous browser token
- Free authenticated-user links: `5`
- Pro: unlimited link creation while Pro is active
- Pro duration after successful payment verification: `30` days
- Displayed monthly Pro price: `$2.00`

Razorpay charges are configured in subunits through `RAZORPAY_PRO_AMOUNT_SUBUNITS`. Keep pricing, currency, and frontend display aligned before production changes.

## Tech Stack

Backend:

- Java 17
- Spring Boot 3.2.5
- Spring Web, Spring Security, Spring Data JPA, Validation
- PostgreSQL in production
- H2 for tests
- Redis support for optional URL lookup caching
- JJWT
- Google API Client
- Razorpay Java SDK
- Resend email integration
- springdoc OpenAPI

Frontend:

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- qrcode.react
- Google Identity Services
- Razorpay Checkout script

## Repository Structure

```text
.
├── backend/
│   ├── src/main/java/xyz/antiz/urlShorter/
│   │   ├── config/          # Startup/schema helpers and OpenAPI config
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Request/response DTOs
│   │   ├── entity/          # JPA entities
│   │   ├── rate/            # Rate limiting filter
│   │   ├── repo/            # Spring Data repositories
│   │   ├── security/        # JWT, CORS, Spring Security
│   │   ├── service/         # Business logic
│   │   └── util/            # Date/time helpers
│   ├── src/main/resources/application.properties
│   ├── src/test/
│   ├── Dockerfile
│   ├── mvnw
│   └── pom.xml
├── frontend/
│   ├── public/              # Static icons, robots.txt, sitemap.xml
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── styles/
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.ts
└── README.md
```

## Backend API

Responses from protected endpoints require:

```http
Authorization: Bearer <jwt>
```

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Health check. |

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Legacy direct registration. |
| `POST` | `/api/auth/register-init` | No | Starts OTP signup and emails an OTP. |
| `POST` | `/api/auth/register-verify` | No | Completes OTP signup. |
| `POST` | `/api/auth/login` | No | Email/password login. |
| `POST` | `/api/auth/google` | No | Google ID-token login/signup. |
| `POST` | `/api/auth/forgot-password` | No | Sends password-reset OTP. |
| `POST` | `/api/auth/forgot-password-verify` | No | Verifies a reset OTP without changing password. |
| `POST` | `/api/auth/reset-password` | No | Resets password with challenge ID and OTP. |
| `DELETE` | `/api/auth/account` | Yes | Deletes the signed-in user's account. |

### Profile

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/me` | Yes | Returns current user's ID, name, and email. |
| `PATCH` | `/api/me` | Yes | Updates profile name; starts OTP flow if email changes. |
| `POST` | `/api/me/email/verify` | Yes | Completes profile email change. |
| `PATCH` | `/api/me/password` | Yes | Changes password using current password. |

### URLs

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/urls` | Optional | Creates a short URL. Guests are mapped to an internal guest account. |
| `GET` | `/api/urls` | Yes | Lists the signed-in user's URLs. |
| `GET` | `/api/urls/{code}/stats` | Yes | Returns stats for a user's short code. |
| `GET` | `/api/urls/{code}/geo-analytics` | Yes, Pro | Returns top country click counts for a user's short code. |
| `POST` | `/api/urls/claim-guest` | Yes | Moves links created with the current browser's guest token into the signed-in user's account. |
| `DELETE` | `/api/urls/{id}` | Yes | Deletes a user's URL by database ID. |
| `GET` | `/{code}` | No | Redirects a public short code to the original URL. |
| `HEAD` | `/{code}` | No | Public short-code HEAD route is permitted by security. |

Create URL request:

```json
{
  "longUrl": "https://example.com",
  "customAlias": "optional-alias"
}
```

Guest create requests must include an anonymous browser token:

```http
X-Guest-Token: <random-browser-token>
```

The frontend stores that token in `localStorage`, allows two guest links, and calls `/api/urls/claim-guest` after login, signup, or Google auth so those two rows become owned by the signed-in user.

### Billing

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/billing/status` | Yes | Returns plan, usage, remaining free links, and Pro expiry. |
| `POST` | `/api/billing/razorpay-order` | Yes | Creates a Razorpay order for Pro checkout. |
| `POST` | `/api/billing/verify-payment` | Yes | Verifies Razorpay signature/payment and activates Pro. |

### Feedback

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/feedback` | No | Sends product feedback by email. |

Feedback request:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Feedback message with at least 10 characters."
}
```

### Static Browser Asset Probes

The API also permits common browser asset paths such as `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png`, `/apple-touch-icon.png`, and Android Chrome icons. This avoids auth failures when browsers probe the API host directly.

## Frontend Routes

| Path | Description |
| --- | --- |
| `/` | Public home shortener. Redirects signed-in users to dashboard. |
| `/track` | Track a short code. |
| `/auth/login` and `/login` | Login. |
| `/auth/signup` and `/signup` | Signup. |
| `/forgot-password` | Start password reset. |
| `/forgot-password-otp` | OTP step for password reset. |
| `/reset-password` | Set a new password. |
| `/user/dashboard` and `/dashboard` | Link dashboard, billing, profile, and settings. |
| `/terms` | Terms page. |
| `/privacy` | Privacy page. |
| `/license` | License page. |
| `/feedback` | Feedback form. |
| `/:code` | Frontend catch-all short-code redirect helper. |

## Environment Variables

Use real values only in your local shell, local ignored files, or deployment provider settings. The examples below are placeholders.

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Server port. Defaults to `5000`. |
| `JDBC_DATABASE_URL` | Yes | PostgreSQL JDBC URL. |
| `JDBC_DATABASE_USERNAME` | Yes | Database username. |
| `JDBC_DATABASE_PASSWORD` | Yes | Database password. |
| `JWT_SECRET` | Yes | Strong signing secret for JWTs. |
| `JWT_EXP_MINUTES` | No | JWT expiry in minutes. Defaults to `10080`. |
| `APP_PUBLIC_BASE_URL` | No | Public URL used when generating short links. |
| `APP_CORS_ALLOWED_ORIGINS` | No | Extra comma-separated allowed CORS origins. |
| `GOOGLE_CLIENT_ID` | For Google auth | Google OAuth client ID. |
| `RAZORPAY_KEY_ID` | For billing | Razorpay key ID. |
| `RAZORPAY_KEY_SECRET` | For billing | Razorpay key secret. |
| `RAZORPAY_CURRENCY` | No | Currency code. Defaults to `INR`. |
| `RAZORPAY_PRO_AMOUNT_SUBUNITS` | No | Pro checkout amount in currency subunits. Defaults to `20000`. |
| `RESEND_API_KEY` | For email | Resend API key. |
| `APP_MAIL_FROM` | For email | Verified sender address for OTP emails. |
| `APP_FEEDBACK_TO` | For feedback email | Destination address for feedback submissions. |
| `APP_REDIS_ENABLED` | No | Enables Redis lookup caching when set to `true`. |
| `REDIS_HOST` | If Redis enabled | Redis host. |
| `REDIS_USERNAME` | If Redis enabled | Redis username. |
| `REDIS_PASSWORD` | If Redis enabled | Redis password. |

Spring properties can also be overridden with environment variables that map to property names. For example, `app.cors.allowed-origins` can be set as `APP_CORS_ALLOWED_ORIGINS`.

Example backend environment template:

```bash
PORT=5000
JDBC_DATABASE_URL=jdbc:postgresql://localhost:5432/shur_click
JDBC_DATABASE_USERNAME=replace-with-local-user
JDBC_DATABASE_PASSWORD=replace-with-local-password
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXP_MINUTES=10080
APP_PUBLIC_BASE_URL=http://localhost:5000
GOOGLE_CLIENT_ID=replace-with-google-client-id
RAZORPAY_KEY_ID=replace-with-razorpay-key-id
RAZORPAY_KEY_SECRET=replace-with-razorpay-key-secret
RAZORPAY_CURRENCY=INR
RAZORPAY_PRO_AMOUNT_SUBUNITS=20000
RESEND_API_KEY=replace-with-resend-key
APP_MAIL_FROM=replace-with-verified-sender@example.com
APP_FEEDBACK_TO=replace-with-feedback-inbox@example.com
```

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | No | Absolute backend API base URL. Production defaults to `https://api.shur.click`; dev defaults to relative `/api` for the Vite proxy. |
| `VITE_DEV_API_PROXY` | No | Dev proxy target. Defaults to `http://localhost:8080`. |
| `VITE_GOOGLE_CLIENT_ID` | For Google auth | Google OAuth client ID exposed to the browser. |

Example frontend environment template:

```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_DEV_API_PROXY=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=replace-with-google-client-id
```

## Local Development

Prerequisites:

- Java 17+
- Node.js and npm
- PostgreSQL
- Optional Redis
- Optional Resend, Google OAuth, and Razorpay accounts for full integration testing

Run backend:

```bash
cd backend
./mvnw spring-boot:run
```

Run frontend:

```bash
cd frontend
npm install
npm run dev
```

By default, Vite proxies `/api` and `/r` to `http://localhost:8080`. If the backend runs on the repository default `5000`, set:

```bash
VITE_DEV_API_PROXY=http://localhost:5000
```

## Build And Test

Backend tests:

```bash
cd backend
./mvnw test
```

Backend package:

```bash
cd backend
./mvnw clean package
```

Frontend build:

```bash
cd frontend
npm run build
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Note: the current frontend lint command may report existing lint debt in files unrelated to recent changes. Build is the primary production compile check.

Docker backend image from the repository root:

```bash
docker build -f backend/Dockerfile -t shur-click-backend .
docker run -p 5000:5000 --env-file path/to/local.env shur-click-backend
```

## Deployment Notes

Backend:

- The backend listens on `PORT`, defaulting to `5000`.
- `backend/Dockerfile` builds the Spring Boot jar with Maven and runs it on Eclipse Temurin 17 JRE.
- Configure secrets and service credentials in the deployment provider, not in source control.
- CORS allows canonical `shur.click` origins and can be extended with `APP_CORS_ALLOWED_ORIGINS`.

Frontend:

- `frontend/vercel.json` is configured for Vite.
- Production API calls default to `https://api.shur.click`.
- Short-code routes are redirected/rewritten to the API while known app routes and static assets stay on the frontend.
- Set `VITE_API_BASE_URL` if deploying against a different API host.

## Security And Privacy Notes

- Never commit real `.env` files, database credentials, API tokens, JWT secrets, payment secrets, or private keys.
- Keep `JWT_SECRET` long, random, and different per environment.
- `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, database passwords, and Redis passwords must remain server-side only.
- Browser-exposed values such as `VITE_GOOGLE_CLIENT_ID` and Razorpay key ID are not secrets, but should still be environment-specific.
- Auth uses stateless JWTs. Protected routes rely on the backend JWT filter attaching `userId` to requests.
- Rate limiting is in-memory and resets on app restart.
- Redis URL lookup caching is optional and used only when enabled/configured.

## OpenAPI

When the backend is running, springdoc exposes OpenAPI/Swagger endpoints:

- `/v3/api-docs`
- `/swagger-ui.html`
- `/swagger-ui/`

## License

See the in-app license page and project licensing terms before redistributing or using this code commercially.
