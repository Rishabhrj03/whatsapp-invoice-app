import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import MenuEntry from "@/models/MenuEntry";
import Category from "@/models/Category";
import OnHoldInvoice from "@/models/OnHoldInvoice";
import CreateInvoiceForm from "@/components/CreateInvoiceForm";
import User from "@/models/User";

import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

import { getCoupons } from "@/app/actions/coupon";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage({
    searchParams,
}: {
    searchParams?: Promise<{ holdId?: string }>;
}) {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    const session = await auth();

    if (!effectiveUserId) {
        redirect("/login");
    }

    const resolvedSearchParams = searchParams ? await searchParams : {};
    const holdId = resolvedSearchParams.holdId;

    const [customers, menuItems, categories, couponsRes, heldCount, heldInvoice] = await Promise.all([
        Customer.find({ userId: effectiveUserId }).sort({ name: 1 }),
        MenuEntry.find({ userId: effectiveUserId, isAvailable: { $ne: false } }).sort({ name: 1 }),
        Category.find({ userId: effectiveUserId }).sort({ name: 1 }),
        getCoupons(),
        OnHoldInvoice.countDocuments({ userId: effectiveUserId }),
        holdId ? OnHoldInvoice.findOne({ _id: holdId, userId: effectiveUserId }).lean() : null,
    ]);

    // Convert mongoose documents to plain JSON to be passed to Client Component
    const customersData = JSON.parse(JSON.stringify(customers));
    const menuItemsData = JSON.parse(JSON.stringify(menuItems));
    const categoriesData = JSON.parse(JSON.stringify(categories));
    const heldInvoiceData = heldInvoice ? JSON.parse(JSON.stringify(heldInvoice)) : null;

    const user = await User.findById(effectiveUserId);

    return (
        <div className="space-y-6">
            <CreateInvoiceForm
                customers={customersData}
                menuItems={menuItemsData}
                categories={categoriesData}
                user={user ? JSON.parse(JSON.stringify(user)) : null}
                coupons={couponsRes.success ? couponsRes.coupons : []}
                initialHeldInvoice={heldInvoiceData}
                heldCount={heldCount}
            />
        </div>
    );
}
