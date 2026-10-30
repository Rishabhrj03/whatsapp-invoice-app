# Data Flow Diagrams (DFD)

**Application:** WhatsApp Digital Invoicing & POS Application  
**Version:** 2.1.0 (App v1.3.0 • Next.js 16.4.3 / React 19)  
**Status:** Approved & Implemented  

---

## 1. DFD Level 0: Context Diagram

The Level 0 Context Diagram depicts the primary external entities interacting with the WhatsApp Invoice & POS System boundary.

```mermaid
graph TD
    Owner[Store Owner / Root User] -->|Catalog, Staff Management, Bill Adjustments| System[WhatsApp Invoice & POS System]
    Staff[Cashier / Staff User] -->|Orders, Payments, Customer Creation| System
    System -->|Document Storage & Aggregation| Mongo[(MongoDB Instance)]
    System -->|PDF Archive Storage| S3[(Amazon S3)]
    System -->|Deep-Link Invoice Payload| WA[WhatsApp Messaging]
    System -->|Deep-Link Text Payload| SMS[SMS Text Messaging]
    WA -->|Invoice Text & Link| Customer[End Customer]
    SMS -->|Invoice Text & Link| Customer
    Customer -->|Public View / Download| System
```

---

## 2. DFD Level 1: System Level Data Flow

The Level 1 diagram breaks down the internal architecture into functional sub-processes, showing data stores and data transformations.

```mermaid
graph TD
    User([User: Owner / Staff]) -->|Credentials / Session| P1[1.0 Authentication & RBAC]
    P1 -->|Session Token + Role| P2[2.0 Transport & Controller]
    
    P2 -->|Form Data / Mutation JSON| P3[3.0 Zod Schema Validation]
    P3 -->|Validated DTO| P4[4.0 Business Service Layer]
    
    P4 -->|Enforce Root Permission| Guard{Is Action Restricted?}
    Guard -->|Restricted & User !== OWNER| Reject[Reject with 403 Forbidden]
    Guard -->|Authorized| P5[5.0 Repository Access Layer]
    
    P5 -->|Query / Mutate with effectiveUserId| D1[(Invoices Collection)]
    P5 -->|Query / Mutate with effectiveUserId| D2[(Customers Collection)]
    P5 -->|Query / Mutate with effectiveUserId| D3[(Menu Collection)]
    P5 -->|Query / Mutate| D4[(Users Collection)]
    
    P4 -->|Messaging Request: whatsapp / sms| P6[6.0 Messaging Factory]
    P6 -->|Channel: whatsapp| WAAdapter[WhatsApp Web Adapter wa.me]
    P6 -->|Channel: sms| SMSAdapter[SMS Text Adapter sms:]
    
    P4 -->|90-Day Report Data| P7[7.0 SheetJS Excel Generation]
    P7 -->|Formatted .xlsx Download| User
```

---

## 3. DFD Level 2: Invoice Creation & Dispatch Sub-Process

Detailed flow showing the steps taken from client order assembly to persistent storage and omnichannel customer dispatch.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier / Staff
    participant UI as POS Billing Client
    participant Action as createInvoice() Server Action
    participant Service as InvoiceService
    participant Repo as InvoiceRepository
    participant DB as MongoDB
    participant Factory as MessagingAdapterFactory
    actor Customer as Customer Device

    Cashier->>UI: Select Customer, Line Items, and Payment Type (UPI/Cash)
    UI->>Action: POST createInvoice(payload)
    Action->>Action: getEffectiveUserId() + verify session
    Action->>Service: createInvoice(data, context)
    Service->>Service: Validate with CreateInvoiceSchema
    Service->>Repo: create(invoiceDTO)
    Repo->>DB: InvoiceModel.create({ ...dto, userId: effectiveUserId })
    DB-->>Repo: Saved Invoice Document
    Repo-->>Service: InvoiceDTO
    Service-->>Action: { success: true, invoiceId }
    Action-->>UI: Invoice Generated
    
    Cashier->>UI: Click "WhatsApp" or "Text Message"
    UI->>Service: generateBillMessageLink(invoiceId, channel)
    Service->>Factory: getAdapter(channel)
    Factory-->>Service: IMessagingAdapter (WhatsApp or SMS)
    Service-->>UI: Return deep-link URI (wa.me or sms:)
    UI->>Customer: Launch deep-link with pre-formatted bill details
