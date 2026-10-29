import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import Category from "@/models/Category";
import MenuClient from "@/components/MenuClient";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) return null;

    const resolvedSearchParams = await searchParams;
    const tab = (resolvedSearchParams.tab as "items" | "categories") || "items";
    const page = parseInt(resolvedSearchParams.page || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const itemsQuery = { userId: effectiveUserId };
    const catQuery = { userId: effectiveUserId };

    const itemsSkip = tab === "items" ? skip : 0;
    const catSkip = tab === "categories" ? skip : 0;

    const [menuItems, totalItems, categories, totalCategories] = await Promise.all([
        MenuEntry.find(itemsQuery).lean().sort({ createdAt: -1 }).skip(itemsSkip).limit(limit),
        MenuEntry.countDocuments(itemsQuery),
        Category.find(catQuery).lean().sort({ name: 1 }).skip(catSkip).limit(limit),
        Category.countDocuments(catQuery)
    ]);

    return (
        <MenuClient
            initialMenuItems={JSON.parse(JSON.stringify(menuItems))}
            initialCategories={JSON.parse(JSON.stringify(categories))}
            initialTab={tab}
            currentPage={page}
            totalItemPages={Math.ceil(totalItems / limit) || 1}
            totalCategoryPages={Math.ceil(totalCategories / limit) || 1}
        />
    );

}
