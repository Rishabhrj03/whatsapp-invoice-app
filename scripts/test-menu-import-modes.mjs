import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { menuService } from '../src/lib/services/MenuService';
import { menuRepository } from '../src/lib/repositories/MenuRepository';

let mongod;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ Assertion Failed: ${message}`);
        throw new Error(message);
    }
    console.log(`✓ ${message}`);
}

async function runTest() {
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║           TESTING 3 MENU IMPORT MODES (SCRATCH, APPEND, SYNC)         ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);

    const testTenantId = new mongoose.Types.ObjectId().toString();
    const testUserId = new mongoose.Types.ObjectId().toString();

    // ─────────────────────────────────────────────────────────────────
    // Phase 1: Setup Initial Catalog with 3 items
    // ─────────────────────────────────────────────────────────────────
    console.log('▶ [1/4] Setting up baseline catalog with 3 items...');
    const initialItems = [
        { name: 'Sourdough Bread', price: 150, category: 'Breads' },
        { name: 'Croissant', price: 90, category: 'Pastries' },
        { name: 'Blueberry Muffin', price: 110, category: 'Pastries' },
    ];
    const initialRes = await menuService.importItems(initialItems, testTenantId, testUserId, 'append');
    assert(initialRes.success === true, 'Initial items imported successfully');
    assert(initialRes.count === 3, 'Catalog has exactly 3 initial items');
    assert(initialRes.mode === 'append', 'Import mode is append');

    let currentItems = await menuRepository.findItemsByUser(testTenantId);
    assert(currentItems.length === 3, 'Database contains 3 items');

    // ─────────────────────────────────────────────────────────────────
    // Phase 2: Mode 2 - Append (Add after current records)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [2/4] Testing Mode: APPEND (add new items without touching existing)...');
    const appendItems = [
        { name: 'Espresso', price: 80, category: 'Beverages' },
        { name: 'Cold Brew', price: 120, category: 'Beverages' },
    ];
    const appendRes = await menuService.importItems(appendItems, testTenantId, testUserId, 'append');
    assert(appendRes.success === true, 'Append import completed');
    assert(appendRes.count === 2, 'Imported 2 appended items');
    assert(appendRes.createdCount === 2, 'Created count is 2');

    currentItems = await menuRepository.findItemsByUser(testTenantId);
    assert(currentItems.length === 5, 'Database now contains 5 items (3 original + 2 appended)');
    assert(currentItems.some(i => i.name === 'Sourdough Bread'), 'Original item Sourdough Bread preserved');
    assert(currentItems.some(i => i.name === 'Cold Brew'), 'Appended item Cold Brew present');

    // ─────────────────────────────────────────────────────────────────
    // Phase 3: Mode 3 - Sync & Reconcile (Update matched, add new, delete missing)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [3/4] Testing Mode: SYNC & RECONCILE (update matched, add new, delete missing)...');
    // We send:
    // - Sourdough Bread (price updated from 150 to 180) -> MUST UPDATE
    // - Croissant (price updated from 90 to 100) -> MUST UPDATE
    // - Iced Latte (NEW item) -> MUST ADD
    // Note: Blueberry Muffin, Espresso, Cold Brew are NOT in this sheet -> MUST BE DELETED!
    const syncItems = [
        { name: 'Sourdough Bread', price: 180, category: 'Breads' },
        { name: 'Croissant', price: 100, category: 'Pastries' },
        { name: 'Iced Latte', price: 140, category: 'Beverages' },
    ];
    const syncRes = await menuService.importItems(syncItems, testTenantId, testUserId, 'sync');
    assert(syncRes.success === true, 'Sync import completed successfully');
    assert(syncRes.mode === 'sync', 'Reported mode is sync');
    assert(syncRes.updatedCount === 2, 'Exactly 2 matched items were updated');
    assert(syncRes.createdCount === 1, 'Exactly 1 new item (Iced Latte) was added');
    assert(syncRes.deletedCount === 3, 'Exactly 3 missing items (Muffin, Espresso, Cold Brew) were deleted');

    currentItems = await menuRepository.findItemsByUser(testTenantId);
    assert(currentItems.length === 3, 'Database now has exactly 3 items after sync reconciliation');

    const updatedBread = currentItems.find(i => i.name === 'Sourdough Bread');
    assert(updatedBread.price === 180, 'Sourdough Bread price was updated to 180');

    const updatedCroissant = currentItems.find(i => i.name === 'Croissant');
    assert(updatedCroissant.price === 100, 'Croissant price was updated to 100');

    const newLatte = currentItems.find(i => i.name === 'Iced Latte');
    assert(newLatte !== undefined && newLatte.price === 140, 'Iced Latte was added successfully');

    assert(!currentItems.some(i => i.name === 'Blueberry Muffin'), 'Blueberry Muffin was removed because not in sheet');
    assert(!currentItems.some(i => i.name === 'Espresso'), 'Espresso was removed because not in sheet');
    assert(!currentItems.some(i => i.name === 'Cold Brew'), 'Cold Brew was removed because not in sheet');

    // ─────────────────────────────────────────────────────────────────
    // Phase 4: Mode 1 - Add from Scratch / Replace (Remove all, import fresh)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n▶ [4/4] Testing Mode: ADD FROM SCRATCH / REPLACE (wipe all, import fresh)...');
    const freshItems = [
        { name: 'Chocolate Donut', price: 60, category: 'Bakery' },
        { name: 'Vanilla Cupcake', price: 75, category: 'Bakery' },
    ];
    const replaceRes = await menuService.importItems(freshItems, testTenantId, testUserId, 'replace');
    assert(replaceRes.success === true, 'Replace import completed successfully');
    assert(replaceRes.mode === 'replace', 'Reported mode is replace');
    assert(replaceRes.count === 2, '2 items imported');
    assert(replaceRes.deletedCount === 3, 'Previous 3 items were completely deleted from database');

    currentItems = await menuRepository.findItemsByUser(testTenantId);
    assert(currentItems.length === 2, 'Catalog contains ONLY the 2 fresh items');
    assert(currentItems.some(i => i.name === 'Chocolate Donut'), 'Chocolate Donut is present');
    assert(currentItems.some(i => i.name === 'Vanilla Cupcake'), 'Vanilla Cupcake is present');
    assert(!currentItems.some(i => i.name === 'Sourdough Bread'), 'Previous items completely wiped');

    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║   🎉 ALL 3 IMPORT MODES VERIFIED WITH 100% SUCCESS!                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
}

runTest().catch(async (err) => {
    console.error('Test failed:', err);
    if (mongod) await mongod.stop();
    process.exit(1);
});
