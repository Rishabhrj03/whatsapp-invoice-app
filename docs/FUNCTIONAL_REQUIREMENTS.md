# Functional Requirements Specification (FRS)

**Application:** WhatsApp Digital Invoicing & POS Application  
**Version:** 2.1.0 (App v1.3.0 • Next.js 16.4.3 / React 19)  
**Status:** Approved & Implemented  

---

## 1. Overview & User Personas

| Persona | Role | Primary Responsibilities |
| :--- | :--- | :--- |
| **Store Owner / Root User** | `OWNER` | Full administrative control, store settings, team management, catalog administration, financial audits, and correcting past bills. |
| **Cashier / Store Associate** | `STAFF` | Day-to-day point of sale, order creation, attaching bills to customers, and dispatching invoices via WhatsApp or SMS. |
| **End Customer** | `GUEST / CUSTOMER` | Receives digital bills via WhatsApp/SMS, views/downloads digital invoices online via `/public/invoice/[id]`. |

---

## 2. Functional Feature Matrix

### FR-01: Authentication & Multi-Tenancy
* **FR-01.1 Registration & Login:** Users can sign up and log in using email and password. Passwords are securely hashed with `bcryptjs` (salt rounds $\ge 10$).
* **FR-01.2 Role-Based Access Control (RBAC):** Supports two distinct roles: `OWNER` and `STAFF`.
* **FR-01.3 Tenant Context Isolation:** `STAFF` users belong to an `ownerId`. All database operations execute under `getEffectiveUserId()` ensuring Staff access only their parent store's catalog and customers.

### FR-02: Menu & Inventory Management
* **FR-02.1 Menu Item CRUD:** Add, edit, view, and delete menu items (Name, Price, Category, Description).
* **FR-02.2 Excel / CSV Bulk Import:** Supports uploading `.xlsx`, `.xls`, and `.csv` files using SheetJS.
* **FR-02.3 Automated Category Provisioning:** If an imported spreadsheet contains categories not yet in the system, they are automatically created with default styling.
* **FR-02.4 Bulk Operations:** Multi-select checkboxes to delete multiple items simultaneously.

### FR-03: Customer Directory & CRM
* **FR-03.1 Customer Profile Creation:** Capture Customer Name, Phone Number (10–15 digits), Anniversary Date, Birthday Date, and Address.
* **FR-03.2 Search & Filtering:** Case-insensitive, real-time search across names and phone numbers.
* **FR-03.3 Pagination:** Server-side pagination with 10 records per page.

### FR-04: Digital Invoicing & POS Billing
* **FR-04.1 Order Assembly:** Select a registered customer or proceed as an anonymous "Guest". Select menu items with quantity adjustments.
* **FR-04.2 Discounts & Coupons:** Apply bill-level discounts or enter promo coupon codes.
* **FR-04.3 Payment Methods:** Support for `Cash`, `Card`, and `UPI`.
* **FR-04.4 Direct Server-Side S3 PDF Storage:** Client renders invoice to canvas/PDF via `html2canvas` / `jspdf`, base64-encodes the buffer, and dispatches via `uploadFileDirect` server action directly to AWS S3 (`primebake` bucket, `invoices/` folder). This server-side proxy completely eliminates browser CORS restrictions and ensures 100% upload delivery.
* **FR-04.5 Negative Line Items & Credit Notes:** Supports negative prices on individual line items and negative invoice grand totals. Enables native creation of Credit Notes, customer refund slips, advance payment deductions, and line-item corrections.
* **FR-04.6 Line Item Customization Modal & Notes:** Interactive item description modal to capture custom product specifications (e.g. custom cake flavor, eggless, weight, delivery notes) with quick preset chips (`Custom Cake`, `Eggless`, `1.5 kg`, `Special Message`). Rendered directly beneath item names on invoice previews, public receipts, and PDF files.
* **FR-04.7 Portaled Full-Screen Item Picker:** `MenuSelector` portaled directly to `document.body` via React `createPortal` to prevent layout clipping and parent overflow issues. Features hover tooltips (`title` attribute) on item and category cards for unabbreviated product titles.

### FR-05: 90-Day Customer Financial Reporting
* **FR-05.1 Historical Window:** Accessible via `/customers/[id]/report` to view all invoices generated for the customer in the past 90 days.
* **FR-05.2 Aggregated Metrics:**
  * **Total Spend:** Total revenue generated from the customer in the last 90 days.
  * **Order Frequency:** Total number of visits/invoices.
  * **Average Order Value (AOV):** Mean spend per invoice.
  * **Payment Method Breakdown:** Total and percentage spent across Cash, Card, and UPI.
