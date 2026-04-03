"use server";

import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export async function createInvoice(data: any) {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const newInvoice = await Invoice.create({
            customer: data.customerId || undefined,
            items: data.items,
            totalAmount: data.totalAmount,
            comment: data.comment,
            date: new Date(),
            status: "Sent",
            userId: effectiveUserId,
            paymentType: data.paymentType,
            discountAmount: data.discountAmount || 0,
            couponCode: data.couponCode,
            createdBy: session.user.id,
        });

        revalidatePath("/dashboard");
        return { success: true, invoiceId: newInvoice._id.toString() };
    } catch (error: any) {
        console.error("Failed to create invoice:", error);
        return { success: false, error: error.message || "Failed to create invoice" };
    }
}

export async function getUploadUrl(filename: string, contentType: string) {
    try {
        const { auth } = await import("@/auth");
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

export async function updateInvoicePdfUrl(invoiceId: string, pdfUrl: string) {
    try {
        await dbConnect();
        const updated = await Invoice.findByIdAndUpdate(invoiceId, { pdfUrl }, { new: true });
        if (!updated) return { success: false, error: "Invoice not found" };
        revalidatePath("/dashboard");
        revalidatePath("/transactions");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to update PDF URL" };
    }
}
