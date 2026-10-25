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

export interface CreateInvoiceContext {
    effectiveUserId: string;
    authUserId: string;
}

export interface UpdateInvoiceContext {
    effectiveUserId: string;
    authUserId: string;
    userRole: string;
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
     * OWNER/ROOT-only: edit a past invoice's items, amounts, or payment method
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

        const updated = await invoiceRepository.update(invoiceId, data);
        if (!updated) {
            return { success: false, error: 'Failed to update invoice' };
        }

        return { success: true, invoice: updated };
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
            customerName: invoice.customer.name,
            customerPhone: invoice.customer.phoneNumber,
            businessName,
            items: invoice.items,
            totalAmount: invoice.totalAmount,
            invoiceUrl,
            paymentType: invoice.paymentType,
            date: new Date(invoice.date).toLocaleDateString('en-IN'),
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
