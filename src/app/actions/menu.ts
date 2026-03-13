"use server";

import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function createMenuEntry(formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session?.user?.id) {
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
            userId: session.user.id,
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
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        await MenuEntry.findOneAndDelete({ _id: id, userId: session.user.id });
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
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const itemsWithUserId = items.map(item => ({
            ...item,
            userId: userId
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
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        await MenuEntry.deleteMany({ _id: { $in: ids }, userId: session.user.id });
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
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const name = formData.get("name") as string;
        const price = formData.get("price") as string;
        const category = formData.get("category") as string;
        const description = formData.get("description") as string;

        const updatedItem = await MenuEntry.findOneAndUpdate(
            { _id: id, userId: session.user.id },
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
