/**
 * Domain types — used across server actions, repositories, and components.
 * Following Interface Segregation Principle: lean, focused contracts.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────
export type UserRole = 'OWNER' | 'STAFF';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    businessName?: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────
export type PaymentType = 'Cash' | 'Card' | 'UPI';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid';

export interface InvoiceItemDTO {
    menuEntryId?: string;
    name: string;
    price: number;
    quantity: number;
    description?: string;
}

export interface InvoiceDTO {
    _id: string;
    customerId?: string;
    customer?: CustomerDTO | null;
    items: InvoiceItemDTO[];
    totalAmount: number;
    discountAmount: number;
    couponCode?: string;
    paymentType: PaymentType;
    pdfUrl?: string;
    comment?: string;
    date: string;          // ISO string after serialization
    status: InvoiceStatus;
    userId: string;
    createdAt: string;
}

export interface CreateInvoiceInput {
    customerId?: string;
    items: InvoiceItemDTO[];
    totalAmount: number;
    discountAmount?: number;
    couponCode?: string;
    comment?: string;
    paymentType: PaymentType;
}

export interface UpdateInvoiceInput {
    items: InvoiceItemDTO[];
    paymentType: PaymentType;
    totalAmount: number;
    discountAmount?: number;
    couponCode?: string;
    comment?: string;
}

// ─── Customer ────────────────────────────────────────────────────────────────
export interface CustomerDTO {
    _id: string;
    name: string;
    phoneNumber: string;
    birthdayDate?: string;
    anniversaryDate?: string;
    address?: string;
    userId: string;
    createdAt: string;
}

export interface CreateCustomerInput {
    name: string;
    phoneNumber: string;
    birthdayDate?: string;
    anniversaryDate?: string;
    address?: string;
}

// ─── Menu / Category ─────────────────────────────────────────────────────────
export interface MenuItemDTO {
    _id: string;
    name: string;
    price: number;
    description?: string;
    category?: string;
    userId: string;
}

export interface CreateMenuItemInput {
    name: string;
    price: number;
    description?: string;
    category?: string;
}

export interface CategoryDTO {
    _id: string;
    name: string;
    description?: string;
    color: string;
    userId: string;
}

export interface CreateCategoryInput {
    name: string;
    description?: string;
    color?: string;
}

// ─── Action Results (generic) ────────────────────────────────────────────────
export type ActionResult<T = undefined> =
    | { success: true; data?: T }
    | { success: false; error: string };

export type ActionResultWith<K extends string, T> =
    | { success: true } & Record<K, T>
    | { success: false; error: string };

// ─── Report ──────────────────────────────────────────────────────────────────
export interface CustomerReportDTO {
    customer: CustomerDTO;
    invoices: InvoiceDTO[];
    totalSpend: number;
}

// ─── Messaging ───────────────────────────────────────────────────────────────
export interface BillMessagePayload {
    customerName: string;
    customerPhone: string;
    businessName: string;
    items: InvoiceItemDTO[];
    totalAmount: number;
    invoiceUrl: string;
    paymentType: PaymentType;
    date: string;
    template?: string;
}
