"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import dbConnect from "@/lib/mongoose";
import OnHoldInvoice, { IOnHoldInvoice } from "@/models/OnHoldInvoice";
import { SaveOnHoldInvoiceSchema } from "@/lib/schemas";
import { activityLogService } from "@/lib/services/ActivityLogService";
import type { OnHoldInvoiceDTO } from "@/types/domain";

export type SaveOnHoldResponse =
    | { success: true; holdId: string; error?: undefined }
    | { success: false; error: string; holdId?: undefined };

export type DeleteOnHoldResponse =
    | { success: true; error?: undefined }
    | { success: false; error: string };

/**
 * Puts a current active invoice draft on hold.
 * Allows cashiers to temporarily park a multi-item bill to serve other waiting customers.
 */
export async function holdInvoice(data: unknown): Promise<SaveOnHoldResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();

        if (!effectiveUserId || !session?.user?.id || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const parsed = SaveOnHoldInvoiceSchema.safeParse(data);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0]?.message || "Invalid on-hold data";
            return { success: false, error: firstIssue };
        }

        await dbConnect();

        const input = parsed.data;

        // Auto-generate a friendly short reference if none provided
        const holdReference = input.holdReference?.trim() ||
            (input.customerName?.trim() ? `Customer: ${input.customerName.trim()}` : `Hold #${Date.now().toString().slice(-4)}`);

        const created = await OnHoldInvoice.create({
            userId: effectiveUserId,
            createdBy: session.user.id,
            customerId: input.customerId || undefined,
            customerName: input.customerName || undefined,
            customerPhone: input.customerPhone || undefined,
            customerAddress: input.customerAddress || undefined,
            items: input.items,
            totalAmount: input.totalAmount,
            discountAmount: input.discountAmount || 0,
            manualDiscountType: input.manualDiscountType || 'FIXED',
            manualDiscountValue: input.manualDiscountValue || '',
            couponCode: input.couponCode || undefined,
            appliedCoupon: input.appliedCoupon || undefined,
            paymentType: input.paymentType,
            comment: input.comment || undefined,
            invoiceDate: input.invoiceDate || undefined,
            holdReference,
        });

        // Audit Trail
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'INVOICE_HELD',
            entityType: 'ON_HOLD_INVOICE',
            entityId: created._id.toString(),
            description: `Placed bill on hold (${created.items.length} items, ₹${created.totalAmount}) — Ref: ${holdReference}`,
            metadata: {
                totalAmount: created.totalAmount,
                itemCount: created.items.length,
                customerName: created.customerName,
                customerPhone: created.customerPhone,
                holdReference,
            },
        });

        revalidatePath("/on-hold");
        revalidatePath("/invoice/create");
        revalidatePath("/dashboard");

        return { success: true, holdId: created._id.toString() };
    } catch (error: any) {
        console.error("Failed to place invoice on hold:", error);
        return { success: false, error: error.message || "Failed to place invoice on hold" };
    }
}

/**
 * Permanently discards a held invoice record.
 */
export async function deleteHeldInvoice(holdId: string): Promise<DeleteOnHoldResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();

        if (!effectiveUserId || !session?.user?.id || !user) {
            return { success: false, error: "Unauthorized" };
        }

        if (!holdId) {
            return { success: false, error: "Missing hold ID" };
        }

        await dbConnect();

        // Enforce multi-tenant security
        const deleted = await OnHoldInvoice.findOneAndDelete({
            _id: holdId,
            userId: effectiveUserId,
        });

        if (!deleted) {
            return { success: false, error: "Held invoice not found or unauthorized" };
        }

        // Audit Trail
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'HELD_INVOICE_DELETED',
            entityType: 'ON_HOLD_INVOICE',
            entityId: holdId,
            description: `Discarded on-hold invoice #${holdId.slice(-6).toUpperCase()} (${deleted.holdReference || 'No Ref'})`,
            metadata: {
                totalAmount: deleted.totalAmount,
                itemCount: deleted.items?.length,
                customerName: deleted.customerName,
            },
        });

        revalidatePath("/on-hold");
        revalidatePath("/invoice/create");
        revalidatePath("/dashboard");

        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete held invoice:", error);
        return { success: false, error: error.message || "Failed to delete held invoice" };
    }
}