```

---

## 4. DFD Level 2: 90-Day Customer Report & Excel Export Sub-Process

Detailed flow demonstrating data aggregation and spreadsheet generation for a specific customer.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner / Auditor
    participant UI as CustomerReportClient
    participant Action as getCustomerReport(customerId)
    participant Service as InvoiceService
    participant Repo as InvoiceRepository
    participant DB as MongoDB
    participant SheetJS as SheetJS (.xlsx Engine)

    Owner->>UI: Navigate to /customers/[id]/report
    UI->>Action: Call getCustomerReport(customerId)
    Action->>Service: getCustomer90DayReport(customerId, effectiveUserId)
    Service->>Service: Calculate Date Threshold (Current Date - 90 Days)
    Service->>Repo: findByCustomer(effectiveUserId, customerId, thresholdDate)
    Repo->>DB: Invoice.find({ userId, customer, date: { $gte: threshold } })
    DB-->>Repo: Invoices Array
    Service->>Service: Compute Total Spend, AOV, and Payment Breakdowns
    Service-->>Action: CustomerReportDTO
    Action-->>UI: Render Report Dashboard & Visual KPIs
    
    Owner->>UI: Click "Export to Excel"
    UI->>SheetJS: Dynamic import("xlsx")
    UI->>SheetJS: Map invoices to rows and calculate SUMMARY row
    UI->>Owner: Download bill_report_[customer_name]_90days.xlsx
```

---

## 5. DFD Level 2: Direct Server-Side S3 Storage Sub-Process (`uploadFileDirect`)

Detailed sequence showing direct file streaming from browser through Next.js Server Action to AWS S3, bypassing browser CORS restrictions and automatically linking PDF records in MongoDB.

```mermaid
sequenceDiagram
    autonumber
    actor User as Staff / Store Owner
    participant Client as POS Client / Booking UI
    participant Reader as FileReader (Browser)
    participant Action as uploadFileDirect() Server Action
    participant Sec as Security Utilities (MIME & Path)
    participant S3 as AWS S3 Bucket (primebake)
    participant Service as InvoiceService
    participant DB as MongoDB

    User->>Client: Generate Bill / Select Photo / Select Logo
    Client->>Reader: readAsDataURL(fileBlob)
    Reader-->>Client: base64DataString
    Client->>Action: uploadFileDirect({ invoiceId, fileBase64, filename, contentType })
    Action->>Action: getEffectiveUserId() + verify session
    Action->>Sec: isValidUploadMimeType(contentType)
    Sec-->>Action: Allowed (image/jpeg, png, webp, pdf)
    Action->>Sec: sanitizeFilename(filename)
    Sec-->>Action: safeFilename (stripped ../, null bytes)
    Action->>Action: Buffer.from(base64Data, 'base64')
    Action->>S3: PutObjectCommand({ Bucket, Key, Body: buffer, ContentType })
    S3-->>Action: S3 PutObject Success
    
    opt If invoiceId provided & PDF
        Action->>Service: updatePdfUrl(invoiceId, publicUrl, effectiveUserId)
        Service->>DB: Invoice.findOneAndUpdate({ _id: invoiceId, userId: effectiveUserId }, { pdfUrl })
        DB-->>Service: Updated Invoice Document
    end

    Action-->>Client: { success: true, publicUrl, objectKey }
    Client-->>User: Display Success / S3 Backup Guaranteed
```
