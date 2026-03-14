import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import Category from "@/models/Category";
import MenuClient from "@/components/MenuClient";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) return null;

    const [menuItems, categories] = await Promise.all([
        MenuEntry.find({ userId: effectiveUserId }).lean().sort({ createdAt: -1 }),
        Category.find({ userId: effectiveUserId }).lean().sort({ name: 1 })
    ]);

    // Serialize MongoDB objects
    const serializedItems = menuItems.map(item => ({
        ...item,
        _id: item._id.toString(),
    }));

    const serializedCategories = categories.map(cat => ({
        ...cat,
        _id: cat._id.toString(),
    }));

    return <MenuClient initialMenuItems={serializedItems} initialCategories={serializedCategories} />;

}
