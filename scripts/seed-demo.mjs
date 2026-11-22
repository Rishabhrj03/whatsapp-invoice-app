import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/primebake-prod';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB at', MONGODB_URI);

    const usersCol = mongoose.connection.collection('users');
    const categoriesCol = mongoose.connection.collection('categories');
    const menuCol = mongoose.connection.collection('menuentries');
    const customersCol = mongoose.connection.collection('customers');
    const invoicesCol = mongoose.connection.collection('invoices');

    const email = 'rishabh.joshi.owner@yopmail.com';
    let user = await usersCol.findOne({ email });

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    if (!user) {
        const insertRes = await usersCol.insertOne({
            name: 'Rishabh Joshi - Owner',
            email,
            password: hashedPassword,
            businessName: 'Bakingbros',
            role: 'OWNER',
            phone: '9876543210',
            address: '123 Baker Street, Mumbai',
            currency: 'INR',
            taxPercentage: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        user = { _id: insertRes.insertedId, name: 'Rishabh Joshi - Owner', email };
        console.log('Created user:', email);
    } else {
        await usersCol.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
        console.log('Updated user password:', email);
    }

    const userId = user._id;

    // Seed Categories
    const categories = ['Breads', 'Cakes', 'Pastries', 'Beverages'];
    for (const catName of categories) {
        await categoriesCol.updateOne(
            { userId, name: catName },
            { $setOnInsert: { userId, name: catName, createdAt: new Date() } },
            { upsert: true }
        );
    }

    // Seed Menu Items
    const sampleItems = [
        { name: 'Sourdough Artisan Loaf', price: 180, category: 'Breads', isAvailable: true, description: 'Naturally fermented 36-hour sourdough' },
        { name: 'Belgian Truffle Cake 500g', price: 650, category: 'Cakes', isAvailable: true, description: 'Rich 55% dark chocolate ganache' },
        { name: 'Red Velvet Pastry', price: 120, category: 'Pastries', isAvailable: true, description: 'Classic cream cheese frosting' },
        { name: 'Butter Croissant', price: 95, category: 'Pastries', isAvailable: false, description: 'Flaky French style butter croissant' },
        { name: 'Iced Hazelnut Latte', price: 160, category: 'Beverages', isAvailable: true, description: 'Double espresso with hazelnut notes' },
    ];

    for (const item of sampleItems) {
        await menuCol.updateOne(
            { userId, name: item.name },
            { $set: { ...item, userId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
        );
    }

    // Seed Customer
    let customer = await customersCol.findOne({ userId, phoneNumber: '9876543210' });
    if (!customer) {
        const custRes = await customersCol.insertOne({
            userId,
            name: 'Priya Sharma',
            phoneNumber: '9876543210',
            address: 'Flat 402, Sunshine Heights, Mumbai',
            birthdayDate: '1995-05-15',
            anniversaryDate: '2021-11-20',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        customer = { _id: custRes.insertedId, name: 'Priya Sharma', phoneNumber: '9876543210' };
    }

    // Seed an Invoice
    const existingInv = await invoicesCol.findOne({ userId });
    if (!existingInv) {
        await invoicesCol.insertOne({
            userId,
            customerId: customer._id,
            invoiceNumber: 'INV-1001',
            items: [
                { name: 'Belgian Truffle Cake 500g', price: 650, quantity: 1, total: 650 },
                { name: 'Iced Hazelnut Latte', price: 160, quantity: 1, total: 160 },
            ],
            subTotal: 810,
            taxAmount: 40.5,
            totalAmount: 850.5,
            discountAmount: 0,
            paymentType: 'UPI',
            status: 'Paid',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    console.log('Seed completed successfully for user:', email);
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
