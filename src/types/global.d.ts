// Global augmentation for Mongoose connection cache (Singleton pattern)
// Prevents TypeScript from complaining about global.mongoose

import { Mongoose } from 'mongoose';

declare global {
    // eslint-disable-next-line no-var
    var _mongooseCache: {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
    } | undefined;
}

export {};
