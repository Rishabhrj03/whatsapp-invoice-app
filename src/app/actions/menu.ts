"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { menuService } from "@/lib/services/MenuService";

export type MenuEntryResponse =
    | { success: true; menuItem: any; error?: undefined }
    | { success: false; error: string; menuItem?: undefined };

export type ImportMenuResponse =
    | { success: true; count: number; error?: undefined }
    | { success: false; error: string; count?: undefined };

export async function createMenuEntry(formData: FormData): Promise<MenuEntryResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name") as string,
            price: parseFloat(formData.get("price") as string),
            description: (formData.get("description") as string) || undefined,
            category: (formData.get("category") as string) || undefined,
        };

        const result = await menuService.createMenuItem(rawData, effectiveUserId, session.user.id);
        if (!result.success || !result.menuItem) {
            return { success: false, error: result.error || "Failed to create menu entry" };
        }

        revalidatePath("/menu");
        return { success: true, menuItem: result.menuItem };
    } catch (error: any) {
        console.error("Failed to create menu entry:", error);
        return { success: false, error: error.message || "Failed to create menu entry" };
    }
}

export async function updateMenuEntry(id: string, formData: FormData): Promise<MenuEntryResponse> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name") as string,
            price: parseFloat(formData.get("price") as string),
            description: (formData.get("description") as string) || undefined,
            category: (formData.get("category") as string) || undefined,
        };

        const result = await menuService.updateMenuItem(id, rawData, effectiveUserId);
        if (!result.success || !result.menuItem) {
            return { success: false, error: result.error || "Failed to update menu entry" };
        }

        revalidatePath("/menu");
        return { success: true, menuItem: result.menuItem };
    } catch (error: any) {
        console.error("Failed to update menu entry:", error);
        return { success: false, error: error.message || "Failed to update menu entry" };
    }
}

export async function deleteMenuEntry(id: string) {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const success = await menuService.deleteMenuItem(id, effectiveUserId);
        if (!success) {
            return { success: false, error: "Item not found or unauthorized" };
        }

        revalidatePath("/menu");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete menu entry" };
    }
}

export async function deleteMultipleMenuEntries(ids: string[]) {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const count = await menuService.deleteMultipleItems(ids, effectiveUserId);
        revalidatePath("/menu");
        return { success: true, count };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete menu entries" };
    }
}

export async function importMenuItemsFromCSV(items: any[]): Promise<ImportMenuResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await menuService.importItems(items, effectiveUserId, session.user.id);
        if (!result.success || result.count === undefined) {
            return { success: false, error: result.error || "Failed to import menu items" };
        }

        revalidatePath("/menu");
        return { success: true, count: result.count };
    } catch (error: any) {
        console.error("Failed to import menu items:", error);
        return { success: false, error: error.message || "Failed to import menu items" };
    }
}
