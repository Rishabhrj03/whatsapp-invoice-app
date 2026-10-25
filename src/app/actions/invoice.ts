"use server";

/**
 * Server Actions: Invoices (Transport & Controller Layer).
 *
 * SOLID Principles applied:
 * - SRP : Acts only as transport/RPC controller; business logic delegated to InvoiceService
 * - DIP : Depends on InvoiceService and abstractions, not directly on Mongoose
 * - Security : RBAC enforced, multi-tenant isolation via getEffectiveUserId()
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { invoiceService } from "@/lib/services/InvoiceService";
import type { MessagingChannel } from "@/lib/adapters/messaging/MessagingAdapterFactory";

export type CreateInvoiceResponse =
    | { success: true; invoiceId: string; error?: undefined }
    | { success: false; error: string; invoiceId?: undefined };

export type UpdateInvoiceResponse =
    | { success: true; invoice: any; error?: undefined }
    | { success: false; error: string; invoice?: undefined };

export type CustomerReportResponse =
    | { success: true; customer: any; invoices: any[]; totalSpend: number; error?: undefined }
    | { success: false; error: string; customer?: undefined; invoices?: undefined; totalSpend?: undefined };

export async function createInvoice(data: unknown): Promise<CreateInvoiceResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await invoiceService.createInvoice(data, {
            effectiveUserId,
            authUserId: session.user.id,
        });

        if (!result.success || !result.invoiceId) {
            return { success: false, error: result.error || "Failed to create invoice" };
        }

        revalidatePath("/dashboard");
        revalidatePath("/transactions");

        return { success: true, invoiceId: result.invoiceId };
    } catch (error: any) {
        console.error("Failed to create invoice:", error);
        return { success: false, error: error.message || "Failed to create invoice" };
    }
}

export async function updateInvoice(invoiceId: string, data: unknown): Promise<UpdateInvoiceResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();

        if (!session?.user?.id || !effectiveUserId || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await invoiceService.updateInvoice(invoiceId, data, {
            effectiveUserId,
            authUserId: session.user.id,
            userRole: user.role,
        });

        if (!result.success || !result.invoice) {
            return { success: false, error: result.error || "Failed to update invoice" };
        }

        revalidatePath("/transactions");
        revalidatePath("/dashboard");

        return { success: true, invoice: result.invoice };
    } catch (error: any) {
        console.error("Failed to update invoice:", error);
        return { success: false, error: error.message || "Failed to update invoice" };
    }
}

export async function getCustomerReport(customerId: string): Promise<CustomerReportResponse> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await invoiceService.getCustomer90DayReport(customerId, effectiveUserId);
        if (!result.success || !result.customer || !result.invoices) {
            return { success: false, error: result.error || "Customer report not found" };
        }

        return {
            success: true,
            customer: result.customer,
            invoices: result.invoices,
            totalSpend: result.totalSpend ?? 0,
        };
    } catch (error: any) {
        console.error("Failed to get customer report:", error);
        return { success: false, error: error.message || "Failed to get report" };
    }
}

export async function sendBillMessage(invoiceId: string, channel: MessagingChannel = 'whatsapp') {
    try {
        const effectiveUserId = await getEffectiveUserId();
        const currentUser = await getCurrentUser();
        if (!effectiveUserId || !currentUser) {
            return { success: false, error: "Unauthorized" };
        }

        const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        return await invoiceService.generateBillMessageLink(
            invoiceId,
            effectiveUserId,
            channel,
            currentUser.businessName || "Our Store",
            appBaseUrl
        );
    } catch (error: any) {
        console.error("Failed to generate bill message:", error);
        return { success: false, error: error.message || "Failed to generate bill link" };
    }
}

export async function updateInvoicePdfUrl(invoiceId: string, pdfUrl: string) {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return { success: false, error: "Unauthorized" };

        const success = await invoiceService.updatePdfUrl(invoiceId, pdfUrl, effectiveUserId);
        if (!success) return { success: false, error: "Invoice not found or unauthorized" };

        revalidatePath("/dashboard");
        revalidatePath("/transactions");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update PDF URL" };
    }
}

export async function getUploadUrl(filename: string, contentType: string) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return { success: false, error: "Unauthorized" };
        }

        const userEmail = session.user.email;
        const objectKey = `${userEmail}/${filename}`;

        const { PutObjectCommand } = await import("@aws-sdk/client-s3");
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
        const { s3Client } = await import("@/lib/s3");

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: objectKey,
            ContentType: contentType,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { success: true, url, objectKey };
    } catch (error: any) {
        console.error("S3 Presign Error:", error);
        return { success: false, error: error.message || "Failed to get upload URL" };
    }
}

export async function getLogoBase64(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);

        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = res.headers.get("content-type") || "image/png";

        return { success: true, base64: `data:${contentType};base64,${base64}` };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
