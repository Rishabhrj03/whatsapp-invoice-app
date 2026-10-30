# WhatsApp POS & Digital Invoicing Platform

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.1-61dafb.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green.svg)](https://mongoosejs.com/)
[![AWS S3](https://img.shields.io/badge/AWS%20S3-Direct%20Server--Side-orange.svg)](https://aws.amazon.com/s3/)
[![Security](https://img.shields.io/badge/Security-Hardened%20(RBAC%20%2B%20Zero--Trust)-emerald.svg)](docs/SENIOR_SECURITY_AUDIT_REPORT.md)

A production-grade, multi-tenant Point-of-Sale (POS) and digital billing platform tailored for retail, bakeries, cafes, and service businesses. Designed with clean SOLID layered architecture, tri-screen responsive UX (Mobile, Tablet, Desktop), instant WhatsApp/SMS bill dispatch, and zero-CORS direct server-side cloud backups to Amazon S3.

---

## 🚀 Key Capabilities

* **⚡ Fast POS Invoicing (`/invoice/create`)**:
  * Real-time customer search, one-click guest checkout, and category filtering.
  * **Portaled Item Catalog**: `MenuSelector` dialog portaled to `document.body` via React 19 `createPortal` with hover tooltips for full item names.
  * **Line Item Customization Modal**: Dedicated popup to record custom cake flavor, weight, custom notes, and quick preset chips (`Custom Cake`, `Eggless`, `1.5 kg`, `Special Message`).
  * **Credit Notes & Returns**: Full support for negative line-item prices and negative grand totals to handle returns, refund slips, and deposit deductions.
* **📲 Omnichannel Bill Dispatch**:
  * Formats clean order summaries into WhatsApp `wa.me` deep links.
  * Native SMS text deep links (`sms:`) for non-WhatsApp users.
  * Public client bill receipt portal at `/public/invoice/[id]` with print-ready thermal receipt and PDF generation.
* **☁️ Zero-CORS Direct Cloud Storage (`uploadFileDirect`)**:
  * Server-side upload gateway streaming base64 buffers directly from Node.js to AWS S3 (`primebake` bucket).
  * Completely bypasses browser CORS constraints, preflight `OPTIONS` blocks, and network proxy drops.
  * Enforces server-side MIME verification (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) and filename traversal sanitization (`sanitizeFilename`).
  * Dedicated folder segregation: `invoices/`, `logos/`, and `bookings/`.
* **📅 Transaction Analytics & Date Filtering (`/transactions`)**:
  * Instant multi-field search across customer name, phone number, and invoice IDs.
  * 1-click Quick Date Presets: `Today`, `Yesterday`, `This Week`, `This Month`, and `Custom Range`.
  * Dual-mode UI: Touch card deck on mobile; tabular grid on desktop.
* **📜 Immutable Activity Audit Log (`/activity`)**:
  * Non-blocking asynchronous audit observer (`ActivityLogService`) tracking all actions across Invoices, Customers, Bookings, Menu, Categories, Coupons, Team, and Profile Settings.
  * Interactive dashboard with KPI metrics, member filters, module filters, and JSON metadata drawers.
* **🎂 Advance Bookings & Custom Orders (`/bookings`)**:
  * Schedule future cake orders with pickup/delivery dates, advance payments, and pending balances.
  * Design reference photos stored directly in AWS S3.
* **📊 90-Day Financial Analytics & Excel Export (`/customers/[id]/report`)**:
  * Rolling 90-day customer spend, average order value (AOV), and payment method distribution.
  * One-click download of formatted `.xlsx` workbooks via SheetJS.
* **🔒 Enterprise Security & Isolation**:
  * Centralized tenant scoping via `getEffectiveUserId()` preventing Insecure Direct Object References (IDOR).
  * Strict RBAC: only store `OWNER` accounts can modify historical bills; `STAFF` edits return `403 Forbidden`.
  * Sliding-window rate limiting on signup (5 requests/5 min per IP).
  * Production database name enforcement (`primebake-prod`) preventing Atlas `test` DB fallback.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16.4.3](https://nextjs.org/) (Turbopack, App Router, Server Actions) |
| **UI Library** | [React 19.3.1](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict mode, zero `any` in services) |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Mongoose 9.3.0](https://mongoosejs.com/) (Singleton connection cache) |
| **Authentication** | [NextAuth.js v5](https://authjs.dev/) (Credentials, bcrypt 10 rounds, HttpOnly cookies) |
| **Cloud Storage** | [AWS SDK v3 S3 Client](https://aws.amazon.com/sdk-for-javascript/) (`@aws-sdk/client-s3`) |
| **Validation** | [Zod 3.25](https://zod.dev/) (Runtime DTO validation) |
| **PDF & Export** | [jsPDF](https://github.com/parallax/jsPDF), [html2canvas](https://html2canvas.hertzen.com/), [SheetJS (xlsx)](https://sheetjs.com/) |

---

## 📂 Project Structure

```text
whatsapp-invoice-app/
├── docs/                                  # Comprehensive architectural & audit documentation
│   ├── ARCHITECTURE_AND_DESIGN_PATTERNS.md # Layered SOLID patterns, S3 gateway, portaling
│   ├── DATA_FLOW_DIAGRAMS.md              # DFD Levels 0, 1, 2 (Sequence diagrams)
│   ├── ENTITY_RELATIONSHIP_DIAGRAM.md     # MongoDB schema ERD & performance indexes
│   ├── FUNCTIONAL_REQUIREMENTS.md         # Detailed functional specification (FR-01 to FR-14)
│   ├── NON_FUNCTIONAL_REQUIREMENTS.md     # Security, performance, and UX benchmarks
│   ├── SENIOR_SECURITY_AUDIT_REPORT.md    # Vulnerability analysis & threat defense
│   ├── SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md # Full SRS and architecture document
│   ├── UI_UX_SECURITY_AND_TESTING_REPORT.md    # Multi-screen UX audit & test reports
│   └── VERSIONING.md                      # Branching strategy, semver, and release runbook
├── scripts/                               # Testing, verification & release scripts
│   ├── release.mjs                        # Automated release runbook (bump, changelog, tag)
│   ├── test-activity-log.mjs              # Activity log audit verification
│   ├── test-comprehensive.mjs             # Full functional acceptance test suite
│   └── test-security.mjs                  # ReDoS, MIME, path traversal, header checks
├── src/
│   ├── app/                               # Next.js App Router (Routes & Server Actions)
│   │   ├── (admin)/                       # Protected dashboard views
│   │   ├── (auth)/                        # Login & registration views
│   │   ├── actions/                       # Transport controllers (invoice, booking, user, activity)
│   │   ├── api/                           # Versioned REST APIs (/api/v1/health, /api/v1/export-csv)
│   │   └── public/                        # Public unauthenticated routes (/public/invoice/[id])
│   ├── components/                        # React 19 UI components
│   │   ├── blocks/                        # Reusable modular UI widgets
│   │   ├── builder/                       # Dynamic page and catalog builders
│   │   └── ...                            # POS billing, customer CRM, transactions, settings
│   ├── lib/                               # Core business logic & infrastructure
│   │   ├── adapters/messaging/            # MessagingAdapterFactory, WhatsApp & SMS adapters
│   │   ├── db/                            # Repository implementations
│   │   ├── repositories/                  # Strongly-typed repository interfaces
│   │   ├── schemas/                       # Single-source-of-truth Zod schemas
│   │   ├── services/                      # Domain services (InvoiceService, ActivityLogService)
│   │   ├── mongoose.ts                    # Hardened singleton DB connection cache
│   │   ├── s3.ts                          # AWS S3 client configuration
│   │   └── security.ts                    # MIME validator, regex escaper, path sanitizer
│   └── models/                            # Mongoose ODM schemas (Invoice, Customer, Booking, etc.)
├── CHANGELOG.md                           # Detailed version changelog (SemVer)
└── package.json                           # Scripts and project dependencies
```

---

## 💻 Getting Started

### Prerequisites

* **Node.js**: $\ge 20.0.0$
* **MongoDB**: Local instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI
* **AWS S3 Bucket**: For invoice PDF archiving and logo storage

### Environment Configuration

Create a `.env.local` file in the project root:

```env
# NextAuth
AUTH_SECRET="your-secure-random-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# MongoDB Database
MONGODB_URI="mongodb://127.0.0.1:27017/primebake-prod"
MONGODB_DB_NAME="primebake-prod"

# AWS S3 Cloud Storage
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_S3_BUCKET_NAME="primebake"
NEXT_PUBLIC_S3_PUBLIC_URL="https://primebake.s3.ap-south-1.amazonaws.com"

# Application Metadata
NEXT_PUBLIC_APP_VERSION="1.3.0"
```

### Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Run local Turbopack development server
npm run dev

# 3. Open http://localhost:3000 in your browser
```

---

## 🧪 Testing & Verification

```bash
# Run security threat tests (ReDoS, Path Traversal, MIME Type whitelist, HTTP Headers)
npm run test:security

# Run end-to-end integration acceptance suite
npm run test:e2e

# Run activity log & audit trail suite
npm run test:activity

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint validation
npm run lint
```

---

## 📦 Release Workflow

All releases follow [Semantic Versioning (SemVer)](https://semver.org/). To create a new release:

```bash
# Bug fix patch (e.g. 1.3.0 -> 1.3.1)
npm run release patch

# Feature minor release (e.g. 1.3.0 -> 1.4.0)
npm run release minor

# Major breaking release (e.g. 1.3.0 -> 2.0.0)
npm run release major
```

The release runbook updates `package.json`, prepends an entry in `CHANGELOG.md`, creates a git commit, and annotates the tag.

---

## 📚 Complete Documentation Index

For in-depth architectural specifications and audit reports, refer to:
* [Architectural & Design Patterns Specification](docs/ARCHITECTURE_AND_DESIGN_PATTERNS.md)
* [Functional Requirements Specification (FRS)](docs/FUNCTIONAL_REQUIREMENTS.md)
* [Non-Functional Requirements Specification (NFRS)](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
* [Data Flow Diagrams (DFD Levels 0, 1, 2)](docs/DATA_FLOW_DIAGRAMS.md)
* [Entity-Relationship Diagram & Schema Specification](docs/ENTITY_RELATIONSHIP_DIAGRAM.md)
* [System Requirements Specification (SRS)](docs/SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md)
* [UI/UX, Security & QA Testing Report](docs/UI_UX_SECURITY_AND_TESTING_REPORT.md)
* [Senior Security Engineer Threat Audit](docs/SENIOR_SECURITY_AUDIT_REPORT.md)
* [Versioning & Branching Guide](docs/VERSIONING.md)
* [Project Changelog](CHANGELOG.md)
