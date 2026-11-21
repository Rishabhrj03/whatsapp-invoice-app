/**
 * InvoiceService — Business logic layer for Invoices (Single Responsibility Principle).
 *
 * Orchestrates:
 * - Domain validation via Zod
 * - Access control & RBAC (e.g. ROOT/OWNER only for editing past bills)
 * - Repository persistence (InvoiceRepository, CustomerRepository)
 * - Messaging dispatch via MessagingAdapterFactory (Adapter + Strategy)
 */
import { invoiceRepository } from '@/lib/repositories/InvoiceRepository';
import { customerRepository } from '@/lib/repositories/CustomerRepository';
import { MessagingAdapterFactory, MessagingChannel } from '@/lib/adapters/messaging/MessagingAdapterFactory';
import { CreateInvoiceSchema, UpdateInvoiceSchema, CreateInvoiceInput, UpdateInvoiceInput } from '@/lib/schemas';
import type { InvoiceDTO, CustomerDTO } from '@/types/domain';

import { archiveInvoicePdf, uploadInvoicePdfBuffer } from '@/lib/s3';
import { generateInvoicePdfBuffer } from '@/lib/pdf/generate-invoice-pdf';

export interface CreateInvoiceContext {
    effectiveUserId: string;
    authUserId: string;
}

export interface UpdateInvoiceContext {
    effectiveUserId: string;
    authUserId: string;
    userRole: string;
    businessName?: string;
}

