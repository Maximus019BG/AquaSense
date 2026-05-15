# Drizzle Authentication — Implementation Plan (High-level)

Purpose: Integrate a professional, secure authentication system using Drizzle ORM and a robust auth design for the AquaSense platform.

Summary goals
- Provide secure email/password, OAuth (Google/GitHub), email verification, password reset, refresh tokens + short-lived access tokens, session revocation, optional MFA.
- Follow security best practices: argon2 hashing, httpOnly secure cookies, CSRF protection, input validation, rate limiting, logging, monitoring, and secrets rotation.

1) Manual prerequisites (what to obtain before coding)
- Production PostgreSQL connection string and a staging DB.
- Secrets management in your host (Vercel, Netlify, Azure, AWS Secrets Manager) and access to set env vars.
- SMTP credentials (SendGrid/SES/Mailgun) and verified sender email.
- OAuth app credentials for providers: client_id, client_secret and callback URLs (dev/staging/prod).
- Canonical application domain(s) and TLS certificate.
- JWT signing keys (RSA keypair or a strong symmetric secret) and a rotation plan.
- Backup plan and DB admin access for migrations.
- Test and admin user accounts list for QA.

2) Environment variables (examples to prepare)
- DATABASE_URL
- AUTH_JWT_PRIVATE_KEY / AUTH_JWT_PUBLIC_KEY or AUTH_JWT_SECRET
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
- OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET
- OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET
- APP_URL (canonical app URL for callbacks)
- SESSION_COOKIE_NAME, SESSION_COOKIE_SECRET
- SENTRY_DSN (or other observability keys)

3) Packages to install (suggested)
- drizzle-orm, drizzle-kit
- pg
- argon2
- jose or jsonwebtoken
- nodemailer
- zod or joi
- rate-limiter-flexible or express-rate-limit
- helmet, csurf (as applicable)
- otplib (optional for TOTP/MFA)

4) Database schema (minimum tables)
- users: id (uuid), email (unique), password_hash, email_verified, created_at, updated_at, metadata(jsonb)
- sessions: id, user_id, session_token_hash, expires_at, created_at, last_active_at, revoked_at, ip, ua
- refresh_tokens: id, user_id, token_hash, created_at, expires_at, revoked_at, replaced_by
- oauth_accounts: id, user_id, provider, provider_account_id, access_token (nullable), refresh_token (nullable), scope, created_at
- tokens: type (email_verification, password_reset), token_hash, user_id, expires_at, used_at
- audit_logs: id, user_id (nullable), action, ip, ua, meta(jsonb), created_at

5) Migrations & Drizzle usage
- Add a typed schema file (e.g. server/db/schema.ts) describing these tables using Drizzle.
- Configure drizzle-kit migrations and a migrations folder.
- Generate and run migrations locally and against staging before production.
  - PowerShell examples: npx drizzle-kit generate --schema server/db/schema.ts --out migrations
    npx drizzle-kit push --preview (test) && npx drizzle-kit push

6) Backend implementation steps
- Create a single DB client wrapper using Drizzle and export typed query functions.
- Implement crypto utilities: argon2 password hashing, secure random token generator, token-hashing (sha256) for DB storage.
- Email service using nodemailer and templates for verification and reset.
- Auth endpoints:
  - POST /api/auth/register — validate input, create user, create verification token, send email.
  - POST /api/auth/login — verify credentials, create session + refresh token, set httpOnly secure cookie, return minimal session info.
  - POST /api/auth/logout — revoke session and refresh token, clear cookie.
  - POST /api/auth/refresh — validate refresh token, rotate refresh token, issue new session/access token.
  - GET /api/auth/verify-email — validate token and mark verified.
  - POST /api/auth/request-password-reset & /api/auth/reset-password.
  - OAuth callbacks for provider flows and account linking.
- Middlewares:
  - Authentication middleware to validate cookie/session, attach user to request.
  - Authorization helpers for role checks.
- Security controls: CSRF protection for stateful requests, rate limiting on auth endpoints, strong input validation, logging/auditing for sensitive actions.