/**
 * Fetches the count of active held invoices for badge indicators.
 */
export async function getHeldInvoicesCount(): Promise<number> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return 0;

        await dbConnect();
        return await OnHoldInvoice.countDocuments({ userId: effectiveUserId });
    } catch (error) {
        console.error("Failed to fetch held invoices count:", error);
        return 0;
    }
}

/**
 * Retrieves all held invoices for the active tenant.
 */
export async function getHeldInvoices(): Promise<OnHoldInvoiceDTO[]> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return [];

        await dbConnect();
        const docs = await OnHoldInvoice.find({ userId: effectiveUserId })
            .sort({ createdAt: -1 })
            .lean();

        return docs.map((doc: any) => ({
            _id: doc._id.toString(),
            userId: doc.userId.toString(),
            createdBy: doc.createdBy?.toString(),
            customerId: doc.customerId?.toString(),
            customerName: doc.customerName,
            customerPhone: doc.customerPhone,
            customerAddress: doc.customerAddress,
            items: (doc.items || []).map((it: any) => ({
                categoryId: it.categoryId,
                menuEntryId: it.menuEntryId,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                description: it.description,
            })),
            totalAmount: doc.totalAmount,
            discountAmount: doc.discountAmount,
            manualDiscountType: doc.manualDiscountType,
            manualDiscountValue: doc.manualDiscountValue,
            couponCode: doc.couponCode,
            appliedCoupon: doc.appliedCoupon,
            paymentType: doc.paymentType,
            comment: doc.comment,
            invoiceDate: doc.invoiceDate,
            holdReference: doc.holdReference,
            createdAt: doc.createdAt?.toISOString?.() || new Date(doc.createdAt).toISOString(),
            updatedAt: doc.updatedAt?.toISOString?.() || new Date(doc.updatedAt).toISOString(),
        }));
    } catch (error) {
        console.error("Failed to retrieve held invoices:", error);
        return [];
    }
}

/**
 * Retrieves a single held invoice by ID with strict tenant ownership validation.
 */
export async function getHeldInvoiceById(holdId: string): Promise<OnHoldInvoiceDTO | null> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !holdId) return null;

        await dbConnect();
        const doc: any = await OnHoldInvoice.findOne({
            _id: holdId,
            userId: effectiveUserId,
        }).lean();

        if (!doc) return null;

        return {
            _id: doc._id.toString(),
            userId: doc.userId.toString(),
            createdBy: doc.createdBy?.toString(),
            customerId: doc.customerId?.toString(),
            customerName: doc.customerName,
            customerPhone: doc.customerPhone,
            customerAddress: doc.customerAddress,
            items: (doc.items || []).map((it: any) => ({
                categoryId: it.categoryId,
                menuEntryId: it.menuEntryId,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                description: it.description,
            })),
            totalAmount: doc.totalAmount,
            discountAmount: doc.discountAmount,
            manualDiscountType: doc.manualDiscountType,
            manualDiscountValue: doc.manualDiscountValue,
            couponCode: doc.couponCode,
            appliedCoupon: doc.appliedCoupon,
            paymentType: doc.paymentType,
            comment: doc.comment,
            invoiceDate: doc.invoiceDate,
            holdReference: doc.holdReference,
            createdAt: doc.createdAt?.toISOString?.() || new Date(doc.createdAt).toISOString(),
            updatedAt: doc.updatedAt?.toISOString?.() || new Date(doc.updatedAt).toISOString(),
        };
    } catch (error) {
        console.error("Failed to retrieve held invoice by id:", error);
        return null;
    }
}
