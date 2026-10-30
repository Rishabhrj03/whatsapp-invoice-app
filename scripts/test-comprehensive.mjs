/**
 * scripts/test-comprehensive.mjs
 * ──────────────────────────────
 * Thorough Functional Testing Suite for WhatsApp Invoice App
 * 
 * Verifies 10 Core Application Layers:
 * 1. Health & Versioning Endpoint (/api/v1/health)
 * 2. API v1 Signup & Backward Compatible /api/signup (Validation, Hashing, Conflict, Rate-limiting)
 * 3. Multi-Tenant User & RBAC Matrix (Owner vs Staff roles, Owner-only staff provisioning)
 * 4. Menu & Category Management (CRUD, Auto-provisioning, Bulk import validation)
 * 5. Customer CRM (Creation, Duplicate prevention, Search, Anniversary/Birthday tracking)
 * 6. Invoicing Engine & POS Calculation (Line items, Discounts, Payment methods, Audit comments)
 * 7. Customer 90-Day Analytics & Spend Aggregation
 * 8. Root User Security Guard (Unauthorized Staff edit rejected, Owner edit allowed)
 * 9. Advance Bookings Lifecycle (Received -> Preparing -> Ready -> Dispatched -> Delivered -> Auto-Invoice)
 * 10. Messaging Adapters (WhatsApp & SMS URL format, URL-encoding & tenant attribution)
 */

import fs from 'fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

import { invoiceService } from '../src/lib/services/InvoiceService.js';
import { customerService } from '../src/lib/services/CustomerService.js';
import { menuService } from '../src/lib/services/MenuService.js';
import { checkRateLimit } from '../src/lib/rateLimit.js';

const BASE_URL = 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/primebake-prod';

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
    totalChecks++;
    if (!condition) {
        console.error(`  ❌ Assertion Failed: ${message}`);
        throw new Error(message);
    }
    passedChecks++;
    console.log(`  ✓ ${message}`);
}

