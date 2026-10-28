/**
 * GET /api/export-csv  ← Backwards-compatible alias for /api/v1/export-csv
 * ──────────────────────────────────────────────────────────────────────────
 * This route re-exports the canonical v1 implementation so that
 * existing clients continue to work without URL changes.
 *
 * @deprecated Use /api/v1/export-csv for new integrations.
 * @see src/app/api/v1/export-csv/route.ts
 */
export { GET } from "@/app/api/v1/export-csv/route";

export const dynamic = "force-dynamic";
