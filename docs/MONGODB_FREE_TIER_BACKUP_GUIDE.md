# 💾 Periodic Zero-Cost Database Backup Guide for MongoDB (Free Tier)

This guide provides a comprehensive, production-grade strategy for automated, periodic backups of a **MongoDB Atlas Free Tier (M0 Shared Cluster)** or any free MongoDB instance with **$0 additional cost**.

---

## 1. Why MongoDB Free Tier (M0) Needs This

MongoDB Atlas provides built-in automated snapshot backups only starting from **M10+ dedicated clusters** (~$57+/month).  
On **M0 (Free Tier)**, Atlas **does NOT** provide automated backups.

However, you can achieve **100% automated, enterprise-grade, periodic backups for $0** using:
1. **GitHub Actions Scheduled Cron** (Recommended — completely serverless, zero maintenance, free).
2. **Local / Server Cron Job** (using native `cron` or `launchd`).

---

## 2. Solution A: GitHub Actions Automated Daily/Hourly Backup (Recommended)

GitHub provides **2,000 free runner minutes per month** for private repositories (and unlimited for public repositories).  
A backup run takes **~30 to 45 seconds**, using only **~15 to 20 minutes per month**—leaving over **99% of your free quota untouched**.

### How It Works
We have configured [`.github/workflows/mongodb-backup.yml`](file://.github/workflows/mongodb-backup.yml):
1. Wakes up automatically on a schedule (e.g. daily at 02:00 UTC / 07:30 AM IST).
2. Installs the official `mongodump` database tools.
3. Securely reads your MongoDB connection string from GitHub Secrets.
4. Dumps and compresses your database with Gzip into a standalone snapshot.
5. **Verifies Integrity (Dry Run)**: Automatically executes `mongorestore --dryRun` on the freshly generated archive to ensure 100% readability and zero data corruption before uploading.
6. Saves the validated backup in **two zero-cost places**:
   - **GitHub Actions Artifacts:** Retained for 90 days for free download anytime.
   - **AWS S3 / Cloudflare R2:** Directly mirrored to your S3 bucket under `backups/`.

### Setup in 2 Minutes
1. Go to your GitHub Repository: `Settings` $\rightarrow$ `Secrets and variables` $\rightarrow$ `Actions`.
2. Click **New repository secret** and add:
   - `MONGODB_URI`: Your production MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/primebake-prod`).
   - `AWS_ACCESS_KEY_ID`: Your AWS access key (optional for S3 upload).
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key (optional for S3 upload).
   - `AWS_S3_BUCKET_NAME`: Your bucket name (e.g. `prime-bake`).
3. That's it! The workflow will run automatically daily. You can also trigger it manually anytime under the **Actions** tab $\rightarrow$ **"Automated MongoDB Free Tier Backup"** $\rightarrow$ **Run workflow**.

---

## 3. Solution B: Run Backups from Terminal / Server

You can run backups on-demand or schedule them locally on your machine or deployment server.

### Run On-Demand
```bash
npm run db:backup
```
This executes [`scripts/backup-db.mjs`](file://scripts/backup-db.mjs):
- Automatically uses `mongodump` if installed.
- **Resilient fallback:** If `mongodump` is not installed on the system, it automatically exports all collections via Node.js/Mongoose into a compressed `.tar.gz` bundle.
- Automatically uploads to your configured S3 bucket under `backups/`.
- Automatically prunes local backups older than 14 days (`BACKUP_RETENTION_DAYS`).

### Setup Local Periodic Cron (macOS / Linux)
To run a daily backup at 2:00 AM automatically on your machine or server:
```bash
crontab -e
```
Add the following line:
```cron
0 2 * * * cd /path/to/whatsapp-invoice-app && npm run db:backup >> /path/to/whatsapp-invoice-app/backups/backup.log 2>&1
```

---

## 4. How to Restore from a Backup

When you need to restore your database (e.g., after accidental data loss or testing):

### If Using Native `mongodump` Archive (`.gz`):
```bash
mongorestore --uri="YOUR_MONGODB_URI" --archive="backups/backup_primebake-prod_2026-11-22_12-55-00.gz" --gzip --drop
```
*(The `--drop` flag clears the existing collections before restoring to avoid duplicate key errors).*

### If Using JSON/Mongoose Fallback Archive (`.tar.gz`):
1. Extract the tar archive:
   ```bash
   tar -xzf backups/backup_primebake-prod_2026-11-22_12-55-00.tar.gz
   ```
2. Restore individual collections using `mongoimport`:
   ```bash
   mongoimport --uri="YOUR_MONGODB_URI" --collection=menuentries --file=backup_primebake-prod_.../menuentries.json --jsonArray --drop
   mongoimport --uri="YOUR_MONGODB_URI" --collection=invoices --file=backup_primebake-prod_.../invoices.json --jsonArray --drop
   mongoimport --uri="YOUR_MONGODB_URI" --collection=customers --file=backup_primebake-prod_.../customers.json --jsonArray --drop
   ```

---

## 5. Cost Breakdown Comparison

| Strategy | Monthly Cost | Automation | Storage Retention |
| :--- | :--- | :--- | :--- |
| **Atlas Dedicated Cluster (M10+)** | $57.00+ / mo | Built-in | 7 - 35 Days |
| **GitHub Actions Cron + Artifacts** | **$0.00 (100% Free)** | Fully Automated | 90 Days Free |
| **GitHub Actions + AWS S3 Free Tier** | **$0.00 (100% Free)** | Fully Automated | Indefinite (5GB free) |
| **Local Cron (`npm run db:backup`)** | **$0.00 (100% Free)** | Local System | Configurable (Default 14 days) |
