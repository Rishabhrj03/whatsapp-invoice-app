"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { menuService } from "@/lib/services/MenuService";
import { activityLogService } from "@/lib/services/ActivityLogService";

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
        const user = await getCurrentUser();
        if (!effectiveUserId || !session?.user?.id || !user) {
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

        // Audit Trail: Record menu item addition
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEM_CREATED',
            entityType: 'MENU_ITEM',
            entityId: result.menuItem._id.toString(),
            description: `Added "${rawData.name}" to menu catalog (₹${rawData.price})`,
            metadata: {
                name: rawData.name,
                price: rawData.price,
                category: rawData.category,
            },
        });

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
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) {
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

        // Audit Trail: Record menu item modification
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEM_UPDATED',
            entityType: 'MENU_ITEM',
            entityId: id,
            description: `Updated menu item "${rawData.name}" (₹${rawData.price})`,
            metadata: {
                name: rawData.name,
                price: rawData.price,
                category: rawData.category,
            },
        });

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
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const success = await menuService.deleteMenuItem(id, effectiveUserId);
        if (!success) {
            return { success: false, error: "Item not found or unauthorized" };
        }

        // Audit Trail: Record menu item deletion
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEM_DELETED',
            entityType: 'MENU_ITEM',
            entityId: id,
            description: `Removed menu item (#${id.slice(-6).toUpperCase()}) from catalog`,
        });

        revalidatePath("/menu");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete menu entry" };
    }
}

export async function deleteMultipleMenuEntries(ids: string[]) {
    try {
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const count = await menuService.deleteMultipleItems(ids, effectiveUserId);

        // Audit Trail: Record bulk deletion
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEM_DELETED',
            entityType: 'MENU_ITEM',
            description: `Bulk deleted ${count} menu catalog items`,
            metadata: { count, ids },
        });

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
        const user = await getCurrentUser();
        if (!effectiveUserId || !session?.user?.id || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await menuService.importItems(items, effectiveUserId, session.user.id);
        if (!result.success || result.count === undefined) {
            return { success: false, error: result.error || "Failed to import menu items" };
        }

        // Audit Trail: Record bulk menu import
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEMS_IMPORTED',
            entityType: 'MENU_ITEM',
            description: `Imported ${result.count} items into menu catalog from Excel/CSV`,
            metadata: { count: result.count },
        });

        revalidatePath("/menu");
        return { success: true, count: result.count };
    } catch (error: any) {
        console.error("Failed to import menu items:", error);
        return { success: false, error: error.message || "Failed to import menu items" };
    }
}
