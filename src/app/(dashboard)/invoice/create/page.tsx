import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import MenuEntry from "@/models/MenuEntry";
import CreateInvoiceForm from "@/components/CreateInvoiceForm";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage() {
    await dbConnect();
    const session = await auth();
    const userId = session?.user?.id;

    const [customers, menuItems] = await Promise.all([
        Customer.find({ userId }).sort({ name: 1 }),
        MenuEntry.find({ userId }).sort({ name: 1 })
    ]);

    // Convert mongoose documents to plain JSON to be passed to Client Component
    const customersData = JSON.parse(JSON.stringify(customers));
    const menuItemsData = JSON.parse(JSON.stringify(menuItems));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Create New Invoice</h1>
            </div>

            <CreateInvoiceForm customers={customersData} menuItems={menuItemsData} />
        </div>
    );
}
