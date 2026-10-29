/**
 * scripts/test-activity-log.mjs
 * ─────────────────────────────
 * Verification of the User Activity Log / Audit Trail Feature
 */

import fs from 'fs';
import mongoose from 'mongoose';

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

import { activityLogService } from '../src/lib/services/ActivityLogService.js';
import ActivityLog from '../src/models/ActivityLog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-invoice-app';

async function runTest() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║               ACTIVITY LOG / AUDIT TRAIL TEST SUITE                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const tenantAId = new mongoose.Types.ObjectId();
    const tenantBId = new mongoose.Types.ObjectId();

    const ownerUser = {
        id: tenantAId,
        name: 'Sarah Connor',
        email: 'sarah@primebake.com',
        role: 'OWNER'
    };

    const staffUser = {
        id: new mongoose.Types.ObjectId(),
        name: 'John Connor',
        email: 'john@primebake.com',
        role: 'STAFF'
    };

    // 1. Log owner action
    const l1 = await activityLogService.logActivity({
        tenantId: tenantAId.toString(),
        user: ownerUser,
        action: 'INVOICE_CREATED',
        entityType: 'INVOICE',
        entityId: 'INV-1001',
        description: 'Generated Bill #INV-1001 for ₹1250 (UPI)',
        metadata: { totalAmount: 1250, paymentType: 'UPI' }
    });
    if (!l1) throw new Error('Failed to log owner activity');
    console.log('✓ [1/5] Successfully recorded Admin (OWNER) activity log');

    // 2. Log staff action
    const l2 = await activityLogService.logActivity({
        tenantId: tenantAId.toString(),
        user: staffUser,
        action: 'BOOKING_STATUS_CHANGED',
        entityType: 'BOOKING',
        entityId: 'BOOK-5002',
        description: 'Changed booking status to "Ready" for "Priya Sharma"',
        metadata: { newStatus: 'Ready', customerName: 'Priya Sharma' }
    });
    if (!l2) throw new Error('Failed to log staff activity');
    console.log('✓ [2/5] Successfully recorded Team Member (STAFF) activity log');

    // 3. Log an action for Tenant B (to test tenant isolation)
    await activityLogService.logActivity({
        tenantId: tenantBId.toString(),
        user: { id: tenantBId, name: 'Other Owner', email: 'other@shop.com', role: 'OWNER' },
        action: 'MENU_ITEM_CREATED',
        entityType: 'MENU_ITEM',
        description: 'Added "Vanilla Scone" to menu',
    });
    console.log('✓ [3/5] Recorded Tenant B event for isolation check');

    // 4. Query Tenant A logs and check multi-tenant scoping
    const tenantALogs = await activityLogService.getActivityLogs(tenantAId.toString(), { page: 1, limit: 10 });
    if (tenantALogs.total !== 2) {
        throw new Error(`Expected exactly 2 logs for Tenant A, found ${tenantALogs.total}`);
    }
    const hasTenantBLogs = tenantALogs.logs.some(l => l.tenantId !== tenantAId.toString());
    if (hasTenantBLogs) {
        throw new Error('Tenant isolation breach: Tenant A queried Tenant B logs');
    }
    console.log(`✓ [4/5] Multi-Tenant Isolation verified: Tenant A queried exactly ${tenantALogs.total} scoped logs`);

    // 5. Check Filtering & Aggregation Statistics
    const staffOnly = await activityLogService.getActivityLogs(tenantAId.toString(), { userId: staffUser.id.toString() });
    if (staffOnly.total !== 1 || staffOnly.logs[0].userName !== 'John Connor') {
        throw new Error('Member filter failed for staff user');
    }

    const stats = await activityLogService.getActivityStats(tenantAId.toString());
    if (stats.totalActions !== 2 || stats.breakdown.owner !== 1 || stats.breakdown.staff !== 1) {
        throw new Error(`Statistics aggregation mismatch: ${JSON.stringify(stats)}`);
    }
    console.log('✓ [5/5] Statistics & Filters verified: 1 Owner action, 1 Staff action properly broken down');

    // Clean up
    await mongoose.connection.collection('activitylogs').deleteMany({ tenantId: { $in: [tenantAId, tenantBId] } });
    await mongoose.disconnect();

    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║   🎉 ALL ACTIVITY LOG & AUDIT TRAIL TESTS PASSED (100% SUCCESS)!     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
}

runTest().catch(err => {
    console.error('❌ Activity log test failed:', err);
    process.exit(1);
});
