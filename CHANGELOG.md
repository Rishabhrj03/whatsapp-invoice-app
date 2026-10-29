# Changelog

All notable changes to this project will be documented in this file.
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] — 2026-10-29

### 🎂 Line Item Customization, Real-Time Descriptions & Invoice UX

#### Added — Line Item Customization Modal & Description Box
- **Item Description Modal Popup (`CreateInvoiceForm.tsx`)**:
  - Added dedicated popup modal to capture real-time item specifications (e.g., custom cake flavor, weight, delivery notes).
  - Quick-preset chips for rapid POS checkout (`Custom Cake`, `Eggless`, `1.5 kg`, `Special Message`).
  - Auto-opens upon selecting custom or open items (e.g. `Open Item Wholesale Cake`).
  - Direct `+ Description` / `+ Note` trigger button adjacent to `Select Menu Item`.
  - Prominent line item description banner rendered beneath each configured line item row.
- **Invoice Preview & Public Receipt Enhancements**:
  - Updated table header from `Item Description` to clean `Item`.
  - Renders item description box directly beneath item names on invoice preview, public invoice view (`/public/invoice/[id]`), and PDF receipts.
- **Data Model & Schema Extensions**:
  - `Invoice.ts`: Added `description?: string` to `IInvoiceItem` and schema.
  - `src/lib/schemas/index.ts`: Added `description: z.string().max(500).optional()` to `InvoiceItemSchema`.
  - `domain.ts`: Added `description?: string` to `InvoiceItemDTO`.
  - `WhatsAppWebAdapter.ts` & `export-csv`: Included item descriptions in messaging payloads and CSV export.

---

## [1.1.0] — 2026-10-29

### 🚀 Activity Log & Production Database Configuration Release

#### Added — Activity Log & Audit Trail Subsystem
- **`ActivityLog` Data Model** (`src/models/ActivityLog.ts`):
  - Stores all operations performed by account administrators (`OWNER`) and staff (`STAFF`).
  - Indexed on `{ tenantId: 1, createdAt: -1 }`, `{ tenantId: 1, userId: 1, createdAt: -1 }`, `{ tenantId: 1, entityType: 1, createdAt: -1 }`.
  - Captures actor identity snapshot (`name`, `email`, `role`), action type, description, and detailed JSON context metadata.
- **`ActivityLogService`** (`src/lib/services/ActivityLogService.ts`):
  - Fire-and-forget, non-blocking asynchronous audit logging.
  - Multi-criteria filtering: team member, entity type, action type, keyword search, date range.
  - Aggregate statistics: 24-hour volume, 7-day volume, and Owner vs. Staff breakdown.
- **Activity Log Server Actions** (`src/app/actions/activity.ts`):
  - `fetchActivityLogs()`, `fetchActivityStats()`, and `fetchAccountMembers()`.
- **Frontend Audit Dashboard** (`/activity` & `src/components/ActivityLogClient.tsx`):
  - Live KPI cards for total actions, 24h activity, and owner/staff split.
  - Interactive multi-filter bar with keyword search, member picker, module picker, and date range inputs.
  - Chronological event timeline with color-coded entity badges and expandable metadata context tray.
  - Navigation bar integration with `History` icon and `Audit` chip.
- **Full Action Instrumentation**:
  - Automatically records events for Invoices, Customers, Advance Bookings, Menu Items, Categories, Coupons, Team Members, and Business Profile updates.

#### Added — Database Hardening & Production Configuration
- **Production Database Enforcement**:
  - `src/lib/mongoose.ts` now explicitly specifies `dbName: process.env.MONGODB_DB_NAME || 'primebake-prod'`.
  - Guarantees MongoDB connections never silently default to the MongoDB Atlas `test` database.
  - Updated `.env.local` to `MONGODB_URI=mongodb://127.0.0.1:27017/primebake-prod`.

#### Fixed — Multi-Tenant Security & Isolation
- **Advance Bookings Multi-Tenant Scoping**:
  - Refactored all booking actions (`createAdvanceBooking`, `getAdvanceBookings`, `updateAdvanceBookingDetails`, `updateBookingStatus`, `completeAdvanceBooking`) to use `effectiveUserId`.
- **CSV Export Scoping**:
  - Scoped `/api/v1/export-csv` to `effectiveUserId` so staff can export business invoices accurately.

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
