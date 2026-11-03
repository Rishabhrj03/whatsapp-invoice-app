/**
 * Normalizes phone numbers for WhatsApp Web and API links.
 * Handles:
 * - 10-digit Indian numbers: "9876543210" -> "919876543210"
 * - 11-digit numbers with leading 0: "09876543210" -> "919876543210"
 * - International numbers already with country code: "+91 98765 43210" -> "919876543210"
 * - Returns clean digit string suitable for https://api.whatsapp.com/send?phone=...
 */
export function normalizeWhatsAppPhone(raw?: string | null): string {
    if (!raw) return "";
    let digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("0")) {
        digits = digits.slice(1);
    }
    if (digits.length === 10) {
        return `91${digits}`;
    }
    return digits;
}
