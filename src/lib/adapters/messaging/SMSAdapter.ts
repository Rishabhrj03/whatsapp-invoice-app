/**
 * SMSAdapter — IMessagingAdapter implementation for Text Messaging (SMS).
 *
 * Implements Adapter Pattern for direct SMS deep-linking (sms:+919876543210?body=...).
 * Works natively across iOS, Android, and desktop SMS clients with zero third-party API dependencies.
 * Easily swappable with TwilioSMSAdapter or MSG91Adapter via MessagingAdapterFactory (Strategy Pattern).
 */
import type { IMessagingAdapter, ISendResult } from './IMessagingAdapter';
import type { BillMessagePayload } from '@/types/domain';

export class SMSAdapter implements IMessagingAdapter {
    readonly channel = 'SMS (Text Message)';

    /** Normalises mobile number to clean format */
    private formatPhone(raw: string): string {
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
        return digits ? `+${digits}` : '';
    }

    /** Compact SMS body (under 160 chars or standard multi-part SMS) */
    private buildMessage(payload: BillMessagePayload): string {
        const { customerName, businessName, totalAmount, invoiceUrl, date } = payload;
        return (
            `Dear ${customerName}, your bill of Rs. ${totalAmount.toFixed(2)} from ${businessName} ` +
            `dated ${date} is ready. View invoice: ${invoiceUrl}`
        );
    }

    async sendBill(payload: BillMessagePayload): Promise<ISendResult> {
        const phone = this.formatPhone(payload.customerPhone);
        if (!phone) {
            return { success: false, error: 'Invalid or missing customer phone number for SMS' };
        }

        const message = this.buildMessage(payload);
        // iOS uses '&body=', standard RFC / Android uses '?body='
        const encodedBody = encodeURIComponent(message);
        const url = `sms:${phone}?body=${encodedBody}`;

        return { success: true, ref: url };
    }
}

export const smsAdapter = new SMSAdapter();