7) Frontend integration (Next.js / app router)
- Use secure httpOnly cookies for session and refresh tokens — do not store tokens in localStorage.
- Implement UI flows: register, login, email verification, password reset, OAuth redirects, logout.
- Use server actions or server-side endpoints for sensitive operations.
- Silent session refresh: rely on cookie + /api/auth/refresh to issue new session without exposing tokens to JS.

8) Testing and QA
- Unit tests for validators, hashing, token logic, and DB layer.
- Integration tests for full flows: register → verify → login → refresh → logout → reset.
- Manual security checks for CSRF, cookie flags, token expiry and reuse.
- Load tests and rate-limit validation.

9) Deployment checklist
- Add and verify environment variables in production.
- Backup production DB, run migrations once, verify schema.
- Ensure TLS cert and domain match OAuth callback URLs.
- Enable monitoring and alerts for auth failures or abnormal activity.
- Implement gradual rollout and feature toggle.

10) Rollout & migration strategy
- If migrating users from an existing auth system, choose one of:
  - Migrate hashes if compatible.
  - Import users and force password resets on first login.
  - Maintain both systems during staged migration with a migration API.
- Enable for a small percentage of users first, monitor, then expand.

11) Security hardening checklist
- Cookies: Secure, httpOnly, SameSite set appropriately.
- Password policy and password-strength enforcement.
- Rate limiting by IP and account for auth endpoints.
- Short access token lifetime; refresh tokens stored hashed and rotated on use.
- Single-use email tokens with expiry.
- Least-privilege DB user and rotated secrets.

12) Minimal PowerShell commands (examples)
- npm install drizzle-orm drizzle-kit pg argon2 jose nodemailer zod rate-limiter-flexible helmet csurf
- npx drizzle-kit generate --schema server/db/schema.ts --out migrations
- npx drizzle-kit push

## Minimal additions required for a minimal secure implementation
- Environment variables (minimum to add):
  - DATABASE_URL — Postgres connection string for auth schema.
  - SESSION_COOKIE_SECRET — a high-entropy secret (32+ bytes) used to sign/derive session cookies.
  - APP_URL — canonical app URL used for cookie domain and links.
  - (Optional) SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM — only required if you use email verification or password reset.
- Secrets and hosting:
  - Store all secrets in your hosting provider's secrets manager (Vercel, Netlify, Azure Key Vault, AWS Secrets Manager).
  - Prepare TLS for your production domain (required for Secure cookies and OAuth callbacks).
- Minimal packages to install locally and in production:
  - drizzle-orm, drizzle-kit, pg
  - argon2 (password hashing)
  - cookie or cookies-next (cookie helpers)
  - zod (input validation)
  - rate-limiter-flexible (protect login/register endpoints)
  - nodemailer (optional for emails)
- Minimal database/tables to create via Drizzle migration:
  - users: id (uuid), email (unique), password_hash, email_verified (boolean), created_at
  - sessions: id (uuid), user_id, session_token_hash, expires_at, created_at, last_active_at
  - tokens (optional): id, user_id, token_hash, type, expires_at, used_at — only if using email flows
- Token and session decisions to prepare:
  - Session lifetime (e.g., 7 days) and token length (crypto.randomBytes(48) recommended).
  - Email token lifetime (e.g., 1 hour) if using verification/reset flows.
  - Session cookie configuration: Secure, HttpOnly, SameSite=Lax, Path=/, Expires set according to session lifetime.
- Operational/prep items:
  - Create a staging database and a staging environment with the same env vars for testing.
  - Create at least one test user and one admin account for QA flows.
  - Backup plan for production DB and a migration rollback plan.
  - Decide how to handle user migration (if any existing users) — plan for password-reset flow if migrating hashes isn't possible.
- Security basics to enable immediately:
  - Rate limiting on auth endpoints.
  - Strong password policy rules defined in the plan.
  - Logging of auth failures (with PII redaction) and alerting setup (Sentry/Datadog) for spikes in failures.

End of plan.
