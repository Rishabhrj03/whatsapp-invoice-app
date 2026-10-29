"use server";

import dbConnect from "@/lib/mongoose";
import Category from "@/models/Category";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { auth } from "@/auth";
import { activityLogService } from "@/lib/services/ActivityLogService";
import { escapeRegex } from "@/lib/security";

export async function getCategories() {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();

        // Use lean() for better performance, and sort alphabetically
        const categories = await Category.find({ userId: effectiveUserId }).sort({ name: 1 }).lean();

        // Convert ObjectIds to strings for Client Components
        const serialized = categories.map(cat => ({
            ...cat,
            _id: cat._id.toString(),
            userId: cat.userId.toString(),
            createdBy: cat.createdBy?.toString(),
            createdAt: cat.createdAt?.toISOString(),
            updatedAt: cat.updatedAt?.toISOString(),
        }));

        return { success: true, categories: serialized };
    } catch (error: any) {
        console.error("Error fetching categories:", error);
        return { success: false, error: "Failed to fetch categories" };
    }
}

export async function createCategory(data: { name: string; description?: string; color?: string }) {
    try {
        const session = await auth();
        const user = await getCurrentUser();
        if (!session?.user || !user) {
            return { success: false, error: "Unauthorized" };
        }

        if (!data.name || data.name.trim() === "") {
            return { success: false, error: "Category name is required" };
        }

        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return { success: false, error: "Unauthorized" };

        // Check for duplicates
        const escapedName = escapeRegex(data.name.trim());
        const existing = await Category.findOne({
            userId: effectiveUserId,
            name: { $regex: new RegExp(`^${escapedName}$`, "i") }
        });

        if (existing) {
            return { success: false, error: "A category with this name already exists" };
        }

        const newCategory = await Category.create({
            name: data.name.trim(),
            description: data.description?.trim(),
            color: data.color || '#f97316',
            userId: effectiveUserId,
            createdBy: session.user.id,
        });

        // Audit Trail: Record category creation
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'CATEGORY_CREATED',
            entityType: 'CATEGORY',
            entityId: newCategory._id.toString(),
            description: `Created menu category "${data.name.trim()}"`,
            metadata: { name: data.name.trim(), color: data.color },
        });

        return {
            success: true,
            category: {
                ...newCategory.toObject(),
                _id: newCategory._id.toString(),
                userId: newCategory.userId.toString(),
                createdBy: newCategory.createdBy.toString(),
                createdAt: newCategory.createdAt.toISOString(),
                updatedAt: newCategory.updatedAt.toISOString(),
            }
        };
    } catch (error: any) {
        if (error.code === 11000) {
            return { success: false, error: "Category name must be unique" };
        }
        console.error("Error creating category:", error);
        return { success: false, error: "Failed to create category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        const session = await auth();
        const user = await getCurrentUser();
        if (!session?.user || !user) {
            return { success: false, error: "Unauthorized" };
        }

        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return { success: false, error: "Unauthorized" };

        const target = await Category.findOne({ _id: id, userId: effectiveUserId });
        const result = await Category.deleteOne({ _id: id, userId: effectiveUserId });

        if (result.deletedCount === 0) {
            return { success: false, error: "Category not found or unauthorized" };
        }

        // Audit Trail: Record category deletion
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'CATEGORY_DELETED',
            entityType: 'CATEGORY',
            entityId: id,
            description: `Deleted category "${target?.name || id}"`,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting category:", error);
        return { success: false, error: "Failed to delete category" };
    }
}

export async function updateCategory(id: string, data: { name: string; description?: string; color?: string }) {
    try {
        const session = await auth();
        const user = await getCurrentUser();
        if (!session?.user || !user) {
            return { success: false, error: "Unauthorized" };
        }

        if (!data.name || data.name.trim() === "") {
            return { success: false, error: "Category name is required" };
        }

        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return { success: false, error: "Unauthorized" };

        // Check for duplicates (other than this one)
        const escapedName = escapeRegex(data.name.trim());
        const existing = await Category.findOne({
            _id: { $ne: id },
            userId: effectiveUserId,
            name: { $regex: new RegExp(`^${escapedName}$`, "i") }
        });

        if (existing) {
            return { success: false, error: "A category with this name already exists" };
        }

        const updated = await Category.findOneAndUpdate(
            { _id: id, userId: effectiveUserId },
            {
                name: data.name.trim(),
                description: data.description?.trim(),
                color: data.color,
            },
            { new: true }
        ).lean();

        if (!updated) {
            return { success: false, error: "Category not found" };
        }

        // Audit Trail: Record category update
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'CATEGORY_UPDATED',
            entityType: 'CATEGORY',
            entityId: id,
            description: `Updated category "${data.name.trim()}"`,
            metadata: { name: data.name.trim(), color: data.color },
        });

        return {
            success: true,
            category: {
                ...updated,
                _id: updated._id.toString(),
                userId: updated.userId.toString(),
                createdBy: updated.createdBy?.toString(),
            }
        };
    } catch (error: any) {
        console.error("Error updating category:", error);
        return { success: false, error: "Failed to update category" };
    }
}
