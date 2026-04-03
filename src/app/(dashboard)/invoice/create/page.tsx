import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import MenuEntry from "@/models/MenuEntry";
import Category from "@/models/Category";
import CreateInvoiceForm from "@/components/CreateInvoiceForm";
import User from "@/models/User";

import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

import { getCoupons } from "@/app/actions/coupon";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage() {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    const session = await auth();
    const userId = session?.user?.id;

    if (!effectiveUserId) return null;

    const [customers, menuItems, categories, couponsRes] = await Promise.all([
        Customer.find({ userId: effectiveUserId }).sort({ name: 1 }),
        MenuEntry.find({ userId: effectiveUserId }).sort({ name: 1 }),
        Category.find({ userId: effectiveUserId }).sort({ name: 1 }),
        getCoupons()
    ]);

    // Convert mongoose documents to plain JSON to be passed to Client Component
    const customersData = JSON.parse(JSON.stringify(customers));
    const menuItemsData = JSON.parse(JSON.stringify(menuItems));
    const categoriesData = JSON.parse(JSON.stringify(categories));

    const user = await User.findById(effectiveUserId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Generate Bill</h1>
            </div>

            <CreateInvoiceForm
                customers={customersData}
                menuItems={menuItemsData}
                categories={categoriesData}
                user={user ? JSON.parse(JSON.stringify(user)) : null}
                coupons={couponsRes.success ? couponsRes.coupons : []}
            />
        </div>
    );

}
