import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import { getPresignedInvoiceDownloadUrl, s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * GET /api/invoices/[id]/download
 *
 * Secure PDF download endpoint.
 * - Attempts to stream the S3 object directly using server credentials, or
 * - Redirects to a fresh presigned URL (valid for 15 minutes), or
 * - Falls back seamlessly to the branded public invoice page (/public/invoice/[id])
 *
 * This prevents customers and cashiers from ever encountering AWS S3 "AccessDenied" XML errors.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    try {
        await dbConnect();
        const invoice = await Invoice.findById(id).lean();

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const bucket = process.env.AWS_S3_BUCKET_NAME || "prime-bake";
        const objectKey = `invoices/${id}.pdf`;

        // 1. Try streaming from S3 via server-side credentials
        try {
            const command = new GetObjectCommand({
                Bucket: bucket,
                Key: objectKey,
            });
            const s3Response = await s3Client.send(command);

            if (s3Response.Body) {
                const stream = s3Response.Body as any;
                const chunks: Uint8Array[] = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const buffer = Buffer.concat(chunks);

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `inline; filename="invoice-${id.slice(-6).toUpperCase()}.pdf"`,
                        "Cache-Control": "public, max-age=3600, s-maxage=3600",
                    },
                });
            }
        } catch (s3Err: any) {
            // If S3 fetch fails (e.g. S3 not yet populated or permissions pending), fallback gracefully
            console.warn(`S3 download stream unavailable for invoice ${id}: ${s3Err.message}`);
        }

        // 2. Try generating a temporary presigned URL
        try {
            const presignedUrl = await getPresignedInvoiceDownloadUrl(objectKey, 900);
            if (presignedUrl) {
                return NextResponse.redirect(presignedUrl, 302);
            }
        } catch (presignErr: any) {
            console.warn(`Presigned URL fallback for invoice ${id}: ${presignErr.message}`);
        }

        // 3. Fallback: Redirect to the responsive public invoice portal
        const origin = request.nextUrl.origin;
        return NextResponse.redirect(`${origin}/public/invoice/${id}`, 302);
    } catch (err: any) {
        console.error("Invoice download endpoint error:", err);
        const origin = request.nextUrl.origin;
        return NextResponse.redirect(`${origin}/public/invoice/${id}`, 302);
    }
}
