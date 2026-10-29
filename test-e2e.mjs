/**
 * Automated Comprehensive End-to-End Test Suite
 * Tests all requested features directly through services, repositories, schemas, and adapters.
 */
import fs from 'fs';
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

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { invoiceService } from './src/lib/services/InvoiceService.js';
import { customerService } from './src/lib/services/CustomerService.js';
import { menuService } from './src/lib/services/MenuService.js';
import { MessagingAdapterFactory } from './src/lib/adapters/messaging/MessagingAdapterFactory.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/primebake-prod';

async function runE2E() {
    console.log('======================================================================');
    console.log('🚀 STARTING COMPREHENSIVE END-TO-END TEST SUITE (NEXT.JS 16 & SOLID)');
    console.log('======================================================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ [1/8] MongoDB Connected successfully (Local: 127.0.0.1:27017)');

    // 1. Setup Users (Owner & Staff)
    const usersCol = mongoose.connection.collection('users');
    await usersCol.deleteMany({ email: { $in: ['e2e_owner@test.com', 'e2e_staff@test.com'] } });

    const hashedOwnerPassword = await bcrypt.hash('OwnerPass123!', 10);
    const ownerRes = await usersCol.insertOne({
        name: 'Alice Owner',
        email: 'e2e_owner@test.com',
        password: hashedOwnerPassword,
        businessName: 'Alice Artisan Breads',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const ownerId = ownerRes.insertedId.toString();

    const hashedStaffPassword = await bcrypt.hash('StaffPass123!', 10);
    const staffRes = await usersCol.insertOne({
        name: 'Bob Staff',
        email: 'e2e_staff@test.com',
        password: hashedStaffPassword,
        businessName: 'Alice Artisan Breads',
        role: 'STAFF',
        ownerId: ownerRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const staffId = staffRes.insertedId.toString();

    console.log(`✅ [2/8] Multi-tenant Users Provisioned: Owner (${ownerId}), Staff (${staffId})`);

    // 2. Feature 1: Menu item creation & Excel/CSV Bulk Import with auto category creation
    const importItems = [
        { name: 'Sourdough Loaf', price: 250, category: 'Artisan Breads', description: 'Naturally fermented' },
        { name: 'Almond Croissant', price: 180, category: 'Viennoiserie', description: 'Twice-baked' },
        { name: 'Espresso Double', price: 120, category: 'Beverages', description: 'Arabica blend' }
    ];

    const menuImportResult = await menuService.importItems(importItems, ownerId, ownerId);
    if (!menuImportResult.success || menuImportResult.count !== 3) {
        throw new Error(`Menu import failed: ${menuImportResult.error}`);
    }
    console.log(`✅ [3/8] Excel Import Feature: Successfully imported ${menuImportResult.count} items with auto-provisioned categories`);

    // 3. Feature 2: Create Customer
    const customerPayload = {
        name: 'Priya Sharma',
        phoneNumber: '9876543210',
        anniversaryDate: '2022-11-15',
        birthdayDate: '1995-05-20',
        address: 'B-402, Green Valley Apartments, Mumbai'
    };

    const customerResult = await customerService.createCustomer(customerPayload, ownerId, staffId);
    if (!customerResult.success || !customerResult.customer) {
        throw new Error(`Customer creation failed: ${customerResult.error}`);
    }
    const customerId = customerResult.customer._id;
    console.log(`✅ [4/8] Customer Management: Created Customer '${customerResult.customer.name}' (ID: ${customerId})`);

    // 4. Feature 3: Create & Attach Bill to Customer
    const invoicePayload = {
        customerId,
        items: [
            { name: 'Sourdough Loaf', price: 250, quantity: 2 },
            { name: 'Almond Croissant', price: 180, quantity: 1 }
        ],
        totalAmount: 680,
        discountAmount: 0,
        paymentType: 'UPI',
        comment: 'Table 4 dine-in'
    };

    const invoiceResult = await invoiceService.createInvoice(invoicePayload, {
        effectiveUserId: ownerId,
        authUserId: staffId
    });
    if (!invoiceResult.success || !invoiceResult.invoiceId) {
        throw new Error(`Invoice creation failed: ${invoiceResult.error}`);
    }
    const invoiceId = invoiceResult.invoiceId;
    console.log(`✅ [5/8] Invoice Billing: Attached Bill #${invoiceId} to Customer '${customerResult.customer.name}' with UPI payment (Total: Rs. 680)`);

    // 5. Feature 4 & 5: Customer 90-Day Report & Total Spend Aggregation
    const reportResult = await invoiceService.getCustomer90DayReport(customerId, ownerId);
    if (!reportResult.success || !reportResult.invoices || reportResult.invoices.length === 0) {
        throw new Error(`90-day report failed: ${reportResult.error}`);
    }
    if (reportResult.totalSpend !== 680) {
        throw new Error(`Report total spend mismatch. Expected 680, got ${reportResult.totalSpend}`);
    }
    console.log(`✅ [6/8] 90-Day Customer Report: Pulled ${reportResult.invoices.length} invoices in past 90 days. Aggregated Total Spend = Rs. ${reportResult.totalSpend}`);

    // 6. Feature 6: Root User Edit Guard & Update Past Invoice
    // 6a: Test unauthorized edit by STAFF user (Must fail)
    const staffEditAttempt = await invoiceService.updateInvoice(invoiceId, {
        items: [
            { name: 'Sourdough Loaf', price: 250, quantity: 2 },
            { name: 'Almond Croissant', price: 180, quantity: 2 } // Modified quantity
        ],
        totalAmount: 860,
        paymentType: 'Cash',
        comment: 'Edited: Added extra croissant'
    }, {
        effectiveUserId: ownerId,
        authUserId: staffId,
        userRole: 'STAFF'
    });

    if (staffEditAttempt.success) {
        throw new Error('SECURITY BREACH: STAFF user was able to edit past invoice!');
    }
    console.log(`🔒 [Security Guard Verified] Staff unauthorized edit correctly rejected: "${staffEditAttempt.error}"`);

    // 6b: Test authorized edit by OWNER (root user) (Must succeed)
    const ownerEditAttempt = await invoiceService.updateInvoice(invoiceId, {
        items: [
            { name: 'Sourdough Loaf', price: 250, quantity: 2 },
            { name: 'Almond Croissant', price: 180, quantity: 2 }
        ],
        totalAmount: 860,
        paymentType: 'Cash',
        comment: 'Owner correction: added 1 extra croissant and changed to Cash'
    }, {
        effectiveUserId: ownerId,
        authUserId: ownerId,
        userRole: 'OWNER'
    });

    if (!ownerEditAttempt.success || !ownerEditAttempt.invoice) {
        throw new Error(`Owner edit failed: ${ownerEditAttempt.error}`);
    }
    if (ownerEditAttempt.invoice.paymentType !== 'Cash' || ownerEditAttempt.invoice.totalAmount !== 860) {
        throw new Error('Updated invoice fields did not match expected values.');
    }
    console.log(`✅ [7/8] Root User Edit: Owner successfully updated bill #${invoiceId} to Cash payment and Total Rs. 860`);

    // 7. Feature 7: Messaging via WhatsApp and SMS Text Message (Adapter & Strategy Pattern)
    const waResult = await invoiceService.generateBillMessageLink(invoiceId, ownerId, 'whatsapp', 'Alice Artisan Breads', 'http://localhost:3000');
    if (!waResult.success || !waResult.ref || !waResult.ref.includes('wa.me')) {
        throw new Error(`WhatsApp adapter link generation failed: ${waResult.error}`);
    }

    const smsResult = await invoiceService.generateBillMessageLink(invoiceId, ownerId, 'sms', 'Alice Artisan Breads', 'http://localhost:3000');
    if (!smsResult.success || !smsResult.ref || !smsResult.ref.startsWith('sms:')) {
        throw new Error(`SMS adapter link generation failed: ${smsResult.error}`);
    }

    console.log(`✅ [8/8] Messaging Adapters:`);
    console.log(`    - WhatsApp URL: ${waResult.ref.substring(0, 70)}...`);
    console.log(`    - SMS URL:      ${smsResult.ref.substring(0, 70)}...`);

    console.log('\n======================================================================');
    console.log('🎉 ALL 8 END-TO-END ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================================\n');
    process.exit(0);
}

runE2E().catch(err => {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
});
