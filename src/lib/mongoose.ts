/**
 * Database Connection Singleton (Singleton Pattern).
 * Reuses the Mongoose connection across serverless invocations and dev hot-reloads.
 * Uses typed global._mongooseCache for type safety without `any` casting.
 */
import mongoose, { Mongoose } from 'mongoose';

const getMongoUri = () => process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-invoice-app';

interface MongooseCache {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

// Global augmentation allows caching across HMR in development
const globalRef = global as unknown as { _mongooseCache?: MongooseCache };

if (!globalRef._mongooseCache) {
    globalRef._mongooseCache = { conn: null, promise: null };
}

const cached = globalRef._mongooseCache;

export async function dbConnect(): Promise<Mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const uri = getMongoUri();
        const opts: mongoose.ConnectOptions = {
            bufferCommands: false,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        };

        cached.promise = mongoose.connect(uri, opts).then((m) => {
            return m;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
