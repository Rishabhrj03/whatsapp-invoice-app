/**
 * Zod validation schemas — single source of truth for data shape.
 * Used in server actions to validate ALL incoming data before touching the DB.
 * Principle: Defense in depth / Fail fast.
 */
import { z } from 'zod';

// ─── Invoice ─────────────────────────────────────────────────────────────────
export const InvoiceItemSchema = z.object({
    menuEntryId: z.string().optional(),
    name: z.string().min(1, 'Item name is required').max(200),
    price: z.number().nonnegative('Price must be ≥ 0'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    description: z.string().max(500).optional(),
});

export const CreateInvoiceSchema = z.object({
    customerId: z.string().optional(),
    items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
    totalAmount: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().optional().default(0),
    couponCode: z.string().optional(),
    comment: z.string().max(500).optional(),
    paymentType: z.enum(['Cash', 'Card', 'UPI']).default('Cash'),
});

export const UpdateInvoiceSchema = z.object({
    items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
    paymentType: z.enum(['Cash', 'Card', 'UPI']),
    totalAmount: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().optional().default(0),
    couponCode: z.string().optional(),
    comment: z.string().max(500).optional(),
});

// ─── Customer ────────────────────────────────────────────────────────────────
export const CreateCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100).trim(),
    phoneNumber: z
        .string()
        .min(10, 'Phone must be at least 10 digits')
        .max(15)
        .regex(/^\d+$/, 'Phone number must contain only digits'),
    birthdayDate: z.string().optional(),
    anniversaryDate: z.string().optional(),
    address: z.string().max(300).optional(),
});

// ─── Menu Item ───────────────────────────────────────────────────────────────
export const CreateMenuItemSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200).trim(),
    price: z.number().nonnegative('Price must be ≥ 0'),
    description: z.string().max(500).optional(),
    category: z.string().optional(),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().required({ name: true, price: true });

// ─── Category ────────────────────────────────────────────────────────────────
export const CreateCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(100).trim(),
    description: z.string().max(300).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex').optional().default('#f97316'),
});

// ─── Business Profile ────────────────────────────────────────────────────────
export const UpdateBusinessProfileSchema = z.object({
    businessName: z.string().max(100).optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    whatsappTemplate: z.string().max(1000).optional(),
    bookingAlertHoursBefore: z.number().int().min(0).max(72).optional(),
    bookingAlertFrequencyMins: z.number().int().min(5).max(1440).optional(),
    dispatchAlertHoursBefore: z.number().int().min(0).max(24).optional(),
});

// ─── Authentication / Signup ─────────────────────────────────────────────────
export const SignupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
    email: z.string().email('Please enter a valid email address').max(200).toLowerCase().trim(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

// Inferred types from schemas
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateBusinessProfileInput = z.infer<typeof UpdateBusinessProfileSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
