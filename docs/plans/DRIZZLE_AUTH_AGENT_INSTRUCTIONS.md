# Drizzle Authentication — Implementation Agent Instructions (Master, Step-by-step)

Purpose: Provide a full, professional, step-by-step set of instructions that an automated agent or developer should follow to implement Drizzle-based authentication correctly and securely on the AquaSense platform. This is actionable and prescriptive so an implementer can follow it without missing key security steps.

Agent responsibilities and preconditions
- Agent assumes access to repository, CI/CD secrets UI (or a mechanism to set env vars), and access to a staging database. Production DB access must be manual with approvals.
- Agent must not commit secrets to source control.
- Agent should create branches and follow repo's branching strategy; open PRs for human review.

1) Preparation (manual steps the agent should ensure are completed)
- Confirm the following env vars are set in staging (fail if missing): DATABASE_URL, APP_URL, SMTP_*, AUTH_JWT_SECRET or keys, OAUTH_*.
- Ensure staging DB snapshot exists and is writable.
- Ensure monitoring hooks (Sentry DSN) are set in staging.
- Ensure TLS certificate for staging domain (or use localhost dev certs) is available for OAuth testing.

2) Branch and coding plan
- Create a new branch: feature/auth-drizzle (or follow team's naming).
- Create the server/db folder and a typed Drizzle schema file: server/db/schema.ts.

3) Create Drizzle schema (agent steps)
- Generate table definitions for users, sessions, refresh_tokens, oauth_accounts, tokens, audit_logs using Drizzle's typed schema syntax. Include indexes on email, session_token_hash, token_hash.
- Create migration script: npx drizzle-kit generate --schema server/db/schema.ts --out migrations
- Commit migration and schema to feature branch.

4) DB client wrapper
- Implement server/db/client.ts that initializes Drizzle with pg and exports a typed query client.
- Ensure pooling configuration via env var PG_POOL_SIZE.

5) Crypto & utils
- Implement utilities in server/lib/crypto.ts:
  - hashPassword(password): argon2id with adequate time/memory/parallelism.
  - verifyPassword(hash, password)
  - generateToken(bytes=48) → base64url or hex token
  - hashToken(token): sha256(token) to store and compare in DB
- Implement constants for token expiry times.

6) Email service
- Implement server/lib/email.ts using nodemailer and templating (handlebars/ejs) for transactional emails. Keep templates in server/emails/*.html.

7) Core auth service
- Implement server/services/authService.ts with functions for:
  - registerUser(email, password, metadata)
  - createSession(userId, ip, ua)
  - verifyPasswordAndLogin(email, password, ip, ua)
  - createRefreshToken(userId)
  - rotateRefreshToken(oldToken, userId)
  - revokeSession(sessionId)
  - generateEmailVerificationToken(userId)
  - verifyEmailToken(token)
  - generatePasswordResetToken(userId), resetPassword(token, newPassword)
- Use Drizzle transactions for multi-step updates (create user + token + email send may be fired-after commit).

8) API routes
- Implement API routes under web/src/app/api/auth/ (or server/routes depending on repo layout): register, login, logout, refresh, verify-email, request-password-reset, reset-password, oauth/callback.
- Validate inputs with zod.
- Use cookies for session/refresh tokens: set-cookie with Secure, HttpOnly, SameSite=Lax (or Strict for sensitive flows), Path=/, SameSite.
- Implement CSRF protection for state-changing endpoints if using cookie-based auth and not using double-submit tokens for SPA.

9) Session management
- Short-lived access token (e.g., 15m) returned in memory to client only if necessary; prefer server-side session via cookie.
- Refresh token stored hashed in DB; rotate on each use and revoke previous.
- Record last_active_at and IP/UA for each session; allow admin revocation.

10) OAuth
- Implement OAuth flow using provider SDKs or passport.js style logic: redirect to provider, handle callback, exchange code, fetch profile, link or create user and create session.
- Validate callback state parameter to prevent CSRF.

11) Testing
- Write tests under web/src/tests/auth: unit tests for crypto and service functions, integration tests using a test DB (Docker or sqlite depending on support) for flows.
- Use supertest/playwright for E2E flows.

12) Linting, types, and CI
- Add type checks and lint rules for new code. Ensure build passes in CI.
- Add migration push step to deployment pipeline with manual approval for production.

13) Documentation & PR
- Update docs/ with the DRIZZLE_AUTH_IMPLEMENTATION_PLAN.md (already added) and DRIZZLE_AUTH_AGENT_INSTRUCTIONS.md.
- Open PR from feature branch with description, migration plan, and rollout strategy. Request security review.

14) Deployment & release
- Deploy to staging, run migrations, smoke tests.
- Run user migration scripts if needed with a dry-run mode.
- After approval, run migration on production during a maintenance window, monitor, then release.

15) Post-deploy
- Monitor errors, failed login spikes, and token usage. Rotate keys if suspicious activity found.
- Provide admin tools for listing active sessions and revoking a user's sessions.

Agent constraints and safety checks
- Do not store secrets in repo.
- Ensure tokens are single-use and stored hashed.
- Do not export user PII in logs; redact emails in public logs.
- Implement rate limiting and lockout after repeated failed logins.

Minimal PowerShell commands to run (agent)
- npm install --save drizzle-orm drizzle-kit pg argon2 jose nodemailer zod rate-limiter-flexible helmet csurf otplib
- npx drizzle-kit generate --schema server/db/schema.ts --out migrations
- npx drizzle-kit push --preview

End of instructions.
