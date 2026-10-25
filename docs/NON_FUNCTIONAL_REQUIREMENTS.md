# Non-Functional Requirements Specification (NFRS)

**Application:** WhatsApp Digital Invoicing & POS Application  
**Version:** 2.0.0 (Next.js 16.4.3 / React 19)  
**Status:** Approved & Implemented  

---

## 1. Security & Compliance (NFR-SEC)

* **NFR-SEC-01: Zero-Trust Tenant Isolation (IDOR Prevention)**
  * Every server action, service, and database query must enforce multi-tenant isolation via `effectiveUserId`.
  * User-supplied IDs in request bodies must never be used to query or mutate tenant records without matching `userId`.
* **NFR-SEC-02: Role-Based Access Control (RBAC)**
  * Privilege escalation checks are executed in the Service layer before mutating financial records.
  * Only `OWNER` users are authorized to modify past invoices or access `/team`. Staff attempts return `403 Forbidden`.
* **NFR-SEC-03: Input Validation & Sanitization**
  * All incoming payloads are validated at runtime using Zod schemas (`src/lib/schemas/index.ts`).
  * Strict constraints: prices must be non-negative numbers, quantities must be positive integers, strings are trimmed and bounded.
* **NFR-SEC-04: Credential & Data Protection**
  * Passwords must be hashed using `bcryptjs` with a work factor of 10.
  * Sensitive fields (`password`, `resetToken`) are excluded from MongoDB projections (`.select('-password')`).
* **NFR-SEC-05: Session Management**
  * NextAuth v5 session tokens are stored in `HttpOnly`, `SameSite=Lax`, and `Secure` (production) cookies to mitigate XSS and CSRF risks.

---

## 2. Performance & Efficiency (NFR-PERF)

* **NFR-PERF-01: Database Indexing & Query Latency**
  * Compound indexes guarantee query latency $< 5\text{ms}$ under standard loads:
    * `Invoice`: `{ userId: 1, createdAt: -1 }`
    * `Invoice`: `{ userId: 1, customer: 1, date: -1 }`
    * `Customer`: `{ userId: 1, name: 1 }`
    * `Customer`: `{ userId: 1, phoneNumber: 1 }`
* **NFR-PERF-02: Next.js 16 Build & Dev Performance**
  * Dev server cold boot with Turbopack in $< 200\text{ms}$.
  * Full production build (`next build`) in $< 3.0\text{s}$.
* **NFR-PERF-03: Client Bundle Optimization & Code Splitting**
  * Heavy client dependencies (`xlsx`, `jspdf`, `html2canvas`) must be dynamically imported on demand (`import('xlsx')`).
  * Initial page load bundle must not exceed $60\text{KB}$ gzipped.
* **NFR-PERF-04: Lean Queries**
  * Read-only queries use `.lean()` to bypass Mongoose document hydration overhead, reducing memory consumption by up to 70%.

---

## 3. Reliability & High Availability (NFR-REL)

* **NFR-REL-01: Database Connection Pooling (Singleton)**
  * Implemented via `_mongooseCache` with optimal pooling parameters:
    * `maxPoolSize: 10`
    * `serverSelectionTimeoutMS: 5000`
    * `socketTimeoutMS: 45000`
  * Prevents connection exhaustion in serverless or containerized environments.
* **NFR-REL-02: Graceful Error Boundaries**
  * Server actions return strongly-typed discriminated unions (`ActionResult<T>`):
    * `{ success: true, ...data }`
    * `{ success: false, error: string }`
  * Prevents unhandled exceptions or database stack traces from crashing the UI or leaking system internals.

---

## 4. Maintainability & Code Quality (NFR-MAINT)

* **NFR-MAINT-01: SOLID Principles Adherence**
  * Architecture strictly separates transport/controller (Server Actions) from domain logic (Services) and database queries (Repositories).
* **NFR-MAINT-02: 100% Type Safety**
  * TypeScript 5 with zero `any` casts in core domain services.
  * Verified with `npx tsc --noEmit` returning 0 errors.
* **NFR-MAINT-03: Next.js 16 Future-Proofing**
  * Complies with Next.js 15+ breaking changes: all page `params` and `searchParams` are typed as `Promise<...>` and awaited asynchronously.

---

## 5. Usability & User Experience (NFR-UX)

* **NFR-UX-01: Responsive POS Interface**
  * Mobile-first responsive layout tailored for smartphones, tablets, POS terminals, and desktops.
* **NFR-UX-02: Instant Feedback**
  * Loading indicators (`Loader2`), optimistic UI transitions, and confirmation dialogs for all destructive actions (deletions).
