# Entity-Relationship Diagram (ERD) & Database Schema Specification

**Application:** WhatsApp Digital Invoicing & POS Application  
**Version:** 2.0.0 (Next.js 16.4.3 / React 19)  
**Database:** MongoDB via Mongoose ODM  
**Status:** Approved & Implemented  

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ USER : "ownerId (Staff belongs to Owner)"
    USER ||--o{ CUSTOMER : "manages"
    USER ||--o{ MENU_ENTRY : "owns"
    USER ||--o{ CATEGORY : "creates"
    USER ||--o{ INVOICE : "generates"
    CUSTOMER ||--o{ INVOICE : "receives"
    INVOICE ||--|{ INVOICE_ITEM : "contains"
    CATEGORY ||--o{ MENU_ENTRY : "classifies"

    USER {
        ObjectId _id PK
        string name "User Full Name"
        string email UK "Unique Login Email"
        string password "Bcrypt Password Hash"
        string businessName "Store Branding Name"
        string logoUrl "Store Logo URL"
        string whatsappTemplate "Custom WhatsApp Template"
        string role "OWNER | STAFF"
        ObjectId ownerId FK "Points to OWNER for STAFF accounts"
        date createdAt "Audit Timestamp"
        date updatedAt "Audit Timestamp"
    }

    CUSTOMER {
        ObjectId _id PK
        ObjectId userId FK "Tenant Store Owner"
        string name "Customer Name"
        string phoneNumber "Customer Phone Number"
        string anniversaryDate "Anniversary String"
        string birthdayDate "Birthday String"
        string address "Customer Address"
        date createdAt "Registration Timestamp"
    }

    CATEGORY {
        ObjectId _id PK
        ObjectId userId FK "Tenant Store Owner"
        string name "Category Display Name"
        string color "Hex Badge Color"
        date createdAt "Creation Timestamp"
    }

    MENU_ENTRY {
        ObjectId _id PK
        ObjectId userId FK "Tenant Store Owner"
        string name "Item Name"
        number price "Unit Price in INR"
        string description "Item Description"
        string category "Category Name reference"
        date createdAt "Creation Timestamp"
    }

    INVOICE {
        ObjectId _id PK
        ObjectId userId FK "Tenant Store Owner"
        ObjectId customerId FK "Optional Customer Reference"
        ObjectId createdBy FK "User who generated the bill"
        number totalAmount "Net Bill Amount"
        number discountAmount "Discount Amount"
        string couponCode "Applied Promo Code"
        string paymentType "Cash | Card | UPI"
        string status "Draft | Sent | Paid"
        string pdfUrl "S3 PDF Archive URL"
        string comment "Special Instructions / Notes"
        date date "Invoice Transaction Date"
        date createdAt "Audit Timestamp"
    }

    INVOICE_ITEM {
        ObjectId menuEntryId FK "Optional Menu Entry"
        string name "Item Name Snapshot"
        number price "Unit Price Snapshot"
        number quantity "Purchased Units"
    }
```

---

## 2. Performance Indexes Specification

To ensure sub-5 millisecond response times under multi-tenant workloads, the following compound and secondary indexes are maintained in MongoDB:

| Collection | Index Fields | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| **`invoices`** | `{ userId: 1, createdAt: -1 }` | Compound | Fast paginated transaction listing per store. |
| **`invoices`** | `{ userId: 1, customer: 1, date: -1 }` | Compound | Instant retrieval of customer invoices for the 90-day report. |
| **`customers`** | `{ userId: 1, name: 1 }` | Compound | Fast prefix name lookup and alphabetical sorting. |
| **`customers`** | `{ userId: 1, phoneNumber: 1 }` | Compound | Phone number search and duplicate prevention. |
| **`users`** | `{ email: 1 }` | Unique | O(1) login lookup and email uniqueness guarantee. |
| **`users`** | `{ ownerId: 1, role: 1 }` | Compound | Fast retrieval of staff members belonging to a store owner. |
| **`menuentries`**| `{ userId: 1, createdAt: -1 }` | Compound | Paginated menu catalog retrieval. |
| **`categories`** | `{ userId: 1, name: 1 }` | Compound | Auto-provisioning lookup during spreadsheet import. |
