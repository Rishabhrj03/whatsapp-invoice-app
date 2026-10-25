/**
 * WhatsAppWebAdapter — IMessagingAdapter implementation using the wa.me deep link.
 *
 * Works on all devices with no API key. For programmatic sending without user
 * interaction, swap this with TwilioAdapter or MetaCloudAdapter (both implement
 * the same IMessagingAdapter interface → zero changes to callers).
 */
import type { IMessagingAdapter, ISendResult } from './IMessagingAdapter';
import type { BillMessagePayload } from '@/types/domain';

export class WhatsAppWebAdapter implements IMessagingAdapter {
    readonly channel = 'WhatsApp Web (wa.me)';

    /** Normalises an Indian mobile number to international format */
    private formatPhone(raw: string): string {
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 10) return `91${digits}`;
        return digits; // already includes country code
    }

    /** Builds the bill text from a template or the default format */
    private buildMessage(payload: BillMessagePayload): string {
        const {
            customerName, businessName, items,
            totalAmount, invoiceUrl, paymentType, date, template
        } = payload;

        const itemLines = items
            .map(it => `  • ${it.name} ×${it.quantity} = ₹${(it.price * it.quantity).toFixed(2)}`)
            .join('\n');

        if (template) {
            return template
                .replace(/{customer_name}/g, customerName)
                .replace(/{total_amount}/g, `₹${totalAmount.toFixed(2)}`)
                .replace(/{invoice_url}/g, invoiceUrl)
                .replace(/{business_name}/g, businessName)
                .replace(/{item_list}/g, itemLines)
                .replace(/{payment_type}/g, paymentType)
                .replace(/{date}/g, date);
        }

        return (
            `*Invoice from ${businessName}*\n` +
            `Hello ${customerName},\n\n` +
            `*Date:* ${date}\n` +
            `*Payment:* ${paymentType}\n\n` +
            `*Items:*\n${itemLines}\n\n` +
            `*Total: ₹${totalAmount.toFixed(2)}*\n\n` +
            `*View Invoice:* ${invoiceUrl}\n\n` +
            `Thank you for your business! 🙏`
        );
    }

    async sendBill(payload: BillMessagePayload): Promise<ISendResult> {
        const phone = this.formatPhone(payload.customerPhone);
        if (!phone) {
            return { success: false, error: 'No phone number for customer' };
        }

        const message = this.buildMessage(payload);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        return { success: true, ref: url };
    }
}

// Singleton — avoids repeated instantiation
export const whatsAppWebAdapter = new WhatsAppWebAdapter();
