/**
 * WhatsAppCloudAdapter — IMessagingAdapter implementation using Meta's WhatsApp Cloud API.
 *
 * Implements native document delivery: sends the invoice as an attached .pdf
 * document using a short-lived S3 presigned download URL.
 *
 * Benefits:
 * - Direct PDF delivery: Customer receives the PDF document directly in chat.
 * - Privacy: Uses a 15-minute temporary presigned S3 download URL; S3 bucket stays private.
 * - Permanent: WhatsApp ingests and delivers the media to the customer's phone storage,
 *   so the invoice file never expires for the customer even after S3 URLs expire.
 */
import type { IMessagingAdapter, ISendResult } from './IMessagingAdapter';
import type { BillMessagePayload } from '@/types/domain';
import { getPresignedInvoiceDownloadUrl } from '@/lib/s3';

export class WhatsAppCloudAdapter implements IMessagingAdapter {
    readonly channel = 'WhatsApp Cloud API (Native PDF Document)';

    /** Normalises mobile number to international format */
    private formatPhone(raw: string): string {
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 10) return `91${digits}`;
        return digits;
    }

    async sendBill(payload: BillMessagePayload): Promise<ISendResult> {
        const phone = this.formatPhone(payload.customerPhone);
        if (!phone) {
            return { success: false, error: 'No phone number for customer' };
        }

        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        // If invoiceId is present, generate a 15-minute short-lived presigned URL
        let presignedPdfUrl = payload.pdfUrl;
        if (payload.invoiceId) {
            try {
                presignedPdfUrl = await getPresignedInvoiceDownloadUrl(
                    `invoices/${payload.invoiceId}.pdf`,
                    900 // 15 minutes TTL
                );
            } catch (err: any) {
                console.warn('Could not generate presigned PDF URL, using fallback:', err.message);
            }
        }

        // Caption accompanying the document
        const caption =
            `*${payload.businessName}*\n` +
            `Hello ${payload.customerName}, here is your digital invoice.\n\n` +
            `*Date:* ${payload.date}\n` +
            `*Amount:* ₹${payload.totalAmount.toFixed(2)} (${payload.paymentType})\n\n` +
            `Thank you for your visit! 🙏`;

        // If Cloud API credentials are not set (e.g. development/testing), provide simulation result
        if (!phoneNumberId || !accessToken) {
            console.log(
                `[WhatsAppCloudAdapter] (Simulation Mode) Document dispatch to ${phone}. Presigned URL: ${presignedPdfUrl?.slice(0, 50)}...`
            );
            return {
                success: true,
                ref: `simulated-wamid-${Date.now()}`,
            };
        }

        try {
            const bodyPayload = presignedPdfUrl
                ? {
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: phone,
                      type: 'document',
                      document: {
                          link: presignedPdfUrl,
                          filename: `Invoice-${(payload.invoiceId || 'bill').slice(-6).toUpperCase()}.pdf`,
                          caption,
                      },
                  }
                : {
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: phone,
                      type: 'text',
                      text: {
                          body: `${caption}\n\n*View Invoice:* ${payload.invoiceUrl}`,
                      },
                  };

            const response = await fetch(
                `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bodyPayload),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const errMsg = data?.error?.message || response.statusText;
                console.error('[WhatsAppCloudAdapter] Meta API error:', data);
                return { success: false, error: errMsg };
            }

            const messageId = data?.messages?.[0]?.id;
            return { success: true, ref: messageId };
        } catch (error: any) {
            console.error('[WhatsAppCloudAdapter] Network or dispatch exception:', error);
            return { success: false, error: error.message || 'WhatsApp Cloud API call failed' };
        }
    }
}

// Singleton instance
export const whatsAppCloudAdapter = new WhatsAppCloudAdapter();