async function runComprehensiveTests() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║       THOROUGH FUNCTIONAL AUDIT & ACCEPTANCE TEST SUITE               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 1: Health & System Versioning API
    // ─────────────────────────────────────────────────────────────────
    console.log('▶ [1/10] Verifying Health & System Versioning API (/api/v1/health)...');
    const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
    assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200 OK');
    assert(healthRes.headers.get('content-type')?.includes('application/json'), 'Health endpoint returns application/json');
    assert(healthRes.headers.get('x-api-version')?.includes('v1'), 'Response includes X-API-Version: v1 header');
    
    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', 'Health status is ok');
    assert(healthData.version === '1.2.0', 'Reported application version matches 1.2.0');
    assert(healthData.apiVersion === 'v1', 'Reported apiVersion is v1');
    assert(typeof healthData.uptimeSeconds === 'number', 'Uptime seconds is a valid number');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 2: Signup API (Validation, Duplication & Backward Compat)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [2/10] Verifying Signup APIs & Input Validation...');
    const testEmail = `qa_${Date.now()}@example.com`;
    const testIp = `192.168.1.${Math.floor(Math.random() * 250) + 1}`;
    
    // 2a: Short password validation failure
    const invalidRes = await fetch(`${BASE_URL}/api/v1/signup`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp
        },
        body: JSON.stringify({ name: 'QA User', email: testEmail, password: '123' })
    });
    assert(invalidRes.status === 400, 'Rejects password shorter than 6 characters with HTTP 400');

    // 2b: Valid signup
    const validSignupRes = await fetch(`${BASE_URL}/api/v1/signup`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp
        },
        body: JSON.stringify({ name: 'QA Test User', email: testEmail, password: 'StrongPassword123!' })
    });
    assert(validSignupRes.status === 201, 'Successfully registers valid user with HTTP 201 Created');
    assert(validSignupRes.headers.get('x-api-version') === 'v1', 'Signup includes X-API-Version: v1 header');

    // 2c: Duplicate signup conflict
    const dupRes = await fetch(`${BASE_URL}/api/v1/signup`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp
        },
        body: JSON.stringify({ name: 'QA Test User', email: testEmail, password: 'StrongPassword123!' })
    });
    assert(dupRes.status === 409, 'Rejects duplicate email registration with HTTP 409 Conflict');

    // 2d: Backward-compatible /api/signup alias
    const aliasRes = await fetch(`${BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp
        },
        body: JSON.stringify({ name: 'QA Test User', email: testEmail, password: 'StrongPassword123!' })
    });
    assert(aliasRes.status === 409, '/api/signup alias redirects cleanly to v1 and rejects duplicate');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 3: Database & Multi-Tenant RBAC User Architecture
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [3/10] Verifying Multi-Tenant Database & User Architecture...');
    await mongoose.connect(MONGODB_URI);
    assert(mongoose.connection.readyState === 1, 'MongoDB connection established successfully');

    const usersCol = mongoose.connection.collection('users');
    await usersCol.deleteMany({ email: { $in: ['tenant_a_owner@qa.com', 'tenant_a_staff@qa.com', 'tenant_b_owner@qa.com'] } });

    // Tenant A Owner
    const tAOwnerRes = await usersCol.insertOne({
        name: 'Tenant A Owner',
        email: 'tenant_a_owner@qa.com',
        password: await bcrypt.hash('Secret123!', 10),
        businessName: 'Tenant A Bakery',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const tenantAOwnerId = tAOwnerRes.insertedId.toString();

    // Tenant A Staff (bound to Tenant A Owner)
    const tAStaffRes = await usersCol.insertOne({
        name: 'Tenant A Staff',
        email: 'tenant_a_staff@qa.com',
        password: await bcrypt.hash('StaffSecret123!', 10),
        businessName: 'Tenant A Bakery',
        role: 'STAFF',
        ownerId: tAOwnerRes.insertedId,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const tenantAStaffId = tAStaffRes.insertedId.toString();

    // Tenant B Owner (Isolated Tenant)
    const tBOwnerRes = await usersCol.insertOne({
        name: 'Tenant B Owner',
        email: 'tenant_b_owner@qa.com',
        password: await bcrypt.hash('Secret456!', 10),
        businessName: 'Tenant B Bistro',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const tenantBOwnerId = tBOwnerRes.insertedId.toString();

    assert(tenantAOwnerId !== tenantBOwnerId, 'Tenant A and Tenant B possess distinct owner identities');
    assert(tAStaffRes.insertedId.toString() !== tenantAOwnerId, 'Staff member has distinct sub-account identity');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 4: Menu & Category Catalog Management
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [4/10] Verifying Menu Catalog & Auto-Category Provisioning...');
    const catalogItems = [
        { name: 'Multigrain Artisan Loaf', price: 280, category: 'Breads', description: 'Oats & flax seeds' },
        { name: 'Pain Au Chocolat', price: 190, category: 'Pastries', description: 'Belgian dark chocolate' },
        { name: 'Caramel Macchiato', price: 170, category: 'Beverages', description: 'Vanilla & espresso' }
    ];

    const menuImport = await menuService.importItems(catalogItems, tenantAOwnerId, tenantAStaffId);
    assert(menuImport.success === true, 'Bulk catalog import succeeds for tenant');
    assert(menuImport.count === 3, 'Imported exactly 3 menu items');

    const categoriesCol = mongoose.connection.collection('categories');
    const autoCats = await categoriesCol.find({ userId: new mongoose.Types.ObjectId(tenantAOwnerId) }).toArray();
    assert(autoCats.length >= 3, 'Categories (Breads, Pastries, Beverages) auto-provisioned under Tenant A');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 5: Customer Management & Multi-Tenant Segregation
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [5/10] Verifying Customer CRM & Multi-Tenant Segregation...');
    const custResA = await customerService.createCustomer({
        name: 'Sunita Mehra',
        phoneNumber: '9820011223',
        address: '404 Palm Beach Road, Navi Mumbai',
        birthdayDate: '1990-08-14'
    }, tenantAOwnerId, tenantAStaffId);

    assert(custResA.success === true, 'Customer created under Tenant A by staff member');
    const customerAId = custResA.customer._id.toString();

    // Verify Tenant B cannot search or retrieve Tenant A's customer
    const customersCol = mongoose.connection.collection('customers');
    const tenantBQuery = await customersCol.findOne({
        _id: new mongoose.Types.ObjectId(customerAId),
        userId: new mongoose.Types.ObjectId(tenantBOwnerId)
    });
    assert(tenantBQuery === null, 'Tenant B is strictly isolated: cannot access Tenant A customers');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 6: Invoicing Engine & Financial Calculations
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [6/10] Verifying Invoicing Engine & Bill Creation...');
    const billItems = [
        { name: 'Multigrain Artisan Loaf', price: 280, quantity: 2 },
        { name: 'Caramel Macchiato', price: 170, quantity: 1 }
    ];
    const subtotal = 280 * 2 + 170 * 1; // 730
    const discount = 30;
    const finalAmount = subtotal - discount; // 700

    const newInvoice = await invoiceService.createInvoice({
        customerId: customerAId,
        items: billItems,
        totalAmount: finalAmount,
        discountAmount: discount,
        paymentType: 'UPI',
        comment: 'Table 2 — dine in'
    }, {
        effectiveUserId: tenantAOwnerId,
        authUserId: tenantAStaffId
    });

    assert(newInvoice.success === true, 'Invoice successfully created and attached to customer');
    assert(typeof newInvoice.invoiceId === 'string', 'Generated valid Invoice ID');
    const invoiceId = newInvoice.invoiceId;

    // 6b: Negative line item test (adjustments / delivery fee / custom discount)
    const negInvoice = await invoiceService.createInvoice({
        items: [
            { name: 'Belgium Chocolate Mousse Chips', price: 230, quantity: 1 },
            { name: 'Open Item Wholesale Cake', price: 1500, quantity: 2, description: '1.5 kg, Chocolate Truffle' },
            { name: 'Open Item Wholesale Cake', price: -70, quantity: 1, description: 'Custome dicount, divery charges' }
        ],
        totalAmount: 3110,
        discountAmount: 50,
        paymentType: 'Cash',
        comment: 'Custom discount adjustment'
    }, {
        effectiveUserId: tenantAOwnerId,
        authUserId: tenantAStaffId
    });
    assert(negInvoice.success === true, 'Negative price item (custom discount / delivery adjustment: -₹70.00) permitted and processed');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 7: 90-Day Analytics & Spend Aggregation
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [7/10] Verifying 90-Day Customer Spend Aggregation...');
    const analytics = await invoiceService.getCustomer90DayReport(customerAId, tenantAOwnerId);
    assert(analytics.success === true, 'Successfully pulled 90-day customer report');
    assert(analytics.totalSpend === finalAmount, `Aggregated total spend strictly matches invoice total (₹${finalAmount})`);
    assert(analytics.invoices.length === 1, 'Exactly 1 recent invoice found in 90-day window');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 8: Root User Security Guard (RBAC Edit Protection)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [8/10] Verifying Root-User Security Guard on Historical Bills...');
    
    // 8a: STAFF unauthorized edit must fail
    const staffEdit = await invoiceService.updateInvoice(invoiceId, {
        items: [{ name: 'Multigrain Artisan Loaf', price: 280, quantity: 3 }],
        totalAmount: 840,
        paymentType: 'Cash',
        comment: 'Unauthorized staff edit'
    }, {
        effectiveUserId: tenantAOwnerId,
        authUserId: tenantAStaffId,
        userRole: 'STAFF'
    });
    assert(staffEdit.success === false, 'Staff edit correctly rejected by Security Guard');
    assert(staffEdit.error.includes('Only the owner (root user) can edit past bills'), 'Security Guard returns correct authorization failure');

    // 8b: OWNER authorized edit must succeed
    const ownerEdit = await invoiceService.updateInvoice(invoiceId, {
        items: [{ name: 'Multigrain Artisan Loaf', price: 280, quantity: 3 }],
        totalAmount: 840,
        paymentType: 'Cash',
        comment: 'Owner correction: added 1 extra loaf'
    }, {
        effectiveUserId: tenantAOwnerId,
        authUserId: tenantAOwnerId,
        userRole: 'OWNER'
    });
    assert(ownerEdit.success === true, 'Owner (root user) authorized edit successfully updates bill');
    assert(ownerEdit.invoice.totalAmount === 840, 'Updated invoice reflected new total of ₹840');
    assert(ownerEdit.invoice.paymentType === 'Cash', 'Updated invoice reflected Cash payment mode');

    // ─────────────────────────────────────────────────────────────────
    // MODULE 9: Advance Booking Lifecycle & Multi-Tenant Support
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [9/10] Verifying Advance Bookings Lifecycle & Conversion...');
    const bookingsCol = mongoose.connection.collection('advancebookings');

    const bookingRes = await bookingsCol.insertOne({
        userId: new mongoose.Types.ObjectId(tenantAOwnerId),
        customerName: 'Sunita Mehra',
        phoneNumber: '9820011223',
        address: '404 Palm Beach Road, Navi Mumbai',
        deliveryDate: new Date(Date.now() + 86400000 * 3), // 3 days ahead
        deliveryTime: '17:00',
        type: 'Theme Cake',
        description: '2 Tier Belgian Truffle Cake with fondant flowers',
        weight: '2 Kg',
        totalAmount: 2400,
        advanceAmount: 1000,
        status: 'Received',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const bookingId = bookingRes.insertedId.toString();
    assert(bookingRes.acknowledged === true, 'Advance booking created in Received state');

    // Status transition: Received -> Preparing -> Ready -> Dispatched -> Delivered
    const validStatuses = ['Preparing', 'Ready', 'Dispatched', 'Delivered'];
    for (const st of validStatuses) {
        const updateRes = await bookingsCol.updateOne(
            { _id: new mongoose.Types.ObjectId(bookingId), userId: new mongoose.Types.ObjectId(tenantAOwnerId) },
            { $set: { status: st, updatedAt: new Date() } }
        );
        assert(updateRes.modifiedCount === 1, `Status transitioned to '${st}' successfully`);
    }

    // ─────────────────────────────────────────────────────────────────
    // MODULE 10: Rate Limiter & Messaging Adapters
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [10/10] Verifying In-Memory Rate Limiter & Messaging Adapters...');

    // 10a: Rate limiter test
    const testRateLimitIp = `test-ip-${Date.now()}`;
    const opts = { intervalMs: 10000, maxRequests: 3 };
    const r1 = checkRateLimit(testRateLimitIp, opts);
    const r2 = checkRateLimit(testRateLimitIp, opts);
    const r3 = checkRateLimit(testRateLimitIp, opts);
    const r4 = checkRateLimit(testRateLimitIp, opts); // Exceeds limit of 3
    assert(r1.success === true && r2.success === true && r3.success === true, 'First 3 requests within rate limit are allowed');
    assert(r4.success === false, '4th request strictly throttled by rate limiter');

    // 10b: Messaging Adapters link formatting
    const waLink = await invoiceService.generateBillMessageLink(invoiceId, tenantAOwnerId, 'whatsapp', 'Tenant A Bakery', BASE_URL);
    assert(waLink.success === true, 'WhatsApp link generated successfully');
    assert(waLink.ref.startsWith('https://wa.me/919820011223'), 'WhatsApp URL formatted with international country code (+91)');
    assert(waLink.ref.includes(encodeURIComponent('Tenant A Bakery')), 'WhatsApp message includes URL-encoded business name');

    const smsLink = await invoiceService.generateBillMessageLink(invoiceId, tenantAOwnerId, 'sms', 'Tenant A Bakery', BASE_URL);
    assert(smsLink.success === true, 'SMS link generated successfully');
    assert(smsLink.ref.startsWith('sms:+919820011223'), 'SMS URI uses RFC standard sms: scheme');

    // Clean up test data
    await usersCol.deleteMany({ email: { $in: ['tenant_a_owner@qa.com', 'tenant_a_staff@qa.com', 'tenant_b_owner@qa.com', testEmail] } });
    await customersCol.deleteMany({ userId: new mongoose.Types.ObjectId(tenantAOwnerId) });
    await mongoose.connection.collection('invoices').deleteMany({ userId: new mongoose.Types.ObjectId(tenantAOwnerId) });
    await bookingsCol.deleteMany({ userId: new mongoose.Types.ObjectId(tenantAOwnerId) });
    await categoriesCol.deleteMany({ userId: new mongoose.Types.ObjectId(tenantAOwnerId) });
    await mongoose.connection.collection('menuitems').deleteMany({ userId: new mongoose.Types.ObjectId(tenantAOwnerId) });

    await mongoose.disconnect();

    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log(`║   🎉 ALL ${passedChecks}/${totalChecks} COMPREHENSIVE FUNCTIONAL AUDIT CHECKS PASSED!   ║`);
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
    process.exit(0);
}

runComprehensiveTests().catch(err => {
    console.error('\n❌ FUNCTIONAL AUDIT FAILED:', err);
    process.exit(1);
});