export class InvoiceService {
    /**
     * Create and record a new invoice with strict Zod validation
     */
    async createInvoice(rawInput: unknown, ctx: CreateInvoiceContext): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
        const parsed = CreateInvoiceSchema.safeParse(rawInput);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0]?.message || 'Invalid invoice data';
            return { success: false, error: firstIssue };
        }

        const data: CreateInvoiceInput = parsed.data;

        // If customerId is provided, verify customer belongs to the tenant
        if (data.customerId) {
            const customer = await customerRepository.findByIdForUser(data.customerId, ctx.effectiveUserId);
            if (!customer) {
                return { success: false, error: 'Associated customer not found or unauthorized' };
            }
        }

        const created = await invoiceRepository.create({
            ...data,
            userId: ctx.effectiveUserId,
            createdBy: ctx.authUserId,
        });

        return { success: true, invoiceId: created._id };
    }

    /**
     * OWNER/ROOT-only: edit a past invoice's items, amounts, or payment method.
     * Archives existing PDF to invoices/edited/ and updates invoices/${id}.pdf with new PDF.
     */
    async updateInvoice(
        invoiceId: string,
        rawInput: unknown,
        ctx: UpdateInvoiceContext
    ): Promise<{ success: boolean; invoice?: InvoiceDTO; error?: string }> {
        // Enforce RBAC: Only OWNER can modify past financial records
        if (ctx.userRole !== 'OWNER') {
            return { success: false, error: 'Forbidden: Only the owner (root user) can edit past bills.' };
        }

        const parsed = UpdateInvoiceSchema.safeParse(rawInput);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0]?.message || 'Invalid update data';
            return { success: false, error: firstIssue };
        }

        const data: UpdateInvoiceInput = parsed.data;

        // Verify the invoice belongs to this business
        const existing = await invoiceRepository.findById(invoiceId);
        if (!existing || existing.userId !== ctx.effectiveUserId) {
            return { success: false, error: 'Invoice not found or access denied' };
        }

        const revisionNumber = (existing.editCount || 0) + 1;

        // 1. Archive the pre-edit PDF to S3: invoices/edited/${id}_rev${rev}_${timestamp}.pdf
        const archiveRes = await archiveInvoicePdf(invoiceId, 'edited', revisionNumber);

        // 2. Persist updated changes in MongoDB with edit tracking metadata & revision history
        const updated = await invoiceRepository.update(invoiceId, data, {
            editedBy: ctx.authUserId,
            revisionNumber,
            previousTotal: existing.totalAmount,
            newTotal: data.totalAmount,
            archivedPdfKey: archiveRes.archivedKey,
        });
        if (!updated) {
            return { success: false, error: 'Failed to update invoice' };
        }

        // 3. Regenerate fresh pixel-perfect PDF and update S3 active link (invoices/${id}.pdf)
        try {
            const newPdfBuffer = generateInvoicePdfBuffer({
                invoice: {
                    _id: updated._id,
                    items: updated.items,
                    totalAmount: updated.totalAmount,
                    discountAmount: updated.discountAmount,
                    couponCode: updated.couponCode,
                    paymentType: updated.paymentType,
                    comment: updated.comment,
                    date: updated.date,
                    status: updated.status,
                    isEdited: updated.isEdited,
                    editedAt: updated.editedAt,
                    editCount: updated.editCount,
                    customer: updated.customer,
                },
                business: {
                    name: ctx.businessName || "Primebake",
                },
            });

            const uploadRes = await uploadInvoicePdfBuffer(invoiceId, newPdfBuffer);
            if (uploadRes.success && uploadRes.publicUrl) {
                await invoiceRepository.updatePdfUrl(invoiceId, uploadRes.publicUrl);
                updated.pdfUrl = uploadRes.publicUrl;
            }
        } catch (pdfErr: any) {
            console.error("Failed regenerating PDF on invoice update:", pdfErr);
        }

        return { success: true, invoice: updated };
    }

    /**
     * Cancel an existing transaction.
     * Archives current PDF to invoices/cancelled/ and updates active PDF with CANCELLED watermark.
     */
    async cancelInvoice(
        invoiceId: string,
        ctx: UpdateInvoiceContext
    ): Promise<{ success: boolean; invoice?: InvoiceDTO; error?: string }> {
        // Enforce RBAC: Only OWNER can cancel finalized bills
        if (ctx.userRole !== 'OWNER') {
            return { success: false, error: 'Forbidden: Only the store owner can cancel transactions.' };
        }

        const existing = await invoiceRepository.findById(invoiceId);
        if (!existing || existing.userId !== ctx.effectiveUserId) {
            return { success: false, error: 'Invoice not found or access denied' };
        }

        if (existing.status === 'Cancelled') {
            return { success: false, error: 'This transaction is already cancelled.' };
        }

        // 1. Move/archive existing PDF on S3 to invoices/cancelled/${id}_${timestamp}.pdf
        await archiveInvoicePdf(invoiceId, 'cancelled');

        // 2. Mark status as Cancelled with audit timestamp in MongoDB
        const cancelled = await invoiceRepository.cancel(invoiceId, ctx.authUserId);
        if (!cancelled) {
            return { success: false, error: 'Failed to cancel invoice' };
        }

        // 3. Regenerate PDF with prominent CANCELLED watermark & header, and overwrite invoices/${id}.pdf
        try {
            const cancelledPdfBuffer = generateInvoicePdfBuffer({
                invoice: {
                    _id: cancelled._id,
                    items: cancelled.items,
                    totalAmount: cancelled.totalAmount,
                    discountAmount: cancelled.discountAmount,
                    couponCode: cancelled.couponCode,
                    paymentType: cancelled.paymentType,
                    comment: cancelled.comment,
                    date: cancelled.date,
                    status: 'Cancelled',
                    customer: cancelled.customer,
                },
                business: {
                    name: ctx.businessName || "Primebake",
                },
            });

            const uploadRes = await uploadInvoicePdfBuffer(invoiceId, cancelledPdfBuffer);
            if (uploadRes.success && uploadRes.publicUrl) {
                await invoiceRepository.updatePdfUrl(invoiceId, uploadRes.publicUrl);
                cancelled.pdfUrl = uploadRes.publicUrl;
            }
        } catch (pdfErr: any) {
            console.error("Failed regenerating cancelled PDF on S3:", pdfErr);
        }

        return { success: true, invoice: cancelled };
    }

    /**
     * Pull 90-day invoice report for a specific customer
     */
    async getCustomer90DayReport(customerId: string, effectiveUserId: string): Promise<{
        success: boolean;
        customer?: CustomerDTO;
        invoices?: InvoiceDTO[];
        totalSpend?: number;
        error?: string;
    }> {
        const customer = await customerRepository.findByIdForUser(customerId, effectiveUserId);
        if (!customer) {
            return { success: false, error: 'Customer not found or unauthorized' };
        }

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const invoices = await invoiceRepository.findByCustomer(effectiveUserId, customerId, ninetyDaysAgo);
        const totalSpend = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

        return {
            success: true,
            customer,
            invoices,
            totalSpend,
        };
    }

    /**
     * Generate shareable deep-link message for WhatsApp or SMS
     */
    async generateBillMessageLink(
        invoiceId: string,
        effectiveUserId: string,
        channel: MessagingChannel = 'whatsapp',
        businessName: string = 'Our Store',
        appBaseUrl: string = ''
    ): Promise<{ success: boolean; ref?: string; error?: string }> {
        const invoice = await invoiceRepository.findById(invoiceId);
        if (!invoice || invoice.userId !== effectiveUserId) {
            return { success: false, error: 'Invoice not found' };
        }

        if (!invoice.customer || !invoice.customer.phoneNumber) {
            return { success: false, error: 'Customer phone number is required to send bill' };
        }

        const adapter = MessagingAdapterFactory.getAdapter(channel);
        const invoiceUrl = `${appBaseUrl}/public/invoice/${invoice._id}`;

        const result = await adapter.sendBill({
            invoiceId: invoice._id,
            customerName: invoice.customer.name,
            customerPhone: invoice.customer.phoneNumber,
            businessName,
            items: invoice.items,
            totalAmount: invoice.totalAmount,
            invoiceUrl,
            paymentType: invoice.paymentType,
            date: new Date(invoice.date).toLocaleDateString('en-IN'),
            pdfUrl: invoice.pdfUrl,
        });

        return result;
    }

    /**
     * Update presigned invoice PDF URL
     */
    async updatePdfUrl(invoiceId: string, pdfUrl: string, effectiveUserId: string): Promise<boolean> {
        const invoice = await invoiceRepository.findById(invoiceId);
        if (!invoice || invoice.userId !== effectiveUserId) {
            return false;
        }
        return invoiceRepository.updatePdfUrl(invoiceId, pdfUrl);
    }
}

// Singleton Service instance
export const invoiceService = new InvoiceService();
