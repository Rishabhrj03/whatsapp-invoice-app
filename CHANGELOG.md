# Changelog

All notable changes to this project will be documented in this file.
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-10-29

### 🎉 First Production Release

#### Added — Architecture & Patterns (SOLID)
- Introduced layered SOLID architecture: `Server Actions → Services → Repositories → Mongoose`
- `src/lib/services/` — `InvoiceService.ts`, `CustomerService.ts`, `MenuService.ts`
- `src/lib/repositories/` — `IRepository.ts` interface + concrete implementations (`InvoiceRepository`, `CustomerRepository`, `MenuRepository`)
- `src/lib/adapters/messaging/` — `IMessagingAdapter.ts`, `WhatsAppWebAdapter.ts`, `SMSAdapter.ts`, `MessagingAdapterFactory.ts` (Strategy + Factory patterns)
- `src/lib/schemas/index.ts` — Zod validation schemas as single source of truth for all data mutations
- Typed singleton MongoDB connection cache in `src/lib/mongoose.ts` with `maxPoolSize: 10`

#### Added — Security Hardening
- **Rate Limiting** — `src/lib/rateLimit.ts`: in-memory sliding-window limiter (5 signups/5 min per IP), returns HTTP 429
- **Input Validation** — Zod schemas enforced at `/api/signup`: email normalization, password length, name boundaries
- **RBAC Guard** — `InvoiceService.updateInvoice()` rejects `STAFF` role edits with HTTP 403 Forbidden
- **IDOR Fix** — All tenant queries use `getEffectiveUserId()` scoping staff to their `ownerId`
- **HTTP Security Headers** — `next.config.mjs` now sets `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **Bcrypt hardened** — Increased bcrypt work factor from 10 to 12 rounds on signup

#### Added — Database Performance
- Compound indexes on `Invoice`: `{ userId, createdAt }`, `{ userId, customer, date }`
- Compound indexes on `Customer`: `{ userId, name }`, `{ userId, phoneNumber }`
- Mongoose 9 migration: replaced deprecated `{ new: true }` with `{ returnDocument: 'after' }` across all repositories

#### Added — Responsive UI/UX (Mobile, Tablet, Desktop)
- `DashboardLayoutClient.tsx`: Glassmorphic header, bottom thumb-navigation bar (mobile), collapsible drawer (tablet), persistent sidebar (desktop)
- `TransactionsClient.tsx`: Dual-mode — touch cards on mobile, rich table on tablet/desktop
- `CustomersClient.tsx`: Mobile card deck with direct WhatsApp/call buttons; table on desktop
- `CustomerReportClient.tsx`: Mobile accordion item breakdowns; table with expand rows on desktop
- `CreateInvoiceForm.tsx`: Sticky floating mobile checkout bar showing live total + "Preview & Bill" CTA
- `globals.css`: `@media print` styles for 80mm thermal POS receipts and A4 invoice printing

#### Added — API Versioning
- `/api/v1/` namespace created for all REST API routes
- Versioned routes: `POST /api/v1/signup`, `GET /api/v1/export-csv`, `GET /api/v1/health`
- Original routes remain functional (backward-compatible re-exports)
- `X-API-Version: 1.0.0` response header on all v1 endpoints

#### Added — Documentation
- `docs/FUNCTIONAL_REQUIREMENTS.md`
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`
- `docs/DATA_FLOW_DIAGRAMS.md`
- `docs/ENTITY_RELATIONSHIP_DIAGRAM.md`
- `docs/ARCHITECTURE_AND_DESIGN_PATTERNS.md`
- `docs/SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md`
- `docs/UI_UX_SECURITY_AND_TESTING_REPORT.md`
- `docs/VERSIONING.md` — branching strategy, commit conventions, release runbook
- `CHANGELOG.md` — this file

#### Changed — Framework Upgrade
- Upgraded from **Next.js 14** → **Next.js 16.4.3** (Turbopack)
- Upgraded from **React 18** → **React 19.3.1**
- All dynamic routes migrated to async `params` and `searchParams` (Next.js 16 standard)
- Applied to: `public/invoice/[id]`, `customers/[id]/report`, `transactions`, `menu`, `customers`, `bookings`, `coupons`, `team`, `dashboard`

#### Added — Versioning Infrastructure (this release)
- `scripts/release.mjs` — automated semver bump, CHANGELOG entry, git commit & annotated tag
- `npm run version:patch`, `npm run version:minor`, `npm run version:major`
- `npm run release patch|minor|major`
- `VERSIONING.md` — full branching and release guide

---

## [0.1.0] — 2026-05-01

### Initial Development Release

- Core Next.js app scaffold with NextAuth v5 authentication
- MongoDB / Mongoose schema: `User`, `Customer`, `Invoice`, `MenuEntry`, `Category`, `Coupon`, `Booking`
- Basic POS invoice creation with customer selector and menu item picker
- WhatsApp `wa.me` deep-link bill sharing
- jsPDF invoice generation with customer branding
- Team management: invite staff cashiers scoped to owner
- Public shareable invoice page (`/public/invoice/[id]`)
- 90-day customer purchase report with Excel export
- Coupon/discount engine (percentage and fixed-value)
- S3 PDF backup with presigned upload URLs
- Booking management with status tracking

---

*To generate the next release:*
```bash
npm run release patch    # bug fixes
npm run release minor    # new features
npm run release major    # breaking changes
```