* **FR-05.3 Expandable Invoices:** Interactive view displaying individual line items, unit prices, discounts, and timestamps.

### FR-06: Excel Data Export Engine
* **FR-06.1 90-Day Customer Report Export:** One-click download of `bill_report_[customer_name]_90days.xlsx` containing:
  * Invoice ID, Date, Time, Item Name, Unit Price, Qty, Line Total, Discount, Payment Type, and Notes.
  * Auto-calculated **SUMMARY** row with total spending and report generation timestamp.
* **FR-06.2 Global Backup Export:** Full export of all customers, menu items, and transactions to CSV via `/export`.

### FR-07: Root-Only Past Invoice Modification
* **FR-07.1 Error Correction:** Enables correcting past billing mistakes:
  * Adding or removing line items (positive or negative).
  * Correcting wrong item quantities or prices.
  * Correcting payment methods (e.g. changing UPI to Cash or vice-versa).
  * Adding operational notes/comments.
* **FR-07.2 Security Enforcement:** Restricted exclusively to users with `role: 'OWNER'`. Attempts by `STAFF` are rejected with `403 Forbidden`.
* **FR-07.3 Cache Revalidation:** Automatically purges cached metrics across `/transactions` and `/dashboard`.

### FR-08: Omnichannel Bill Dispatch
* **FR-08.1 WhatsApp Web Dispatch:** Formats order summary, items, payment method, and public invoice link into `wa.me/[phone]?text=[message]`.
* **FR-08.2 SMS Text Message Dispatch:** Formats compact bill details into native `sms:[phone]?body=[message]` deep link.
* **FR-08.3 Adapter Architecture:** Implemented via `IMessagingAdapter` and `MessagingAdapterFactory` for plug-and-play cloud SMS gateways.

### FR-09: Public Invoice Portal
* **FR-09.1 Public Access:** Accessible at `/public/invoice/[id]` without requiring customer login.
* **FR-09.2 Rich Digital Bill:** Displays store branding, logo, itemized breakdown, tax/discounts, and print/PDF download options.

### FR-10: Team & Staff Management
* **FR-10.1 Staff Roster:** Owners can view all staff members associated with their account via `/team`.
* **FR-10.2 Staff Onboarding & Revocation:** Owners can invite new staff with secure passwords and delete staff credentials at any time.

### FR-11: Activity Log & Comprehensive Audit Trail
* **FR-11.1 Non-Blocking Event Recording:** `ActivityLogService` automatically logs audit events across invoices, customers, bookings, menu entries, categories, coupons, team members, and business settings.
* **FR-11.2 Actor Snapshot:** Records performer identity (`userId`, `name`, `email`, `role`), event timestamp, action code, human-readable summary, and JSON metadata context.
* **FR-11.3 Audit Dashboard (`/activity`):** Interactive UI providing KPI cards (total events, 24h volume, owner vs. staff breakdown), multi-criteria filtering (performer, module, action type, date range, keyword search), and expandable JSON context inspect drawers.

### FR-12: Advance Booking Subsystem
* **FR-12.1 Order Scheduling:** Schedule future cake and catering orders with delivery dates, advance deposits, remaining balances, and status tracking (`PENDING`, `CONFIRMED`, `DELIVERED`, `CANCELLED`).
* **FR-12.2 Cake Reference Photo Upload:** Direct server-side upload of design reference photos via `uploadFileDirect` into `bookings/` S3 folder without client CORS dependencies.
* **FR-12.3 Multi-Tenant Isolation:** Advance bookings are strictly scoped to the store's `effectiveUserId`.

### FR-13: Advanced Transactions Analytics & Date Filtering
* **FR-13.1 Instant Multi-Field Search:** Real-time search across customer names, phone numbers, and invoice identifiers.
* **FR-13.2 Quick Date Presets:** 1-click filter bar with presets: `Today`, `Yesterday`, `This Week`, `This Month`, and `Custom Date Range`.
* **FR-13.3 Dynamic Aggregate Metrics:** Header KPI cards automatically recompute total revenue and invoice counts matching the active date/search filter.

### FR-14: Store Branding & Asset Management
* **FR-14.1 Custom Store Profile:** Store owner configures business name, custom WhatsApp message template, and branding logo.
* **FR-14.2 Server-Side Logo Uploads:** High-res store logos are compressed client-side and streamed server-side to S3 (`logos/` folder) via `uploadFileDirect`.
