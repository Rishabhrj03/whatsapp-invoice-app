/**
 * scripts/backup-db.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-Cost Automated MongoDB Backup Utility
 * 
 * Works with MongoDB Atlas Free Tier (M0) and local/cloud clusters.
 * 
 * Capabilities:
 * 1. Checks for `mongodump` CLI tool for fast native binary dumping.
 * 2. Fallback: If `mongodump` is not installed, exports collections via Mongoose to JSON/BSON.
 * 3. Compresses backup archive (.tar.gz / .gz).
 * 4. Optional: Uploads archive directly to AWS S3 or Cloudflare R2 (zero extra cost).
 * 5. Retention policy: Automatically rotates and prunes backups older than N days.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
const BACKUP_DIR = path.resolve('backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10);

// S3 Configuration (Optional for cloud mirroring)
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const HAS_S3 = Boolean(S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

function getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

async function runNativeMongodump(archivePath) {
    console.log('⚡ Using native mongodump binary...');
    const cmd = `mongodump --uri="${MONGODB_URI}" --archive="${archivePath}" --gzip`;
    execSync(cmd, { stdio: 'inherit' });
    return archivePath;
}

async function runMongooseFallback(backupSubdir) {
    console.log('ℹ mongodump not found in PATH. Using resilient Node.js / Mongoose fallback...');
    fs.mkdirSync(backupSubdir, { recursive: true });

    await mongoose.connect(MONGODB_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();

    const summary = {};
    for (const colInfo of collections) {
        const name = colInfo.name;
        // Skip system collections
        if (name.startsWith('system.')) continue;

        const col = mongoose.connection.collection(name);
        const docs = await col.find({}).toArray();
        const filePath = path.join(backupSubdir, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
        summary[name] = docs.length;
        console.log(`  ✓ Exported ${name}: ${docs.length} documents`);
    }

    fs.writeFileSync(path.join(backupSubdir, '_metadata.json'), JSON.stringify({
        timestamp: new Date().toISOString(),
        collections: summary,
    }, null, 2));

    await mongoose.disconnect();

    // Compress directory to tar.gz if tar is available
    const tarArchive = `${backupSubdir}.tar.gz`;
    try {
        execSync(`tar -czf "${tarArchive}" -C "${path.dirname(backupSubdir)}" "${path.basename(backupSubdir)}"`);
        // Remove uncompressed folder
        fs.rmSync(backupSubdir, { recursive: true, force: true });
        return tarArchive;
    } catch {
        return backupSubdir;
    }
}

async function uploadToS3(filePath) {
    if (!HAS_S3) return;
    try {
        console.log(`☁ Uploading backup to S3 bucket [${S3_BUCKET}]...`);
        const s3 = new S3Client({
            region: S3_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);
        const key = `backups/${fileName}`;

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: 'application/gzip',
        }));
        console.log(`✓ S3 upload completed: s3://${S3_BUCKET}/${key}`);
    } catch (err) {
        console.warn('⚠️ S3 upload failed (continuing with local backup):', err.message);
    }
}

function pruneOldBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const files = fs.readdirSync(BACKUP_DIR);
    let prunedCount = 0;
    for (const f of files) {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            prunedCount++;
            console.log(`  🗑 Pruned old backup (${RETENTION_DAYS}+ days): ${f}`);
        }
    }
    if (prunedCount > 0) {
        console.log(`✓ Cleaned up ${prunedCount} old backups according to retention policy.`);
    }
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║       MONGODB AUTOMATED DATABASE BACKUP UTILITY (FREE CLUSTER)        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = getTimestamp();
    const dbName = MONGODB_URI.split('/').pop().split('?')[0] || 'mongodb_backup';
    const archiveName = `backup_${dbName}_${timestamp}.gz`;
    const targetFile = path.join(BACKUP_DIR, archiveName);

    let finalBackupPath = '';

    // Check if mongodump is available in environment
    let hasMongodump = false;
    try {
        execSync('mongodump --version', { stdio: 'ignore' });
        hasMongodump = true;
    } catch {
        hasMongodump = false;
    }

    if (hasMongodump) {
        finalBackupPath = await runNativeMongodump(targetFile);
    } else {
        const backupSubdir = path.join(BACKUP_DIR, `backup_${dbName}_${timestamp}`);
        finalBackupPath = await runMongooseFallback(backupSubdir);
    }

    const stats = fs.statSync(finalBackupPath);
    const sizeKb = (stats.size / 1024).toFixed(2);
    console.log(`\n🎉 Backup created successfully!`);
    console.log(`📁 File: ${finalBackupPath}`);
    console.log(`📊 Size: ${sizeKb} KB`);

    // Upload to S3 if configured
    await uploadToS3(finalBackupPath);

    // Prune local backups older than retention window
    pruneOldBackups();

    console.log('\n✅ Backup process completed successfully with $0 additional cost.\n');
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Backup failed:', err);
    process.exit(1);
});
