/**
 * scripts/restore-db.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-Cost MongoDB Restore Utility
 * 
 * Directly restores a daily backup archive to MongoDB Atlas or local MongoDB.
 * 
 * Usage:
 *   npm run db:restore <path-to-backup-file>
 * 
 * Example:
 *   npm run db:restore backups/backup_primebake-prod_2026-11-22_12-55-00.gz
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import mongoose from 'mongoose';

// ── 1. Load Environment Variables ───────────────────────────────────────────
if (fs.existsSync('.env.local')) {
    const envConfig = fs.readFileSync('.env.local', 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [k, ...v] = trimmed.split('=');
            if (k && v.length) process.env[k.trim()] = v.join('=').trim();
        }
    });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/primebake-prod';

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║       MONGODB DATABASE RESTORE UTILITY (ATLAS & CLOUD COMPATIBLE)     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    let backupFile = process.argv[2];

    // If no file argument passed, find the most recent backup in backups/
    if (!backupFile) {
        if (fs.existsSync('backups')) {
            const files = fs.readdirSync('backups')
                .filter(f => f.endsWith('.gz') || f.endsWith('.tar.gz'))
                .map(f => ({ name: f, path: path.join('backups', f), time: fs.statSync(path.join('backups', f)).mtimeMs }))
                .sort((a, b) => b.time - a.time);

            if (files.length > 0) {
                backupFile = files[0].path;
                console.log(`ℹ No backup file specified. Auto-selected latest backup: ${backupFile}`);
            }
        }
    }

    if (!backupFile || !fs.existsSync(backupFile)) {
        console.error('❌ Error: Backup file not found!');
        console.log('\nUsage: npm run db:restore <path-to-backup-file>');
        console.log('Example: npm run db:restore backups/backup_primebake-prod_2026-11-22_12-55-00.gz\n');
        process.exit(1);
    }

    const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log(`🎯 Target MongoDB: ${maskedUri}`);
    console.log(`📦 Restoring from: ${backupFile}`);

    // Check if file is native mongodump archive (.gz) or tar.gz (JSON fallback)
    const isTarGz = backupFile.endsWith('.tar.gz');

    let hasMongorestore = false;
    try {
        execSync('mongorestore --version', { stdio: 'ignore' });
        hasMongorestore = true;
    } catch {
        hasMongorestore = false;
    }

    if (!isTarGz && hasMongorestore) {
        console.log('\n⚡ Running native mongorestore to Atlas cluster...');
        const cmd = `mongorestore --uri="${MONGODB_URI}" --archive="${backupFile}" --gzip --drop`;
        execSync(cmd, { stdio: 'inherit' });
        console.log('\n✅ Database restored successfully to MongoDB Atlas via mongorestore!');
        process.exit(0);
    }

    // Fallback: Restore JSON collections using Mongoose
    console.log('\nℹ Restoring JSON collections directly via Mongoose connection...');
    const tempDir = path.resolve('backups', `temp_restore_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    let jsonDir = tempDir;
    if (isTarGz) {
        execSync(`tar -xzf "${backupFile}" -C "${tempDir}"`);
        const extractedDirs = fs.readdirSync(tempDir);
        if (extractedDirs.length === 1 && fs.statSync(path.join(tempDir, extractedDirs[0])).isDirectory()) {
            jsonDir = path.join(tempDir, extractedDirs[0]);
        }
    }

    await mongoose.connect(MONGODB_URI);
    const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));

    for (const jsonFile of jsonFiles) {
        const colName = path.basename(jsonFile, '.json');
        const content = fs.readFileSync(path.join(jsonDir, jsonFile), 'utf8');
        const docs = JSON.parse(content);

        const col = mongoose.connection.collection(colName);
        await col.deleteMany({}); // Drop old documents to prevent duplicate key collisions

        if (docs.length > 0) {
            // Restore ObjectIDs and Dates
            const sanitizedDocs = docs.map(doc => {
                if (doc._id && typeof doc._id === 'string' && doc._id.length === 24) {
                    try { doc._id = new mongoose.Types.ObjectId(doc._id); } catch {}
                }
                if (doc.userId && typeof doc.userId === 'string' && doc.userId.length === 24) {
                    try { doc.userId = new mongoose.Types.ObjectId(doc.userId); } catch {}
                }
                if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
                if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
                return doc;
            });
            await col.insertMany(sanitizedDocs);
            console.log(`  ✓ Restored ${colName}: ${docs.length} documents`);
        } else {
            console.log(`  ✓ Cleared ${colName} (0 documents to insert)`);
        }
    }

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
    await mongoose.disconnect();

    console.log('\n✅ Database restored successfully to MongoDB Atlas!');
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Restore failed:', err);
    process.exit(1);
});
