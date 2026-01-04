import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import os from 'os';

// 1. Reconstruct DB Key (Same logic as SecretGuard)
const XOR_KEY = 165;
const DB_KEY_BYTES = [232, 196, 220, 202, 241, 192, 198, 205, 250, 224, 203, 198, 215, 220, 213, 209, 192, 193, 250, 243, 196, 208, 201, 209, 250, 151, 149, 151, 144];
const DB_KEY = DB_KEY_BYTES.map(b => String.fromCharCode(b ^ XOR_KEY)).join('');

// 2. Locate Database
// In development, it might be in a different place, but let's try the default AppData path
// If running in dev mode via "npm run dev", the app name might be different or same.
// Usually 'inv-pro' based on package name, or 'electron' if unpackaged.
// Let's try to find it.
const APP_NAME = 'inv-pro';
const dbPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), APP_NAME, 'inventory.db');

console.log(`🔌 Connecting to database at: ${dbPath}`);
console.log(`🔑 Using Key length: ${DB_KEY.length}`);

// 3. Connect
let db;
try {
    db = new Database(dbPath);
    db.pragma(`key='${DB_KEY}'`);

    // Test connection
    const test = db.prepare('SELECT count(*) as count FROM products').get();
    console.log(`✅ Connected! Current product count: ${test.count}`);
} catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
}

// 4. Seeding Config
const TARGET_PRODUCTS = 10000;
const TARGET_TRANSACTIONS = 50000;
const TARGET_SUPPLIERS = 500;

// 5. Generators
const ADJECTIVES = ['Super', 'Mega', 'Hyper', 'Smart', 'Eco', 'Pro', 'Ultra', 'Max', 'Mini', 'Nano'];
const NOUNS = ['Widget', 'Gadget', 'Tool', 'Device', 'System', 'Unit', 'Module', 'Component', 'Part', 'Kit'];
const CATEGORIES = ['Electronics', 'Home', 'Office', 'Industrial', 'Automotive', 'Medical', 'Toys'];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 6. Execute Seeding
console.log('🚀 Starting Stress Test Seeding...');
const startTime = Date.now();

db.transaction(() => {
    // A. Seed Suppliers
    console.log('📦 Seeding Suppliers...');
    const insertSupplier = db.prepare(`
        INSERT INTO suppliers (name, contact_person, phone, email, address)
        VALUES (@name, @contact, @phone, @email, @address)
    `);

    const suppliers = [];
    for (let i = 0; i < TARGET_SUPPLIERS; i++) {
        const name = `${randomItem(ADJECTIVES)} Supplier ${i}`;
        const result = insertSupplier.run({
            name,
            contact: `Manager ${i}`,
            phone: `010${randomNumber(10000000, 99999999)}`,
            email: `supplier${i}@example.com`,
            address: `Address ${i}`
        });
        suppliers.push(result.lastInsertRowid);
    }

    // B. Seed Categories (Ensure some exist)
    const catCheck = db.prepare('SELECT id FROM categories').all();
    let catIds = catCheck.map(c => c.id);
    if (catIds.length === 0) {
        const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
        CATEGORIES.forEach(c => {
            const res = insertCat.run(c);
            catIds.push(res.lastInsertRowid);
        });
    }

    // C. Seed Units (Ensure some exist)
    const unitCheck = db.prepare('SELECT id FROM units').all();
    let unitIds = unitCheck.map(u => u.id);
    if (unitIds.length === 0) {
        const insertUnit = db.prepare("INSERT INTO units (name, abbreviation) VALUES ('Piece', 'pcs')");
        const res = insertUnit.run();
        unitIds.push(res.lastInsertRowid);
    }

    // D. Seed Products
    console.log('🏭 Seeding Products...');
    const insertProduct = db.prepare(`
        INSERT INTO products (
            sku, name, description, category_id, unit_id, supplier_id, 
            cost_price, selling_price, min_stock_level, max_stock_level, is_active
        ) VALUES (
            @sku, @name, @desc, @catId, @unitId, @supId,
            @cost, @price, 10, 1000, 1
        )
    `);

    const productIds = [];
    const existingSkus = new Set(db.prepare('SELECT sku FROM products').all().map(p => p.sku));

    for (let i = 0; i < TARGET_PRODUCTS; i++) {
        const sku = `STRESS-${randomNumber(1000, 9999)}-${i}`;
        if (existingSkus.has(sku)) continue;

        const cost = randomNumber(10, 1000);
        const price = Math.floor(cost * 1.5);

        try {
            const result = insertProduct.run({
                sku,
                name: `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)} ${i}`,
                desc: 'Generated for stress test',
                catId: randomItem(catIds),
                unitId: randomItem(unitIds),
                supId: randomItem(suppliers),
                cost,
                price
            });
            productIds.push(result.lastInsertRowid);
        } catch (e) {
            // Ignore duplicates if re-running
        }

        if (i % 1000 === 0) console.log(`   ... ${i} products`);
    }

    // E. Seed Transactions & Stock Levels
    console.log('📝 Seeding Transactions...');
    const warehouseId = 1; // Default

    const insertTrans = db.prepare(`
        INSERT INTO inventory_transactions (
            transaction_type, product_id, warehouse_id, quantity, unit_cost, 
            reference_number, created_at
        ) VALUES (
            'stock_in', @pid, @wid, @qty, @cost, @ref, @date
        )
    `);

    const updateStock = db.prepare(`
        INSERT INTO stock_levels (product_id, warehouse_id, quantity)
        VALUES (@pid, @wid, @qty)
        ON CONFLICT(product_id, warehouse_id) DO UPDATE SET
        quantity = quantity + excluded.quantity
    `);

    for (let i = 0; i < TARGET_TRANSACTIONS; i++) {
        const pid = randomItem(productIds) || randomNumber(1, 100); // Fallback if no new products
        const qty = randomNumber(1, 100);

        insertTrans.run({
            pid,
            wid: warehouseId,
            qty,
            cost: randomNumber(10, 500),
            ref: `REF-${i}`,
            date: new Date().toISOString()
        });

        updateStock.run({
            pid,
            wid: warehouseId,
            qty
        });

        if (i % 5000 === 0) console.log(`   ... ${i} transactions`);
    }
})();

const duration = (Date.now() - startTime) / 1000;
console.log(`✨ Done in ${duration}s!`);
console.log(`📊 Statistics:`);
console.log(`   - Suppliers: ${db.prepare('SELECT count(*) as c FROM suppliers').get().c}`);
console.log(`   - Products:  ${db.prepare('SELECT count(*) as c FROM products').get().c}`);
console.log(`   - Trans:     ${db.prepare('SELECT count(*) as c FROM inventory_transactions').get().c}`);

// Clean exit for Electron runner
process.exit(0);
