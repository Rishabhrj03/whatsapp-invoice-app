/**
 * MenuService — Business logic layer for Menu Items and Categories.
 * Handles single creation, bulk Excel/CSV import validation, and auto-provisioning of missing categories.
 */
import { menuRepository } from '@/lib/repositories/MenuRepository';
import { CreateMenuItemSchema, CreateCategorySchema, CreateMenuItemInput, CreateCategoryInput } from '@/lib/schemas';
import type { MenuItemDTO, CategoryDTO } from '@/types/domain';

export class MenuService {
    async createMenuItem(
        rawInput: unknown,
        effectiveUserId: string,
        authUserId: string
    ): Promise<{ success: boolean; menuItem?: MenuItemDTO; error?: string }> {
        const parsed = CreateMenuItemSchema.safeParse(rawInput);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid item' };
        }

        const item = await menuRepository.createItem({
            ...parsed.data,
            userId: effectiveUserId,
            createdBy: authUserId,
        });

        return { success: true, menuItem: item };
    }

    async updateMenuItem(
        id: string,
        rawInput: unknown,
        effectiveUserId: string
    ): Promise<{ success: boolean; menuItem?: MenuItemDTO; error?: string }> {
        const parsed = CreateMenuItemSchema.partial().safeParse(rawInput);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid update data' };
        }

        const updated = await menuRepository.updateItem(id, effectiveUserId, parsed.data);
        if (!updated) {
            return { success: false, error: 'Item not found' };
        }

        return { success: true, menuItem: updated };
    }

    async importItems(
        items: Array<{ name: string; price: number; description?: string; category?: string; isAvailable?: boolean }>,
        effectiveUserId: string,
        authUserId: string,
        mode: 'append' | 'replace' | 'sync' = 'append'
    ): Promise<{
        success: boolean;
        count?: number;
        mode?: 'append' | 'replace' | 'sync';
        createdCount?: number;
        updatedCount?: number;
        deletedCount?: number;
        error?: string;
    }> {
        if (!Array.isArray(items) || items.length === 0) {
            return { success: false, error: 'No items provided for import' };
        }

        // Validate items and filter valid ones
        const validItems: CreateMenuItemInput[] = [];
        for (const item of items) {
            const parsed = CreateMenuItemSchema.safeParse({
                name: item.name,
                price: Number(item.price),
                description: item.description,
                category: item.category,
                isAvailable: item.isAvailable !== false,
            });
            if (parsed.success) {
                validItems.push(parsed.data);
            }
        }

        if (validItems.length === 0) {
            return { success: false, error: 'No valid items found to import' };
        }

        // Auto-create missing categories
        const categoryNames = Array.from(new Set(validItems.map(i => i.category).filter(Boolean))) as string[];
        if (categoryNames.length > 0) {
            await menuRepository.ensureCategoriesExist(categoryNames, effectiveUserId, authUserId);
        }

        // Mode 1: Replace / Add from Scratch — wipes current catalog then imports fresh
        if (mode === 'replace') {
            const deletedCount = await menuRepository.deleteAllItemsByUser(effectiveUserId);
            const count = await menuRepository.bulkCreateItems(
                validItems.map(item => ({
                    ...item,
                    userId: effectiveUserId,
                    createdBy: authUserId,
                }))
            );
            return {
                success: true,
                count,
                mode: 'replace',
                createdCount: count,
                updatedCount: 0,
                deletedCount,
            };
        }

        // Mode 2: Sync / Reconcile — updates matched items, creates new, deletes missing
        if (mode === 'sync') {
            const existingItems = await menuRepository.findItemsByUser(effectiveUserId);
            const existingMap = new Map<string, typeof existingItems[0]>();
            for (const ex of existingItems) {
                existingMap.set(ex.name.trim().toLowerCase(), ex);
            }

            const itemsToCreate: (CreateMenuItemInput & { userId: string; createdBy?: string })[] = [];
            const matchedIds = new Set<string>();
            let updatedCount = 0;

            for (const item of validItems) {
                const key = item.name.trim().toLowerCase();
                const existing = existingMap.get(key);
                if (existing) {
                    matchedIds.add(existing._id);
                    await menuRepository.updateItem(existing._id, effectiveUserId, {
                        price: item.price,
                        category: item.category,
                        description: item.description,
                        isAvailable: item.isAvailable !== false,
                    });
                    updatedCount++;
                } else {
                    itemsToCreate.push({
                        ...item,
                        userId: effectiveUserId,
                        createdBy: authUserId,
                    });
                }
            }

            let createdCount = 0;
            if (itemsToCreate.length > 0) {
                createdCount = await menuRepository.bulkCreateItems(itemsToCreate);
            }

            // Delete existing database records that were not in the imported sheet
            const idsToDelete = existingItems
                .filter(ex => !matchedIds.has(ex._id))
                .map(ex => ex._id);

            let deletedCount = 0;
            if (idsToDelete.length > 0) {
                deletedCount = await menuRepository.deleteItems(idsToDelete, effectiveUserId);
            }

            return {
                success: true,
                count: updatedCount + createdCount,
                mode: 'sync',
                createdCount,
                updatedCount,
                deletedCount,
            };
        }

        // Mode 3: Append (Default) — adds after current records
        const count = await menuRepository.bulkCreateItems(
            validItems.map(item => ({
                ...item,
                userId: effectiveUserId,
                createdBy: authUserId,
            }))
        );

        return {
            success: true,
            count,
            mode: 'append',
            createdCount: count,
            updatedCount: 0,
            deletedCount: 0,
        };
    }

    async deleteMenuItem(id: string, effectiveUserId: string): Promise<boolean> {
        return menuRepository.deleteItem(id, effectiveUserId);
    }

    async deleteMultipleItems(ids: string[], effectiveUserId: string): Promise<number> {
        return menuRepository.deleteItems(ids, effectiveUserId);
    }

    async bulkUpdateAvailability(ids: string[], effectiveUserId: string, isAvailable: boolean): Promise<number> {
        return menuRepository.bulkUpdateAvailability(ids, effectiveUserId, isAvailable);
    }
}

export const menuService = new MenuService();
