import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import Coupon from "@/models/Coupon";
import CouponsClient from "@/components/CouponsClient";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function CouponsPage({ searchParams }: { searchParams: { page?: string } }) {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return null;

    const page = parseInt(searchParams.page || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = { userId: session.user.id };

    const [coupons, total, menuItems] = await Promise.all([
        Coupon.find(query).lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
        Coupon.countDocuments(query),
        MenuEntry.find({ userId: session.user.id }).sort({ name: 1 }).lean()
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
                initialCoupons={JSON.parse(JSON.stringify(coupons))}
                menuItems={JSON.parse(JSON.stringify(menuItems))}
                currentPage={page}
                totalPages={Math.ceil(total / limit) || 1}
            />
        </div>
    );
}
