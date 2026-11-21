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

        const bucket = process.env.AWS_S3_BUCKET_NAME || "primebake";
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

                return new NextResponse(new Uint8Array(buffer), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `inline; filename="invoice-${id.slice(-6).toUpperCase()}.pdf"`,
                        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                        "Pragma": "no-cache",
                        "Expires": "0",
                    },
                });
            }
        } catch (s3Err: any) {
            console.warn(`S3 download stream unavailable for invoice ${id}: ${s3Err.message}`);
        }

        // 2. On-Demand Generator: Generate fresh standardized PDF directly from database
        try {
            const { generateInvoicePdfBuffer } = await import("@/lib/pdf/generate-invoice-pdf");
            const { uploadInvoicePdfBuffer } = await import("@/lib/s3");
            const populatedInvoice = await Invoice.findById(id).populate("customer").populate("userId").lean();
            if (populatedInvoice) {
                const bizUser = populatedInvoice.userId as any;
                const buffer = generateInvoicePdfBuffer({
                    invoice: {
                        _id: populatedInvoice._id.toString(),
                        items: (populatedInvoice.items || []).map((it: any) => ({
                            name: it.name,
                            price: it.price,
                            quantity: it.quantity,
                            description: it.description,
                        })),
                        totalAmount: populatedInvoice.totalAmount,
                        discountAmount: populatedInvoice.discountAmount,
                        couponCode: populatedInvoice.couponCode,
                        paymentType: populatedInvoice.paymentType,
                        comment: populatedInvoice.comment,
                        date: populatedInvoice.date || populatedInvoice.createdAt,
                        status: populatedInvoice.status,
                        isEdited: populatedInvoice.isEdited,
                        editedAt: populatedInvoice.editedAt,
                        editCount: populatedInvoice.editCount,
                        customer: populatedInvoice.customer as any,
                    },
                    business: {
                        name: bizUser?.businessName || "Primebake",
                    },
                });

                // Asynchronously sync back to S3 so future downloads stream instantly
                uploadInvoicePdfBuffer(id, buffer).catch((err) =>
                    console.warn(`Background S3 upload failed for ${id}:`, err.message)
                );

                return new NextResponse(new Uint8Array(buffer), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `inline; filename="invoice-${id.slice(-6).toUpperCase()}.pdf"`,
                        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                        "Pragma": "no-cache",
                        "Expires": "0",
                    },
                });
            }
        } catch (genErr: any) {
            console.warn(`On-demand PDF generation fallback error:`, genErr.message);
        }

        // 3. Try generating a temporary presigned URL
        try {
            const presignedUrl = await getPresignedInvoiceDownloadUrl(objectKey, 900);
            if (presignedUrl) {
                return NextResponse.redirect(presignedUrl, 302);
            }
        } catch (presignErr: any) {
            console.warn(`Presigned URL fallback for invoice ${id}: ${presignErr.message}`);
        }

        // 4. Fallback: Redirect to the responsive public invoice portal
        const origin = request.nextUrl.origin;
        return NextResponse.redirect(`${origin}/public/invoice/${id}`, 302);
    } catch (err: any) {
        console.error("Invoice download endpoint error:", err);
        const origin = request.nextUrl.origin;
        return NextResponse.redirect(`${origin}/public/invoice/${id}`, 302);
    }
}
