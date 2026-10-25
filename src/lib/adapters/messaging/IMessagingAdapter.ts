/**
 * IMessagingAdapter — contract for any messaging channel.
 *
 * Adapter Pattern: isolates the "how to send" from "what to send".
 * OCP: add Twilio/Meta adapters without touching existing code.
 * DIP: consumers depend on this interface, not a concrete channel.
 */
import type { BillMessagePayload } from '@/types/domain';

export interface ISendResult {
    success: boolean;
    /** Channel-specific URL/SID, e.g. wa.me URL or Twilio MessageSID */
    ref?: string;
    error?: string;
}

export interface IMessagingAdapter {
    /** Human-readable channel name for logging/display */
    readonly channel: string;
    /**
     * Build and "send" (or return a URL to open) the bill message.
     * Synchronous adapters return immediately; async ones await delivery.
     */
    sendBill(payload: BillMessagePayload): Promise<ISendResult>;
}
