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
        items: Array<{ name: string; price: number; description?: string; category?: string }>,
        effectiveUserId: string,
        authUserId: string
    ): Promise<{ success: boolean; count?: number; error?: string }> {
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

        const count = await menuRepository.bulkCreateItems(
            validItems.map(item => ({
                ...item,
                userId: effectiveUserId,
                createdBy: authUserId,
            }))
        );

        return { success: true, count };
    }

    async deleteMenuItem(id: string, effectiveUserId: string): Promise<boolean> {
        return menuRepository.deleteItem(id, effectiveUserId);
    }

    async deleteMultipleItems(ids: string[], effectiveUserId: string): Promise<number> {
        return menuRepository.deleteItems(ids, effectiveUserId);
    }
}

export const menuService = new MenuService();
