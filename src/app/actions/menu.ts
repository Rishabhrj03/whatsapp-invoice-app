"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { menuService } from "@/lib/services/MenuService";
import { activityLogService } from "@/lib/services/ActivityLogService";

export type MenuEntryResponse =
    | { success: true; menuItem: any; error?: undefined }
    | { success: false; error: string; menuItem?: undefined };

export type ImportMode = 'append' | 'replace' | 'sync';

export type ImportMenuResponse =
    | {
        success: true;
        count: number;
        mode: ImportMode;
        createdCount?: number;
        updatedCount?: number;
        deletedCount?: number;
        error?: undefined;
      }
    | {
        success: false;
        error: string;
        count?: undefined;
        mode?: undefined;
        createdCount?: undefined;
        updatedCount?: undefined;
        deletedCount?: undefined;
      };

export async function createMenuEntry(formData: FormData): Promise<MenuEntryResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !session?.user?.id || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const isAvailableVal = formData.get("isAvailable");
        const rawData = {
            name: formData.get("name") as string,
            price: parseFloat(formData.get("price") as string),
            description: (formData.get("description") as string) || undefined,
            category: (formData.get("category") as string) || undefined,
            isAvailable: isAvailableVal !== null ? isAvailableVal === "true" : true,
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
                isAvailable: rawData.isAvailable,
            },
        });

        revalidatePath("/menu");
        revalidatePath("/invoice/create");
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

        const isAvailableVal = formData.get("isAvailable");
        const rawData: any = {
            name: formData.get("name") as string,
            price: parseFloat(formData.get("price") as string),
            description: (formData.get("description") as string) || undefined,
            category: (formData.get("category") as string) || undefined,
        };
        if (isAvailableVal !== null && isAvailableVal !== undefined) {
            rawData.isAvailable = isAvailableVal === "true";
        }

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
                isAvailable: rawData.isAvailable,
            },
        });

        revalidatePath("/menu");
        revalidatePath("/invoice/create");
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

export async function importMenuItemsFromCSV(items: any[], mode: ImportMode = 'append'): Promise<ImportMenuResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !session?.user?.id || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await menuService.importItems(items, effectiveUserId, session.user.id, mode);
        if (!result.success || result.count === undefined) {
            return { success: false, error: result.error || "Failed to import menu items" };
        }

        const modeDescription = 
            mode === 'replace' ? 'from scratch (replaced all existing)' :
            mode === 'sync' ? `synced (added: ${result.createdCount || 0}, updated: ${result.updatedCount || 0}, deleted: ${result.deletedCount || 0})` :
            'appended to existing';

        // Audit Trail: Record bulk menu import
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEMS_IMPORTED',
            entityType: 'MENU_ITEM',
            description: `Imported ${result.count} items into menu catalog [${modeDescription}] from Excel/CSV`,
            metadata: {
                count: result.count,
                mode,
                createdCount: result.createdCount,
                updatedCount: result.updatedCount,
                deletedCount: result.deletedCount,
            },
        });

        revalidatePath("/menu");
        return {
            success: true,
            count: result.count,
            mode,
            createdCount: result.createdCount,
            updatedCount: result.updatedCount,
            deletedCount: result.deletedCount,
        };
    } catch (error: any) {
        console.error("Failed to import menu items:", error);
        return { success: false, error: error.message || "Failed to import menu items" };
    }
}

export async function toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<MenuEntryResponse> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await menuService.updateMenuItem(id, { isAvailable }, effectiveUserId);
        if (!result.success || !result.menuItem) {
            return { success: false, error: result.error || "Failed to update item availability" };
        }

        // Audit Trail: Record availability toggle
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEM_UPDATED',
            entityType: 'MENU_ITEM',
            entityId: id,
            description: `${isAvailable ? 'Enabled (Available)' : 'Disabled (Unavailable)'} menu item "${result.menuItem.name}"`,
            metadata: { isAvailable },
        });

        revalidatePath("/menu");
        revalidatePath("/invoice/create");
        return { success: true, menuItem: result.menuItem };
    } catch (error: any) {
        console.error("Failed to toggle menu item availability:", error);
        return { success: false, error: error.message || "Failed to toggle item availability" };
    }
}

export async function bulkUpdateMenuItemAvailability(ids: string[], isAvailable: boolean): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const count = await menuService.bulkUpdateAvailability(ids, effectiveUserId, isAvailable);

        // Audit Trail: Record bulk availability update
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'MENU_ITEM_UPDATED',
            entityType: 'MENU_ITEM',
            description: `Bulk marked ${count} menu items as ${isAvailable ? 'Available' : 'Unavailable'}`,
            metadata: { count, ids, isAvailable },
        });

        revalidatePath("/menu");
        revalidatePath("/invoice/create");
        return { success: true, count };
    } catch (error: any) {
        console.error("Failed to bulk update availability:", error);
        return { success: false, error: error.message || "Failed to bulk update availability" };
    }
}
