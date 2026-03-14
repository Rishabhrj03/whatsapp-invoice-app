"use server";

import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import Category from "@/models/Category";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export async function createMenuEntry(formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const name = formData.get("name") as string;
        const price = parseFloat(formData.get("price") as string);
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;

        if (!name || isNaN(price)) {
            return { success: false, error: "Name and valid Price are required." };
        }

        const newEntry = await MenuEntry.create({
            name,
            price,
            ...(description && { description }),
            ...(category && { category }),
            userId: effectiveUserId,
            createdBy: session.user.id,
        });

        revalidatePath("/menu");
        return {
            success: true,
            menuItem: JSON.parse(JSON.stringify(newEntry))
        };
    } catch (error: any) {
        console.error("Failed to create menu entry:", error);
        return { success: false, error: error.message || "Failed to create menu entry" };
    }
}

export async function deleteMenuEntry(id: string) {
    try {
        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }
        await MenuEntry.findOneAndDelete({ _id: id, userId: effectiveUserId });
        revalidatePath("/menu");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete menu entry" };
    }
}

export async function importMenuItemsFromCSV(items: any[]) {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Auto-create missing categories
        const categoriesInImport = Array.from(new Set(items.map(item => item.category).filter(Boolean))) as string[];
        if (categoriesInImport.length > 0) {
            const existingCategories = await Category.find({
                userId: effectiveUserId,
                name: { $in: categoriesInImport.map(n => new RegExp(`^${n}$`, 'i')) }
            }).select('name').lean();

            const existingNames = new Set(existingCategories.map((c: any) => c.name.toLowerCase()));
            const missingCategoriesNames = categoriesInImport.filter(name => !existingNames.has(name.toLowerCase()));

            if (missingCategoriesNames.length > 0) {
                const newCategories = missingCategoriesNames.map(name => ({
                    name: name.trim(),
                    userId: effectiveUserId,
                    createdBy: session.user?.id,
                    color: '#f97316'
                }));
                await Category.insertMany(newCategories);
            }
        }

        const itemsWithUserId = items.map(item => ({
            ...item,
            userId: effectiveUserId,
            createdBy: session?.user?.id
        }));

        await MenuEntry.insertMany(itemsWithUserId);
        revalidatePath("/menu");
        return { success: true, count: items.length };
    } catch (error: any) {
        console.error("Failed to import CSV:", error);
        return { success: false, error: error.message || "Failed to import CSV" };
    }
}

export async function deleteMultipleMenuEntries(ids: string[]) {
    try {
        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }
        await MenuEntry.deleteMany({ _id: { $in: ids }, userId: effectiveUserId });
        revalidatePath("/menu");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete multiple menu entries:", error);
        return { success: false, error: error.message || "Failed to delete items" };
    }
}

export async function updateMenuEntry(id: string, formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const name = formData.get("name") as string;
        const price = formData.get("price") as string;
        const category = formData.get("category") as string;
        const description = formData.get("description") as string;

        const updatedItem = await MenuEntry.findOneAndUpdate(
            { _id: id, userId: effectiveUserId },
            { name, price, category, description },
            { new: true }
        );

        if (!updatedItem) {
            return { success: false, error: "Item not found" };
        }

        revalidatePath("/menu");
        return { success: true, menuItem: JSON.parse(JSON.stringify(updatedItem)) };
    } catch (error: any) {
        console.error("Failed to update menu entry:", error);
        return { success: false, error: error.message || "Failed to update item" };
    }
}
