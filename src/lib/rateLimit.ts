/**
 * In-memory sliding-window rate limiter for API routes and Server Actions.
 * Protects against brute-force attacks on signup, login, and webhook endpoints.
 */

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of Object.entries(store)) {
            if (now > record.resetTime) {
                delete store[key];
            }
        }
    }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
    intervalMs: number; // e.g. 60 * 1000 for 1 minute
    maxRequests: number; // max requests permitted in that window
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetTime: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions = { intervalMs: 60 * 1000, maxRequests: 10 }): RateLimitResult {
    const now = Date.now();
    const record = store[key];

    if (!record || now > record.resetTime) {
        store[key] = {
            count: 1,
            resetTime: now + options.intervalMs,
        };
        return {
            success: true,
            remaining: options.maxRequests - 1,
            resetTime: now + options.intervalMs,
        };
    }

    if (record.count >= options.maxRequests) {
        return {
            success: false,
            remaining: 0,
            resetTime: record.resetTime,
        };
    }

    record.count += 1;
    return {
        success: true,
        remaining: options.maxRequests - record.count,
        resetTime: record.resetTime,
    };
}

export function getClientIp(req: Request): string {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    return '127.0.0.1';
}
