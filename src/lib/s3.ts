import { S3Client, GetObjectCommand, CopyObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

/**
 * Generate a short-lived presigned download URL for an invoice PDF.
 * This URL can be safely passed to WhatsApp Cloud API or client devices;
 * WhatsApp servers download the media once and cache it permanently on
 * the recipient's phone, after which the URL expires.
 *
 * @param objectKey S3 Key (e.g. "invoices/6721...pdf")
 * @param expiresInSeconds TTL in seconds (default 900 = 15 minutes)
 */
export async function getPresignedInvoiceDownloadUrl(
    objectKey: string,
    expiresInSeconds: number = 900
): Promise<string> {
    const bucket = process.env.AWS_S3_BUCKET_NAME || "primebake";
    const filename = objectKey.split("/").pop() || "invoice.pdf";

    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ResponseContentType: "application/pdf",
        ResponseContentDisposition: `inline; filename="${filename}"`,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Archive an existing invoice PDF before it is replaced or cancelled.
 * Copies invoices/${invoiceId}.pdf -> invoices/${folder}/${invoiceId}_${timestamp}.pdf
 *
 * @param invoiceId Invoice database ID
 * @param folder 'edited' | 'cancelled'
 */
export async function archiveInvoicePdf(
    invoiceId: string,
    folder: 'edited' | 'cancelled'
): Promise<{ success: boolean; archivedKey?: string; error?: string }> {
    const bucket = process.env.AWS_S3_BUCKET_NAME || "primebake";
    const sourceKey = `invoices/${invoiceId}.pdf`;
    const timestamp = Date.now();
    const destinationKey = `invoices/${folder}/${invoiceId}_${timestamp}.pdf`;

    try {
        const copyCommand = new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${sourceKey}`,
            Key: destinationKey,
        });

        await s3Client.send(copyCommand);
        return { success: true, archivedKey: destinationKey };
    } catch (err: any) {
        // If source key did not exist on S3 (e.g. legacy invoice or offline save), log and continue gracefully
        console.warn(`S3 archive notice: could not copy ${sourceKey} to ${destinationKey}: ${err.message}`);
        return { success: false, error: err.message };
    }
}

/**
 * Upload an invoice PDF buffer directly to S3 with cache-busting headers.
 * Overwrites invoices/${invoiceId}.pdf so active links immediately serve the latest version.
 */
export async function uploadInvoicePdfBuffer(
    invoiceId: string,
    pdfBuffer: Buffer
): Promise<{ success: boolean; objectKey: string; publicUrl: string; error?: string }> {
    const bucket = process.env.AWS_S3_BUCKET_NAME || "primebake";
    const objectKey = `invoices/${invoiceId}.pdf`;

    try {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: pdfBuffer,
            ContentType: "application/pdf",
            CacheControl: "no-cache, no-store, must-revalidate",
        });

        await s3Client.send(command);

        const publicPrefix = (process.env.NEXT_PUBLIC_S3_PUBLIC_URL || `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`).replace(/\/$/, '');
        const publicUrl = `${publicPrefix}/${objectKey}`;

        return { success: true, objectKey, publicUrl };
    } catch (err: any) {
        console.error(`S3 upload error for ${objectKey}:`, err);
        return { success: false, objectKey, publicUrl: "", error: err.message };
    }
}

