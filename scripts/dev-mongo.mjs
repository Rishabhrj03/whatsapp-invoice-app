import { MongoMemoryServer } from 'mongodb-memory-server';

try {
    const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
    console.log('MongoDB Memory Server running on port 27017:', mongod.getUri());

    const cleanup = async () => {
        console.log('Stopping MongoDB Memory Server...');
        await mongod.stop();
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep process alive
    setInterval(() => {}, 10000);
} catch (err) {
    console.error('Failed to start MongoDB Memory Server:', err);
    process.exit(1);
}
