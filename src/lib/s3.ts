import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

