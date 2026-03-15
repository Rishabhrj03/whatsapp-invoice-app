import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import CouponsClient from "@/components/CouponsClient";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { getCoupons } from "@/app/actions/coupon";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) return null;

    const [couponsRes, menuItems] = await Promise.all([
        getCoupons(),
        MenuEntry.find({ userId: effectiveUserId }).sort({ name: 1 }).lean()
    ]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Discount Coupons
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Manage promo codes and generic or product-specific deals.
                </p>
            </div>

            <CouponsClient
                initialCoupons={couponsRes.success ? couponsRes.coupons : []}
                menuItems={JSON.parse(JSON.stringify(menuItems))}
            />
        </div>
    );
}
