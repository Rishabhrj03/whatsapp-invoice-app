/**
 * POST /api/signup  ← Backwards-compatible alias for /api/v1/signup
 * ──────────────────────────────────────────────────────────────────
 * This route re-exports the canonical v1 implementation so that
 * existing clients (mobile apps, integrations) continue to work
 * without URL changes.
 *
 * @deprecated Use /api/v1/signup for new integrations.
 * @see src/app/api/v1/signup/route.ts
 */
export { POST } from "@/app/api/v1/signup/route";
