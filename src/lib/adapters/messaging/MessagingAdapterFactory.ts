/**
 * MessagingAdapterFactory — Factory & Strategy Pattern.
 * Resolves the appropriate IMessagingAdapter based on user preference or message channel.
 *
 * Open/Closed Principle (OCP): New channels (Twilio, Meta Cloud API, Telegram)
 * can be registered without modifying calling invoice services.
 */
import type { IMessagingAdapter } from './IMessagingAdapter';
import { whatsAppWebAdapter } from './WhatsAppWebAdapter';
import { smsAdapter } from './SMSAdapter';

export type MessagingChannel = 'whatsapp' | 'sms';

export class MessagingAdapterFactory {
    private static registry: Map<MessagingChannel, IMessagingAdapter> = new Map<MessagingChannel, IMessagingAdapter>([
        ['whatsapp' as const, whatsAppWebAdapter as IMessagingAdapter],
        ['sms' as const, smsAdapter as IMessagingAdapter],
    ]);

    /**
     * Get the registered adapter for the chosen channel
     */
    public static getAdapter(channel: MessagingChannel = 'whatsapp'): IMessagingAdapter {
        const adapter = this.registry.get(channel);
        if (!adapter) {
            throw new Error(`Unsupported messaging channel: ${channel}`);
        }
        return adapter;
    }

    /**
     * Register or override an adapter (enables plugins/third-party gateways)
     */
    public static registerAdapter(channel: MessagingChannel, adapter: IMessagingAdapter): void {
        this.registry.set(channel, adapter);
    }
}
